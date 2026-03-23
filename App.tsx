import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Video, 
  Users, 
  Copy, 
  ArrowRight,
  Terminal as TerminalIcon,
  Tv,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Captions as CaptionsIcon,
  Circle,
  Hash,
  Activity,
  Box
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
      signaling.sendCaption(roomId, text);
      
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => setCurrentCaption(''), 6000);
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
      addLog(`CMD_EXEC: ${cmd}`, 'info');
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
      setReactions(prev => [...prev, emoji]);
      setTimeout(() => setReactions(prev => prev.slice(1)), 2000);
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (!userName.trim() || !roomId.trim()) {
        setFormError('MISSING_DATA');
        return;
    }
    setFormError(null);
    joinRoom(); 
    addLog(`BOOTSTRAP_INIT...`, 'info'); 
  };

  const handleLeave = () => { leaveRoom(); clearMessages(); setActiveTool('none'); };
  const toggleTool = (tool: typeof activeTool) => setActiveTool(prev => prev === tool ? 'none' : tool);

  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#f0f0f0] brutal-bg-pattern relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-40 h-40 bg-[#ffdf1e] border-4 border-black -rotate-12 brutal-card -z-0 hidden md:block" />
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-[#00ff9d] border-4 border-black rotate-12 brutal-card -z-0 hidden md:block" />
        
        {/* Error Notification */}
        {permissionError && (
            <div className="fixed top-8 z-[200] w-full max-w-md px-6 animate-shake">
                <div className="brutal-card bg-[#ff5e5e] p-6 border-black">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="text-black w-10 h-10" />
                        <div>
                            <h4 className="text-lg font-black uppercase tracking-tighter">HARDWARE_BLOCKED</h4>
                            <p className="text-[10px] font-bold uppercase mt-1">Permission denied. Check system protocols.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button onClick={joinRoom} className="flex-1 brutal-btn bg-white">RETRY</button>
                        <button onClick={() => setPermissionError(null)} className="flex-1 brutal-btn bg-black text-white">X</button>
                    </div>
                </div>
            </div>
        )}

        <div className="brutal-card p-8 md:p-12 w-full max-w-lg relative z-10 bg-white">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-[#ffdf1e] p-5 mb-6 border-4 border-black shadow-[4px_4px_0px_black]"><Video className="text-black w-10 h-10" /></div>
            <h1 className="text-6xl md:text-8xl font-black text-black mb-2 tracking-tighter italic">SYNC<span className="text-[#ffdf1e]">MEET</span></h1>
            <div className="bg-black text-white px-4 py-1 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 mt-2">v.2.0 BRUTAL_MESH_PROT</div>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
               <label className="block text-[10px] font-black uppercase mb-1 ml-1">USER_IDENTIFIER</label>
               <input 
                 type="text" 
                 value={userName} 
                 onChange={(e) => {setUserName(e.target.value); if(formError) setFormError(null);}} 
                 className={`w-full brutal-input ${formError && !userName.trim() ? 'bg-[#ff5e5e]' : ''}`} 
                 placeholder="ENTER_NAME" 
               />
            </div>
            <div className="relative">
               <label className="block text-[10px] font-black uppercase mb-1 ml-1">SESSION_UUID</label>
               <input 
                 type="text" 
                 value={roomId} 
                 onChange={(e) => {setRoomId(e.target.value); if(formError) setFormError(null);}} 
                 className={`w-full brutal-input ${formError && !roomId.trim() ? 'bg-[#ff5e5e]' : ''}`} 
                 placeholder="ROOM_CODE" 
               />
            </div>
            <button type="submit" className="w-full py-5 brutal-btn-primary text-xl font-black mt-4">ESTABLISH_LINK_</button>
          </form>
          
          <div className="mt-8 flex justify-between gap-4">
            <div className="flex-1 brutal-card bg-[#00ff9d] p-3 text-center border-[3px]">
              <div className="text-[8px] font-black uppercase">ULTRA_LOW_LATENCY</div>
            </div>
            <div className="flex-1 brutal-card bg-[#5eb5ff] p-3 text-center border-[3px]">
              <div className="text-[8px] font-black uppercase">P2P_ENCRYPTED</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#f0f0f0] brutal-bg-pattern flex flex-col overflow-hidden relative font-mono">
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onCommand={handleCommand} />
      
      {/* Brutalist Header HUD */}
      <div className="h-16 border-b-[4px] border-black bg-white flex items-center justify-between px-6 z-[110] shadow-[0_4px_0px_black]">
        <div className="flex items-center gap-6">
           <div className="font-black italic text-2xl tracking-tighter select-none">SYNC<span className="bg-[#ffdf1e] px-1 ml-1">MEET</span></div>
           <div className="hidden md:flex items-center gap-2 bg-[#00ff9d] border-2 border-black px-3 py-0.5 text-[10px] font-black uppercase"> <Hash size={12} /> {roomId} </div>
        </div>
        
        <div className="flex items-center gap-4">
           {isRecording && (
                <div className="bg-[#ff5e5e] border-2 border-black px-4 py-1 flex items-center gap-2 animate-pulse">
                   <Circle size={8} fill="black" />
                   <span className="text-[9px] font-black uppercase">REC</span>
                </div>
           )}
           <div className="bg-black text-white px-4 py-1 text-[9px] font-black uppercase"> {new Date().toLocaleTimeString().split(' ')[0]} </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative md:pt-12 pt-8 pb-32 overflow-hidden px-4 md:px-10">
         <div className={`relative flex-1 transition-all duration-500 flex flex-col ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'lg:mr-[420px]' : ''}`}>
            {['whiteboard', 'notes', 'media'].includes(activeTool) && (
                <div className="absolute inset-0 z-[120] lg:z-[60] brutal-card bg-white overflow-hidden shadow-[12px_12px_0px_black]">
                    <div className="h-10 bg-black text-white flex items-center justify-between px-4 border-b-2 border-black">
                        <span className="text-[10px] font-black uppercase tracking-widest">{activeTool}_VIEW</span>
                        <button onClick={() => setActiveTool('none')} className="font-black hover:text-[#ffdf1e]">CLOSE [X]</button>
                    </div>
                    {activeTool === 'whiteboard' && <Whiteboard roomId={roomId} />}
                    {activeTool === 'notes' && <CollaborativeNotes roomId={roomId} />}
                    {activeTool === 'media' && <MediaPlayer syncData={syncData} onSync={(t, s) => signaling.sendMediaSync(roomId, { time: t, state: s })} onClose={() => setActiveTool('none')} /> as any}
                </div>
            )}

            {/* MESH_VIEWPORT: Intel-Adaptive Grid Logic */}
            <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500
                ${['whiteboard', 'notes', 'media'].includes(activeTool) ? 'opacity-20 scale-[0.98] blur-xl h-0 overflow-hidden pointer-events-none' : 'w-full h-full'}`}>
               
               <div className={`grid gap-6 md:gap-8 w-full max-w-[1600px] h-full transition-all duration-500 mx-auto content-center
                  ${remotePeers.length === 0 ? 'grid-cols-1 max-w-5xl aspect-video' : 
                    remotePeers.length === 1 ? 'grid-cols-1 md:grid-cols-2' : 
                    remotePeers.length === 2 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                    'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                  
                  {/* LOCAL_NODE */}
                  <div className="w-full h-full min-h-[220px] md:min-h-[280px]">
                     <VideoTile stream={localStream} isLocal={true} username={userName.toUpperCase()} isAudioEnabled={isMicOn} isVideoEnabled={isCameraOn} isHandRaised={isHandRaised} isGlitching={isGlitching} isScreenShare={isScreenSharing} />
                  </div>

                  {/* REMOTE_NODES */}
                  {remotePeers.map((peer: any) => (
                     <div key={peer.id} className="w-full h-full min-h-[220px] md:min-h-[280px]">
                        <VideoTile stream={peer.stream} username={peer.userName.toUpperCase()} isAudioEnabled={peer.isMicOn} isVideoEnabled={peer.isCameraOn} isHandRaised={peer.isHandRaised} isGlitching={peer.isGlitching} isTyping={peer.isTyping} networkQuality={peer.networkQuality} connectionState={peer.connectionState as any} reactions={reactions} onRetry={manualReconnect as any} />
                     </div>
                  ))}
               </div>
            </div>

            {/* Floating Captions */}
            {isCaptionsOn && currentCaption && (
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-3xl px-4 animate-slide-up pointer-events-none">
                  <div className="brutal-card bg-black text-white p-4 border-2 border-white shadow-[8px_8px_0px_#ffdf1e] text-center">
                      <p className="text-xl font-bold uppercase tracking-tighter">
                         <span className="text-[#ffdf1e] mr-4">{userName.substring(0, 3)}:</span> {currentCaption}
                      </p>
                  </div>
               </div>
            )}
         </div>

         {/* Sidebar Tools - Brutalist Overhaul */}
         <div className={`fixed inset-y-8 right-8 w-full max-w-[400px] z-[150] transition-all duration-300 transform 
             ${['chat', 'logs', 'polls', 'dashboard'].includes(activeTool) ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
            <div className="brutal-card h-full bg-white flex flex-col overflow-hidden border-[6px]">
               <div className="bg-black text-white p-4 font-black uppercase tracking-widest flex items-center justify-between">
                  <span>TOOL_ACCESS</span>
                  <button onClick={() => setActiveTool('none')}>[X]</button>
               </div>
               <div className="p-4 grid grid-cols-2 gap-3 border-b-4 border-black bg-[#f0f0f0]">
                  <button onClick={() => setActiveTool('chat')} className={`brutal-btn py-2 text-[9px] ${activeTool === 'chat' ? 'bg-[#ffdf1e]' : ''}`}>MESSAGES</button>
                  <button onClick={() => setActiveTool('polls')} className={`brutal-btn py-2 text-[9px] ${activeTool === 'polls' ? 'bg-[#ffdf1e]' : ''}`}>POLLS</button>
                  <button onClick={() => setActiveTool('dashboard')} className={`brutal-btn py-2 text-[9px] ${activeTool === 'dashboard' ? 'bg-[#ffdf1e]' : ''}`}>TELEMETRY</button>
                  <button onClick={() => setActiveTool('logs')} className={`brutal-btn py-2 text-[9px] ${activeTool === 'logs' ? 'bg-[#ffdf1e]' : ''}`}>CONSOLE</button>
               </div>
               <div className="flex-1 overflow-hidden custom-scrollbar">
                  {activeTool === 'chat' && <Chat roomId={roomId} userName={userName} messages={messages} onSendMessage={sendMessage} onNotifyTyping={notifyTyping} isRemoteTyping={isRemoteTyping} />}
                  {activeTool === 'logs' && <SystemLogs logs={logs} onClear={() => setLogs([])} />}
                  {activeTool === 'polls' && <Polls polls={polls} onVote={handleVote} onCreate={handleCreatePoll} onClear={() => setPolls([])} />}
                  {activeTool === 'dashboard' && <Dashboard stats={stats} />}
               </div>
            </div>
         </div>
      </div>

      <div className="fixed bottom-10 left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none">
         <div className="pointer-events-auto w-full max-w-fit flex gap-4 brutal-card bg-white p-2 border-[4px] border-black shadow-[10px_10px_0px_black]">
            <Controls onToggleMic={toggleMic} isMicOn={isMicOn} onToggleCamera={toggleCamera} isCameraOn={isCameraOn} onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} onToggleHandRaise={toggleHandRaise} isHandRaised={isHandRaised} onToggleTool={toggleTool} activeTool={activeTool} onLeave={handleLeave} onSendReaction={handleSendReaction} isRecording={isRecording} onToggleRecording={() => !isRecording ? startRecording() : stopRecording()} isCaptionsOn={isCaptionsOn} onToggleCaptions={() => setIsCaptionsOn(!isCaptionsOn)} />
         </div>
      </div>
    </div>
  );
};

export default App;