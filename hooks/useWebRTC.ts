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
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Mesh Refs
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueues = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
  const handshakeInterval = useRef<number | null>(null);

  // --- Utility: Set Bitrate Limit for Stability ---
  const setBitrateLimit = async (pc: RTCPeerConnection, maxBitrate: number) => {
    const senders = pc.getSenders();
    for (const sender of senders) {
        if (sender.track?.kind === 'video') {
            const parameters = sender.getParameters();
            if (!parameters.encodings) parameters.encodings = [{}];
            parameters.encodings[0].maxBitrate = maxBitrate;
            try {
                await sender.setParameters(parameters);
                console.log(`📉 Bitrate set to ${maxBitrate/1000}kbps`);
            } catch (e) {
                console.warn("Bitrate adjustment failed:", e);
            }
        }
    }
  };

  // --- Connection Core ---
  const createPeerConnection = useCallback((peerId: string) => {
    if (peerConnections.current[peerId]) {
        return peerConnections.current[peerId];
    }

    console.log(`🛠️ Connecting to Peer: ${peerId}`);
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerId] = pc;

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
        
        if (pc.iceConnectionState === 'failed') {
            console.warn(`❌ Peer ${peerId} failed, re-negotiating...`);
            pc.restartIce();
        }
    };

    pc.ontrack = (event) => {
      console.log(`📹 Remote Stream from ${peerId}`);
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemotePeers(prev => ({
          ...prev,
          [peerId]: { ...prev[peerId], stream: stream }
      }));
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
        });
    }
    
    return pc;
  }, [roomId, localStream]);

  // --- Handshake ---
  const startHandshake = useCallback(() => {
    if (handshakeInterval.current) clearInterval(handshakeInterval.current);
    signaling.joinRoom(roomId, userName);
    handshakeInterval.current = window.setInterval(() => {
        signaling.joinRoom(roomId, userName);
    }, 1500); 
  }, [roomId, userName]);

  // --- Main Actions ---
  const joinRoom = async () => {
    if (!roomId || !userName) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 24 }, // Locked high-stability res
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      localVideoTrack.current = stream.getVideoTracks()[0];
      localAudioTrack.current = stream.getAudioTracks()[0];
      setLocalStream(stream);
      setIsInRoom(true);
      startHandshake();
    } catch (err) {
      console.error("Media Error:", err);
      alert("System access required for protocol.");
    }
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

      // Initialize peer object if not exists
      if (!remotePeers[payload.senderId]) {
          setRemotePeers(prev => ({
              ...prev,
              [payload.senderId]: {
                  id: payload.senderId,
                  userName: payload.payload.name || "PEER-02",
                  stream: null,
                  isMicOn: true,
                  isCameraOn: true,
                  isScreenSharing: false,
                  connectionState: 'new',
                  isTyping: false,
                  networkQuality: 4
              }
          }));
      }

      const isCaller = signaling.userId > payload.senderId;
      if (isCaller) {
        const pc = createPeerConnection(payload.senderId);
        if (pc.signalingState !== 'stable') return;
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.sendOffer(roomId, payload.senderId, offer);
            // Limit outbound bitrate to 500kbps per peer for stability
            await setBitrateLimit(pc, 500000);
        } catch (e) { console.error(e); }
      }
    };

    const handleOffer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId || payload.payload.targetUserId !== signaling.userId) return;
      const pc = createPeerConnection(payload.senderId);
      
      if (pc.signalingState !== 'stable') {
           if (signaling.userId > payload.senderId) return; // Wait for rollback
           await pc.setLocalDescription({type: "rollback"});
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
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
      }
    };

    const handleIce = (payload: SignalPayload) => {
      const pc = peerConnections.current[payload.senderId];
      if (pc && pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(payload.payload.candidate)).catch(e => {});
      }
    };

    const handleMediaStatus = (payload: SignalPayload) => {
        setRemotePeers(prev => ({
            ...prev,
            [payload.senderId]: {
                ...prev[payload.senderId],
                [payload.payload.kind === 'audio' ? 'isMicOn' : 'isCameraOn']: payload.payload.enabled
            }
        }));
    };

    const handleTyping = (payload: SignalPayload) => {
        setRemotePeers(prev => ({
            ...prev,
            [payload.senderId]: { ...prev[payload.senderId], isTyping: payload.payload.isTyping }
        }));
    };

    const handleLeave = (payload: SignalPayload) => {
        const peerId = payload.payload.senderId;
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
    signaling.on('typing', handleTyping);
    signaling.on('leave', handleLeave);

    return () => {
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIce);
      signaling.off('media-status', handleMediaStatus);
      signaling.off('typing', handleTyping);
      signaling.off('leave', handleLeave);
    };
  }, [roomId, createPeerConnection, remotePeers]);

  return {
    isInRoom,
    localStream,
    remotePeers: Object.values(remotePeers),
    isMicOn, isCameraOn, isScreenSharing,
    statusMessage,
    joinRoom, leaveRoom, manualReconnect: () => {},
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
    toggleScreenShare: async () => {
        // Simple screen share trigger (requires mesh sender update logic)
        alert("SCREEN_SHARE_FEATURE: Mesh-Optimization in Progress.");
    }
  };
};