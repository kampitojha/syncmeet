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
  Maximize2,
  ShieldAlert,
  Zap
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
    if (networkQuality >= 4) return "text-cyan-400";
    if (networkQuality === 3) return "text-green-400";
    if (networkQuality === 2) return "text-yellow-400";
    return "text-red-500";
  };

  return (
    <div 
      className={`
        relative w-full h-full bg-[#0a0a0a] overflow-hidden transition-all duration-700
        rounded-[40px] border border-white/5
        ${isSpeaking 
          ? 'shadow-[0_0_50px_rgba(34,211,238,0.2)] border-cyan-500/30' 
          : 'shadow-2xl'
        }
        ${isHandRaised ? 'ring-4 ring-cyan-400/50' : ''}
        ${isGlitching ? 'animate-glitch-refined' : ''}
      `}
    >
      {/* Hand Raise Overlay */}
      {isHandRaised && (
          <div className="absolute top-6 right-6 z-[40] animate-bounce">
              <div className="glass-card-bright p-3 px-5 rounded-2xl border border-white/20 shadow-xl flex items-center gap-3">
                  <Hand size={20} fill="currentColor" className="text-cyan-400" />
                  <span className="font-extrabold uppercase text-[10px] tracking-widest text-white">RAISING_HAND</span>
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
                w-full h-full transition-all duration-1000
                ${isScreenShare ? 'object-contain' : 'object-cover'} 
                ${shouldMirror ? 'scale-x-[-1]' : ''}
                ${!isVideoEnabled ? 'opacity-0 blur-xl scale-110' : 'opacity-100 blur-0 scale-100'}
                ${isGlitching ? 'grayscale' : ''}
            `}
        />
      </div>

      {/* Placeholder for Cam Off */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in bg-gradient-to-br from-[#0a0a0a] to-[#111]">
          <div className="relative">
            <div className={`h-32 w-32 md:h-48 md:w-48 bg-white/5 rounded-full border border-white/10 shadow-2xl flex items-center justify-center`}>
              <User className="w-16 h-16 md:w-24 md:h-24 text-white/10" strokeWidth={1} />
            </div>
            {isSpeaking && !isLocal && (
               <div className="absolute -inset-4 border-2 border-cyan-400/30 rounded-full animate-ping" />
            )}
          </div>
          <div className="mt-10 glass-card p-4 px-6 rounded-2xl flex items-center gap-4 text-white/40 font-bold uppercase text-[10px] tracking-widest border border-white/5">
             <VideoOff size={16} className="text-cyan-400/50" /> SIGNAL_INTERRUPTED_
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isTyping && !isLocal && (
        <div className="absolute bottom-28 left-8 glass-card-bright p-3 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 z-20 shadow-xl animate-pulse">
            <span className="flex items-center gap-3">
                <Terminal size={14} /> {username} IS_TRANSMITTING...
            </span>
        </div>
      )}

      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-[45] overflow-hidden">
        {reactions.map((emoji, i) => (
           <div 
             key={i} 
             className="absolute bottom-0 text-5xl md:text-7xl animate-float-up opacity-0"
             style={{ left: `${Math.random() * 80 + 10}%`, animationDelay: `${i * 0.1}s` }}
           >
             {emoji}
           </div>
        ))}
      </div>

      {/* Info Overlay (Negotiating/Lost) */}
      {statusMessage && !isLocal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-8">
            <div className="glass-card-bright rounded-[40px] p-10 shadow-2xl border border-white/20 max-w-sm w-full text-center">
              <div className="flex flex-col items-center gap-6">
                 <div className="p-5 bg-white/5 rounded-full">
                     <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin" strokeWidth={2} />
                 </div>
                 <h4 className="font-extrabold text-xl text-white uppercase tracking-widest">RECOV_LINK_</h4>
                 <p className="text-white/40 text-xs font-medium uppercase leading-relaxed tracking-wider">{statusMessage}</p>
                 {onRetry && (
                 <button 
                  onClick={onRetry}
                  className="mt-4 w-full bg-cyan-400 text-black py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-lg shadow-cyan-400/20"
                 >
                  RESET_ENCRYPTION_LINK
                 </button>
              )}
              </div>
           </div>
        </div>
      )}

      {/* Peer Label */}
      <div className="absolute top-6 left-6 z-40 flex flex-col gap-2">
        <div className="glass-card-bright p-2.5 px-5 rounded-2xl border border-white/10 flex items-center gap-3 shadow-xl">
           <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-white/90">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
             {username} {isLocal ? '(HOST)' : ''}
           </span>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-40 pointer-events-none">
        <div className={`p-2.5 px-5 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3 transition-all ${isAudioEnabled ? (isSpeaking ? 'glass-card-bright' : 'glass-card text-white/40') : 'bg-red-500/20 text-red-500'}`}>
          {isAudioEnabled ? (
            <Activity size={14} strokeWidth={2} className={`${isSpeaking ? 'text-cyan-400' : 'opacity-20'}`} />
          ) : (
            <MicOff size={14} strokeWidth={2} />
          )}
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
             {isAudioEnabled ? (isSpeaking ? 'ACTIVE_SPEECH' : 'AUDIO_ON') : 'MUTED'}
          </span>
        </div>

        <div className="flex gap-4 pointer-events-auto">
            {isScreenShare && (
                <div className="glass-card-bright p-3 rounded-2xl flex items-center gap-3 shadow-xl border border-white/10">
                    <Maximize2 size={16} strokeWidth={2} className="text-cyan-400" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">SCREEN</span>
                </div>
            )}
            <div className={`p-3 rounded-2xl glass-card border border-white/10 shadow-xl`}>
                <Signal size={16} strokeWidth={2} className={getSignalColor()} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTile;