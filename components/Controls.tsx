import React from 'react';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  PenTool, 
  FileText,
  MonitorUp,
  Smile,
  Hand,
  Terminal,
  Zap
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
  onToggleTool: (tool: any) => void;
  activeTool: string;
  onLeave: () => void;
  onSendReaction: (emoji: string) => void;
}

const REACTIONS = ['🔥', '👍', '❤️', '👏', '😂', '😮', '❓'];

const Controls: React.FC<ControlsProps> = ({
  onToggleMic,
  isMicOn,
  onToggleCamera,
  isCameraOn,
  onToggleScreenShare,
  isScreenSharing,
  onToggleHandRaise,
  isHandRaised,
  onToggleTool,
  activeTool,
  onLeave,
  onSendReaction
}) => {
  const iconClass = "w-5 h-5 md:w-6 md:h-6 transition-all duration-300";

  return (
    <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
      <div className="flex items-center gap-1.5 md:gap-3">
        <button 
          onClick={onToggleMic}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${!isMicOn ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Microphone"
        >
          {isMicOn ? <Mic className={iconClass} strokeWidth={2} /> : <MicOff className={iconClass} strokeWidth={2} />}
        </button>
        <button 
          onClick={onToggleCamera}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${!isCameraOn ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Camera"
        >
          {isCameraOn ? <VideoIcon className={iconClass} strokeWidth={2} /> : <VideoOff className={iconClass} strokeWidth={2} />}
        </button>
        <button 
          onClick={onToggleScreenShare}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${isScreenSharing ? 'bg-cyan-400 text-black shadow-cyan-400/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Share Screen"
        >
          <MonitorUp className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={onToggleHandRaise}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${isHandRaised ? 'bg-cyan-400 text-black shadow-cyan-400/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Raise Hand"
        >
          <Hand className={iconClass} strokeWidth={2} fill={isHandRaised ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="w-[1px] h-10 bg-white/10 mx-2" />

      <div className="flex items-center gap-1.5 md:gap-3">
        <button 
          onClick={() => onToggleTool('chat')}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'chat' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Chat"
        >
          <MessageSquare className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onToggleTool('whiteboard')}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'whiteboard' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Whiteboard"
        >
          <PenTool className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onToggleTool('notes')}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'notes' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Notes"
        >
          <FileText className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onToggleTool('logs')}
          className={`p-4 rounded-2xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'logs' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="System Console"
        >
          <Terminal className={iconClass} strokeWidth={2} />
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-3 group relative ml-4 px-2">
         <div className="p-4 rounded-2xl bg-white/5 text-white/50 hover:bg-cyan-400 hover:text-black transition-all shadow-xl border border-white/10 cursor-pointer">
            <Smile className={iconClass} strokeWidth={2} />
         </div>
         <div className="absolute bottom-[calc(100%+24px)] left-0 glass-card-bright p-4 rounded-[32px] flex gap-3 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transform translate-y-4 group-hover:translate-y-0 transition-all shadow-2xl border border-white/10">
            {REACTIONS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="text-3xl hover:scale-150 transition-transform p-2 active:scale-90"
                >
                  {emoji}
                </button>
            ))}
         </div>
      </div>

      <button 
        onClick={onLeave}
        className="p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-500 shadow-xl border border-red-500/20 ml-2 md:ml-4"
        title="Disconnect Session"
      >
        <PhoneOff className={iconClass} strokeWidth={2} />
      </button>
    </div>
  );
};

export default Controls;