import React, { useState, useEffect } from 'react';
import { signaling } from './services/signaling';
import VideoTile from './components/VideoTile';
import Controls from './components/Controls';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import CollaborativeNotes from './components/CollaborativeNotes';
import { useWebRTC } from './hooks/useWebRTC';
import { useChat } from './hooks/useChat';
import { Video, Copy, Users, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { SignalPayload } from './types';

const App: React.FC = () => {
  // --- UI State ---
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  
  // Tools State
  const [activeTool, setActiveTool] = useState<'none' | 'chat' | 'whiteboard' | 'notes'>('none');

  // Local Reactions State
  const [reactions, setReactions] = useState<string[]>([]);

  // --- Logic Hooks ---
  const {
    isInRoom,
    localStream,
    remoteStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    remoteUserName,
    remoteIsMicOn,
    remoteIsCameraOn,
    remoteIsScreenSharing,
    networkQuality,
    connectionState,
    statusMessage, 
    joinRoom,
    leaveRoom,
    manualReconnect,
    toggleMic,
    toggleCamera,
    toggleScreenShare
  } = useWebRTC(roomId, userName);

  const {
    messages,
    sendMessage,
    clearMessages,
    notifyTyping,
    isRemoteTyping
  } = useChat(roomId, signaling.userId, userName, activeTool === 'chat');

  // Handle Reactions
  useEffect(() => {
    const handleReaction = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const emoji = payload.payload.emoji;
        setReactions(prev => [...prev, emoji]);
        // Remove after animation
        setTimeout(() => setReactions(prev => prev.slice(1)), 2000);
    };
    signaling.on('reaction', handleReaction);
    return () => signaling.off('reaction', handleReaction);
  }, [roomId]);

  const sendReaction = (emoji: string) => {
      signaling.sendReaction(roomId, emoji);
  };

  // --- Handlers ---
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinRoom();
  };

  const handleLeave = () => {
    leaveRoom();
    clearMessages();
    setActiveTool('none');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  // Toggle helpers
  const toggleTool = (tool: 'chat' | 'whiteboard' | 'notes') => {
      setActiveTool(prev => prev === tool ? 'none' : tool);
  };

  // --- Landing Screen ---
  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#ffdf00] relative overflow-hidden">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-10 left-10 w-32 h-32 border-8 border-black rotate-12 -z-10" />
        <div className="absolute bottom-10 right-10 w-48 h-48 border-8 border-black -rotate-6 -z-10" />

        <div className="brut-border-lg bg-white p-8 md:p-12 w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-black p-4 mb-6 shadow-[4px_4px_0px_0px_rgba(255,223,0,1)]">
              <Video className="text-[#ffdf00] w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-black mb-0 tracking-tighter uppercase italic -skew-x-6">SyncMeet</h1>
            <p className="text-black font-bold uppercase tracking-widest text-sm bg-[#ffdf00] px-2 mt-2">P2P VIDEO PROTOCOL</p>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-black text-black uppercase tracking-tighter">Your Name_</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)}
                className="brut-input w-full text-lg"
                placeholder="TYPE_HERE"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-black uppercase tracking-tighter">Room ID_</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)}
                  className="brut-input w-full text-lg"
                  placeholder="ROOM_NAME"
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="brut-btn w-full py-5 text-2xl flex items-center justify-center gap-3 active:bg-black active:text-[#ffdf00]"
            >
              INITIALIZE_
              <ArrowRight size={24} strokeWidth={3} />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t-[4px] border-black flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase">
             <span>• SECURE</span>
             <span>• P2P</span>
             <span>• NO_LOGS</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Room View ---
  return (
    <div className="h-[100dvh] w-full bg-[#f0f0f0] flex flex-col overflow-hidden relative font-bold">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundPosition: '0 0, 20px 20px', backgroundSize: '40px 40px' }} />
      
      {/* Navbar */}
      <div className="absolute top-4 md:top-8 left-4 md:left-8 right-4 md:right-8 z-50 flex flex-wrap gap-4 justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-[#ffdf00] p-2 md:p-3 brut-border">
          <div className="flex items-center gap-2">
            <div className="w-3 md:w-4 h-3 md:h-4 rounded-none bg-black animate-pulse" />
            <span className="text-sm md:text-lg font-black uppercase text-black italic">ROOM: {roomId}</span>
          </div>
          <div className="h-4 md:h-6 w-1 bg-black" />
          <button 
            onClick={copyRoomId} 
            className="flex items-center gap-1.5 text-black hover:bg-black hover:text-white px-2 py-0.5 transition-colors uppercase text-[10px] md:text-xs"
          >
            <Copy size={12} strokeWidth={3} />
            <span>COPY_ID</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden pt-16 md:pt-0">
        
        {/* Main Grid */}
        <div 
          className={`
            relative flex-1 p-4 md:p-10 transition-all duration-300 ease-[cubic-bezier(0.87,0,0.13,1)] flex flex-col
            ${activeTool !== 'none' ? 'md:mr-[400px]' : ''}
          `}
        >
            {/* Whiteboard/Notes Overlay */}
            {activeTool === 'whiteboard' && (
                <div className="absolute inset-4 md:inset-10 z-[60] animate-fade-in brut-border-lg bg-white overflow-hidden">
                    <Whiteboard roomId={roomId} />
                    <button 
                        onClick={() => setActiveTool('none')}
                        className="absolute top-2 right-2 md:top-4 md:right-4 z-[70] p-1.5 md:p-2 border-[3px] md:border-4 border-black bg-white hover:bg-[#ffdf00]"
                    >
                        <ArrowRight className="rotate-180 w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                    </button>
                </div>
            )}

            {activeTool === 'notes' && (
                <div className="absolute inset-4 md:inset-10 z-[60] animate-fade-in brut-border-lg bg-white overflow-hidden">
                    <CollaborativeNotes roomId={roomId} />
                    <button 
                        onClick={() => setActiveTool('none')}
                        className="absolute top-2 right-2 md:top-4 md:right-4 z-[70] p-1.5 md:p-2 border-[3px] md:border-4 border-black bg-white hover:bg-[#ffdf00]"
                    >
                        <ArrowRight className="rotate-180 w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                    </button>
                </div>
            )}

            {/* Video Grid */}
            <div className={`
                grid gap-4 md:gap-8 w-full h-full max-h-[1400px] mx-auto transition-all duration-300
                ${remoteStream 
                    ? 'grid-rows-2 md:grid-rows-1 md:grid-cols-2' 
                    : 'grid-cols-1 max-w-5xl h-full md:h-auto md:aspect-video' 
                }
                ${(activeTool === 'whiteboard' || activeTool === 'notes') ? 'hidden md:grid opacity-10 grayscale scale-[0.98]' : ''}
            `}>
            
            {/* Local Video */}
            <div className="relative w-full h-full min-h-0 brut-tile">
              <VideoTile 
                stream={localStream} 
                isLocal={true} 
                username={userName} 
                isAudioEnabled={isMicOn}
                isVideoEnabled={isScreenSharing || isCameraOn}
                isMirrored={!isScreenSharing} 
                isScreenShare={isScreenSharing}
              />
            </div>

            {/* Remote Video */}
            {remoteStream ? (
               <div className="relative w-full h-full min-h-0 brut-tile">
                <VideoTile 
                  stream={remoteStream} 
                  username={remoteUserName || "PEER-01"} 
                  isAudioEnabled={remoteIsMicOn}
                  isVideoEnabled={remoteIsCameraOn}
                  isTyping={isRemoteTyping}
                  isScreenShare={remoteIsScreenSharing}
                  networkQuality={networkQuality}
                  connectionState={connectionState}
                  reactions={reactions}
                  statusMessage={statusMessage}
                  onRetry={manualReconnect}
                />
              </div>
            ) : (
              // Waiting State
              <div className="hidden md:flex flex-col items-center justify-center bg-white brut-border-lg border-dashed animate-fade-in px-4 text-center">
                <div className="bg-[#ffdf00] p-4 md:p-6 brut-border mb-6">
                  <Users className="text-black w-8 h-8 md:w-12 md:h-12" strokeWidth={3} />
                </div>
                <h3 className="text-black text-xl md:text-3xl font-black uppercase italic -skew-x-3 mb-2 leading-tight">SYSTEM_IDLE: AWAITING_PEER</h3>
                <p className="text-black font-bold uppercase text-xs md:text-sm border-2 border-black px-3 py-1 bg-[#ffdf00] mt-2">LINK: {roomId}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Panel (Chat) */}
        <div 
          className={`
            fixed md:absolute inset-0 md:inset-auto md:top-0 md:right-0 md:h-full bg-white border-l-[6px] border-black shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)] z-[100] transition-transform duration-300 ease-[cubic-bezier(0.87,0,0.13,1)]
            w-full md:w-[400px]
            ${activeTool === 'chat' ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <Chat 
            messages={messages} 
            currentUserId={signaling.userId}
            onSendMessage={sendMessage}
            onClose={() => setActiveTool('none')}
            onTyping={notifyTyping}
            isRemoteTyping={isRemoteTyping}
          />
        </div>

      </div>

      {/* Floating Controls Dock */}
      <div className="fixed bottom-6 md:bottom-10 left-1/2 transform -translate-x-1/2 z-[80] w-full max-w-fit px-4 md:px-6 pointer-events-none">
        <div className="pointer-events-auto brut-border bg-white p-2">
          <Controls 
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            isChatOpen={activeTool === 'chat'}
            isWhiteboardOpen={activeTool === 'whiteboard'}
            isNotesOpen={activeTool === 'notes'}
            onToggleMic={toggleMic}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={toggleScreenShare}
            onToggleChat={() => toggleTool('chat')}
            onToggleWhiteboard={() => toggleTool('whiteboard')}
            onToggleNotes={() => toggleTool('notes')}
            onReaction={sendReaction}
            onLeave={handleLeave}
          />
        </div>
      </div>

    </div>
  );
};

export default App;