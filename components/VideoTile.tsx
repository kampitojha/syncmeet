import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff, MessageSquare, AudioLines, User, Signal, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { useAudioLevel } from '../hooks/useAudioLevel';

interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  username?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isMirrored?: boolean; 
  isTyping?: boolean; 
  isScreenShare?: boolean;
  networkQuality?: number; 
  connectionState?: RTCIceConnectionState;
  reactions?: string[];
  statusMessage?: string; 
  onRetry?: () => void; // New prop
}

const VideoTile: React.FC<VideoTileProps> = ({ 
  stream, 
  isLocal = false, 
  username = "User",
  isAudioEnabled = true,
  isVideoEnabled = true,
  isMirrored = false,
  isTyping = false,
  isScreenShare = false,
  networkQuality = 4,
  connectionState = 'connected',
  reactions = [],
  statusMessage = '',
  onRetry
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioLevel = useAudioLevel(stream, isAudioEnabled ?? true);
  const isSpeaking = audioLevel > 5;
  const isReconnecting = connectionState === 'disconnected' || connectionState === 'failed' || connectionState === 'checking';
  const showRetry = connectionState === 'failed' || connectionState === 'disconnected' || statusMessage.includes("failed");

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.play().catch(e => console.error("Auto-play failed:", e));
    }
  }, [stream, isVideoEnabled]); 

  const shouldMirror = isScreenShare ? false : (isMirrored !== undefined ? isMirrored : isLocal);

  const getSignalColor = () => {
    if (networkQuality >= 4) return "text-green-500";
    if (networkQuality === 3) return "text-green-400";
    if (networkQuality === 2) return "text-yellow-400";
    return "text-red-500";
  };

  return (
    <div 
      className={`
        relative w-full h-full bg-gray-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300
        ${isSpeaking 
          ? 'ring-2 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]' 
          : 'ring-1 ring-white/10 hover:ring-white/20'
        }
      `}
    >
      
      {/* Video Content or Placeholder */}
      {stream && isVideoEnabled ? (
        <div className={`w-full h-full flex items-center justify-center ${isScreenShare ? 'bg-black' : ''}`}>
           <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} 
            className={`w-full h-full ${isScreenShare ? 'object-contain' : 'object-cover'} ${shouldMirror ? 'scale-x-[-1]' : ''}`}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-gray-900 animate-pulse" />
          
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={`
              relative h-28 w-28 rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-800
              ${isSpeaking ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 scale-105 transition-transform' : 'bg-gray-700'}
            `}>
              <span className="text-4xl font-bold text-white/90">
                {username.charAt(0).toUpperCase()}
              </span>
              {!isVideoEnabled && (
                  <div className="absolute bottom-0 right-0 bg-gray-800 p-2 rounded-full border border-gray-700 shadow-lg">
                      <VideoOff size={16} className="text-red-400" />
                  </div>
              )}
            </div>
            <span className="text-gray-400 text-sm font-medium tracking-wide">Camera Off</span>
          </div>
        </div>
      )}

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
         {reactions.map((emoji, i) => (
             <div key={i} className="absolute bottom-20 left-1/2 text-4xl animate-float-up" style={{ animationDelay: `${i * 100}ms` }}>
                 {emoji}
             </div>
         ))}
      </div>

      {/* Typing Indicator */}
      {isTyping && !isLocal && (
        <div className="absolute bottom-20 left-6 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-2xl rounded-bl-none text-xs font-semibold flex items-center gap-2 animate-bounce z-20 shadow-lg">
            <MessageSquare size={14} className="text-indigo-300 fill-current" />
            <span className="text-indigo-100">Typing...</span>
        </div>
      )}

      {/* Connection Status Overlay */}
      {statusMessage && !isLocal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center animate-fade-in">
             <div className="bg-gray-800/80 p-6 rounded-xl border border-white/10 flex flex-col items-center max-w-xs text-center">
                <Loader2 size={32} className="text-indigo-500 animate-spin mb-3" />
                <span className="text-white font-medium text-sm mb-4">{statusMessage}</span>
                {showRetry && onRetry && (
                    <button 
                        onClick={onRetry}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors pointer-events-auto"
                    >
                        <RefreshCw size={14} /> Retry Connection
                    </button>
                )}
             </div>
        </div>
      )}
      
      {/* Reconnecting Overlay (Native WebRTC State) */}
      {!statusMessage && isReconnecting && !isLocal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
            <WifiOff size={32} className="text-red-500 mb-2 animate-pulse" />
            <span className="text-white font-semibold">Connection Unstable</span>
        </div>
      )}

      {/* Bottom Overlay Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Info Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          {isSpeaking && !isLocal && (
               <AudioLines size={16} className="text-green-400 animate-pulse" />
          )}
          
          <span className={`text-sm font-semibold tracking-tight ${isSpeaking ? 'text-white' : 'text-gray-200'}`}>
            {username} {isLocal && <span className="text-gray-400 font-normal ml-1">(You)</span>}
          </span>
        </div>

        <div className="flex items-center gap-2">
            {!isLocal && (
                <div className="bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10" title="Network Quality">
                    <Signal size={16} className={getSignalColor()} />
                </div>
            )}
            {!isAudioEnabled && (
                <div className="bg-red-500/20 backdrop-blur-md p-2 rounded-full border border-red-500/30" title="Microphone Muted">
                    <MicOff size={16} className="text-red-400" />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;