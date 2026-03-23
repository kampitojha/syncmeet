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
  Zap,
  BarChart3,
  Activity,
  Captions,
  Circle
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
  isRecording?: boolean;
  onToggleRecording: () => void;
  isCaptionsOn?: boolean;
  onToggleCaptions: () => void;
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
  onSendReaction,
  isRecording,
  onToggleRecording,
  isCaptionsOn,
  onToggleCaptions
}) => {
  const iconClass = "w-5 h-5 md:w-6 md:h-6 transition-all duration-300";

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 pointer-events-auto">
      <div className="flex items-center gap-1.5 md:gap-3 glass-card p-2 rounded-[24px]">
        <button 
          onClick={onToggleMic}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${!isMicOn ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Microphone"
        >
          {isMicOn ? <Mic className={iconClass} strokeWidth={2} /> : <MicOff className={iconClass} strokeWidth={2} />}
        </button>
        <button 
          onClick={onToggleCamera}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${!isCameraOn ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Camera"
        >
          {isCameraOn ? <VideoIcon className={iconClass} strokeWidth={2} /> : <VideoOff className={iconClass} strokeWidth={2} />}
        </button>
        <button 
          onClick={onToggleScreenShare}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${isScreenSharing ? 'bg-cyan-400 text-black shadow-cyan-400/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Share Screen"
        >
          <MonitorUp className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={onToggleHandRaise}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${isHandRaised ? 'bg-cyan-400 text-black shadow-cyan-400/20' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Raise Hand"
        >
          <Hand className={iconClass} strokeWidth={2} fill={isHandRaised ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 glass-card p-2 rounded-[24px]">
        <button 
          onClick={onToggleCaptions}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${isCaptionsOn ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Live Captions"
        >
          <Captions className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={onToggleRecording}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Record Session"
        >
          <Circle className={iconClass} strokeWidth={3} fill={isRecording ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 glass-card p-2 rounded-[24px]">
        <button 
          onClick={() => onToggleTool('chat')}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'chat' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Chat"
        >
          <MessageSquare className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onToggleTool('polls')}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'polls' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Polls"
        >
          <BarChart3 className={iconClass} strokeWidth={2} />
        </button>
        <button 
          onClick={() => onToggleTool('dashboard')}
          className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'dashboard' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
          title="Network Telemetry"
        >
          <Activity className={iconClass} strokeWidth={2} />
        </button>
        <button 
           onClick={() => onToggleTool('logs')}
           className={`p-4 rounded-xl transition-all duration-500 shadow-xl border border-white/10 ${activeTool === 'logs' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
           title="System Console"
         >
           <Terminal className={iconClass} strokeWidth={2} />
         </button>
      </div>

      <div className="relative ml-4 px-2">
         <button 
            onClick={() => onToggleTool('reactions')}
            className={`p-4 rounded-xl transition-all shadow-xl border border-white/10 ${activeTool === 'reactions' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
            title="Send Reaction"
         >
            <Smile className={iconClass} strokeWidth={2} />
         </button>
         
         {activeTool === 'reactions' && (
           <div className="absolute bottom-[calc(100%+24px)] left-1/2 -translate-x-1/2 glass-card-bright p-4 rounded-[32px] flex gap-3 transform transition-all shadow-2xl border border-white/10 animate-slide-up z-[120]">
              {REACTIONS.map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => { onSendReaction(emoji); onToggleTool('none'); }}
                    className="text-3xl hover:scale-150 transition-transform p-2 active:scale-90"
                  >
                    {emoji}
                  </button>
              ))}
           </div>
         )}
      </div>

      <button 
        onClick={onLeave}
        className="p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-500 shadow-xl border border-red-500/20"
        title="Disconnect Session"
      >
        <PhoneOff className={iconClass} strokeWidth={2} />
      </button>
    </div>
  );
};

export default Controls;