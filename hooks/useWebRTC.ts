import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

// STUN configuration
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10,
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

  // Refs
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const statsInterval = useRef<number | null>(null);
  const discoveryInterval = useRef<number | null>(null);
  
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
        console.log("ICE Connection State:", pc.iceConnectionState);
        
        // Stop discovery if connected
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            if (discoveryInterval.current) {
                clearInterval(discoveryInterval.current);
                discoveryInterval.current = null;
            }
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
            // If failed, maybe restart discovery?
            if (!discoveryInterval.current && isInRoom) {
               startDiscovery();
            }
        }
    };

    // Handle Remote Stream (Robust Implementation)
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      
      setRemoteStream(prevStream => {
        const newStream = prevStream ? new MediaStream(prevStream.getTracks()) : new MediaStream();
        if (!newStream.getTracks().find(t => t.id === event.track.id)) {
            newStream.addTrack(event.track);
        }
        return newStream;
      });
    };

    // Add Local Tracks using addTrack (Standard WebRTC)
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
      
      // Immediately announce
      try {
        signaling.joinRoom(roomId, userName);
      } catch (e) {
        console.warn("Initial discovery announcement failed", e);
      }
      
      discoveryInterval.current = window.setInterval(() => {
          if (peerConnection.current?.iceConnectionState !== 'connected' && peerConnection.current?.iceConnectionState !== 'completed') {
             try {
                signaling.joinRoom(roomId, userName); // Re-broadcast join
             } catch (e) {
                 console.warn("Discovery heartbeat failed, retrying...", e);
             }
          }
      }, 3000);
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

            // Calculate Quality Score
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
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      localVideoTrack.current = videoTrack;
      localAudioTrack.current = audioTrack;
      localStreamRef.current = stream;

      setLocalStream(stream);
      setIsInRoom(true);
      
      // Initialize Signaling and start Heartbeat
      try {
        signaling.joinRoom(roomId, userName);
        startDiscovery();
      } catch (signalErr) {
        console.error("Signaling failed to start:", signalErr);
        // We still keep the user in the room locally so they can retry or see themselves
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
    if (statsInterval.current) {
        clearInterval(statsInterval.current);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setIsInRoom(false);
    setRemoteUserName(null);
    remoteUserNameRef.current = null;
    setConnectionState('new');
    setNetworkQuality(4);
    
    setIsScreenSharing(false);
    setIsCameraOn(true);
    setIsMicOn(true);
    
    setRemoteIsMicOn(true);
    setRemoteIsCameraOn(true);
    setRemoteIsScreenSharing(false);
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
        if (videoSender) {
            videoSender.replaceTrack(localVideoTrack.current);
        }
    }

    if (localVideoTrack.current && localAudioTrack.current) {
        const newStream = new MediaStream([localVideoTrack.current, localAudioTrack.current]);
        setLocalStream(newStream);
    }

    setIsScreenSharing(false);
    signaling.sendScreenShareStatus(roomId, false);
    
    if (localVideoTrack.current) {
        signaling.sendMediaStatus(roomId, 'video', localVideoTrack.current.enabled);
    }
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
            if (videoSender) {
                videoSender.replaceTrack(screenTrack);
            }
        }

        if (localAudioTrack.current) {
            const newStream = new MediaStream([screenTrack, localAudioTrack.current]);
            setLocalStream(newStream);
        } else {
             setLocalStream(new MediaStream([screenTrack]));
        }

        screenTrack.onended = () => {
           stopScreenSharing();
        };

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

      console.log("Peer discovered:", payload.payload.name);
      
      // Update UI state but don't depend on it
      setRemoteUserName(payload.payload.name);
      remoteUserNameRef.current = payload.payload.name;
      
      signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current?.enabled ?? true);
      signaling.sendMediaStatus(roomId, 'video', isScreenSharingRef.current ? true : (localVideoTrack.current?.enabled ?? true));
      signaling.sendScreenShareStatus(roomId, isScreenSharingRef.current);

      // --- TIE BREAKER LOGIC ---
      const myId = signaling.userId;
      const remoteId = payload.senderId;
      const isCaller = myId > remoteId;

      if (isCaller) {
        const pc = createPeerConnection();
        // Check if we can/should start a connection
        const canOffer = pc && 
                         pc.signalingState === 'stable' && 
                         pc.iceConnectionState !== 'connected' && 
                         pc.iceConnectionState !== 'completed';

        if (canOffer) {
            console.log("I am the Caller. sending offer.");
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
      if (!remoteUserNameRef.current) {
          setRemoteUserName("Peer");
          remoteUserNameRef.current = "Peer";
      }

      signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current?.enabled ?? true);
      signaling.sendMediaStatus(roomId, 'video', isScreenSharingRef.current ? true : (localVideoTrack.current?.enabled ?? true));
      signaling.sendScreenShareStatus(roomId, isScreenSharingRef.current);

      const pc = createPeerConnection();
      if (pc) {
        try {
            // Rollback if we were trying to be the caller but lost connection or state is weird
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
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
        } catch(e) {
            console.error("Error handling offer:", e);
        }
      }
    };

    const handleAnswer = async (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
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
      
      setRemoteUserName(null);
      remoteUserNameRef.current = null;
      setRemoteStream(null);
      setRemoteIsMicOn(true);
      setRemoteIsCameraOn(true);
      setRemoteIsScreenSharing(false);
      setNetworkQuality(4);
      setConnectionState('disconnected');

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      iceCandidatesQueue.current = [];
      
      // If remote left, restart discovery to wait for them (or someone else) to come back
      if (!discoveryInterval.current && isInRoom) {
          startDiscovery();
      }
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
    joinRoom,
    leaveRoom,
    toggleMic,
    toggleCamera,
    toggleScreenShare
  };
};