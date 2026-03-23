import React, { useEffect, useRef } from 'react';
import { 
  MicOff, 
  VideoOff, 
  RefreshCw, 
  Signal, 
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

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
      }
      videoEl.play().catch(e => {});
    }
  }, [stream, isVideoEnabled, stream?.getTracks().length, connectionState]); 

  const shouldMirror = isScreenShare ? false : (isMirrored !== undefined ? isMirrored : isLocal);

  const getSignalColor = () => {
    if (networkQuality >= 4) return "text-[#00ff9d]";
    if (networkQuality === 3) return "text-green-500";
    if (networkQuality === 2) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div 
      className={`
        relative w-full h-full bg-white overflow-hidden transition-all duration-300
        border-[4px] border-black shadow-[8px_8px_0px_black]
        ${isSpeaking ? 'translate-x-[-2px] translate-y-[-2px] shadow-[12px_12px_0px_black] z-10' : ''}
        ${isHandRaised ? 'border-[#ffdf1e]' : ''}
        ${isGlitching ? 'brutal-shake' : ''}
      `}
    >
      {/* Hand Raise Overlay */}
      {isHandRaised && (
          <div className="absolute top-4 right-4 z-[40]">
              <div className="bg-[#ffdf1e] border-2 border-black p-2 px-4 shadow-[4px_4px_0px_black] flex items-center gap-2">
                  <Hand size={16} fill="black" />
                  <span className="font-black uppercase text-[9px] tracking-widest text-black">HAND_RAISED</span>
              </div>
          </div>
      )}

      {/* Video Content */}
      <div className={`w-full h-full flex items-center justify-center ${isScreenShare ? 'bg-black' : 'bg-[#e0e0e0]'}`}>
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} 
            className={`
                w-full h-full transition-all duration-300
                ${isScreenShare ? 'object-contain' : 'object-cover'} 
                ${shouldMirror ? 'scale-x-[-1]' : ''}
                ${!isVideoEnabled ? 'opacity-0 grayscale' : 'opacity-100 grayscale-0'}
            `}
        />
      </div>

      {/* Placeholder for Cam Off */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
          <div className="brutal-card bg-[#f0f0f0] p-6 border-black shadow-[6px_6px_0px_black]">
            <User className="w-12 h-12 text-black" strokeWidth={3} />
          </div>
          <div className="mt-6 bg-black text-white p-2 px-4 font-black uppercase text-[10px] tracking-widest">
             <VideoOff size={14} className="inline mr-2 text-[#ff5e5e]" /> NO_SIGNAL
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isTyping && !isLocal && (
        <div className="absolute bottom-20 left-4 bg-[#ffdf1e] border-2 border-black p-2 px-4 text-[9px] font-black uppercase tracking-widest z-20 shadow-[4px_4px_0px_black]">
           TYPING_LINK...
        </div>
      )}

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden">
        {reactions.map((emoji, i) => (
           <div 
             key={i} 
             className="absolute bottom-0 text-7xl animate-float-up opacity-0 font-black italic"
             style={{ left: `${Math.random() * 80 + 10}%`, animationDelay: `${i * 0.1}s` }}
           >
             {emoji}
           </div>
        ))}
      </div>

      {/* Peer Label */}
      <div className="absolute top-4 left-4 z-40">
        <div className={`border-2 border-black p-2 px-4 shadow-[4px_4px_0px_black] transition-all ${isSpeaking ? 'bg-[#ffdf1e]' : 'bg-white'}`}>
           <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
             <Activity size={12} strokeWidth={3} className={isSpeaking ? 'animate-pulse' : 'opacity-20'} />
             {username} {isLocal ? '[ME]' : ''}
           </span>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-40 pointer-events-none">
        <div className={`p-2 px-4 border-2 border-black shadow-[4px_4px_0px_black] flex items-center gap-2 pointer-events-auto transition-all ${isAudioEnabled ? (isSpeaking ? 'bg-[#00ff9d]' : 'bg-white') : 'bg-[#ff5e5e] text-white'}`}>
          {isAudioEnabled ? (
            <Activity size={12} strokeWidth={3} />
          ) : (
            <MicOff size={12} strokeWidth={3} />
          )}
          <span className="text-[8px] font-black uppercase tracking-widest">
             {isAudioEnabled ? (isSpeaking ? 'SPEECH' : 'LIVE') : 'MUTE'}
          </span>
        </div>

        <div className="flex gap-2 pointer-events-auto">
            {isScreenShare && (
                <div className="bg-black text-white p-2 border-2 border-black shadow-[4px_4px_0px_white] flex items-center gap-2">
                    <Maximize2 size={12} strokeWidth={3} />
                    <span className="text-[8px] font-black uppercase font-mono">SCN</span>
                </div>
            )}
            <div className={`p-2 bg-white border-2 border-black shadow-[4px_4px_0px_black]`}>
                <Signal size={12} strokeWidth={3} className={getSignalColor()} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTile;