import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Captions as CaptionsIcon,
  Circle
} from 'lucide-react';
import VideoTile from './components/VideoTile';
import Controls from './components/Controls';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import CollaborativeNotes from './components/CollaborativeNotes';
import CommandPalette from './components/CommandPalette';
import SystemLogs, { LogEntry } from './components/SystemLogs';
import MediaPlayer from './components/MediaPlayer';
import Polls from './components/Polls';
import Dashboard from './components/Dashboard';

import { useWebRTC } from './hooks/useWebRTC';
import { useChat } from './hooks/useChat';
import { useCaptions } from './hooks/useCaptions';
import { useRecorder } from './hooks/useRecorder';

import { signaling } from './services/signaling';
import { SignalPayload, Poll } from './types';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [activeTool, setActiveTool] = useState<'none' | 'chat' | 'whiteboard' | 'notes' | 'logs' | 'media' | 'polls' | 'dashboard'>('none');
  const [reactions, setReactions] = useState<string[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncData, setSyncData] = useState<{ time: number, state: 'play' | 'pause' }>();
  
  // New States
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stats, setStats] = useState({ bitrate: 4.23, latency: 42, packetLoss: 0.1, connections: 0, quality: 'Excellent' as const });

  const {
    isInRoom, localStream, remotePeers, isMicOn, isCameraOn, isHandRaised, isGlitching, isScreenSharing,
    permissionError, setPermissionError,
    joinRoom, leaveRoom, manualReconnect, toggleMic, toggleCamera, toggleHandRaise, toggleScreenShare
  } = useWebRTC(roomId, userName);

  const { messages, sendMessage, clearMessages, notifyTyping, isRemoteTyping } = useChat(roomId, signaling.userId, userName, activeTool === 'chat');

  const { isRecording, startRecording, stopRecording } = useRecorder(localStream);

  useCaptions(isCaptionsOn && isMicOn, (text) => {
      setCurrentCaption(text);
      signaling.sendCaption(roomId, text);
      setTimeout(() => setCurrentCaption(''), 4000);
  });

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
      const entry: LogEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), message, type };
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
    const handleCaption = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        addLog(`CC: [${payload.senderName}] ${payload.payload.text}`, 'info');
    };
    const handlePollUpdate = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        setPolls(prev => {
           const existing = prev.find(p => p.id === payload.payload.poll.id);
           if (existing) return prev.map(p => p.id === payload.payload.poll.id ? payload.payload.poll : p);
           return [...prev, payload.payload.poll];
        });
        addLog(`POLL: NEW_POLL_BROADCAST`, 'success');
    };
    const handlePollVote = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        setPolls(prev => prev.map(poll => {
            if (poll.id === payload.payload.pollId) {
                const newOptions = poll.options.map(opt => opt.id === payload.payload.optionId ? { ...opt, votes: opt.votes + 1 } : opt);
                const updated = { ...poll, options: newOptions, totalVotes: poll.totalVotes + 1 };
                if (poll.creatorName === userName) signaling.sendPollUpdate(roomId, updated);
                return updated;
            }
            return poll;
        }));
    };

    signaling.on('reaction', handleReaction);
    signaling.on('system-log', handleSystemLog);
    signaling.on('caption-update', handleCaption);
    signaling.on('poll-update', handlePollUpdate);
    signaling.on('poll-vote', handlePollVote);
    signaling.on('peer-joined', (p: any) => addLog(`PEER_ID_CONNECTED: ${p.peerId}`, 'success'));
    signaling.on('leave', (p: any) => addLog(`PEER_ID_REMOVED: ${p.payload?.senderId || p.senderId}`, 'warn'));

    return () => {
        signaling.off('reaction', handleReaction);
        signaling.off('system-log', handleSystemLog);
        signaling.off('caption-update', handleCaption);
        signaling.off('poll-update', handlePollUpdate);
        signaling.off('poll-vote', handlePollVote);
    };
  }, [roomId, userName]);

  useEffect(() => {
     setStats(prev => ({ ...prev, connections: remotePeers.length }));
  }, [remotePeers.length]);

  const handleCommand = (cmd: string) => {
      addLog(`PROTOCOL_EXEC: ${cmd}`, 'info');
      switch(cmd.toLowerCase()) {
          case '/record': !isRecording ? startRecording() : stopRecording(); break;
          case '/captions': setIsCaptionsOn(!isCaptionsOn); break;
          case '/mute': toggleMic(); break;
          case '/cam': toggleCamera(); break;
          case '/polls': setActiveTool('polls'); break;
          case '/dash': setActiveTool('dashboard'); break;
          case '/leave': handleLeave(); break;
          default: addLog(`ERROR: UNOWN_CMD_${cmd.toUpperCase()}`, 'error');
      }
  };

  const handleCreatePoll = (question: string, options: string[]) => {
      const newPoll: Poll = {
          id: Math.random().toString(36).substr(2, 9),
          question,
          options: options.map(opt => ({ id: Math.random().toString(36).substr(2, 5), text: opt, votes: 0 })),
          creatorName: userName,
          totalVotes: 0
      };
      setPolls(prev => [...prev, newPoll]);
      signaling.sendPollUpdate(roomId, newPoll);
  };

  const handleVote = (pollId: string, optionId: string) => {
      signaling.sendPollVote(roomId, pollId, optionId);
      setPolls(prev => prev.map(p => p.id === pollId ? { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o), totalVotes: p.totalVotes + 1 } : p));
  };

  const handleSendReaction = (emoji: string) => {
      signaling.sendReaction(roomId, emoji);
      setReactions(prev => [...prev, emoji]);
      setTimeout(() => setReactions(prev => prev.slice(1)), 2000);
  };

  const handleJoin = (e: React.FormEvent) => { e.preventDefault(); joinRoom(); addLog(`INIT: BOOTSTRAPPING_SESSION_LINK...`, 'info'); };
  const handleLeave = () => { leaveRoom(); clearMessages(); setActiveTool('none'); };
  const toggleTool = (tool: typeof activeTool) => setActiveTool(prev => prev === tool ? 'none' : tool);

  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-transparent relative overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
        
        {/* Hardware Status Error Overlay */}
        {permissionError && (
            <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-[200] w-full max-w-sm px-6 animate-slide-up">
                <div className="glass-card-bright p-8 rounded-[32px] border border-red-500/30 shadow-2xl backdrop-blur-3xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500/40" />
                    <div className="flex flex-col items-center text-center">
                        <div className="p-4 bg-red-500/10 rounded-2xl mb-6 pulse-accent"> <ShieldCheck className="text-red-500 w-10 h-10" /> </div>
                        <h4 className="text-xl font-black text-white/90 uppercase tracking-[0.2em] mb-4 italic">HARDWARE_BLOCKED_</h4>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-loose mb-8"> {permissionError === 'ACCESS_DENIED_BY_USER' ? 'Session blocked: Please grant camera/mic permissions in your address bar protocol settings.' : 'Hardware conflict: Your devices are busy or not found in the initial handshake.'} </p>
                        <div className="flex w-full gap-4">
                            <button onClick={joinRoom} className="flex-1 py-4 bg-cyan-400 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white transition-all">RETRY_INIT</button>
                            <button onClick={() => setPermissionError(null)} className="flex-1 py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all">DISMISS</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="glass-card-bright p-8 md:p-14 w-full max-w-lg relative z-10 rounded-[40px] shadow-2xl border border-white/10 group">
          <div className="flex flex-col items-center mb-12">
            <div className="bg-white/5 p-5 mb-8 rounded-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500"><Video className="text-cyan-400 w-14 h-14" /></div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-2 tracking-tight group-hover:tracking-tighter transition-all duration-700">Sync<span className="text-cyan-400 font-light">Meet</span></h1>
            <p className="text-white/40 text-sm md:text-base font-medium tracking-widest uppercase flex items-center gap-3"><ShieldCheck size={16} className="text-cyan-400/50" /> Secure P2P Mesh Protocol</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="relative group/field"><input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white/90 font-semibold placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-cyan-400/50 shadow-inner transition-all" placeholder="Display Name" required /></div>
            <div className="relative group/field"><input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white/90 font-semibold placeholder:text-white/20 outline-none focus:bg-white/10 focus:border-cyan-400/50 shadow-inner transition-all" placeholder="Meeting UUID" required /></div>
            <button type="submit" className="w-full py-5 rounded-2xl bg-cyan-400 text-black text-xl font-black flex items-center justify-center gap-4 hover:bg-white hover:scale-[1.02] transform transition-all active:scale-95 shadow-xl shadow-cyan-400/20 group/btn">START_SESSION <ArrowRight size={24} className="group-hover/btn:translate-x-2 transition-transform" /></button>
          </form>
          <div className="mt-10 flex justify-center gap-6 opacity-40"><div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white"> <Zap size={14} className="text-cyan-400" /> Ultra-Low Latency </div><div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white"> <LayoutDashboard size={14} className="text-cyan-400" /> Advanced Toolkit </div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#050505] flex flex-col overflow-hidden relative font-sans">
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onCommand={handleCommand} />
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      {/* HUD & Overlays */}
      <div className="absolute top-8 left-10 flex gap-4 z-[110]">
         {isRecording && (
            <div className="glass-card-bright p-3 px-6 rounded-2xl flex items-center gap-4 border border-red-500/30 animate-pulse shadow-lg shadow-red-500/10">
               <Circle size={12} fill="currentColor" className="text-red-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-white/90">RECORDING_IN_PROGRESS</span>
            </div>
         )}
         {isCaptionsOn && (
            <div className="glass-card-bright p-3 px-6 rounded-2xl flex items-center gap-4 border border-cyan-400/30 shadow-lg shadow-cyan-400/10">
               <CaptionsIcon size={12} className="text-cyan-400" />
               <span className="text-[10px] font-black uppercase tracking-widest text-white/90">LIVE_TRANSCRIPTION_ON</span>
            </div>
         )}
      </div>

      <div className="absolute top-8 right-10 z-[110] glass-card p-2 px-6 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400"> <Zap size={14} /> MESH_ENCRYPTED_LINK_{roomId} </div>
      </div>

      <div className="flex-1 flex flex-col relative md:pt-32 pt-24 pb-32 overflow-hidden px-4 md:px-10">
         <div className={`relative flex-1 transition-all duration-700 flex flex-col ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'lg:mr-[420px]' : ''}`}>
            {['whiteboard', 'notes', 'media'].includes(activeTool) && (
                <div className="absolute inset-0 z-[120] lg:z-[60] animate-fade-in glass-card-bright md:rounded-[40px] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                    {activeTool === 'whiteboard' && <Whiteboard roomId={roomId} />}
                    {activeTool === 'notes' && <CollaborativeNotes roomId={roomId} />}
                    {activeTool === 'media' && <MediaPlayer syncData={syncData} onSync={(t, s) => signaling.sendMediaSync(roomId, { time: t, state: s })} onClose={() => setActiveTool('none')} />}
                </div>
            )}

            <div className={`grid gap-4 md:gap-10 w-full h-full mx-auto transition-all 
                ${remotePeers.length === 0 ? 'max-w-6xl aspect-video' : 
                  remotePeers.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} 
                ${['whiteboard', 'notes', 'media'].includes(activeTool) ? 'opacity-20 scale-[0.98] blur-xl h-0 pointer-events-none' : ''}`}>
               
               <div className="w-full aspect-video md:aspect-auto h-full">
                  <VideoTile stream={localStream} isLocal={true} username={userName} isAudioEnabled={isMicOn} isVideoEnabled={isCameraOn} isHandRaised={isHandRaised} isGlitching={isGlitching} isScreenShare={isScreenSharing} />
               </div>

               {remotePeers.map(peer => (
                 <div key={peer.id} className="w-full aspect-video md:aspect-auto h-full">
                    <VideoTile stream={peer.stream} username={peer.userName} isAudioEnabled={peer.isMicOn} isVideoEnabled={peer.isCameraOn} isHandRaised={peer.isHandRaised} isGlitching={peer.isGlitching} isTyping={peer.isTyping} networkQuality={peer.networkQuality} connectionState={peer.connectionState} reactions={reactions} onRetry={manualReconnect} />
                 </div>
               ))}
               
               {remotePeers.length === 0 && (
                 <div className="hidden sm:flex flex-col items-center justify-center glass-card rounded-[32px] md:rounded-[40px] border border-white/5 opacity-40 shadow-inner p-10">
                   <Users className="text-white/20 w-12 h-12 md:w-16 md:h-16 mb-6" />
                   <h3 className="text-white/30 text-lg md:text-2xl font-bold uppercase tracking-widest text-center">Awaiting Mesh nodes...</h3>
                 </div>
               )}
            </div>

            {/* Captions Presentation Overlay - Floating above controls */}
            {isCaptionsOn && currentCaption && (
               <div className="absolute bottom-32 md:bottom-40 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4 animate-slide-up pointer-events-none">
                  <div className="glass-card-bright p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-cyan-400/30 text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
                      <p className="text-xl md:text-3xl font-black text-white uppercase tracking-tight leading-relaxed italic drop-shadow-2xl">
                         <span className="text-cyan-400 mr-2 md:mr-6 font-light">[{userName.split('-')[1]}]:</span> {currentCaption}
                      </p>
                  </div>
               </div>
            )}
         </div>

         {/* Right Sidebar Toolings - Fullscreen on mobile, anchored on desktop */}
         <div className={`fixed inset-0 lg:inset-y-8 lg:right-8 lg:left-auto lg:w-[400px] z-[150] lg:z-[100] transform transition-all duration-700 ease-in-out p-4 md:p-0
             ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="glass-card-bright h-full md:rounded-[40px] rounded-3xl flex flex-col shadow-2xl border border-white/10 overflow-hidden">
               <div className="p-4 md:p-6 pb-2 grid grid-cols-2 gap-2 md:gap-3">
                  <button onClick={() => setActiveTool('chat')} className={`py-3 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase text-[8px] md:text-[9px] tracking-widest transition-all ${activeTool === 'chat' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>MESSAGES</button>
                  <button onClick={() => setActiveTool('polls')} className={`py-3 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase text-[8px] md:text-[9px] tracking-widest transition-all ${activeTool === 'polls' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>POLLS</button>
                  <button onClick={() => setActiveTool('dashboard')} className={`py-3 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase text-[8px] md:text-[9px] tracking-widest transition-all ${activeTool === 'dashboard' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>TELEMETRY</button>
                  <button onClick={() => setActiveTool('logs')} className={`py-3 md:py-4 rounded-xl md:rounded-2xl font-bold uppercase text-[8px] md:text-[9px] tracking-widest transition-all ${activeTool === 'logs' ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>CONSOLE</button>
               </div>
               <div className="flex-1 overflow-hidden">
                  {activeTool === 'chat' && <Chat roomId={roomId} userName={userName} messages={messages} onSendMessage={sendMessage} onNotifyTyping={notifyTyping} isRemoteTyping={isRemoteTyping} />}
                  {activeTool === 'logs' && <SystemLogs logs={logs} onClear={() => setLogs([])} />}
                  {activeTool === 'polls' && <Polls polls={polls} onVote={handleVote} onCreate={handleCreatePoll} onClear={() => setPolls([])} />}
                  {activeTool === 'dashboard' && <Dashboard stats={stats} />}
               </div>
               <button onClick={() => setActiveTool('none')} className="m-4 md:m-6 bg-red-500/10 text-red-500 py-4 md:p-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all">EXIT_SIDEBAR_</button>
            </div>
         </div>
      </div>

      <div className="fixed bottom-6 md:bottom-10 left-0 right-0 z-[110] flex justify-center px-4 md:px-0 pointer-events-none">
         <div className="pointer-events-auto shadow-[0_0_80px_rgba(0,0,0,0.5)] w-full max-w-fit overflow-x-auto custom-scrollbar">
            <Controls onToggleMic={toggleMic} isMicOn={isMicOn} onToggleCamera={toggleCamera} isCameraOn={isCameraOn} onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} onToggleHandRaise={toggleHandRaise} isHandRaised={isHandRaised} onToggleTool={toggleTool} activeTool={activeTool} onLeave={handleLeave} onSendReaction={handleSendReaction} isRecording={isRecording} onToggleRecording={() => !isRecording ? startRecording() : stopRecording()} isCaptionsOn={isCaptionsOn} onToggleCaptions={() => setIsCaptionsOn(!isCaptionsOn)} />
         </div>
      </div>
    </div>
  );
};

export default App;