import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

// Simple Google STUN servers are usually enough for 1:1
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 2, // Reduced pool size to save resources
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
  
  // Logic Refs
  const remoteUserNameRef = useRef<string | null>(null);
  const isScreenSharingRef = useRef(false);
  const isNegotiating = useRef(false); // CRITICAL: Prevents loop
  const didOffer = useRef(false); // CRITICAL: Ensures we only offer once per session

  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  // --- WebRTC Core ---

  const processIceQueue = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) { console.warn(e); }
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    console.log("🛠️ Creating RTCPeerConnection");
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
         signaling.sendIceCandidate(roomId, 'broadcast', event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
        setConnectionState(pc.iceConnectionState);
        console.log("STATE:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
            setStatusMessage('');
        } else if (pc.iceConnectionState === 'disconnected') {
            setStatusMessage('Reconnecting...');
        }
    };

    pc.ontrack = (event) => {
      console.log("📹 Track Received");
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(prev => {
          // Force refresh stream ref to ensure UI updates
          if (prev?.id === stream.id) return prev; 
          return stream;
      });
    };

    // Add Local Tracks
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
    
    return pc;
  }, [roomId, localStream]);

  // --- Actions ---

  const joinRoom = async () => {
    if (!roomId || !userName) return;

    try {
      // Requested 720p for stability/lower lag
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }, 
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      localVideoTrack.current = stream.getVideoTracks()[0];
      localAudioTrack.current = stream.getAudioTracks()[0];

      setLocalStream(stream);
      setIsInRoom(true);
      setStatusMessage("Waiting for peer...");
      
      signaling.joinRoom(roomId, userName);
      
    } catch (err) {
      console.error("Media Error:", err);
      alert("Camera access denied or unavailable.");
    }
  };

  const leaveRoom = useCallback(() => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (peerConnection.current) peerConnection.current.close();
    
    peerConnection.current = null;
    localVideoTrack.current = null;
    localAudioTrack.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsInRoom(false);
    setConnectionState('new');
    setStatusMessage('');
    signaling.leaveRoom(roomId);
    
    // Reset Logic Refs
    isNegotiating.current = false;
    didOffer.current = false;
  }, [roomId, localStream]);

  // --- Signaling Effects ---

  useEffect(() => {
    const handleJoin = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      if (payload.senderId === signaling.userId) return; 

      setRemoteUserName(payload.payload.name);
      remoteUserNameRef.current = payload.payload.name;
      
      // Tie-Breaker: Deterministic Caller Selection
      const isCaller = signaling.userId > payload.senderId;
      
      // Only the winner calls, and only if we haven't already
      if (isCaller && !didOffer.current) {
        console.log("📞 I am Caller. Creating Offer.");
        setStatusMessage("Connecting...");
        
        const pc = createPeerConnection();
        isNegotiating.current = true;
        didOffer.current = true; // Mark as done so we don't spam

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signaling.sendOffer(roomId, payload.senderId, offer);
        } catch (e) {
            console.error(e);
            isNegotiating.current = false;
        }
      }
    };

    const handleOffer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("📩 Received Offer");
      
      const pc = createPeerConnection();
      
      // If we are colliding (both sent offer), and I am the smaller ID, I yield
      if (peerConnection.current?.signalingState !== 'stable') {
          console.warn("⚠️ Collision detected. Handling...");
           // In a simple 1:1, usually just overwriting works if we are polite
           await Promise.all([
               pc.setLocalDescription({type: "rollback"}),
               pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp))
           ]);
      } else {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
      }

      await processIceQueue();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signaling.sendAnswer(roomId, payload.senderId, answer);
      setStatusMessage("");
    };

    const handleAnswer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("✅ Received Answer");
      const pc = peerConnection.current;
      if (pc && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
          await processIceQueue();
          setStatusMessage("");
      }
    };

    const handleIceCandidate = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      const candidate = payload.payload.candidate;
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => {});
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };

    const handleLeavePeer = () => {
        setRemoteStream(null);
        setRemoteUserName(null);
        setStatusMessage("Peer left");
        if(peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        didOffer.current = false; // Reset so we can connect again
    };

    // Listeners
    signaling.on('join', handleJoin);
    signaling.on('offer', handleOffer);
    signaling.on('answer', handleAnswer);
    signaling.on('ice-candidate', handleIceCandidate);
    signaling.on('leave', handleLeavePeer);

    return () => {
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIceCandidate);
      signaling.off('leave', handleLeavePeer);
    };
  }, [roomId, createPeerConnection, processIceQueue]);

  return {
    isInRoom,
    localStream,
    remoteStream,
    isMicOn, isCameraOn, isScreenSharing,
    remoteUserName, remoteIsMicOn, remoteIsCameraOn, remoteIsScreenSharing,
    networkQuality, connectionState, statusMessage,
    joinRoom, leaveRoom,
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
        // ... (Screen share logic remains similar, simplified for brevity here)
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
                    // Revert logic
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