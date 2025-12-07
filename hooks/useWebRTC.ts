import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

// Robust STUN config including Twilio as backup
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 0, 
};

export const useWebRTC = (roomId: string, userName: string) => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);
  
  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Remote Media State
  const [remoteIsMicOn, setRemoteIsMicOn] = useState(true);
  const [remoteIsCameraOn, setRemoteIsCameraOn] = useState(true);
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);

  // Connection State
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  const [networkQuality, setNetworkQuality] = useState<number>(4);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Refs
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const handshakeInterval = useRef<number | null>(null);
  
  // Logic Refs
  const remoteUserNameRef = useRef<string | null>(null);
  const isScreenSharingRef = useRef(false);

  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  // --- 1. Connection Core ---

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current && peerConnection.current.connectionState !== 'closed' && peerConnection.current.connectionState !== 'failed') {
        return peerConnection.current;
    }

    console.log("🛠️ Initializing PeerConnection");
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
         signaling.sendIceCandidate(roomId, 'broadcast', event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
        setConnectionState(pc.iceConnectionState);
        console.log("📶 Connection State:", pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'connected') {
            setStatusMessage('');
            if (handshakeInterval.current) {
                clearInterval(handshakeInterval.current);
                handshakeInterval.current = null;
            }
        } else if (pc.iceConnectionState === 'disconnected') {
            setStatusMessage('Reconnecting...');
            pc.restartIce();
        } else if (pc.iceConnectionState === 'failed') {
            setStatusMessage('Connection failed. Retrying...');
            startHandshake();
        }
    };

    pc.ontrack = (event) => {
      console.log("📹 Remote Stream Received");
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(prev => {
          if (prev?.id === stream.id) return prev; 
          return stream;
      });
    };

    if (localStream) {
        localStream.getTracks().forEach(track => {
            try { pc.addTrack(track, localStream); } catch(e) {}
        });
    }
    
    return pc;
  }, [roomId, localStream]);

  // --- 2. Negotiation Logic ---

  const startHandshake = useCallback(() => {
    if (handshakeInterval.current) clearInterval(handshakeInterval.current);
    
    console.log("👋 Starting Handshake...");
    setStatusMessage("Searching for peer...");
    
    signaling.joinRoom(roomId, userName);

    // Aggressive discovery: ping every 2s until connected
    handshakeInterval.current = window.setInterval(() => {
        if (peerConnection.current?.iceConnectionState === 'connected') {
            clearInterval(handshakeInterval.current!);
            return;
        }
        console.log("📡 Pinging room...");
        signaling.joinRoom(roomId, userName);
    }, 2000);

  }, [roomId, userName]);

  // --- 3. Main Actions ---

  const joinRoom = async () => {
    if (!roomId || !userName) return;

    try {
      // Use 480p for stability
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            frameRate: { ideal: 24 } 
        }, 
        audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true 
        }
      });
      
      localVideoTrack.current = stream.getVideoTracks()[0];
      localAudioTrack.current = stream.getAudioTracks()[0];

      setLocalStream(stream);
      setIsInRoom(true);
      
      startHandshake();
      
    } catch (err) {
      console.error("Media Error:", err);
      alert("Camera access denied. Check permissions.");
    }
  };

  const manualReconnect = () => {
      console.log("🔄 Manual Reconnect Triggered");
      if (peerConnection.current) {
          peerConnection.current.close();
          peerConnection.current = null;
      }
      setRemoteStream(null);
      startHandshake();
  };

  const leaveRoom = useCallback(() => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
    if (handshakeInterval.current) clearInterval(handshakeInterval.current);
    
    peerConnection.current = null;
    localVideoTrack.current = null;
    localAudioTrack.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsInRoom(false);
    setConnectionState('new');
    setStatusMessage('');
    signaling.leaveRoom(roomId);
  }, [roomId, localStream]);

  // --- 4. Signaling Event Handlers ---

  useEffect(() => {
    const handleJoin = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      if (payload.senderId === signaling.userId) return; 

      setRemoteUserName(payload.payload.name);
      remoteUserNameRef.current = payload.payload.name;
      
      // Found peer, stop pinging to reduce noise
      if (handshakeInterval.current) clearInterval(handshakeInterval.current);

      const isCaller = signaling.userId > payload.senderId;
      
      if (isCaller) {
        console.log("📞 I am Caller. Initiating...");
        setStatusMessage("Connecting...");
        
        const pc = createPeerConnection();
        
        // FIX: If we are already offering but connection isn't done, 
        // resend the offer! This fixes cases where the first offer was lost.
        if (pc.signalingState === 'have-local-offer') {
            console.log("⚠️ Resending lost offer...");
            if (pc.localDescription) {
                signaling.sendOffer(roomId, payload.senderId, pc.localDescription);
            }
            return;
        }

        if (pc.signalingState !== 'stable') return;

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.sendOffer(roomId, payload.senderId, offer);
        } catch (e) {
            console.error(e);
        }
      }
    };

    const handleOffer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("📩 Received Offer");
      
      const pc = createPeerConnection();
      
      // Glare handling
      if (pc.signalingState !== 'stable') {
           const amIPolite = signaling.userId < payload.senderId;
           if (!amIPolite) return; 
           
           await Promise.all([
             pc.setLocalDescription({type: "rollback"}),
             pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp))
           ]);
      } else {
           await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
      }

      while (iceCandidatesQueue.current.length > 0) {
          const c = iceCandidatesQueue.current.shift();
          if(c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(e=>{});
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signaling.sendAnswer(roomId, payload.senderId, answer);
    };

    const handleAnswer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("✅ Received Answer");
      const pc = peerConnection.current;
      if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
      }
    };

    const handleIceCandidate = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      const candidate = payload.payload.candidate;
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };
    
    const handleRestart = () => {
        manualReconnect();
    };

    signaling.on('join', handleJoin);
    signaling.on('offer', handleOffer);
    signaling.on('answer', handleAnswer);
    signaling.on('ice-candidate', handleIceCandidate);
    signaling.on('ice-restart', handleRestart);

    return () => {
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIceCandidate);
      signaling.off('ice-restart', handleRestart);
    };
  }, [roomId, createPeerConnection, manualReconnect]);

  return {
    isInRoom,
    localStream,
    remoteStream,
    isMicOn, isCameraOn, isScreenSharing,
    remoteUserName, remoteIsMicOn, remoteIsCameraOn, remoteIsScreenSharing,
    networkQuality, connectionState, statusMessage,
    joinRoom, leaveRoom, manualReconnect,
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
        if (!isScreenSharing) {
             try {
                const stream = await navigator.mediaDevices.getDisplayMedia({video:true});
                const track = stream.getVideoTracks()[0];
                screenTrackRef.current = track;
                if(peerConnection.current) {
                    const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                    if(sender) sender.replaceTrack(track);
                }
                setLocalStream(new MediaStream([track, localAudioTrack.current!]));
                setIsScreenSharing(true);
                track.onended = () => {
                     if(peerConnection.current && localVideoTrack.current) {
                        const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                        if(sender) sender.replaceTrack(localVideoTrack.current);
                    }
                    setLocalStream(new MediaStream([localVideoTrack.current!, localAudioTrack.current!]));
                    setIsScreenSharing(false);
                };
             } catch(e) {}
        } else {
             screenTrackRef.current?.stop();
             if(peerConnection.current && localVideoTrack.current) {
                const sender = peerConnection.current.getSenders().find(s => s.track?.kind === 'video');
                if(sender) sender.replaceTrack(localVideoTrack.current);
            }
            setLocalStream(new MediaStream([localVideoTrack.current!, localAudioTrack.current!]));
            setIsScreenSharing(false);
        }
    }
  };
};