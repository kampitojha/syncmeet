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
    <div className="flex items-center gap-2 md:gap-4 glass-card-bright p-2 md:p-4 rounded-3xl md:rounded-[36px] border border-white/20 select-none no-scrollbar flex-nowrap overflow-x-auto max-w-[90vw] md:max-w-none shadow-2xl">
      {/* Primary Communication Protocols */}
      <div className="flex items-center gap-1 md:gap-2 px-1 border-r border-white/10 flex-shrink-0">
        <button 
          onClick={onToggleMic}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1 group
            ${isMicOn ? 'bg-white/5 text-cyan-400 hover:bg-white/10' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
        >
          {isMicOn ? <Mic size={20} strokeWidth={2.5} /> : <MicOff size={20} strokeWidth={2.5} />}
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">MIC_L1</span>
        </button>

        <button 
          onClick={onToggleCamera}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1 group
            ${isCameraOn ? 'bg-white/5 text-cyan-400 hover:bg-white/10' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}
        >
          {isCameraOn ? <Video size={20} strokeWidth={2.5} /> : <VideoOff size={20} strokeWidth={2.5} />}
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">CAM_L2</span>
        </button>
      </div>

      {/* Collaboration Suite */}
      <div className="flex items-center gap-1 md:gap-2 px-1 border-r border-white/10 flex-shrink-0">
        <button 
          onClick={onToggleScreenShare}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${isScreenSharing ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <ScreenShare size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">SHARE_L3</span>
        </button>

        <button 
          onClick={onToggleHandRaise}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${isHandRaised ? 'bg-yellow-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <Hand size={20} strokeWidth={2.5} className={isHandRaised ? 'animate-bounce' : ''} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">RAISE_L4</span>
        </button>
      </div>

      {/* Advanced Logic Modules */}
      <div className="flex items-center gap-1 md:gap-2 px-1 flex-shrink-0">
        <button 
          onClick={() => onToggleTool('chat')}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1 relative
            ${activeTool === 'chat' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <MessageSquare size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">HUB_L5</span>
        </button>

        <button 
          onClick={() => onToggleTool('whiteboard')}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${activeTool === 'whiteboard' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <PenTool size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">DRAW_L6</span>
        </button>

        <button 
          onClick={() => onToggleTool('notes')}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${activeTool === 'notes' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <FileText size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">NOTE_L7</span>
        </button>

        <button 
          onClick={() => onToggleTool('media')}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${activeTool === 'media' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <Tv size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">CAST_L8</span>
        </button>

        <button 
          onClick={onToggleCaptions}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${isCaptionsOn ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <Captions size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">TX_L9</span>
        </button>

        <button 
          onClick={onToggleRecording}
          className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
            ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
        >
          <Radio size={20} strokeWidth={2.5} />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">REC_X0</span>
        </button>

        <div className="relative flex-shrink-0">
          <button 
            onClick={() => setShowReactions(!showReactions)}
            className={`p-3 md:p-5 rounded-2xl md:rounded-3xl transition-all active:scale-90 flex flex-col items-center gap-1
              ${showReactions ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            <Smile size={20} strokeWidth={2.5} />
            <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">REACT_X1</span>
          </button>
          
          {showReactions && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 glass-card-bright p-3 rounded-2xl flex gap-3 shadow-2xl animate-slide-up border border-white/20 z-[200]">
               {['⚡', '🔥', '👏', '❤️', '🎉', '😂', '💯'].map(emoji => (
                 <button 
                   key={emoji} 
                   onClick={() => { onSendReaction(emoji); setShowReactions(false); }}
                   className="p-3 text-xl hover:scale-150 active:scale-90 transition-all hover:bg-white/10 rounded-xl"
                 >
                   {emoji}
                 </button>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* Termination Protocol */}
      <div className="flex-shrink-0 pl-1">
        <button 
          onClick={onLeave}
          className="p-3 md:p-5 rounded-2xl md:rounded-3xl bg-red-500 text-white hover:bg-red-600 transition-all active:scale-90 flex flex-col items-center gap-1 shadow-lg shadow-red-500/20 group"
        >
          <PhoneOff size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[7px] font-black uppercase tracking-tighter hidden md:block">LEAVE_OFF</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;