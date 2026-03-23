import React, { useEffect, useRef } from 'react';
import { MicOff, VideoOff, MessageSquare, AudioLines, RefreshCw, Signal, WifiOff } from 'lucide-react';
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
  onRetry?: () => void;
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
        relative w-full h-full bg-white overflow-hidden transition-all duration-100
        ${isSpeaking 
          ? 'border-[8px] md:border-[12px] border-[#ffdf00] z-10' 
          : 'border-[4px] md:border-[6px] border-black'
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
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f0f0] relative overflow-hidden group">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '10px 10px' }} />
          
          <div className="relative z-10 flex flex-col items-center gap-4 md:gap-6">
            <div className={`
              relative h-20 w-20 md:h-32 md:w-32 flex items-center justify-center border-[4px] md:border-[6px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              ${isSpeaking ? 'bg-[#ffdf00]' : 'bg-white'}
            `}>
              <span className="text-4xl md:text-6xl font-black text-black italic -skew-x-6">
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="bg-black text-[#ffdf00] px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-widest italic -skew-x-2">
                SIGNAL_LOSS: CAM_DISABLED
            </div>
          </div>
        </div>
      )}

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
         {reactions.map((emoji, i) => (
             <div key={i} className="absolute bottom-16 md:bottom-20 left-1/2 text-4xl md:text-6xl animate-float-up drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]" style={{ animationDelay: `${i * 100}ms` }}>
                 {emoji}
             </div>
         ))}
      </div>

      {/* Typing Indicator */}
      {isTyping && !isLocal && (
        <div className="absolute bottom-16 md:bottom-24 left-4 md:left-8 bg-[#ffdf00] border-2 md:border-4 border-black text-black px-2 md:px-4 py-1 md:py-2 text-[10px] md:text-sm font-black uppercase italic -skew-x-12 z-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            <span className="flex items-center gap-1 md:gap-2">
                <MessageSquare size={12} strokeWidth={3} className="md:w-4 md:h-4 w-3 h-3" /> {username}_ISO_TYPING
            </span>
        </div>
      )}

      {/* Connection Status Overlay */}
      {statusMessage && !isLocal && (
        <div className="absolute inset-0 bg-[#ffdf00]/90 z-30 flex flex-col items-center justify-center p-4">
             <div className="bg-white p-6 md:p-8 border-[4px] md:border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center max-w-sm text-center">
                <div className="bg-black p-3 md:p-4 mb-4 md:mb-6 leading-none">
                    <RefreshCw size={32} strokeWidth={3} className="text-[#ffdf00] animate-spin md:w-10 md:h-10 w-8 h-8" />
                </div>
                <span className="text-black font-black text-lg md:text-xl uppercase italic mb-4 md:mb-6 leading-tight">{statusMessage}</span>
                {showRetry && onRetry && (
                    <button 
                        onClick={onRetry}
                        className="brut-btn px-6 md:px-8 py-2 md:py-3 text-sm md:text-lg flex items-center justify-center gap-2 md:gap-3 w-full"
                    >
                        RE_SYNC_PROTOCOL
                    </button>
                )}
             </div>
        </div>
      )}
      
      {/* Reconnecting Overlay (Native WebRTC State) */}
      {!statusMessage && isReconnecting && !isLocal && (
        <div className="absolute inset-x-0 top-0 bg-red-500 border-b-4 border-black py-2 px-4 flex items-center justify-center gap-4 z-40 overflow-hidden">
            <div className="whitespace-nowrap flex animate-infinite-scroll">
                 <span className="mx-4 font-black text-sm uppercase italic text-white flex items-center gap-2">
                    <WifiOff size={14} strokeWidth={3} /> NETWORK_UNSTABLE_RECONNECTING_
                 </span>
                 <span className="mx-4 font-black text-sm uppercase italic text-white flex items-center gap-2">
                    <WifiOff size={14} strokeWidth={3} /> NETWORK_UNSTABLE_RECONNECTING_
                 </span>
            </div>
        </div>
      )}

      {/* Info Bar */}
      <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 right-4 md:right-6 flex items-end justify-between z-10 pointer-events-none">
        <div className="flex flex-col gap-1 md:gap-2">
            <div className={`p-2 md:p-3 border-[3px] md:border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 md:gap-3 ${isSpeaking ? 'bg-[#ffdf00]' : 'bg-white'}`}>
                {isSpeaking && !isLocal && (
                    <AudioLines size={16} strokeWidth={3} className="text-black animate-pulse md:w-5 md:h-5 w-4 h-4" />
                )}
                <span className="text-sm md:text-lg font-black text-black uppercase italic tracking-tighter">
                    {username} {isLocal && <span className="opacity-50 NOT_ITALIC font-bold ml-1 text-[10px] md:text-sm">(LOCAL)</span>}
                </span>
            </div>
            
            {isScreenShare && (
                <div className="bg-black text-[#ffdf00] px-1.5 md:px-2 py-0.5 text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] w-fit">
                    BROADCASTING_SCREEN_MODE
                </div>
            )}
        </div>

        <div className="flex flex-col gap-1.5 md:gap-2 pointer-events-auto">
            {!isLocal && (
                <div className="bg-white border-[3px] md:border-4 border-black p-1.5 md:p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" title="SIGNAL QUALITY">
                    <Signal size={16} strokeWidth={3} className={`${getSignalColor().replace('text-', 'stroke-')} md:w-5 md:h-5 w-4 h-4`} />
                </div>
            )}
            {!isAudioEnabled && (
                <div className="bg-red-500 border-[3px] md:border-4 border-black p-1.5 md:p-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" title="MUTE_ACTIVE">
                    <MicOff size={16} strokeWidth={3} className="text-white md:w-5 md:h-5 w-4 h-4" />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;