import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10,
};

interface RemotePeer {
    id: string;
    userName: string;
    stream: MediaStream | null;
    isMicOn: boolean;
    isCameraOn: boolean;
    isHandRaised: boolean;
    isGlitching: boolean;
    isScreenSharing: boolean;
    connectionState: RTCIceConnectionState;
    isTyping: boolean;
    networkQuality: number;
}

export const useWebRTC = (roomId: string, userName: string) => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Record<string, RemotePeer>>({});
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Mesh Refs
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueues = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const handshakeInterval = useRef<number | null>(null);

  // --- Utility: Set Bitrate Limit ---
  const setBitrateLimit = async (pc: RTCPeerConnection, maxBitrate: number) => {
    try {
        const senders = pc.getSenders();
        for (const sender of senders) {
            if (sender.track?.kind === 'video') {
                const parameters = sender.getParameters();
                if (!parameters.encodings) parameters.encodings = [{}];
                parameters.encodings[0].maxBitrate = maxBitrate;
                await sender.setParameters(parameters);
            }
        }
    } catch (e) {}
  };

  // --- Connection Core ---
  const createPeerConnection = useCallback((peerId: string) => {
    if (peerConnections.current[peerId]) return peerConnections.current[peerId];

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerId] = pc;
    iceCandidatesQueues.current[peerId] = [];

    pc.onicecandidate = (event) => {
      if (event.candidate) signaling.sendIceCandidate(roomId, peerId, event.candidate);
    };

    pc.oniceconnectionstatechange = () => {
        setRemotePeers(prev => ({
            ...prev,
            [peerId]: { ...prev[peerId], connectionState: pc.iceConnectionState }
        }));
        if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemotePeers(prev => ({ ...prev, [peerId]: { ...prev[peerId], stream: stream } }));
    };

    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
    
    return pc;
  }, [roomId, localStream]);

  const joinRoom = async () => {
    if (!roomId || !userName) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 24 }, 
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      localVideoTrack.current = stream.getVideoTracks()[0];
      localAudioTrack.current = stream.getAudioTracks()[0];
      setLocalStream(stream);
      setIsInRoom(true);
      signaling.joinRoom(roomId, userName);
      handshakeInterval.current = window.setInterval(() => signaling.joinRoom(roomId, userName), 2000);
    } catch (err) { alert("Access Denied: Protocol requires hardware initialization."); }
  };

  const leaveRoom = useCallback(() => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (handshakeInterval.current) clearInterval(handshakeInterval.current);
    peerConnections.current = {};
    setRemotePeers({});
    setLocalStream(null);
    setIsInRoom(false);
    signaling.leaveRoom(roomId);
  }, [roomId, localStream]);

  // --- Mesh Optimized Screen Share ---
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const track = stream.getVideoTracks()[0];
            screenTrackRef.current = track;
            
            // Replace tracks in all mesh peers
            Object.values(peerConnections.current).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(track);
            });

            setLocalStream(new MediaStream([track, localAudioTrack.current!]));
            setIsScreenSharing(true);
            signaling.sendScreenShareStatus(roomId, true);

            track.onended = () => {
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender && localVideoTrack.current) sender.replaceTrack(localVideoTrack.current);
                });
                setLocalStream(new MediaStream([localVideoTrack.current!, localAudioTrack.current!]));
                setIsScreenSharing(false);
                signaling.sendScreenShareStatus(roomId, false);
            };
        } catch (e) {}
    } else {
        screenTrackRef.current?.stop();
        Object.values(peerConnections.current).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && localVideoTrack.current) sender.replaceTrack(localVideoTrack.current);
        });
        setLocalStream(new MediaStream([localVideoTrack.current!, localAudioTrack.current!]));
        setIsScreenSharing(false);
        signaling.sendScreenShareStatus(roomId, false);
    }
  };

  useEffect(() => {
    const handleJoin = async (p: SignalPayload) => {
      if (p.roomId !== roomId || p.senderId === signaling.userId) return; 
      if (!remotePeers[p.senderId]) {
          setRemotePeers(prev => ({
              ...prev,
              [p.senderId]: {
                  id: p.senderId, userName: p.payload.name || "PEER", stream: null,
                  isMicOn: true, isCameraOn: true, isHandRaised: false, isGlitching: false,
                  isScreenSharing: false, connectionState: 'new', isTyping: false, networkQuality: 4
              }
          }));
      }
      if (signaling.userId > p.senderId) {
        const pc = createPeerConnection(p.senderId);
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.sendOffer(roomId, p.senderId, offer);
        await setBitrateLimit(pc, 500000);
      }
    };

    const handleOffer = async (p: SignalPayload) => {
      if (p.roomId !== roomId || p.payload.targetUserId !== signaling.userId) return;
      const pc = createPeerConnection(p.senderId);
      if (pc.signalingState !== 'stable' && signaling.userId < p.senderId) await pc.setLocalDescription({type: "rollback"});
      if (pc.signalingState !== 'stable' && signaling.userId > p.senderId) return;
      await pc.setRemoteDescription(new RTCSessionDescription(p.payload.sdp));
      while (iceCandidatesQueues.current[p.senderId]?.length > 0) {
          const c = iceCandidatesQueues.current[p.senderId].shift();
          if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => {});
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signaling.sendAnswer(roomId, p.senderId, answer);
      await setBitrateLimit(pc, 500000);
    };

    const handleAnswer = async (p: SignalPayload) => {
      if (p.roomId !== roomId || p.payload.targetUserId !== signaling.userId) return;
      const pc = peerConnections.current[p.senderId];
      if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(p.payload.sdp));
          while (iceCandidatesQueues.current[p.senderId]?.length > 0) {
              const c = iceCandidatesQueues.current[p.senderId].shift();
              if (c) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => {});
          }
      }
    };

    const handleIce = (p: SignalPayload) => {
      if (p.roomId !== roomId) return;
      const pc = peerConnections.current[p.senderId];
      if (pc && pc.remoteDescription) pc.addIceCandidate(new RTCIceCandidate(p.payload.candidate)).catch(e => {});
      else { if (!iceCandidatesQueues.current[p.senderId]) iceCandidatesQueues.current[p.senderId] = []; iceCandidatesQueues.current[p.senderId].push(p.payload.candidate); }
    };

    const handleMediaStatus = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], [p.payload.kind === 'audio' ? 'isMicOn' : 'isCameraOn']: p.payload.enabled }
        } : prev);
        if (p.payload.kind === 'video') {
            setRemotePeers(prev => ({...prev, [p.senderId]: { ...prev[p.senderId], isGlitching: true }}));
            setTimeout(() => setRemotePeers(prev => ({...prev, [p.senderId]: { ...prev[p.senderId], isGlitching: false }})), 400);
        }
    };

    const handleHandRaise = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], isHandRaised: p.payload.isRaised }
        } : prev);
    };

    const handleLeave = (p: SignalPayload) => {
        const id = p.payload?.senderId || p.senderId;
        if (peerConnections.current[id]) { peerConnections.current[id].close(); delete peerConnections.current[id]; }
        setRemotePeers(prev => { const n = {...prev}; delete n[id]; return n; });
    };

    signaling.on('join', handleJoin);
    signaling.on('offer', handleOffer);
    signaling.on('answer', handleAnswer);
    signaling.on('ice-candidate', handleIce);
    signaling.on('media-status', handleMediaStatus);
    signaling.on('hand-raise', handleHandRaise);
    signaling.on('leave', handleLeave);

    return () => {
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIce);
      signaling.off('media-status', handleMediaStatus);
      signaling.off('hand-raise', handleHandRaise);
      signaling.off('leave', handleLeave);
    };
  }, [roomId, createPeerConnection, remotePeers]);

  return {
    isInRoom, localStream, remotePeers: Object.values(remotePeers),
    isMicOn, isCameraOn, isHandRaised, isGlitching, isScreenSharing,
    joinRoom, leaveRoom, manualReconnect: () => Object.values(peerConnections.current).forEach(pc => pc.restartIce()),
    toggleMic: () => { if(localAudioTrack.current) { localAudioTrack.current.enabled = !localAudioTrack.current.enabled; setIsMicOn(localAudioTrack.current.enabled); signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current.enabled); } },
    toggleCamera: () => { if(localVideoTrack.current) { localVideoTrack.current.enabled = !localVideoTrack.current.enabled; setIsCameraOn(localVideoTrack.current.enabled); setIsGlitching(true); setTimeout(() => setIsGlitching(false), 400); signaling.sendMediaStatus(roomId, 'video', localVideoTrack.current.enabled); } },
    toggleHandRaise: () => { const s = !isHandRaised; setIsHandRaised(s); signaling.sendHandRaise(roomId, s); },
    toggleScreenShare
  };
};