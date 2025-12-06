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

  const baseBtnClass = "flex-shrink-0 p-3.5 md:p-4 rounded-full transition-all duration-300 flex items-center justify-center transform hover:scale-105 active:scale-95 relative";
  
  const getBtnStyle = (isActive: boolean, type: 'normal' | 'danger' | 'toggle' = 'normal') => {
    if (type === 'danger') {
      return `${baseBtnClass} bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 px-6 md:px-8 rounded-2xl`;
    }
    if (type === 'toggle') {
        return `${baseBtnClass} ${isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/50' 
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'}`;
    }
    return `${baseBtnClass} ${isActive 
        ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'}`;
  };

  return (
    <div className="relative max-w-[90vw] md:max-w-none mx-auto">
        {/* Emoji Popover */}
        {showEmojis && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-white/10 p-2 rounded-2xl flex gap-2 shadow-xl animate-fade-in-up overflow-x-auto max-w-full">
                {emojis.map(e => (
                    <button 
                        key={e} 
                        onClick={() => { onReaction(e); setShowEmojis(false); }}
                        className="text-2xl hover:bg-white/10 p-2 rounded-xl transition-colors hover:scale-125 transform flex-shrink-0"
                    >
                        {e}
                    </button>
                ))}
            </div>
        )}

        <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-full px-2 py-2 md:px-6 md:py-4 flex items-center gap-2 md:gap-3 shadow-2xl overflow-x-auto no-scrollbar max-w-full">
        <button 
            onClick={onToggleMic} 
            className={getBtnStyle(isMicOn)}
            title={isMicOn ? "Mute" : "Unmute"}
        >
            {isMicOn ? <Mic size={20} className="md:w-5 md:h-5" /> : <MicOff size={20} className="md:w-5 md:h-5" />}
        </button>

        <button 
            onClick={onToggleCamera} 
            className={getBtnStyle(isCameraOn)}
            title={isCameraOn ? "Turn off camera" : "Turn on camera"}
        >
            {isCameraOn ? <Video size={20} className="md:w-5 md:h-5" /> : <VideoOff size={20} className="md:w-5 md:h-5" />}
        </button>

        <div className="w-px h-8 bg-gray-700 mx-1 flex-shrink-0" />

        <button 
            onClick={onToggleScreenShare} 
            className={getBtnStyle(isScreenSharing, 'toggle')}
            title="Share Screen"
        >
            {isScreenSharing ? <MonitorOff size={20} className="md:w-5 md:h-5" /> : <Monitor size={20} className="md:w-5 md:h-5" />}
        </button>
        
        <button 
            onClick={onToggleWhiteboard} 
            className={getBtnStyle(isWhiteboardOpen, 'toggle')}
            title="Whiteboard"
        >
            <PenTool size={20} className="md:w-5 md:h-5" />
        </button>

        <button 
            onClick={onToggleNotes} 
            className={getBtnStyle(isNotesOpen, 'toggle')}
            title="Shared Notes"
        >
            <FileText size={20} className="md:w-5 md:h-5" />
        </button>

        <div className="w-px h-8 bg-gray-700 mx-1 flex-shrink-0" />

        <button 
            onClick={() => setShowEmojis(!showEmojis)} 
            className={getBtnStyle(showEmojis, 'toggle')}
            title="Reactions"
        >
            <Smile size={20} className="md:w-5 md:h-5" />
        </button>

        <button 
            onClick={onToggleChat} 
            className={getBtnStyle(isChatOpen, 'toggle')}
            title="Chat"
        >
            <MessageSquare size={20} className="md:w-5 md:h-5" />
        </button>

        <button 
            onClick={onLeave} 
            className={getBtnStyle(false, 'danger')}
            title="Leave Call"
        >
            <PhoneOff size={22} className="md:w-5 md:h-5" />
        </button>
        </div>
    </div>
  );
};

export default Controls;