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
  Terminal
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
  const iconClass = "w-5 h-5 md:w-6 md:h-6";

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <div className="flex items-center gap-1.5 md:gap-2">
        <button 
          onClick={onToggleMic}
          className={`brut-btn p-2 md:p-4 ${!isMicOn ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
        >
          {isMicOn ? <Mic className={iconClass} strokeWidth={3} /> : <MicOff className={iconClass} strokeWidth={3} />}
        </button>
        <button 
          onClick={onToggleCamera}
          className={`brut-btn p-2 md:p-4 ${!isCameraOn ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
        >
          {isCameraOn ? <VideoIcon className={iconClass} strokeWidth={3} /> : <VideoOff className={iconClass} strokeWidth={3} />}
        </button>
        <button 
          onClick={onToggleScreenShare}
          className={`brut-btn p-2 md:p-4 ${isScreenSharing ? 'bg-[#ffdf00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
        >
          <MonitorUp className={iconClass} strokeWidth={3} />
        </button>
        <button 
          onClick={onToggleHandRaise}
          className={`brut-btn p-2 md:p-4 ${isHandRaised ? 'bg-[#ffdf00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
        >
          <Hand className={iconClass} strokeWidth={3} fill={isHandRaised ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="w-[4px] h-10 bg-black opacity-10 mx-1" />

      <div className="flex items-center gap-1.5 md:gap-2">
        <button 
          onClick={() => onToggleTool('chat')}
          className={`brut-btn p-2 md:p-4 ${activeTool === 'chat' ? 'bg-[#ffdf00] text-black' : 'bg-white text-black'}`}
        >
          <MessageSquare className={iconClass} strokeWidth={3} />
        </button>
        <button 
          onClick={() => onToggleTool('whiteboard')}
          className={`brut-btn p-2 md:p-4 ${activeTool === 'whiteboard' ? 'bg-[#ffdf00] text-black' : 'bg-white text-black'}`}
        >
          <PenTool className={iconClass} strokeWidth={3} />
        </button>
        <button 
          onClick={() => onToggleTool('notes')}
          className={`brut-btn p-2 md:p-4 ${activeTool === 'notes' ? 'bg-[#ffdf00] text-black' : 'bg-white text-black'}`}
        >
          <FileText className={iconClass} strokeWidth={3} />
        </button>
        <button 
          onClick={() => onToggleTool('logs')}
          className={`brut-btn p-2 md:p-4 ${activeTool === 'logs' ? 'bg-[#ffdf00] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black'}`}
        >
          <Terminal className={iconClass} strokeWidth={3} />
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-2 group relative ml-2">
         <div className="brut-btn p-4 bg-white text-black group-hover:bg-[#ffdf00]">
            <Smile size={24} strokeWidth={3} />
         </div>
         <div className="absolute bottom-[calc(100%+16px)] left-0 bg-white border-4 border-black p-3 flex gap-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {REACTIONS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => onSendReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
            ))}
         </div>
      </div>

      <button 
        onClick={onLeave}
        className="brut-btn p-2 md:p-4 bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-[#ffdf00] transition-all ml-2 md:ml-4"
      >
        <PhoneOff className={iconClass} strokeWidth={3} />
      </button>
    </div>
  );
};

export default Controls;