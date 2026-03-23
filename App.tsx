import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Users, 
  Copy, 
  ArrowRight,
  Terminal,
  Tv
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
  const [roomId, setRoomId] = useState('ROOM-01');
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
        addLog(`SYNC_PROTO: MEDIA_UPDATE [${payload.payload.state}]`, 'success');
    };

    signaling.on('reaction', handleReaction);
    signaling.on('system-log', handleSystemLog);
    signaling.on('media-sync', handleMediaSync);
    signaling.on('peer-joined', (p: any) => addLog(`PEER_DETECTION_ID: ${p.peerId}`, 'success'));
    signaling.on('leave', (p: any) => {
        const id = p.payload?.senderId || p.senderId;
        addLog(`PEER_DISCONNECTED_ID: ${id}`, 'warn');
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
    addLog(`INITIALIZED_SYSTEM: LINKING_PEERS...`, 'info');
  };

  const handleLeave = () => {
    leaveRoom();
    clearMessages();
    setActiveTool('none');
    addLog(`TERMINATED_LINK: SYSTEM_SHUTDOWN`, 'warn');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    addLog(`SECURE_DATA: ROOM_ID_COPIED_TO_BUFFER`, 'success');
  };

  const toggleTool = (tool: typeof activeTool) => {
      setActiveTool(prev => prev === tool ? 'none' : tool);
  };

  const handleMediaSyncEmit = (time: number, state: 'play' | 'pause') => {
      signaling.sendMediaSync(roomId, { time, state });
  };

  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#ffdf00] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="brut-border-lg bg-white p-8 md:p-12 w-full max-w-md relative z-10 animate-fade-in shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-black p-4 mb-6 shadow-[6px_6px_0px_0px_rgba(255,223,0,1)]">
              <Video className="text-[#ffdf00] w-12 h-12" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-black mb-0 tracking-tighter uppercase italic -skew-x-6">SyncMeet</h1>
            <span className="bg-black text-[#ffdf00] px-3 py-1 font-black text-xs md:text-sm uppercase tracking-widest mt-4">PRIVATE_P2P_MESH_PROTOCOL</span>
          </div>
          <form onSubmit={handleJoin} className="space-y-6">
            <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="brut-input w-full text-xl" placeholder="NAME_" required />
            <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="brut-input w-full text-xl" placeholder="ROOM_ID_" required />
            <button type="submit" className="brut-btn w-full py-5 text-2xl flex items-center justify-center gap-3">
              INITIALIZE_LINK_ <ArrowRight size={24} strokeWidth={3} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#f0f0f0] flex flex-col overflow-hidden relative font-bold">
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onCommand={handleCommand} />
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px' }} />
      
      <div className="absolute top-4 md:top-8 left-4 md:left-8 right-4 md:right-8 z-50 flex flex-wrap gap-4 justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#ffdf00] p-2 md:p-3 brut-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="text-sm md:text-lg font-black uppercase text-black italic">LINK: {roomId}</span>
          <button onClick={copyRoomId} className="flex items-center gap-1.5 text-black hover:bg-black hover:text-white px-2 py-0.5 uppercase text-[10px] md:text-xs border-2 border-black font-bold">COPY_ID</button>
        </div>
        <div className="pointer-events-auto bg-black text-[#ffdf00] px-4 py-2 text-[10px] uppercase font-black italic -skew-x-12 animate-pulse shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
           SYSTEM_OPERATIONAL_LINKED_ [CMD+K]
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden pt-16 md:pt-0">
        <div className={`relative flex-1 p-4 md:p-10 transition-all duration-300 flex flex-col ${['chat', 'logs'].includes(activeTool) ? 'md:mr-[400px]' : ''}`}>
            
            {['whiteboard', 'notes', 'media'].includes(activeTool) && (
                <div className="absolute inset-4 md:inset-10 z-[60] animate-fade-in brut-border-lg bg-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(255,223,0,1)]">
                    {activeTool === 'whiteboard' && <Whiteboard roomId={roomId} />}
                    {activeTool === 'notes' && <CollaborativeNotes roomId={roomId} />}
                    {activeTool === 'media' && <MediaPlayer syncData={syncData} onSync={handleMediaSyncEmit} onClose={() => setActiveTool('none')} />}
                    <button onClick={() => setActiveTool('none')} className="absolute top-4 right-4 z-[70] p-2 border-4 border-[#ffdf00] bg-black text-[#ffdf00] hover:bg-[#ffdf00] hover:text-black transition-colors"><ArrowRight className="rotate-180 w-6 h-6" strokeWidth={3} /></button>
                </div>
            )}

            <div className={`grid gap-4 md:gap-8 w-full h-full max-h-[1400px] mx-auto transition-all duration-300 ${remotePeers.length > 0 ? (remotePeers.length === 1 ? 'md:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3') : 'max-w-5xl md:aspect-video'} ${['whiteboard', 'notes', 'media'].includes(activeTool) ? 'opacity-10 grayscale scale-[0.98]' : ''}`}>
               <VideoTile stream={localStream} isLocal={true} username={userName} isAudioEnabled={isMicOn} isVideoEnabled={isCameraOn} isHandRaised={isHandRaised} isGlitching={isGlitching} isScreenShare={isScreenSharing} />
               {remotePeers.map(peer => (
                 <VideoTile key={peer.id} stream={peer.stream} username={peer.userName} isAudioEnabled={peer.isMicOn} isVideoEnabled={peer.isCameraOn} isHandRaised={peer.isHandRaised} isGlitching={peer.isGlitching} isTyping={peer.isTyping} networkQuality={peer.networkQuality} connectionState={peer.connectionState} reactions={reactions} onRetry={manualReconnect} />
               ))}
               {remotePeers.length === 0 && (
                 <div className="hidden md:flex flex-col items-center justify-center bg-white brut-border-lg border-dashed">
                   <div className="bg-[#ffdf00] p-6 brut-border mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"><Users className="text-black w-12 h-12" strokeWidth={3} /></div>
                   <h3 className="text-black text-3xl font-black uppercase italic -skew-x-3 mb-2">AWAITING_PROTO_LINK...</h3>
                 </div>
               )}
            </div>
        </div>

        <div className={`fixed top-0 right-0 h-full w-full md:w-[400px] z-[100] transform transition-transform duration-500 bg-white border-l-[6px] border-black shadow-[-10px_0px_40px_rgba(0,0,0,0.5)] ${['chat', 'logs'].includes(activeTool) ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex h-full flex-col">
            <div className="bg-black p-4 flex gap-4">
                <button onClick={() => setActiveTool('chat')} className={`flex-1 py-3 font-black uppercase text-xs italic transition-all ${activeTool === 'chat' ? 'bg-[#ffdf00] text-black shadow-[4px_4px_0px_0px_rgba(255,223,0,0.3)]' : 'bg-transparent text-[#ffdf00] border-2 border-[#ffdf00] opacity-50 hover:opacity-100'}`}>COMMS_MODULE</button>
                <button onClick={() => setActiveTool('logs')} className={`flex-1 py-3 font-black uppercase text-xs italic transition-all ${activeTool === 'logs' ? 'bg-[#ffdf00] text-black shadow-[4px_4px_0px_0px_rgba(255,223,0,0.3)]' : 'bg-transparent text-[#ffdf00] border-2 border-[#ffdf00] opacity-50 hover:opacity-100'}`}>PROTO_LOGS</button>
                <button onClick={() => setActiveTool('none')} className="bg-red-500 p-3 border-2 border-black text-white hover:bg-black hover:text-[#ffdf00] transition-colors"><ArrowRight strokeWidth={3} size={20} /></button>
            </div>
            {activeTool === 'chat' && <Chat roomId={roomId} userName={userName} messages={messages} onSendMessage={sendMessage} onNotifyTyping={notifyTyping} isRemoteTyping={isRemoteTyping} />}
            {activeTool === 'logs' && <SystemLogs logs={logs} onClear={() => setLogs([])} />}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 md:bottom-10 left-1/2 transform -translate-x-1/2 z-[80] w-full max-w-fit px-4 md:px-6 pointer-events-none flex flex-col items-center gap-4">
        {activeTool === 'none' && (
            <div className="pointer-events-auto bg-black border-4 border-black text-[#ffdf00] px-4 py-1.5 font-black text-[10px] uppercase italic -rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] animate-slide-up">
               QUICK_ACCESS_PROTOCOL_DOCK_v3.2_
            </div>
        )}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4 bg-white p-2 md:p-4 brut-border-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:shadow-[14px_14px_0px_0px_rgba(0,0,0,1)] overflow-x-auto no-scrollbar max-w-full">
            <Controls onToggleMic={toggleMic} isMicOn={isMicOn} onToggleCamera={toggleCamera} isCameraOn={isCameraOn} onToggleScreenShare={toggleScreenShare} isScreenSharing={isScreenSharing} onToggleHandRaise={toggleHandRaise} isHandRaised={isHandRaised} onToggleTool={toggleTool} activeTool={activeTool} onLeave={handleLeave} onSendReaction={(emoji) => signaling.sendReaction(roomId, emoji)} />
            <button onClick={() => toggleTool('media')} className={`ml-2 md:ml-4 p-2 md:p-3 border-4 border-black transition-colors ${activeTool === 'media' ? 'bg-black text-[#ffdf00]' : 'bg-[#ffdf00] text-black'}`} title="MEDIA_SYNC_MODULE"><Tv className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /></button>
            <button onClick={() => setShowPalette(true)} className="ml-2 bg-black text-[#ffdf00] p-2 md:p-3 border-4 border-black hover:bg-[#ffdf00] hover:text-black transition-colors" title="COMMAND_PALETTE"><Terminal className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} /></button>
        </div>
      </div>
    </div>
  );
};

export default App;