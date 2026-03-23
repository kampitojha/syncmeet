import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Users, 
  Copy, 
  ArrowRight,
  Terminal,
  Tv,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';
import VideoTile from './components/VideoTile';
import Controls from './components/Controls';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import CollaborativeNotes from './components/CollaborativeNotes';
import CommandPalette from './components/CommandPalette';
import SystemLogs, { LogEntry } from './components/SystemLogs';
import MediaPlayer from './components/MediaPlayer';
import { useWebRTC } from './hooks/useWebRTC';
import { useChat } from './hooks/useChat';
import { signaling } from './services/signaling';
import { SignalPayload } from './types';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState('SYNC-P2P-PRO');
  const [userName, setUserName] = useState('PEER-' + Math.random().toString(36).substr(2, 4).toUpperCase());
  const [activeTool, setActiveTool] = useState<'none' | 'chat' | 'whiteboard' | 'notes' | 'logs' | 'media'>('none');
  const [reactions, setReactions] = useState<string[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncData, setSyncData] = useState<{ time: number, state: 'play' | 'pause' }>();

  const {
    isInRoom,
    localStream,
    remotePeers, 
    isMicOn,
    isCameraOn,
    isHandRaised,
    isGlitching,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    manualReconnect,
    toggleMic,
    toggleCamera,
    toggleHandRaise,
    toggleScreenShare
  } = useWebRTC(roomId, userName);

  const {
    messages,
    sendMessage,
    clearMessages,
    notifyTyping,
    isRemoteTyping
  } = useChat(roomId, signaling.userId, userName, activeTool === 'chat');

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
      const entry: LogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          message,
          type
      };
      setLogs(prev => [...prev.slice(-100), entry]);
  };

  useEffect(() => {
    const handleReaction = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        setReactions(prev => [...prev, payload.payload.emoji]);
        setTimeout(() => setReactions(prev => prev.slice(1)), 2000);
    };
    const handleSystemLog = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        addLog(payload.payload.message, payload.payload.type);
    };
    const handleMediaSync = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        setSyncData(payload.payload);
        addLog(`SYNC: MEDIA_UPDATE [${payload.payload.state}]`, 'success');
    };
    signaling.on('reaction', handleReaction);
    signaling.on('system-log', handleSystemLog);
    signaling.on('media-sync', handleMediaSync);
    signaling.on('peer-joined', (p: any) => addLog(`PEER_ID_CONNECTED: ${p.peerId}`, 'success'));
    signaling.on('leave', (p: any) => {
        const id = p.payload?.senderId || p.senderId;
        addLog(`PEER_ID_REMOVED: ${id}`, 'warn');
    });
    return () => {
        signaling.off('reaction', handleReaction);
        signaling.off('system-log', handleSystemLog);
        signaling.off('media-sync', handleMediaSync);
    };
  }, [roomId]);

  useEffect(() => {
     const handleKeyPress = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
             e.preventDefault();
             setShowPalette(true);
         }
     };
     window.addEventListener('keydown', handleKeyPress);
     return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleCommand = (cmd: string) => {
      addLog(`PROTOCOL_EXEC: ${cmd}`, 'info');
      switch(cmd.toLowerCase()) {
          case '/mute': toggleMic(); break;
          case '/cam': toggleCamera(); break;
          case '/share': toggleScreenShare(); break;
          case '/hand': toggleHandRaise(); break;
          case '/media': setActiveTool('media'); break;
          case '/leave': handleLeave(); break;
          case '/clear': setLogs([]); break;
          default: addLog(`ERROR: UNOWN_CMD_${cmd.toUpperCase()}`, 'error');
      }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoom();
    addLog(`INIT: BOOTSTRAPPING_SESSION_LINK...`, 'info');
  };

  const handleLeave = () => {
    leaveRoom();
    clearMessages();
    setActiveTool('none');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    addLog(`SECURE_DATA: ROOM_LINK_BUFFERED`, 'success');
  };

  const toggleTool = (tool: typeof activeTool) => {
      setActiveTool(prev => prev === tool ? 'none' : tool);
  };

  const handleMediaSyncEmit = (time: number, state: 'play' | 'pause') => {
      signaling.sendMediaSync(roomId, { time, state });
  };

  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
        {/* Decorative Spheres */}
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        
        <div className="glass-card-bright p-8 md:p-14 w-full max-w-lg relative z-10 animate-fade-in rounded-[40px] shadow-2xl overflow-hidden border border-white/10 group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex flex-col items-center mb-12">
            <div className="bg-white/5 p-5 mb-8 rounded-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Video className="text-cyan-400 w-14 h-14" />
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-2 tracking-tight group-hover:tracking-tighter transition-all duration-700">Sync<span className="text-cyan-400 font-light">Meet</span></h1>
            <p className="text-white/40 text-sm md:text-base font-medium tracking-widest uppercase flex items-center gap-3">
               <ShieldCheck size={16} className="text-cyan-400/50" /> Secure P2P Mesh Protocol
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-4">
                <div className="relative group/field">
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white/90 font-semibold placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-cyan-500/50 shadow-inner transition-all" 
                      placeholder="Display Name" 
                      required 
                    />
                </div>
                <div className="relative group/field">
                    <input 
                      type="text" 
                      value={roomId} 
                      onChange={(e) => setRoomId(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white/90 font-semibold placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-cyan-500/50 shadow-inner transition-all" 
                      placeholder="Meeting UUID" 
                      required 
                    />
                </div>
            </div>
            
            <button type="submit" className="w-full py-5 rounded-2xl bg-cyan-400 text-black text-xl font-black flex items-center justify-center gap-4 hover:bg-white hover:scale-[1.02] transform transition-all active:scale-95 shadow-xl shadow-cyan-400/20 group/btn">
              START_SESSION <ArrowRight size={24} className="group-hover/btn:translate-x-2 transition-transform" />
            </button>
          </form>

          <div className="mt-10 flex justify-center gap-6 opacity-40">
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white"> <Zap size={14} className="text-cyan-400" /> Ultra-Low Latency </div>
             <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white"> <LayoutDashboard size={14} className="text-cyan-400" /> Advanced Toolkit </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050505] flex flex-col overflow-hidden relative font-sans">
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onCommand={handleCommand} />
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      {/* Top Navigation */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none md:top-8 md:left-10 md:right-10">
        <div className="pointer-events-auto flex items-center gap-4 group">
            <div className="glass-card-bright p-3 rounded-2xl border border-white/10 group-hover:rotate-12 transition-transform">
                <Video className="text-cyan-400 w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="glass-card p-2 md:p-3 px-4 md:px-6 rounded-2xl border border-white/10 flex items-center gap-4 group/chip hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs md:text-sm font-bold text-white/90 uppercase tracking-widest">{roomId}</span>
                </div>
                <button onClick={copyRoomId} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-cyan-400">
                    <Copy size={14} />
                </button>
            </div>
        </div>
        
        <div className="pointer-events-auto hidden md:flex items-center gap-4 glass-card p-2 px-6 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
                <Terminal size={14} /> SYSTEM_TRANSPARENCY_MODE
            </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden pt-24 md:pt-32">
        <div className={`relative flex-1 p-6 transition-all duration-700 flex flex-col ${['chat', 'logs'].includes(activeTool) ? 'md:mr-[420px]' : ''}`}>
            
            {['whiteboard', 'notes', 'media'].includes(activeTool) && (
                <div className="absolute inset-6 md:inset-10 z-[60] animate-fade-in glass-card-bright rounded-[40px] overflow-hidden shadow-2xl border border-white/20">
                    {activeTool === 'whiteboard' && <Whiteboard roomId={roomId} />}
                    {activeTool === 'notes' && <CollaborativeNotes roomId={roomId} />}
                    {activeTool === 'media' && <MediaPlayer syncData={syncData} onSync={handleMediaSyncEmit} onClose={() => setActiveTool('none')} />}
                </div>
            )}

            <div className={`grid gap-6 md:gap-10 w-full h-full max-h-[1400px] mx-auto transition-all duration-700 ${remotePeers.length > 0 ? (remotePeers.length === 1 ? 'md:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3') : 'max-w-6xl md:aspect-video'} ${['whiteboard', 'notes', 'media'].includes(activeTool) ? 'opacity-20 scale-[0.98] blur-xl' : ''}`}>
               <VideoTile stream={localStream} isLocal={true} username={userName} isAudioEnabled={isMicOn} isVideoEnabled={isCameraOn} isHandRaised={isHandRaised} isGlitching={isGlitching} isScreenShare={isScreenSharing} />
               {remotePeers.map(peer => (
                 <VideoTile key={peer.id} stream={peer.stream} username={peer.userName} isAudioEnabled={peer.isMicOn} isVideoEnabled={peer.isCameraOn} isHandRaised={peer.isHandRaised} isGlitching={peer.isGlitching} isTyping={peer.isTyping} networkQuality={peer.networkQuality} connectionState={peer.connectionState} reactions={reactions} onRetry={manualReconnect} />
               ))}
               {remotePeers.length === 0 && (
                 <div className="hidden md:flex flex-col items-center justify-center glass-card rounded-[40px] border border-white/5 group shadow-inner">
                   <div className="p-8 bg-white/5 rounded-full mb-8 group-hover:bg-cyan-500/10 transition-colors">
                        <Users className="text-white/20 w-16 h-16 group-hover:text-cyan-400 transition-colors" />
                   </div>
                   <h3 className="text-white/30 text-2xl font-bold uppercase tracking-widest text-center max-w-xs">Waiting for peers to join...</h3>
                   <p className="mt-4 text-white/10 text-xs font-medium uppercase text-center flex items-center gap-2"> <CheckCircle2 size={12} /> SECURE_LINK_ACTIVATED</p>
                 </div>
               )}
            </div>
        </div>

        {/* Floating Sidebar (Chat/Logs) */}
        <div className={`fixed top-6 right-6 bottom-6 w-full md:w-[400px] z-[100] transform transition-all duration-700 bg-transparent flex flex-col ${['chat', 'logs'].includes(activeTool) ? 'translate-x-0 opacity-100' : 'translate-x-[450px] opacity-0'}`}>
          <div className="glass-card-bright h-full rounded-[40px] flex flex-col shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-6 pb-2 flex gap-4">
                <button onClick={() => setActiveTool('chat')} className={`flex-1 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all ${activeTool === 'chat' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>MESSAGES</button>
                <button onClick={() => setActiveTool('logs')} className={`flex-1 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all ${activeTool === 'logs' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>CONSOLE</button>
                <button onClick={() => setActiveTool('none')} className="bg-white/5 p-4 rounded-2xl text-white/40 hover:bg-red-500 hover:text-white transition-all"><ArrowRight size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden p-3 mt-4">
                {activeTool === 'chat' && <Chat roomId={roomId} userName={userName} messages={messages} onSendMessage={sendMessage} onNotifyTyping={notifyTyping} isRemoteTyping={isRemoteTyping} />}
                {activeTool === 'logs' && <SystemLogs logs={logs} onClear={() => setLogs([])} />}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tool Dock */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[110] w-full max-w-fit px-6 pointer-events-none flex flex-col items-center gap-6">
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4 glass-card-bright p-3 md:p-5 rounded-[32px] shadow-2xl border border-white/20 transition-all hover:border-cyan-500/30">
            <Controls onToggleMic={toggleMic} isMicOn={isMicOn} onToggleCamera={toggleCamera} isCameraOn={isCameraOn} onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} onToggleHandRaise={toggleHandRaise} isHandRaised={isHandRaised} onToggleTool={toggleTool} activeTool={activeTool} onLeave={handleLeave} onSendReaction={(emoji) => signaling.sendReaction(roomId, emoji)} />
            <div className="w-[1px] h-10 bg-white/10 mx-2" />
            <div className="flex items-center gap-2">
                <button onClick={() => toggleTool('media')} className={`p-4 rounded-2xl transition-all shadow-sm ${activeTool === 'media' ? 'bg-cyan-400 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`} title="Watch Together"><Tv size={22} /></button>
                <button onClick={() => setShowPalette(true)} className="p-4 rounded-2xl bg-white/5 text-white hover:bg-cyan-400 hover:text-black transition-all shadow-sm" title="Command Center"><Terminal size={22} /></button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;