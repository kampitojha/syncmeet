import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, ScreenShare, Hand, 
  MessageSquare, PenTool, FileText, Tv, Captions, Radio, 
  Smile, PhoneOff 
} from 'lucide-react';

interface ControlsProps {
  onToggleMic: () => void;
  isMicOn: boolean;
  onToggleCamera: () => void;
  isCameraOn: boolean;
  onToggleScreenShare: () => void;
  isScreenSharing: boolean;
  onToggleHandRaise: () => void;
  isHandRaised: boolean;
  onToggleTool: (tool: 'chat' | 'whiteboard' | 'notes' | 'media' | 'logs' | 'polls' | 'dashboard' | 'none') => void;
  activeTool: string;
  onLeave: () => void;
  onSendReaction: (emoji: string) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isCaptionsOn: boolean;
  onToggleCaptions: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  onToggleMic, isMicOn,
  onToggleCamera, isCameraOn,
  onToggleScreenShare, isScreenSharing,
  onToggleHandRaise, isHandRaised,
  onToggleTool, activeTool,
  onLeave, onSendReaction,
  isRecording, onToggleRecording,
  isCaptionsOn, onToggleCaptions
}) => {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="relative flex items-center gap-2 md:gap-4 bg-white p-1 md:p-2 min-w-0">
      {/* REACTION_PAYLOAD_POPOUT */}
      {showReactions && (
        <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 brutal-card bg-white p-2 md:p-5 flex gap-3 md:gap-5 shadow-[12px_12px_0px_#000] z-[600] animate-slide-up border-4 md:border-[6px] max-w-[95vw] md:w-auto overflow-x-auto no-scrollbar">
           {['⚡', '🔥', '👏', '❤️', '🎉', '😂', '💯', '🚀', '✨'].map(emoji => (
             <button 
                key={emoji} 
                onClick={() => { onSendReaction(emoji); setShowReactions(false); }}
                className="w-14 h-14 md:w-20 md:h-20 text-2xl md:text-5xl brutal-card border-2 md:border-[3px] shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] hover:bg-[var(--brutal-yellow)] hover:-translate-y-3 transition-all shrink-0 flex items-center justify-center bg-white"
             >
                {emoji}
             </button>
           ))}
           <button 
             onClick={() => setShowReactions(false)}
             className="w-14 h-14 md:w-20 md:h-20 text-[10px] md:text-sm brutal-card border-2 md:border-[3px] bg-black text-white shadow-[4px_4px_0px_#000] hover:bg-[var(--brutal-red)] flex items-center justify-center shrink-0 font-black italic"
           >
             CLOSE
           </button>
        </div>
      )}

      {/* CORE_COMM_GROUP */}
      <div className="flex gap-2 md:gap-4 border-r-4 md:border-r-8 border-black pr-3 md:pr-6 shrink-0">
        <div className="flex flex-col items-center gap-1 md:gap-2">
            <button 
              onClick={onToggleMic}
              className={`w-12 h-12 md:w-20 md:h-20 brutal-card border-2 md:border-4 flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] ${isMicOn ? 'bg-[var(--brutal-green)] text-white' : 'bg-[var(--brutal-red)] text-white brutal-shake'}`}
            >
              {isMicOn ? <Mic className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /> : <MicOff className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />}
            </button>
            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest">{isMicOn ? 'ON' : 'OFF'}</span>
        </div>

        <div className="flex flex-col items-center gap-1 md:gap-2">
            <button 
              onClick={onToggleCamera}
              className={`w-12 h-12 md:w-20 md:h-20 brutal-card border-2 md:border-4 flex items-center justify-center shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] ${isCameraOn ? 'bg-[var(--brutal-green)] text-white' : 'bg-[var(--brutal-red)] text-white'}`}
            >
              {isCameraOn ? <Video className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /> : <VideoOff className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />}
            </button>
            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest">{isCameraOn ? 'LIVE' : 'HIDE'}</span>
        </div>
      </div>

      {/* EXTENDED_TOOLS_GROUP */}
      <div className="flex gap-2 md:gap-4 px-2 md:px-4 overflow-x-auto no-scrollbar scroll-smooth flex-1 md:flex-none">
        {[
            { id: 'share', icon: <ScreenShare className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: onToggleScreenShare, active: isScreenSharing, color: '--brutal-yellow' },
            { id: 'hand', icon: <Hand className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: onToggleHandRaise, active: isHandRaised, color: '--brutal-yellow' },
            { id: 'chat', icon: <MessageSquare className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: () => onToggleTool('chat'), active: activeTool === 'chat', color: '--brutal-violet' },
            { id: 'whiteboard', icon: <PenTool className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: () => onToggleTool('whiteboard'), active: activeTool === 'whiteboard', color: '--brutal-cyan' },
            { id: 'notes', icon: <FileText className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: () => onToggleTool('notes'), active: activeTool === 'notes', color: '--brutal-cyan' },
            { id: 'media', icon: <Tv className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: () => onToggleTool('media'), active: activeTool === 'media', color: '--brutal-orange' },
            { id: 'captions', icon: <Captions className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: onToggleCaptions, active: isCaptionsOn, color: '--brutal-violet' },
            { id: 'rec', icon: <Radio className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />, action: onToggleRecording, active: isRecording, color: '--brutal-red' }
        ].map(tool => (
            <div key={tool.id} className="flex flex-col items-center gap-1 md:gap-2 shrink-0">
                <button 
                  onClick={tool.action}
                  className={`w-10 h-10 md:w-16 md:h-16 brutal-card border-2 md:border-[3px] flex items-center justify-center shadow-[4px_4px_0px_#000] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none ${tool.active ? `bg-[var(${tool.color})] ${tool.color.includes('red') || tool.color.includes('violet') ? 'text-white' : 'text-black'}` : 'bg-white'}`}
                >
                  {tool.icon}
                </button>
                <span className="text-[7px] md:text-[8px] font-black uppercase tracking-tighter opacity-40">{tool.id.substring(0, 3)}</span>
            </div>
        ))}

        <div className="flex flex-col items-center gap-1 md:gap-2 shrink-0">
            <button 
              onClick={() => setShowReactions(!showReactions)}
              className={`w-10 h-10 md:w-16 md:h-16 brutal-card border-2 md:border-[3px] flex items-center justify-center shadow-[4px_4px_0px_#000] ${showReactions ? 'bg-[var(--brutal-yellow)]' : 'bg-white'}`}
            >
              <Smile className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </button>
            <span className="text-[7px] md:text-[8px] font-black uppercase opacity-40">ETC</span>
        </div>
      </div>

      {/* TERMINATION_BLOCK */}
      <div className="pl-3 md:pl-6 border-l-4 md:border-l-8 border-black shrink-0">
        <div className="flex flex-col items-center gap-1 md:gap-2">
            <button 
              onClick={onLeave}
              className="w-12 h-12 md:w-20 md:h-20 brutal-card bg-[var(--brutal-red)] text-white border-2 md:border-4 border-black shadow-[4px_4px_0px_#000] md:shadow-[6px_6px_0px_#000] hover:bg-black active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
            >
              <PhoneOff className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} />
            </button>
            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-[var(--brutal-red)]">END</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;