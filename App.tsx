import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Terminal as TerminalIcon,
  Zap,
  Circle,
  Hash,
  Activity,
  Box,
  Layout,
  Command as CommandIcon,
  ShieldAlert
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

import { playEmojiSound } from './utils/sounds';

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
  const [reactions, setReactions] = useState<{ id: string, emoji: string, senderId?: string }[]>([]);
  const [showPalette, setShowPalette] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [syncData] = useState<{ time: number, state: 'play' | 'pause' }>();
  
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stats, setStats] = useState({ bitrate: 4.23, latency: 42, packetLoss: 0.1, connections: 0, quality: 'Excellent' as const });

  const {
    isInRoom, localStream, remotePeers, isMicOn, isCameraOn, isHandRaised, isGlitching, isScreenSharing,
    permissionError, setPermissionError,
    joinRoom, leaveRoom, manualReconnect, toggleMic, toggleCamera, toggleHandRaise, toggleScreenShare
  } = useWebRTC(roomId, userName) as any;

  const { messages, sendMessage, clearMessages, notifyTyping, isRemoteTyping } = useChat(roomId, signaling.userId, userName, activeTool === 'chat');

  const { isRecording, startRecording, stopRecording } = useRecorder(localStream);

  const captionTimeoutRef = useRef<any>(null);

  useCaptions(isCaptionsOn && isMicOn, (text) => {
      setCurrentCaption(text);
      // Synchronize with mesh immediately
      signaling.sendCaption(roomId, text);
      
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => {
          setCurrentCaption('');
      }, 5000); // 5s shelf life
  });

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
      const entry: LogEntry = { id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toLocaleTimeString(), message, type };
      setLogs(prev => [...prev.slice(-100), entry]);
  };

  useEffect(() => {
    const handleReaction = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const newReaction = { 
            id: Math.random().toString(36).substr(2, 9), 
            emoji: payload.payload.emoji,
            senderId: payload.senderId
        };
        setReactions(prev => [...prev, newReaction]);
        playEmojiSound(payload.payload.emoji); // Sound for remote reactions
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);
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
    signaling.on('peer-joined', (p: any) => addLog(`PEER_CONNECTED: ${p.peerId}`, 'success'));
    signaling.on('leave', (p: any) => addLog(`PEER_REMOVED: ${p.payload?.senderId || p.senderId}`, 'warn'));

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
      addLog(`EXEC: ${cmd}`, 'info');
      switch(cmd.toLowerCase()) {
          case '/record': !isRecording ? startRecording() : stopRecording(); break;
          case '/captions': setIsCaptionsOn(!isCaptionsOn); break;
          case '/mute': toggleMic(); break;
          case '/cam': toggleCamera(); break;
          case '/polls': setActiveTool('polls'); break;
          case '/dash': setActiveTool('dashboard'); break;
          case '/leave': handleLeave(); break;
          default: addLog(`ERR: UNKNOWN_${cmd.toUpperCase()}`, 'error');
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
      const newReaction = { id: Math.random().toString(36).substr(2, 9), emoji, senderId: signaling.userId };
      setReactions(prev => [...prev, newReaction]);
      playEmojiSound(emoji); // Sound for local reaction
      setTimeout(() => setReactions(prev => prev.filter(r => r.id !== newReaction.id)), 3000);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!userName.trim() || !roomId.trim()) {
        setFormError('MISSING_FIELDS');
        return;
    }
    setFormError(null);
    joinRoom(); 
    addLog(`INIT_HANDSHAKE_v4`, 'info'); 
  };

  const handleLeave = () => { leaveRoom(); clearMessages(); setActiveTool('none'); };
  const toggleTool = (tool: typeof activeTool) => setActiveTool(prev => prev === tool ? 'none' : tool);

  if (!isInRoom) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 md:p-10 bg-[#f0f0f0] brutal-bg-pattern relative overflow-hidden font-mono">
        {/* Abstract Background Shapes */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-[var(--brutal-yellow)] border-8 border-black -rotate-12 brutal-card shadow-[20px_20px_0px_#000] -z-0 hidden lg:block" />
        <div className="absolute top-1/4 right-20 w-48 h-48 bg-[var(--brutal-pink)] border-8 border-black rotate-6 brutal-card shadow-[15px_15px_0px_#000] -z-0 hidden lg:block" />
        <div className="absolute bottom-10 left-1/4 w-80 h-24 bg-[var(--brutal-blue)] border-8 border-black -rotate-3 brutal-card shadow-[10px_10px_0px_#000] -z-0 hidden lg:block" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-[var(--brutal-violet)] border-8 border-black rotate-12 brutal-card shadow-[25px_25px_0px_#000] -z-0 hidden lg:block" />

        {/* Permission Overlay */}
        {permissionError && (
            <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
                <div className="brutal-card bg-[var(--brutal-red)] p-6 md:p-10 border-4 border-black max-w-md w-full shadow-[10px_10px_0px_#000] md:shadow-[20px_20px_0px_#000]">
                    <div className="flex flex-col items-center gap-4 md:gap-6 text-white">
                        <ShieldAlert strokeWidth={3} className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] brutal-shake" />
                        <h2 className="text-3xl md:text-4xl font-black uppercase text-center tracking-tighter italic">ACCESS_DENIED</h2>
                        <p className="text-center font-bold uppercase tracking-widest text-[10px] md:text-sm opacity-90 leading-relaxed">Sensor feedback blocked by local admin protocols.</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 mt-8 md:mt-10">
                        <button onClick={joinRoom} className="flex-1 brutal-btn p-4 bg-white hover:bg-[#f0f0f0]">RE_INIT</button>
                        <button onClick={() => setPermissionError(null)} className="flex-1 brutal-btn p-4 bg-black text-white hover:bg-zinc-800">CLOSE</button>
                    </div>
                </div>
            </div>
        )}

        <div className="relative z-10 w-full max-w-4xl flex flex-col lg:flex-row gap-6 md:gap-10 items-stretch">
           {/* Left Hero Section */}
           <div className="flex-1 flex flex-col justify-between p-6 md:p-10 bg-black text-white border-[6px] md:border-[8px] border-black shadow-[10px_10px_0px_var(--brutal-yellow)] md:shadow-[20px_20px_0px_var(--brutal-yellow)]">
              <div>
                <Activity className="text-[var(--brutal-yellow)] mb-4 md:mb-6 w-8 h-8 md:w-12 md:h-12" />
                <h1 className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter italic leading-[0.8] mb-4 md:mb-6 glitch-effect">SYNC<br/><span className="text-[var(--brutal-yellow)]">MEET</span></h1>
                <p className="max-w-xs font-black uppercase tracking-widest text-[8px] md:text-xs opacity-50 italic">Ultra high-chroma peer-to-peer transmission engine v4.0.ALPHA</p>
              </div>
              <div className="mt-8 md:mt-20">
                <div className="flex flex-wrap gap-2">
                   {['P2P', 'AES_256', 'LOW_LATENCY', 'PROTO_MESH'].map(tag => (
                       <span key={tag} className="bg-white text-black px-2 md:px-3 py-0.5 md:py-1 text-[7px] md:text-[8px] font-black border-2 border-black tracking-tighter">{tag}</span>
                   ))}
                </div>
              </div>
           </div>

           {/* Right Form Section */}
           <div className="flex-1 brutal-card p-6 md:p-12 bg-white flex flex-col justify-center border-[6px] md:border-[8px] shadow-[10px_10px_0px_var(--brutal-violet)] md:shadow-[20px_20px_0px_var(--brutal-violet)]">
               <div className="mb-10 md:mb-14 relative">
                  <span className="absolute -top-10 -left-6 md:-top-16 md:-left-12 text-[60px] md:text-[80px] font-black opacity-5 select-none pointer-events-none tracking-tighter">PROTO_X</span>
                  <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-[0.9] mb-4">ACCESS<br />PORTAL</h2>
                  <div className="h-2 md:h-3 w-16 md:w-24 bg-[var(--brutal-violet)]" />
               </div>
               
               <form onSubmit={handleJoin} className="space-y-4 md:space-y-6">
                <div className="group">
                   <label className="block text-[8px] md:text-[10px] font-black uppercase mb-1 ml-1 tracking-widest">USER_ID</label>
                   <input 
                     type="text" 
                     value={userName} 
                     onChange={(e) => {setUserName(e.target.value); if(formError) setFormError(null);}} 
                     className={`w-full brutal-input text-xs md:text-sm p-4 md:p-5 ${formError && !userName.trim() ? 'brutal-shake border-[var(--brutal-red)]' : ''}`} 
                     placeholder="TYPE_IDENTIFIER" 
                   />
                </div>
                <div className="group">
                   <label className="block text-[8px] md:text-[10px] font-black uppercase mb-1 ml-1 tracking-widest">SESSION_KEY</label>
                   <input 
                     type="text" 
                     value={roomId} 
                     onChange={(e) => {setRoomId(e.target.value); if(formError) setFormError(null);}} 
                     className={`w-full brutal-input text-xs md:text-sm p-4 md:p-5 ${formError && !roomId.trim() ? 'brutal-shake border-[var(--brutal-red)]' : ''}`} 
                     placeholder="ENTER_UUID" 
                   />
                </div>
                {formError && (
                    <div className="bg-[var(--brutal-red)] text-white p-3 font-black text-[8px] md:text-[10px] uppercase tracking-widest border-2 border-black flex items-center gap-3 animate-shake">
                        <ShieldAlert size={14} /> ERROR: {formError}
                    </div>
                )}
                <button type="submit" className="w-full py-4 md:py-5 brutal-btn-violet text-xl md:text-2xl font-black shadow-[6px_6px_0px_#000] md:shadow-[10px_10px_0px_#000] hover:shadow-none translate-x-0 active:translate-x-[6px] active:translate-y-[6px]">
                   BOOT_STREAM_
                </button>
              </form>

            </div>
         </div>
       </div>
     );
   }

  return (
    <div className="h-[100dvh] w-full bg-[#f8f8f8] brutal-bg-pattern flex flex-col overflow-hidden relative font-mono text-black">
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onCommand={handleCommand} />
      
      {/* HUD HEADER */}
      <div className="h-16 md:h-20 border-b-[4px] md:border-b-[6px] border-black bg-white flex items-center justify-between px-4 md:px-6 z-[110] shadow-[0_4px_0px_#000] md:shadow-[0_6px_0px_#000]">
        <div className="flex items-center gap-4 md:gap-8">
           <div className="font-black italic text-xl md:text-3xl tracking-tighter select-none glitch-effect">SYNC<span className="bg-[var(--brutal-yellow)] px-1.5 md:px-2 ml-1 border-2 border-black text-sm md:text-lg">MEET</span></div>
           <div className="hidden sm:flex items-center gap-2 md:gap-3 bg-[var(--brutal-cyan)] border-2 md:border-4 border-black px-2 md:px-4 py-0.5 md:py-1 text-[9px] md:text-[11px] font-black uppercase shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]"> 
              <Box strokeWidth={3} className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" /> {roomId} 
           </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
           {isRecording && (
                <div className="bg-[var(--brutal-red)] text-white border-2 md:border-4 border-black px-2 md:px-4 py-1 md:py-1.5 flex items-center gap-2 md:gap-3 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000]">
                   <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />
                   <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest hidden xs:block">RECORDING</span>
                </div>
           )}
           <div className="flex items-center gap-2 md:gap-3 bg-black text-white px-3 md:px-5 py-1.5 md:py-2 text-[8px] md:text-[10px] font-black uppercase border-2 md:border-4 border-black shadow-[3px_3px_0px_#facc15] md:shadow-[4px_4px_0px_#facc15]">
              <Circle size={8} className="border-none fill-[var(--brutal-yellow)]" /> <span className="hidden sm:inline">LIVE_PROTO_STREAM</span><span className="sm:hidden">LIVE</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
         {/* MAIN TRANSMISSION HUB */}
         <div className={`flex-1 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] relative
            ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'lg:mr-[460px]' : ''}`}>
            {/* MESH_VIEWPORT: Adaptive grid that respects sidebar docking */}
            <div className={`flex-1 flex flex-col items-center justify-center p-4 md:p-12 transition-all duration-700
                ${['whiteboard', 'notes', 'media'].includes(activeTool) ? 'opacity-5 scale-[0.95] blur-2xl pointer-events-none' : 'w-full h-full'}`}>
               
               <div className={`grid gap-4 md:gap-10 w-full max-w-[1600px] h-full transition-all duration-500 mx-auto content-center
                  ${remotePeers.length === 0 ? 'grid-cols-1 max-w-[1000px] aspect-video' : 
                    remotePeers.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 
                    remotePeers.length === 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                    'grid-cols-2 lg:grid-cols-4'}`}>
                  
                  {/* LOCAL_NODE */}
                  <div className="w-full h-full brutal-card-highlight overflow-hidden border-4 md:border-[6px] aspect-video">
                     <VideoTile 
                        stream={localStream} 
                        isLocal={true} 
                        username={userName.toUpperCase()} 
                        isAudioEnabled={isMicOn} 
                        isVideoEnabled={isCameraOn} 
                        isHandRaised={isHandRaised} 
                        isGlitching={isGlitching} 
                        isScreenShare={isScreenSharing}
                        reactions={reactions.filter(r => r.senderId === signaling.userId).map(r => r.emoji)}
                     />
                  </div>

                  {/* REMOTE_NODES */}
                  {remotePeers.filter((p: any) => p && typeof p === 'object' && p.id).map((peer: any) => (
                     <div key={peer.id} className="w-full h-full brutal-card-highlight overflow-hidden border-4 md:border-[6px] aspect-video">
                        <VideoTile 
                            stream={peer.stream} 
                            username={(peer.userName || 'GUEST').toUpperCase()} 
                            isAudioEnabled={peer.isMicOn} 
                            isVideoEnabled={peer.isCameraOn} 
                            isHandRaised={peer.isHandRaised} 
                            isGlitching={peer.isGlitching} 
                            isTyping={peer.isTyping} 
                            networkQuality={peer.networkQuality} 
                            connectionState={peer.connectionState as any} 
                            reactions={reactions.filter(r => r.senderId === peer.id).map(r => r.emoji)} 
                            onRetry={manualReconnect as any} 
                        />
                     </div>
                  ))}
               </div>
            </div>

            {/* FLOATING SUBTITLES - RELOCATED TO TOP FOR VISIBILITY */}
            {isCaptionsOn && currentCaption && (
               <div className="absolute top-24 md:top-32 left-0 right-0 z-[250] w-full max-w-2xl px-4 md:px-6 mx-auto pointer-events-none drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  <div 
                    key={currentCaption.split(' ').slice(-1)[0]} 
                    className="brutal-card bg-black text-white p-3 md:p-4 border-[3px] border-[var(--brutal-yellow)] shadow-[6px_6px_0px_#000] text-center animate-slide-up"
                  >
                      <p className="text-xs md:text-xl font-black uppercase tracking-tighter leading-tight italic font-mono overflow-hidden whitespace-nowrap overflow-ellipsis">
                         <span className="text-[var(--brutal-yellow)] bg-white/10 px-1.5 mr-3 border-r-2 border-white/20">{userName.substring(0, 3)}:</span> 
                         {currentCaption}
                         <span className="ml-1.5 inline-block w-1.5 md:w-3 h-3 md:h-5 bg-[var(--brutal-cyan)] animate-pulse" />
                      </p>
                  </div>
               </div>
            )}
         </div>

         {/* SIDEBAR PANEL - Docked on Desktop, Drawer on Mobile */}
         <div className={`fixed lg:absolute top-0 bottom-0 right-0 z-[150] transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] transform 
             ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'translate-x-0 w-full lg:w-[440px]' : 'translate-x-full w-full lg:w-[440px] pointer-events-none'}`}>
            <div className="h-full bg-white flex flex-col overflow-hidden border-l-[6px] md:border-l-[8px] border-black shadow-[-10px_0_30px_rgba(0,0,0,0.1)]">
               <div className="bg-black text-white p-4 md:p-5 font-black uppercase tracking-[.2em] flex items-center justify-between border-b-4 border-black">
                  <div className="flex items-center gap-3">
                     <CommandIcon strokeWidth={3} className="text-[var(--brutal-yellow)] w-[18px] h-[18px] md:w-5 md:h-5" />
                     <span className="text-[10px] md:text-xs">{activeTool}_PROTOCOL</span>
                  </div>
                  <button onClick={() => setActiveTool('none')} className="hover:text-[var(--brutal-red)] transition-colors p-2 text-xs md:text-sm font-black">[CLOSE_X]</button>
               </div>
               
               {/* Quick Tool Switcher */}
               <div className="p-3 md:p-4 grid grid-cols-4 gap-2 border-b-8 border-black bg-[#f0f0f0]">
                  {[
                    { id: 'chat', label: 'MSG', color: '--brutal-violet' },
                    { id: 'polls', label: 'POLL', color: '--brutal-pink' },
                    { id: 'dashboard', label: 'TELE', color: '--brutal-cyan' },
                    { id: 'logs', label: 'LOGS', color: '--brutal-orange' }
                  ].map(btn => (
                    <button 
                       key={btn.id} 
                       onClick={() => setActiveTool(btn.id as any)} 
                       className={`brutal-btn py-2 text-[8px] md:text-[9px] px-0 font-black uppercase italic ${activeTool === btn.id ? `bg-[var(${btn.color})] text-white shadow-none translate-x-1 translate-y-1` : 'bg-white'}`}
                    >
                       {btn.label}
                    </button>
                  ))}
               </div>
               <div className="flex-1 overflow-hidden">
                  {activeTool === 'chat' && <Chat roomId={roomId} userName={userName} messages={messages} onSendMessage={sendMessage} onNotifyTyping={notifyTyping} isRemoteTyping={isRemoteTyping} />}
                  {activeTool === 'logs' && <SystemLogs logs={logs} onClear={() => setLogs([])} />}
                  {activeTool === 'polls' && <Polls polls={polls} onVote={handleVote} onCreate={handleCreatePoll} onClear={() => setPolls([])} />}
                  {activeTool === 'dashboard' && <Dashboard stats={stats} />}
               </div>
            </div>
         </div>
      </div>

      {/* FIXED CONTROL BAR - Adjusted for mobile */}
      <div className="fixed bottom-4 md:bottom-12 left-0 right-0 z-[110] flex justify-center px-4 md:px-6 pointer-events-none">
         <div className="pointer-events-auto flex w-full max-w-full lg:max-w-fit gap-2 md:gap-6 brutal-card bg-white p-2 md:p-4 border-[4px] md:border-[6px] border-black shadow-[8px_8px_0px_#000] md:shadow-[15px_15px_0px_#000] overflow-x-auto custom-scrollbar no-scrollbar">
            <Controls onToggleMic={toggleMic} isMicOn={isMicOn} onToggleCamera={toggleCamera} isCameraOn={isCameraOn} onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} onToggleHandRaise={toggleHandRaise} isHandRaised={isHandRaised} onToggleTool={toggleTool} activeTool={activeTool} onLeave={handleLeave} onSendReaction={handleSendReaction} isRecording={isRecording} onToggleRecording={() => !isRecording ? startRecording() : stopRecording()} isCaptionsOn={isCaptionsOn} onToggleCaptions={() => setIsCaptionsOn(!isCaptionsOn)} />
         </div>
      </div>

      {/* MODAL_TOOL_LAYER: Highest Z-level for overlay tools */}
      {['whiteboard', 'notes', 'media'].includes(activeTool) && (
          <div className="fixed inset-4 md:inset-10 z-[500] border-[6px] md:border-[10px] border-black bg-white shadow-[10px_10px_0px_#000] md:shadow-[20px_20px_0px_#000] overflow-hidden flex flex-col animate-slide-up">
              <div className="h-10 md:h-12 bg-black text-white flex items-center justify-between px-4 md:px-6 border-b-4 border-black text-[10px] md:text-sm">
                  <div className="flex items-center gap-2 md:gap-3">
                      <Layout strokeWidth={3} className="text-[var(--brutal-yellow)] w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
                      <span className="font-black uppercase tracking-widest italic">{activeTool}_PROTOCOL</span>
                  </div>
                  <button onClick={() => setActiveTool('none')} className="font-black hover:text-[var(--brutal-red)] transition-colors uppercase italic">[TERMINATE_X]</button>
              </div>
              <div className="flex-1 overflow-hidden">
                  {activeTool === 'whiteboard' && <Whiteboard roomId={roomId} />}
                  {activeTool === 'notes' && <CollaborativeNotes roomId={roomId} />}
                  {activeTool === 'media' && <MediaPlayer syncData={syncData} onSync={(t, s) => signaling.sendMediaSync(roomId, { time: t, state: s })} onClose={() => setActiveTool('none')} />}
              </div>
          </div>
      )}

      {/* GLOBAL HUD DECORATION - Hidden on mobile */}
      <div className="fixed top-24 left-6 hidden xl:flex flex-col gap-4 opacity-40 select-none pointer-events-none">
         <div className="p-3 border-4 border-black bg-white shadow-[4px_4px_0px_#000]">
            <Hash size={16} strokeWidth={3} />
         </div>
         <div className="w-[4px] h-32 bg-black mx-auto" />
      </div>
    </div>
  );
};

export default App;