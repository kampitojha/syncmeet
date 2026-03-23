import React, { useEffect, useRef } from 'react';
import { 
  MicOff, 
  VideoOff, 
  MessageSquare, 
  AudioLines, 
  RefreshCw, 
  Signal, 
  WifiOff,
  User,
  Hand,
  Activity,
  Terminal,
  Maximize2
} from 'lucide-react';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { VideoTileProps } from '../types';

const VideoTile: React.FC<VideoTileProps> = ({ 
    stream, 
    isLocal = false, 
    username = "User",
    isAudioEnabled = true,
    isVideoEnabled = true,
    isHandRaised = false,
    isGlitching = false,
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
        relative w-full h-full bg-white overflow-hidden transition-all duration-300
        ${isSpeaking 
          ? 'border-[8px] md:border-[12px] border-[#ffdf00] z-10' 
          : 'border-[4px] md:border-[6px] border-black'
        }
        ${isHandRaised ? 'shadow-[0px_0px_50px_rgba(255,223,0,0.5)]' : 'shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]'}
        ${isGlitching ? 'animate-glitch' : ''}
      `}
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Hand Raise Overlay */}
      {isHandRaised && (
          <div className="absolute top-4 right-4 z-[40] animate-bounce">
              <div className="bg-[#ffdf00] p-3 md:p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
                  <Hand size={24} fill="currentColor" className="text-black" />
                  <span className="font-black uppercase text-xs md:text-sm italic">REQUESTING_SPEECH</span>
              </div>
          </div>
      )}

      {/* Video Content */}
      <div className={`w-full h-full flex items-center justify-center ${isScreenShare ? 'bg-black' : ''}`}>
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} 
            className={`
                w-full h-full transition-transform duration-500
                ${isScreenShare ? 'object-contain' : 'object-cover'} 
                ${shouldMirror ? 'scale-x-[-1]' : ''}
                ${!isVideoEnabled ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
                ${isGlitching ? 'grayscale invert' : ''}
            `}
        />
      </div>

      {/* Placeholder for Cam Off */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in bg-[#f0f0f0]">
          <div className="relative">
            <div className={`h-24 w-24 md:h-40 md:w-40 bg-[#ffdf00] border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center -rotate-3`}>
              <User size={64} md:size={96} strokeWidth={3} className="text-black" />
            </div>
            {isSpeaking && !isLocal && (
               <div className="absolute -inset-4 border-4 border-black animate-ping opacity-20" />
            )}
          </div>
          <div className="mt-8 bg-black text-[#ffdf00] px-4 py-2 flex items-center gap-3 italic font-black uppercase text-xs md:text-sm">
             <VideoOff size={20} className="text-[#ffdf00]" /> SIGNAL_LOSS: CAM_DISABLED
          </div>
          {isHandRaised && (
              <div className="mt-4 bg-[#ffdf00] text-black px-4 py-1 border-2 border-black font-black uppercase text-xs">AWAITING_PROTO_ACK</div>
          )}
        </div>
      )}

      {/* Typing Indicator */}
      {isTyping && !isLocal && (
        <div className="absolute bottom-24 md:bottom-32 left-4 md:left-8 bg-[#ffdf00] border-4 border-black text-black px-4 py-2 text-sm font-black uppercase italic -skew-x-12 z-20 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            <span className="flex items-center gap-2">
                <Terminal size={14} strokeWidth={3} /> {username}_TRANSMITTING_SYSTEM_INFO
            </span>
        </div>
      )}

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden">
        {reactions.map((emoji, i) => (
           <div 
             key={i} 
             className="absolute bottom-0 text-4xl md:text-6xl animate-float-up opacity-0 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]"
             style={{ left: `${Math.random() * 80 + 10}%`, animationDelay: `${i * 0.1}s` }}
           >
             {emoji}
           </div>
        ))}
      </div>

      {/* Info Overlay (Negotiating/Lost) */}
      {statusMessage && !isLocal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-6 text-center">
            <div className="bg-white border-[6px] border-black p-8 shadow-[12px_12px_0px_0px_rgba(255,223,0,1)] max-w-sm w-full">
              <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4">
                 <RefreshCw size={32} className="text-black animate-spin" strokeWidth={3} />
                 <span className="font-black text-lg md:text-xl uppercase italic -skew-x-6">RECONNECTING_PROTOCOL</span>
              </div>
              <p className="font-bold text-xs text-black uppercase mb-6 leading-tight">{statusMessage}</p>
              {onRetry && (
                 <button 
                  onClick={onRetry}
                  className="w-full bg-[#ffdf00] border-4 border-black py-4 font-black uppercase text-sm hover:bg-black hover:text-[#ffdf00] transition-colors"
                 >
                  RESET_CRYPTO_LINK_
                 </button>
              )}
           </div>
        </div>
      )}

      {/* Info Indicators */}
      <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
        <div className="bg-white border-4 border-black px-3 py-1.5 flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
           <span className="text-sm font-black uppercase italic tracking-tighter flex items-center gap-2">
             <span className={`w-2 h-2 rounded-none bg-black ${isSpeaking ? 'animate-pulse' : ''}`} />
             {username} {isLocal ? '(LOCAL_HOST)' : '(REMOTE_ID)'}
           </span>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-40 pointer-events-none">
        <div className={`p-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 ${isAudioEnabled ? (isSpeaking ? 'bg-[#ffdf00]' : 'bg-white') : 'bg-red-500'}`}>
          {isAudioEnabled ? (
            <Activity size={16} strokeWidth={3} className="text-black" />
          ) : (
            <MicOff size={16} strokeWidth={3} className="text-white" />
          )}
          <span className={`text-[10px] font-black uppercase ${!isAudioEnabled ? 'text-white' : 'text-black'}`}>
             {isAudioEnabled ? (isSpeaking ? 'IS_SPEAKING' : 'AUDIO_LIVE') : 'AUDIO_MUTED'}
          </span>
        </div>

        <div className="flex gap-3 pointer-events-auto">
            {isScreenShare && (
                <div className="bg-[#ffdf00] border-4 border-black p-2 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Maximize2 size={16} strokeWidth={3} className="text-black" />
                    <span className="text-[10px] font-black uppercase italic">SCREEN_TRANS_</span>
                </div>
            )}
            <div className={`p-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${getSignalColor().replace('text-', 'bg-')}`}>
                <Wifi size={16} strokeWidth={3} className="text-black" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTile;