import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MessageSquare, MonitorOff, PenTool, FileText, Smile } from 'lucide-react';

interface ControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  isWhiteboardOpen: boolean;
  isNotesOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onToggleWhiteboard: () => void;
  onToggleNotes: () => void;
  onReaction: (emoji: string) => void;
  onLeave: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isChatOpen,
  isWhiteboardOpen,
  isNotesOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleWhiteboard,
  onToggleNotes,
  onReaction,
  onLeave,
}) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const emojis = ['👍', '❤️', '😂', '🎉', '👋', '🔥'];

  const baseBtnClass = "group p-4 flex items-center justify-center transition-all duration-75 relative active:translate-x-1 active:translate-y-1 active:shadow-none";
  
  const getBtnStyle = (isActive: boolean, type: 'normal' | 'danger' | 'toggle' = 'normal') => {
    let classes = `${baseBtnClass} border-[4px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] `;
    
    if (type === 'danger') {
      return `${classes} bg-[#ff4444] text-white hover:bg-red-600 px-8`;
    }
    
    if (isActive) {
        return `${classes} bg-black text-[#ffdf00]`;
    }
    
    return `${classes} bg-white text-black hover:bg-[#ffdf00]`;
  };

  return (
    <div className="relative max-w-[95vw] md:max-w-none mx-auto">
        {/* Emoji Popover */}
        {showEmojis && (
            <div className="absolute bottom-[calc(100%+20px)] left-1/2 -translate-x-1/2 bg-white border-[4px] border-black p-3 flex gap-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-fade-in-up z-50 overflow-x-auto max-w-full no-scrollbar">
                {emojis.map(e => (
                    <button 
                        key={e} 
                        onClick={() => { onReaction(e); setShowEmojis(false); }}
                        className="text-3xl hover:bg-[#ffdf00] p-2 transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                    >
                        {e}
                    </button>
                ))}
            </div>
        )}

        <div className="flex items-center gap-4 bg-[#f0f0f0] p-4 border-[6px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-x-auto no-scrollbar max-w-full">
        <button 
            onClick={onToggleMic} 
            className={getBtnStyle(isMicOn)}
            title={isMicOn ? "Mute" : "Unmute"}
        >
            {isMicOn ? <Mic size={24} strokeWidth={3} /> : <MicOff size={24} strokeWidth={3} />}
        </button>

        <button 
            onClick={onToggleCamera} 
            className={getBtnStyle(isCameraOn)}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
            {isCameraOn ? <Video size={24} strokeWidth={3} /> : <VideoOff size={24} strokeWidth={3} />}
        </button>

        <div className="w-1.5 h-12 bg-black mx-1 flex-shrink-0" />

        <button 
            onClick={onToggleScreenShare} 
            className={getBtnStyle(isScreenSharing)}
            title="Share Screen"
        >
            {isScreenSharing ? <MonitorOff size={24} strokeWidth={3} /> : <Monitor size={24} strokeWidth={3} />}
        </button>
        
        <button 
            onClick={onToggleWhiteboard} 
            className={getBtnStyle(isWhiteboardOpen)}
            title="Whiteboard"
        >
            <PenTool size={24} strokeWidth={3} />
        </button>

        <button 
            onClick={onToggleNotes} 
            className={getBtnStyle(isNotesOpen)}
            title="Shared Notes"
        >
            <FileText size={24} strokeWidth={3} />
        </button>

        <div className="w-1.5 h-12 bg-black mx-1 flex-shrink-0" />

        <button 
            onClick={() => setShowEmojis(!showEmojis)} 
            className={getBtnStyle(showEmojis)}
            title="Reactions"
        >
            <Smile size={24} strokeWidth={3} />
        </button>

        <button 
            onClick={onToggleChat} 
            className={getBtnStyle(isChatOpen)}
            title="Chat"
        >
            <MessageSquare size={24} strokeWidth={3} />
        </button>

        <button 
            onClick={onLeave} 
            className={getBtnStyle(false, 'danger')}
            title="Leave Call"
        >
            <PhoneOff size={24} strokeWidth={3} />
        </button>
        </div>
    </div>
  );
};

export default Controls;