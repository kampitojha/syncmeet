import React, { useEffect, useRef } from 'react';
import { 
  MicOff, 
  VideoOff, 
  Signal, 
  User,
  Hand,
  Activity,
  Maximize2,
  Zap,
  Globe
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
    reactions = [],
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
  }, [stream, isVideoEnabled, stream?.getTracks().length]); 

  const shouldMirror = isScreenShare ? false : (isMirrored !== undefined ? isMirrored : isLocal);

  const getSignalColor = () => {
    if (networkQuality >= 4) return "bg-[var(--brutal-green)] text-white";
    if (networkQuality === 3) return "bg-[var(--brutal-blue)] text-white";
    if (networkQuality === 2) return "bg-[var(--brutal-yellow)] text-black";
    return "bg-[var(--brutal-red)] text-white";
  };

  return (
    <div 
      className={`
        relative w-full h-full bg-white overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        border-4 md:border-[6px] border-black shadow-[6px_6px_0px_#000] md:shadow-[10px_10px_0px_#000]
        ${isSpeaking ? 'translate-x-[-2px] md:translate-x-[-4px] translate-y-[-2px] md:translate-y-[-4px] shadow-[10px_10px_0px_#000] md:shadow-[15px_15px_0px_#000] z-10' : ''}
        ${isHandRaised ? 'border-[var(--brutal-yellow)]' : ''}
        ${isGlitching ? 'brutal-shake' : ''}
      `}
    >
      {/* HAND_RAISE_INTEL */}
      {isHandRaised && (
          <div className="absolute top-0 right-0 z-[40] bg-[var(--brutal-yellow)] border-l-2 md:border-l-4 border-b-2 md:border-b-4 border-black p-1.5 md:p-3 shadow-[2px_2px_0px_#000] md:shadow-[4px_4px_0px_#000] animate-bounce">
              <Hand className="w-4 h-4 md:w-6 md:h-6" fill="black" strokeWidth={3} />
          </div>
      )}

      {/* VIDEO_STREAM_CONTAINER */}
      <div className={`w-full h-full flex items-center justify-center ${isScreenShare ? 'bg-black' : 'brutal-bg-pattern'}`}>
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} 
            className={`
                w-full h-full transition-all duration-500
                ${isScreenShare ? 'object-contain' : 'object-cover'} 
                ${shouldMirror ? 'scale-x-[-1]' : ''}
                ${!isVideoEnabled ? 'opacity-0' : 'opacity-100'}
            `}
        />
      </div>

      {/* CAM_OFF_PLACEHOLDER */}
      {!isVideoEnabled && stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fcfcfc] brutal-grid-dot p-4">
          <div className="brutal-card bg-white p-4 md:p-8 border-2 md:border-4 border-black shadow-[6px_6px_0px_var(--brutal-pink)] md:shadow-[10px_10px_0px_var(--brutal-pink)] mb-4 md:mb-6">
            <User className="w-8 h-8 md:w-16 md:h-16 text-black" strokeWidth={3} />
          </div>
          <div className="bg-black text-white p-1.5 md:p-3 border-2 md:border-4 border-black shadow-[4px_4px_0px_var(--brutal-red)] md:shadow-[6px_6px_0px_var(--brutal-red)]">
             <span className="font-black uppercase text-[8px] md:text-[12px] tracking-widest flex items-center gap-2 md:gap-3 italic">
                <VideoOff strokeWidth={3} className="text-[var(--brutal-red)] w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> NO_VIDEO
             </span>
          </div>
        </div>
      )}

      {/* SYNC_CONNECTING_OVERLAY */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white brutal-grid-dot p-4 z-50">
           <div className="border-4 border-black p-4 bg-[var(--brutal-yellow)] shadow-[6px_6px_0px_#000] animate-pulse">
              <span className="text-[10px] md:text-[14px] font-black uppercase tracking-tighter">SYNCHRONIZING...</span>
           </div>
           <div className="mt-4 text-[8px] font-bold opacity-30 uppercase tracking-widest italic animate-bounce">Awaiting Link Establishment</div>
        </div>
      )}

      {/* REACTIONS_STREAM */}
      <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden">
        {reactions.map((emoji, i) => (
           <div 
             key={i} 
             className="absolute bottom-0 text-7xl md:text-9xl animate-float-up opacity-0 font-black italic select-none"
             style={{ left: `${Math.random() * 70 + 15}%`, animationDelay: `${i * 0.1}s` }}
           >
             {emoji}
           </div>
        ))}
      </div>

      {/* ASYMMETRIC_USER_LABEL */}
      <div className="absolute top-2 md:top-6 left-2 md:left-6 z-40">
        <div className={`border-2 md:border-4 border-black p-1.5 md:p-3 shadow-[4px_4px_0px_#000] md:shadow-[8px_8px_0px_#000] transition-all transform -rotate-2 ${isSpeaking ? 'bg-[var(--brutal-yellow)]' : 'bg-white'}`}>
           <span className="text-[8px] md:text-[12px] font-black uppercase tracking-tight flex items-center gap-2 md:gap-3">
             <Activity className={`${isSpeaking ? 'animate-pulse' : 'opacity-30'} w-3 h-3 md:w-4 md:h-4`} strokeWidth={3} />
             {username} <span className="text-[6px] md:text-[8px] opacity-40 ml-1 hidden xs:inline">{isLocal ? 'MASTER' : 'NODE'}</span>
           </span>
        </div>
      </div>

      {/* TELEMETRY_HUD */}
      <div className="absolute bottom-2 md:bottom-6 left-2 md:left-6 right-2 md:right-6 flex justify-between items-end z-40 pointer-events-none">
        <div className="flex flex-col gap-1 md:gap-2 pointer-events-auto">
            {isTyping && !isLocal && (
                <div className="bg-[var(--brutal-pink)] text-white p-1 md:p-2 border border-black font-black uppercase text-[6px] md:text-[8px] tracking-widest shadow-[2px_2px_0px_#000] md:shadow-[4px_4px_0px_#000] w-fit mb-1">
                   TYPING...
                </div>
            )}
            <div className={`p-1.5 md:p-3 border-2 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[6px_6px_0px_#000] flex items-center gap-2 md:gap-4 transition-all ${isAudioEnabled ? (isSpeaking ? 'bg-[var(--brutal-green)] text-white translate-x-1' : 'bg-white') : 'bg-[var(--brutal-red)] text-white'}`}>
                {isAudioEnabled ? (
                    <Zap className="text-[var(--brutal-yellow)] w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
                ) : (
                    <MicOff className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
                )}
                <div className="flex flex-col">
                    <span className="text-[7px] md:text-[10px] font-black uppercase leading-none">{isAudioEnabled ? (isSpeaking ? 'ON' : 'IDLE') : 'MUTED'}</span>
                    <span className="text-[5px] md:text-[7px] font-bold uppercase opacity-60 tracking-widest hidden xs:block">{isAudioEnabled ? (isSpeaking ? 'TX' : 'RX') : 'OFF'}</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-2 md:gap-3 items-end pointer-events-auto">
            {isScreenShare && (
                <div className="bg-black text-white p-1.5 md:p-3 border-2 md:border-4 border-white shadow-[3px_3px_0px_#000] md:shadow-[6px_6px_0px_#000] flex items-center gap-2 md:gap-3">
                    <Maximize2 className="text-[var(--brutal-cyan)] w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={3} />
                    <span className="text-[7px] md:text-[9px] font-black uppercase tracking-tighter hidden xs:block">SCREEN</span>
                </div>
            )}
            <div className="flex gap-1 md:gap-2">
                <div className={`p-1.5 md:p-3 border-2 md:border-4 border-black shadow-[3px_3px_0px_#000] md:shadow-[6px_6px_0px_#000] ${getSignalColor()}`}>
                    <Signal className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
                </div>
                <div className="p-1.5 md:p-3 bg-black text-white border-2 md:border-4 border-black shadow-[3px_3px_0px_var(--brutal-yellow)] md:shadow-[6px_6px_0px_var(--brutal-yellow)] hidden xs:block">
                    <Globe className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} />
                </div>
            </div>
        </div>
      </div>

      {/* SPEAKING_GLOW */}
      {isSpeaking && (
          <div className="absolute inset-0 border-[6px] md:border-[12px] border-[var(--brutal-yellow)]/30 pointer-events-none bg-[var(--brutal-yellow)]/5 z-0" />
      )}
    </div>
  );
};

export default VideoTile;