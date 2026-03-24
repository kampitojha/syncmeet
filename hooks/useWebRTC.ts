import { useState, useRef, useCallback, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';

interface RemotePeer {
    id: string;
    userName: string;
    stream: MediaStream | null;
    isMicOn: boolean;
    isCameraOn: boolean;
    isHandRaised: boolean;
    isGlitching: boolean;
    isScreenSharing: boolean;
    connectionState: string;
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
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const localVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localAudioTrack = useRef<MediaStreamTrack | null>(null);

  const joinRoom = async () => {
    if (!roomId || !userName) return;
    setPermissionError(null);
    
    let stream: MediaStream | null = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 24, facingMode: 'user' }, 
            audio: { echoCancellation: true, noiseSuppression: true }
        });
    } catch (e) {
        console.warn("FULL_MEDIA_FAILED, TRYING_AUDIO_ONLY");
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsCameraOn(false);
        } catch (e2) {
            setIsCameraOn(false); setIsMicOn(false);
        }
    }

    if (stream) {
        localVideoTrack.current = stream.getVideoTracks()[0];
        localAudioTrack.current = stream.getAudioTracks()[0];
        setLocalStream(stream);
    }
    
    setIsInRoom(true);
    signaling.joinRoom(roomId, userName, stream);
  };

  const leaveRoom = useCallback(() => {
    signaling.leaveRoom();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    setRemotePeers({});
    setLocalStream(null);
    setIsInRoom(false);
  }, [localStream]);

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { cursor: 'always' } as any,
                audio: false 
            });
            const screenTrack = stream.getVideoTracks()[0];
            
            // Replace local track in all active calls
            Object.values((signaling as any).peers).forEach((peer: any) => {
                if (peer.connected && localVideoTrack.current) {
                    peer.replaceTrack(localVideoTrack.current, screenTrack, localStream);
                }
            });

            const newLocalStream = new MediaStream([screenTrack]);
            if (localAudioTrack.current) newLocalStream.addTrack(localAudioTrack.current);
            
            setLocalStream(newLocalStream);
            setIsScreenSharing(true);
            signaling.sendScreenShareStatus(roomId, true);

            screenTrack.onended = () => {
                stopScreenShare(screenTrack);
            };
        } catch (e) {
            console.error("SCREEN_SHARE_INIT_FAILED", e);
        }
    } else {
        const activeScreenTrack = localStream?.getVideoTracks()[0];
        if (activeScreenTrack) stopScreenShare(activeScreenTrack);
    }
  };

  const stopScreenShare = (screenTrack: MediaStreamTrack) => {
    screenTrack.stop();
    
    // Force a fresh track state
    if (localVideoTrack.current) {
        localVideoTrack.current.enabled = true; // Hard reset to active
    }

    const refreshedStream = new MediaStream();
    if (localVideoTrack.current) refreshedStream.addTrack(localVideoTrack.current);
    if (localAudioTrack.current) refreshedStream.addTrack(localAudioTrack.current);

    // Swap back for all remote peers
    Object.values((signaling as any).peers).forEach((peer: any) => {
        if (peer.connected && localVideoTrack.current) {
            try {
                peer.replaceTrack(screenTrack, localVideoTrack.current, refreshedStream);
            } catch (e) {
                console.error("PEER_RESTORE_FAIL", e);
            }
        }
    });
    
    setLocalStream(refreshedStream);
    setIsScreenSharing(false);
    setIsCameraOn(true); // Ensure UI matches the forced enabled state
    signaling.sendScreenShareStatus(roomId, false);
    signaling.sendMediaStatus(roomId, isMicOn, true);
  };

  useEffect(() => {
    const handleJoin = (p: SignalPayload) => {
        setRemotePeers(prev => {
            const existing = prev[p.senderId];
            return {
                ...prev,
                [p.senderId]: {
                    id: p.senderId, 
                    userName: p.payload.name || (existing?.userName) || 'User', 
                    stream: existing?.stream || null,
                    isMicOn: existing?.isMicOn ?? true, 
                    isCameraOn: existing?.isCameraOn ?? true, 
                    isHandRaised: existing?.isHandRaised ?? false, 
                    isGlitching: existing?.isGlitching ?? false,
                    isScreenSharing: existing?.isScreenSharing ?? false, 
                    connectionState: 'connected', 
                    isTyping: existing?.isTyping ?? false, 
                    networkQuality: existing?.networkQuality ?? 4
                }
            };
        });
    };

    const handleTrack = (p: { peerId: string, stream: MediaStream }) => {
        setRemotePeers(prev => {
            const existing = prev[p.peerId];
            if (!existing) {
                // If track arrives before join metadata, create placeholder
                return {
                    ...prev,
                    [p.peerId]: {
                        id: p.peerId,
                        userName: 'User',
                        stream: p.stream,
                        isMicOn: true,
                        isCameraOn: true,
                        isHandRaised: false,
                        isGlitching: false,
                        isScreenSharing: false,
                        connectionState: 'connected',
                        isTyping: false,
                        networkQuality: 4
                    }
                };
            }
            return {
                ...prev,
                [p.peerId]: { ...existing, stream: p.stream }
            };
        });
    };

    const handleLeave = (p: SignalPayload) => {
        setRemotePeers(prev => {
            const n = { ...prev };
            delete n[p.senderId];
            return n;
        });
    };

    const handleMediaStatus = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], [p.payload.kind === 'audio' ? 'isMicOn' : 'isCameraOn']: p.payload.enabled }
        } : prev);
    };

    const handleHandRaise = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], isHandRaised: p.payload.isRaised }
        } : prev);
    };

    const handleScreenStatus = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], isScreenSharing: p.payload.isScreenSharing }
        } : prev);
    };

    const handleTyping = (p: SignalPayload) => {
        setRemotePeers(prev => prev[p.senderId] ? {
            ...prev, [p.senderId]: { ...prev[p.senderId], isTyping: p.payload.isTyping }
        } : prev);
    };

    signaling.on('join', handleJoin);
    signaling.on('track_received', handleTrack);
    signaling.on('leave', handleLeave);
    signaling.on('media-status', handleMediaStatus);
    signaling.on('hand-raise', handleHandRaise);
    signaling.on('screen-status', handleScreenStatus);
    signaling.on('typing', handleTyping);

    return () => {
        signaling.off('join', handleJoin);
        signaling.off('track_received', handleTrack);
        signaling.off('leave', handleLeave);
        signaling.off('media-status', handleMediaStatus);
        signaling.off('hand-raise', handleHandRaise);
        signaling.off('screen-status', handleScreenStatus);
        signaling.off('typing', handleTyping);
    };
  }, [roomId]);

  return {
    isInRoom, localStream, remotePeers: Object.values(remotePeers),
    isMicOn, isCameraOn, isHandRaised, isGlitching, isScreenSharing,
    permissionError, setPermissionError,
    joinRoom, leaveRoom, manualReconnect: () => { signaling.joinRoom(roomId, userName, localStream); },
    toggleMic: () => { if(localAudioTrack.current) { localAudioTrack.current.enabled = !localAudioTrack.current.enabled; setIsMicOn(localAudioTrack.current.enabled); signaling.sendMediaStatus(roomId, 'audio', localAudioTrack.current.enabled); } },
    toggleCamera: () => { if(localVideoTrack.current) { localVideoTrack.current.enabled = !localVideoTrack.current.enabled; setIsCameraOn(localVideoTrack.current.enabled); setIsGlitching(true); setTimeout(() => setIsGlitching(false), 400); signaling.sendMediaStatus(roomId, 'video', localVideoTrack.current.enabled); } },
    toggleHandRaise: () => { const s = !isHandRaised; setIsHandRaised(s); signaling.sendHandRaise(roomId, s); },
    toggleScreenShare
  } as any;
};