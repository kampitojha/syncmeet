import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

// Robust STUN configuration with backups
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
  iceTransportPolicy: 'all'
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

  // Network & Connection State
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>('new');
  const [networkQuality, setNetworkQuality] = useState<number>(4); // 0-4 scale
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Refs
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const statsInterval = useRef<number | null>(null);
  const discoveryInterval = useRef<number | null>(null);
  const connectionTimeout = useRef<number | null>(null);
  
  // Logic Refs (to avoid useEffect dependency loops)
  const remoteUserNameRef = useRef<string | null>(null);
  const isScreenSharingRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Queue for ICE candidates received before remote description is set
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  // Update refs when state changes
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  // --- WebRTC Core ---

  const processIceQueue = useCallback(async () => {
    if (!peerConnection.current || !peerConnection.current.remoteDescription) return;
    
    console.log(`🧊 Processing ${iceCandidatesQueue.current.length} buffered ICE candidates`);
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding buffered ice candidate", e);
        }
      }
    }
  }, []);

  // --- Bitrate Adaptation ---
  const updateBitrate = (pc: RTCPeerConnection, quality: number) => {
    const senders = pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');
    if (!videoSender || !videoSender.track) return;
    const parameters = videoSender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
    }
    // Map quality (0-4) to Max Bitrate (bps)
    let maxBitrate = undefined;
    if (quality === 3) maxBitrate = 1500000;
    if (quality === 2) maxBitrate = 500000;
    if (quality === 1) maxBitrate = 250000;
    if (quality === 0) maxBitrate = 100000;
    parameters.encodings[0].maxBitrate = maxBitrate;
    videoSender.setParameters(parameters).catch(e => console.warn("Bitrate adaptation failed", e));
  };

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    console.log("🛠️ Creating new RTCPeerConnection");
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnection.current = pc;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
         signaling.sendIceCandidate(roomId, 'broadcast', event.candidate);
      }
    };

    // Handle Connection State
    pc.oniceconnectionstatechange = () => {
        setConnectionState(pc.iceConnectionState);
        console.log("🔄 ICE Connection State:", pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'connected') {
            setStatusMessage('');
            if (discoveryInterval.current) {
                clearInterval(discoveryInterval.current);
                discoveryInterval.current = null;
            }
            if (connectionTimeout.current) {
                clearTimeout(connectionTimeout.current);
                connectionTimeout.current = null;
            }
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            setStatusMessage('Connection unstable, retrying...');
            // Maybe restart ICE?
            if (pc.iceConnectionState === 'failed') {
               pc.restartIce();
            }
        }
    };

    // Handle Remote Stream (Robust Implementation)
    pc.ontrack = (event) => {
      console.log("📹 Received remote track:", event.track.kind);
      setRemoteStream(prevStream => {
        const newStream = prevStream ? new MediaStream(prevStream.getTracks()) : new MediaStream();
        if (!newStream.getTracks().find(t => t.id === event.track.id)) {
            newStream.addTrack(event.track);
        }
        return newStream;
      });
    };

    // Add Local Tracks
    const streamToSend = new MediaStream();
    if (localAudioTrack.current) {
        streamToSend.addTrack(localAudioTrack.current);
        pc.addTrack(localAudioTrack.current, streamToSend);
    }
    if (localVideoTrack.current) {
        streamToSend.addTrack(localVideoTrack.current);
        pc.addTrack(localVideoTrack.current, streamToSend);
    }
    
    return pc;
  }, [roomId, isInRoom]);

  const startDiscovery = useCallback(() => {
      if (discoveryInterval.current) clearInterval(discoveryInterval.current);
      
      console.log("📡 Starting Peer Discovery...");
      setStatusMessage("Searching for peer...");

      // Immediately announce
      signaling.joinRoom(roomId, userName);
      
      discoveryInterval.current = window.setInterval(() => {
          if (peerConnection.current?.iceConnectionState !== 'connected' && peerConnection.current?.iceConnectionState !== 'completed') {
             console.log("📡 Sending Heartbeat...");
             signaling.joinRoom(roomId, userName); 
          }
      }, 2000);
  }, [roomId, userName]);


  // --- Monitoring Loop ---
  useEffect(() => {
    if (!isInRoom) {
        if (statsInterval.current) window.clearInterval(statsInterval.current);
        return;
    }

    statsInterval.current = window.setInterval(async () => {
        if (!peerConnection.current || peerConnection.current.iceConnectionState !== 'connected') {
            setNetworkQuality(0);
            return;
        }
        try {
            const stats = await peerConnection.current.getStats();
            let rtt = 0;
            stats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    rtt = report.currentRoundTripTime || 0;
                }
            });
            let score = 4;
            if (rtt > 0.1) score = 3;
            if (rtt > 0.3) score = 2;
            if (rtt > 0.5) score = 1;
            setNetworkQuality(score);
            updateBitrate(peerConnection.current, score);
        } catch (e) {
            console.error("Error fetching stats:", e);
        }
    }, 2000);

    return () => {
        if (statsInterval.current) window.clearInterval(statsInterval.current);
    };
  }, [isInRoom]);

  // --- Actions ---

  const joinRoom = async () => {
    if (!roomId || !userName) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      localVideoTrack.current = stream.getVideoTracks()[0];
      localAudioTrack.current = stream.getAudioTracks()[0];
      localStreamRef.current = stream;

      setLocalStream(stream);
      setIsInRoom(true);
      
      try {
        signaling.joinRoom(roomId, userName);
        startDiscovery();
      } catch (signalErr) {
        console.error("Signaling failed to start:", signalErr);
        setStatusMessage("Signaling Server Error");
      }

    } catch (err) {
      console.error("Error accessing media:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  const leaveRoom = useCallback(() => {
    if (localVideoTrack.current) localVideoTrack.current.stop();
    if (localAudioTrack.current) localAudioTrack.current.stop();
    if (screenTrackRef.current) screenTrackRef.current.stop();

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    signaling.leaveRoom(roomId);
    
    localVideoTrack.current = null;
    localAudioTrack.current = null;
    screenTrackRef.current = null;
    localStreamRef.current = null;
    iceCandidatesQueue.current = [];
    
    if (discoveryInterval.current) {
        clearInterval(discoveryInterval.current);
        discoveryInterval.current = null;
    }
    if (statsInterval.current) clearInterval(statsInterval.current);
    if (connectionTimeout.current) clearTimeout(connectionTimeout.current);

    setLocalStream(null);
    setRemoteStream(null);
    setIsInRoom(false);
    setRemoteUserName(null);
    remoteUserNameRef.current = null;
    setConnectionState('new');
    setNetworkQuality(4);
    setStatusMessage('');
    
    setIsScreenSharing(false);
    setIsCameraOn(true);
    setIsMicOn(true);
  }, [roomId]);

  const toggleMic = useCallback(() => {
    if (localAudioTrack.current) {
      const enabled = !isMicOn;
      localAudioTrack.current.enabled = enabled;
      setIsMicOn(enabled);
      signaling.sendMediaStatus(roomId, 'audio', enabled);
    }
  }, [isMicOn, roomId]);

  const toggleCamera = useCallback(() => {
    if (localVideoTrack.current) {
      const enabled = !isCameraOn;
      localVideoTrack.current.enabled = enabled;
      setIsCameraOn(enabled);
      if (!isScreenSharing) {
        signaling.sendMediaStatus(roomId, 'video', enabled);
      }
    }
  }, [isCameraOn, roomId, isScreenSharing]);

  const stopScreenSharing = useCallback(() => {
    if (!screenTrackRef.current) return;
    screenTrackRef.current.stop();
    screenTrackRef.current = null;

    if (peerConnection.current && localVideoTrack.current) {
        const senders = peerConnection.current.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) videoSender.replaceTrack(localVideoTrack.current);
    }
    if (localVideoTrack.current && localAudioTrack.current) {
        setLocalStream(new MediaStream([localVideoTrack.current, localAudioTrack.current]));
    }
    setIsScreenSharing(false);
    signaling.sendScreenShareStatus(roomId, false);
    if (localVideoTrack.current) signaling.sendMediaStatus(roomId, 'video', localVideoTrack.current.enabled);
  }, [roomId]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenSharing();
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        if (peerConnection.current) {
            const senders = peerConnection.current.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) videoSender.replaceTrack(screenTrack);
        }
        setLocalStream(new MediaStream([screenTrack, localAudioTrack.current!]));
        
        screenTrack.onended = () => stopScreenSharing();

        setIsScreenSharing(true);
        signaling.sendMediaStatus(roomId, 'video', true);
        signaling.sendScreenShareStatus(roomId, true);
      } catch (err) {
        console.error("Error sharing screen", err);
      }
    }
  }, [isScreenSharing, stopScreenSharing, roomId]);

  // --- Signaling Effects ---

  useEffect(() => {
    const handleJoin = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      if (payload.senderId === signaling.userId) return; 

      console.log("👋 Peer discovered:", payload.payload.name);
      
      setRemoteUserName(payload.payload.name);
      remoteUserNameRef.current = payload.payload.name;
      setStatusMessage("Connecting to peer...");

      // Send our status
      signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current?.enabled ?? true);
      signaling.sendMediaStatus(roomId, 'video', isScreenSharingRef.current ? true : (localVideoTrack.current?.enabled ?? true));
      signaling.sendScreenShareStatus(roomId, isScreenSharingRef.current);

      // --- TIE BREAKER LOGIC ---
      const myId = signaling.userId;
      const remoteId = payload.senderId;
      const isCaller = myId > remoteId;

      if (isCaller) {
        const pc = createPeerConnection();
        // Strict check to prevent race conditions or re-offers on active connections
        const canOffer = pc && 
                         (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') &&
                         (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed');

        if (canOffer) {
            console.log("📞 I am the Caller. Sending offer.");
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                signaling.sendOffer(roomId, payload.senderId, offer);
            } catch (e) {
                console.error("Error creating offer:", e);
            }
        }
      }
    };

    const handleOffer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("📩 Received Offer");
      setStatusMessage("Negotiating connection...");
      
      if (!remoteUserNameRef.current) {
          setRemoteUserName("Peer");
          remoteUserNameRef.current = "Peer";
      }

      signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current?.enabled ?? true);
      signaling.sendMediaStatus(roomId, 'video', isScreenSharingRef.current ? true : (localVideoTrack.current?.enabled ?? true));

      const pc = createPeerConnection();
      if (pc) {
        try {
            // Handle Glare: If we have a local offer but receive a remote offer
            if (pc.signalingState !== 'stable') {
                console.warn("⚠️ Signaling Glare detected. Rolling back local description.");
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
            console.log("📨 Sending Answer");
            signaling.sendAnswer(roomId, payload.senderId, answer);
        } catch(e) {
            console.error("Error handling offer:", e);
        }
      }
    };

    const handleAnswer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("📩 Received Answer");
      if (peerConnection.current) {
        try {
            if (peerConnection.current.signalingState === 'have-local-offer') {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.payload.sdp));
                await processIceQueue();
            }
        } catch (e) {
            console.error("Error setting remote description (Answer):", e);
        }
      }
    };

    const handleIceCandidate = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      const candidate = payload.payload.candidate;
      if (peerConnection.current && peerConnection.current.remoteDescription) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      } else {
        iceCandidatesQueue.current.push(candidate);
      }
    };

    const handleRemoteLeave = (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      console.log("👋 Remote Peer Left");
      setRemoteUserName(null);
      remoteUserNameRef.current = null;
      setRemoteStream(null);
      setConnectionState('disconnected');
      setStatusMessage("Peer left. Waiting...");

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      iceCandidatesQueue.current = [];
      if (!discoveryInterval.current && isInRoom) startDiscovery();
    };

    const handleMediaStatus = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const { kind, enabled } = payload.payload;
        if (kind === 'audio') setRemoteIsMicOn(enabled);
        if (kind === 'video') setRemoteIsCameraOn(enabled);
    };

    const handleScreenShareStatus = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const { isScreenSharing } = payload.payload;
        setRemoteIsScreenSharing(isScreenSharing);
        if (isScreenSharing) setRemoteIsCameraOn(true);
    };

    // Attach Listeners
    signaling.on('join', handleJoin);
    signaling.on('offer', handleOffer);
    signaling.on('answer', handleAnswer);
    signaling.on('ice-candidate', handleIceCandidate);
    signaling.on('leave', handleRemoteLeave);
    signaling.on('media-status', handleMediaStatus);
    signaling.on('screen-share-status', handleScreenShareStatus);
    signaling.on('peer-joined', (data: any) => console.log("Peer joined via signaling event", data));

    return () => {
      // Detach Listeners
      signaling.off('join', handleJoin);
      signaling.off('offer', handleOffer);
      signaling.off('answer', handleAnswer);
      signaling.off('ice-candidate', handleIceCandidate);
      signaling.off('leave', handleRemoteLeave);
      signaling.off('media-status', handleMediaStatus);
      signaling.off('screen-share-status', handleScreenShareStatus);
    };
  }, [roomId, createPeerConnection, processIceQueue, isInRoom, startDiscovery]);

  return {
    isInRoom,
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    remoteUserName,
    remoteIsMicOn,
    remoteIsCameraOn,
    remoteIsScreenSharing,
    networkQuality,
    connectionState,
    statusMessage,
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare
  };
};