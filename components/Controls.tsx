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
    <div className="relative flex items-center gap-4 bg-white p-2">
      {/* REACTION_PAYLOAD_POPOUT */}
      {showReactions && (
        <div className="absolute bottom-full mb-10 left-1/2 -translate-x-1/2 brutal-card bg-white p-4 flex gap-4 shadow-[15px_15px_0px_#000] z-[300] animate-slide-up border-[6px]">
           {['⚡', '🔥', '👏', '❤️', '🎉', '😂', '💯'].map(emoji => (
             <button 
                key={emoji} 
                onClick={() => { onSendReaction(emoji); setShowReactions(false); }}
                className="w-16 h-16 text-3xl brutal-card border-4 shadow-[6px_6px_0px_#000] hover:bg-[var(--brutal-yellow)] hover:-translate-y-2 transition-all"
             >
                {emoji}
             </button>
           ))}
        </div>
      )}

      {/* CORE_COMM_GROUP */}
      <div className="flex gap-4 border-r-8 border-black pr-6">
        <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onToggleMic}
              className={`w-20 h-20 brutal-card border-4 flex items-center justify-center shadow-[6px_6px_0px_#000] ${isMicOn ? 'bg-[var(--brutal-green)] text-white' : 'bg-[var(--brutal-red)] text-white brutal-shake'}`}
            >
              {isMicOn ? <Mic size={32} strokeWidth={3} /> : <MicOff size={32} strokeWidth={3} />}
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest">{isMicOn ? 'MIC_TX' : 'MIC_OFF'}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onToggleCamera}
              className={`w-20 h-20 brutal-card border-4 flex items-center justify-center shadow-[6px_6px_0px_#000] ${isCameraOn ? 'bg-[var(--brutal-green)] text-white' : 'bg-[var(--brutal-red)] text-white'}`}
            >
              {isCameraOn ? <Video size={32} strokeWidth={3} /> : <VideoOff size={32} strokeWidth={3} />}
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest">{isCameraOn ? 'CAM_TX' : 'CAM_OFF'}</span>
        </div>
      </div>

      {/* EXTENDED_TOOLS_GROUP */}
      <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar scroll-smooth max-w-[50vw]">
        {[
            { id: 'share', icon: <ScreenShare size={24} strokeWidth={3} />, action: onToggleScreenShare, active: isScreenSharing, color: '--brutal-yellow' },
            { id: 'hand', icon: <Hand size={24} strokeWidth={3} />, action: onToggleHandRaise, active: isHandRaised, color: '--brutal-yellow' },
            { id: 'chat', icon: <MessageSquare size={24} strokeWidth={3} />, action: () => onToggleTool('chat'), active: activeTool === 'chat', color: '--brutal-violet' },
            { id: 'whiteboard', icon: <PenTool size={24} strokeWidth={3} />, action: () => onToggleTool('whiteboard'), active: activeTool === 'whiteboard', color: '--brutal-cyan' },
            { id: 'notes', icon: <FileText size={24} strokeWidth={3} />, action: () => onToggleTool('notes'), active: activeTool === 'notes', color: '--brutal-cyan' },
            { id: 'media', icon: <Tv size={24} strokeWidth={3} />, action: () => onToggleTool('media'), active: activeTool === 'media', color: '--brutal-orange' },
            { id: 'captions', icon: <Captions size={24} strokeWidth={3} />, action: onToggleCaptions, active: isCaptionsOn, color: '--brutal-violet' },
            { id: 'rec', icon: <Radio size={24} strokeWidth={3} />, action: onToggleRecording, active: isRecording, color: '--brutal-red' }
        ].map(tool => (
            <div key={tool.id} className="flex flex-col items-center gap-2">
                <button 
                  onClick={tool.action}
                  className={`w-16 h-16 brutal-card border-[3px] flex items-center justify-center shadow-[4px_4px_0px_#000] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none ${tool.active ? `bg-[var(${tool.color})] ${tool.color.includes('red') || tool.color.includes('violet') ? 'text-white' : 'text-black'}` : 'bg-white'}`}
                >
                  {tool.icon}
                </button>
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-40">{tool.id.toUpperCase()}</span>
            </div>
        ))}

        <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => setShowReactions(!showReactions)}
              className={`w-16 h-16 brutal-card border-[3px] flex items-center justify-center shadow-[4px_4px_0px_#000] ${showReactions ? 'bg-[var(--brutal-yellow)]' : 'bg-white'}`}
            >
              <Smile size={24} strokeWidth={3} />
            </button>
            <span className="text-[8px] font-black uppercase opacity-40">REACT</span>
        </div>
      </div>

      {/* TERMINATION_BLOCK */}
      <div className="pl-6 border-l-8 border-black">
        <div className="flex flex-col items-center gap-2">
            <button 
              onClick={onLeave}
              className="w-20 h-20 brutal-card bg-[var(--brutal-red)] text-white border-4 border-black shadow-[6px_6px_0px_#000] hover:bg-black hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px]"
            >
              <PhoneOff size={32} strokeWidth={3} />
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--brutal-red)]">DISCONNECT</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;