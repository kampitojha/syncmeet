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
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Mesh Refs
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueues = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
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

    console.log(`🛠️ Creating PC for Peer: ${peerId}`);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerId] = pc;
    iceCandidatesQueues.current[peerId] = [];

    pc.onicecandidate = (event) => {
      if (event.candidate) {
         signaling.sendIceCandidate(roomId, peerId, event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
        setRemotePeers(prev => ({
            ...prev,
            [peerId]: { ...prev[peerId], connectionState: pc.iceConnectionState }
        }));
        if (pc.iceConnectionState === 'failed') pc.restartIce();
    };

    pc.ontrack = (event) => {
      console.log(`📹 Track received from ${peerId}`);
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemotePeers(prev => ({
          ...prev,
          [peerId]: { ...prev[peerId], stream: stream }
      }));
    };

    // Add local tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }
    
    return pc;
  }, [roomId, localStream]);

  const startHandshake = useCallback(() => {
    if (handshakeInterval.current) clearInterval(handshakeInterval.current);
    signaling.joinRoom(roomId, userName);
    handshakeInterval.current = window.setInterval(() => {
        signaling.joinRoom(roomId, userName);
    }, 2000); 
  }, [roomId, userName]);

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
      startHandshake();
    } catch (err) { alert("Access Denied: Camera/Mic required."); }
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

  // --- Signaling logic ---
  useEffect(() => {
    const handleJoin = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId || payload.senderId === signaling.userId) return; 

      if (!remotePeers[payload.senderId]) {
          setRemotePeers(prev => ({
              ...prev,
              [payload.senderId]: {
                  id: payload.senderId,
                  userName: payload.payload.name || "PEER",
                  stream: null,
                  isMicOn: true, isCameraOn: true, isScreenSharing: false,
                  connectionState: 'new', isTyping: false, networkQuality: 4
              }
          }));
      }

      // Caller Logic
      if (signaling.userId > payload.senderId) {
        const pc = createPeerConnection(payload.senderId);
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        signaling.sendOffer(roomId, payload.senderId, offer);
        await setBitrateLimit(pc, 500000);
      }
    };

    const handleOffer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId || payload.payload.targetUserId !== signaling.userId) return;
      const pc = createPeerConnection(payload.senderId);
      
      const offer = new RTCSessionDescription(payload.payload.sdp);
      const isPolite = signaling.userId < payload.senderId;

      if (pc.signalingState !== 'stable') {
           if (!isPolite) return;
           await pc.setLocalDescription({type: "rollback"});
      }
      
      await pc.setRemoteDescription(offer);
      
      // Process Queued ICE
      while (iceCandidatesQueues.current[payload.senderId]?.length > 0) {
          const candidate = iceCandidatesQueues.current[payload.senderId].shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signaling.sendAnswer(roomId, payload.senderId, answer);
      await setBitrateLimit(pc, 500000);
    };

    const handleAnswer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId || payload.payload.targetUserId !== signaling.userId) return;
      const pc = peerConnections.current[payload.senderId];
      if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          // Process Queued ICE
          while (iceCandidatesQueues.current[payload.senderId]?.length > 0) {
              const candidate = iceCandidatesQueues.current[payload.senderId].shift();
              if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
          }
      }
    };

    const handleIce = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      const peerId = payload.senderId;
      const candidate = payload.payload.candidate;
      const pc = peerConnections.current[peerId];

      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
      } else {
          if (!iceCandidatesQueues.current[peerId]) iceCandidatesQueues.current[peerId] = [];
          iceCandidatesQueues.current[peerId].push(candidate);
      }
    };

    const handleMediaStatus = (payload: SignalPayload) => {
        setRemotePeers(prev => {
            if (!prev[payload.senderId]) return prev;
            return {
                ...prev,
                [payload.senderId]: {
                    ...prev[payload.senderId],
                    [payload.payload.kind === 'audio' ? 'isMicOn' : 'isCameraOn']: payload.payload.enabled
                }
            };
        });
    };

    const handleLeave = (payload: SignalPayload) => {
        const peerId = payload.payload?.senderId || payload.senderId;
        if (peerConnections.current[peerId]) {
            peerConnections.current[peerId].close();
            delete peerConnections.current[peerId];
        }
        setRemotePeers(prev => {
            const next = {...prev};
            delete next[peerId];
            return next;
        });
    };

    signaling.on('join', handleJoin);
    signaling.on('offer', handleOffer);
    signaling.on('answer', handleAnswer);
    signaling.on('ice-candidate', handleIce);
    signaling.on('media-status', handleMediaStatus);
    signaling.on('leave', handleLeave);

    return () => {
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIce);
      signaling.off('media-status', handleMediaStatus);
      signaling.off('leave', handleLeave);
    };
  }, [roomId, createPeerConnection, remotePeers]);

  return {
    isInRoom, localStream,
    remotePeers: Object.values(remotePeers),
    isMicOn, isCameraOn, isScreenSharing,
    joinRoom, leaveRoom, manualReconnect: () => {
        Object.values(peerConnections.current).forEach(pc => pc.restartIce());
    },
    toggleMic: () => {
        if(localAudioTrack.current) {
            localAudioTrack.current.enabled = !localAudioTrack.current.enabled;
            setIsMicOn(localAudioTrack.current.enabled);
            signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current.enabled);
        }
    },
    toggleCamera: () => {
        if(localVideoTrack.current) {
            localVideoTrack.current.enabled = !localVideoTrack.current.enabled;
            setIsCameraOn(localVideoTrack.current.enabled);
            signaling.sendMediaStatus(roomId, 'video', localVideoTrack.current.enabled);
        }
    },
    toggleScreenShare: () => {}
  };
};