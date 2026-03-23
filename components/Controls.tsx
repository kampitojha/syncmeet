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
    <div className="relative group/controls flex items-center gap-2">
      {/* Reactions Popup */}
      {showReactions && (
        <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 brutal-card bg-white p-2 flex gap-2 shadow-[8px_8px_0px_black] z-[300] animate-slide-up whitespace-nowrap border-[4px]">
           {['⚡', '🔥', '👏', '❤️', '🎉', '😂', '💯'].map(emoji => (
             <button 
                key={emoji} 
                onClick={() => { onSendReaction(emoji); setShowReactions(false); }}
                className="p-3 text-2xl hover:bg-[#ffdf1e] brutal-card border-2 shadow-[4px_4px_0px_black] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
             >
                {emoji}
             </button>
           ))}
        </div>
      )}

      {/* Primary Comm Row */}
      <div className="flex gap-2 border-r-4 border-black pr-4">
        <button 
          onClick={onToggleMic}
          className={`p-4 brutal-btn ${isMicOn ? 'bg-[#00ff9d]' : 'bg-[#ff5e5e] text-white'}`}
        >
          {isMicOn ? <Mic size={24} strokeWidth={3} /> : <MicOff size={24} strokeWidth={3} />}
        </button>

        <button 
          onClick={onToggleCamera}
          className={`p-4 brutal-btn ${isCameraOn ? 'bg-[#00ff9d]' : 'bg-[#ff5e5e] text-white'}`}
        >
          {isCameraOn ? <Video size={24} strokeWidth={3} /> : <VideoOff size={24} strokeWidth={3} />}
        </button>
      </div>

      {/* Tools Row */}
      <div className="flex gap-2 px-2 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={onToggleScreenShare}
          className={`p-4 brutal-btn ${isScreenSharing ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <ScreenShare size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={onToggleHandRaise}
          className={`p-4 brutal-btn ${isHandRaised ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <Hand size={24} strokeWidth={3} className={isHandRaised ? 'brutal-shake' : ''} />
        </button>
        
        <button 
          onClick={() => onToggleTool('chat')}
          className={`p-4 brutal-btn ${activeTool === 'chat' ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <MessageSquare size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={() => onToggleTool('whiteboard')}
          className={`p-4 brutal-btn ${activeTool === 'whiteboard' ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <PenTool size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={() => onToggleTool('notes')}
          className={`p-4 brutal-btn ${activeTool === 'notes' ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <FileText size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={() => onToggleTool('media')}
          className={`p-4 brutal-btn ${activeTool === 'media' ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <Tv size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={onToggleCaptions}
          className={`p-4 brutal-btn ${isCaptionsOn ? 'bg-[#a855f7] text-white' : 'bg-white'}`}
        >
          <Captions size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={onToggleRecording}
          className={`p-4 brutal-btn ${isRecording ? 'bg-[#ff5e5e] text-white brutal-shake shadow-none' : 'bg-white'}`}
        >
          <Radio size={24} strokeWidth={3} />
        </button>

        <button 
          onClick={() => setShowReactions(!showReactions)}
          className={`p-4 brutal-btn ${showReactions ? 'bg-[#ffdf1e]' : 'bg-white'}`}
        >
          <Smile size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Leave Button */}
      <div className="pl-4 border-l-4 border-black">
        <button 
          onClick={onLeave}
          className="p-4 brutal-btn bg-[#ff5e5e] text-white hover:bg-black"
        >
          <PhoneOff size={24} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default Controls;