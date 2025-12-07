import React, { useState, useEffect } from 'react';
import { signaling } from './services/signaling';
import VideoTile from './components/VideoTile';
import Controls from './components/Controls';
import Chat from './components/Chat';
import Whiteboard from './components/Whiteboard';
import CollaborativeNotes from './components/CollaborativeNotes';
import { useWebRTC } from './hooks/useWebRTC';
import { useChat } from './hooks/useChat';
import { Video, Copy, Users, Sparkles, ArrowRight } from 'lucide-react';
import { SignalPayload } from './types';

const App: React.FC = () => {
  // --- UI State ---
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  
  // Tools State (Only one active tool typically, or split screen)
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
    statusMessage, // New Prop
    joinRoom,
    leaveRoom,
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
      // Show locally too? Maybe not, or yes for feedback
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

  // Toggle helpers - ensure mutual exclusivity for mobile friendliness
  const toggleTool = (tool: 'chat' | 'whiteboard' | 'notes') => {
      setActiveTool(prev => prev === tool ? 'none' : tool);
  };

  // --- Landing Screen ---
  if (!isInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 animate-gradient relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md relative z-10 transition-all hover:shadow-indigo-500/10 hover:border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-4 rounded-2xl shadow-lg mb-6 transform rotate-3 hover:rotate-6 transition-transform">
              <Video className="text-white w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">SyncMeet</h1>
            <p className="text-gray-400 text-center">Premium, low-latency video collaboration.</p>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Display Name</label>
              <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Room ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={roomId} 
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                  placeholder="e.g. daily-standup"
                  required
                />
                <div className="absolute right-3 top-3.5 text-gray-500 pointer-events-none">
                  <Sparkles size={18} />
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              className="group w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-4"
            >
              Join Session
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 text-xs text-gray-500 text-center border-t border-gray-800 pt-4">
            <p>Secure • Peer-to-Peer • No Sign-up Required</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Room View ---
  return (
    <div className="h-[100dvh] w-full bg-[#030712] flex flex-col overflow-hidden relative">
      
      {/* Navbar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-200 tracking-tight">{roomId}</span>
          </div>
          <div className="h-4 w-px bg-gray-700" />
          <button 
            onClick={copyRoomId} 
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors group"
          >
            <Copy size={12} className="group-hover:scale-110 transition-transform" />
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Main Grid: Adapts based on Active Tool */}
        <div 
          className={`
            relative flex-1 p-4 md:p-6 transition-all duration-500 ease-in-out flex flex-col
            ${activeTool !== 'none' ? 'mr-0 md:mr-[360px]' : ''}
          `}
        >
            {/* If Whiteboard/Notes are active, they take center stage on Mobile, or squeeze Video on Desktop */}
            {activeTool === 'whiteboard' && (
                <div className="absolute inset-4 md:inset-6 z-20 animate-fade-in">
                    <Whiteboard roomId={roomId} />
                </div>
            )}

            {activeTool === 'notes' && (
                <div className="absolute inset-4 md:inset-6 z-20 animate-fade-in">
                    <CollaborativeNotes roomId={roomId} />
                </div>
            )}

            {/* Video Grid - Hides if tool is active on mobile, or shrinks on desktop */}
            <div className={`
                grid gap-4 md:gap-6 w-full h-full max-h-[1200px] mx-auto transition-all duration-500
                ${remoteStream 
                    ? 'grid-rows-2 md:grid-rows-1 md:grid-cols-2' 
                    : 'grid-cols-1 max-w-4xl h-full md:h-auto md:aspect-video' 
                }
                ${(activeTool === 'whiteboard' || activeTool === 'notes') ? 'hidden md:grid opacity-20 pointer-events-none' : ''}
            `}>
            
            {/* Local Video */}
            <div className="relative w-full h-full min-h-0">
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
               <div className="relative w-full h-full min-h-0">
                <VideoTile 
                  stream={remoteStream} 
                  username={remoteUserName || "Peer"} 
                  isAudioEnabled={remoteIsMicOn}
                  isVideoEnabled={remoteIsCameraOn}
                  isTyping={isRemoteTyping}
                  isScreenShare={remoteIsScreenSharing}
                  networkQuality={networkQuality}
                  connectionState={connectionState}
                  reactions={reactions}
                  statusMessage={statusMessage} // Pass status
                />
              </div>
            ) : (
              // Waiting State
              <div className="hidden md:flex flex-col items-center justify-center bg-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-800 border-dashed animate-fade-in">
                <div className="bg-gray-800/50 p-4 rounded-full mb-4 animate-pulse">
                  <Users className="text-indigo-400" size={32} />
                </div>
                <h3 className="text-gray-300 text-lg font-medium mb-1">Waiting for others...</h3>
                <p className="text-gray-500 text-sm">Share the room ID <span className="text-indigo-400 font-mono bg-indigo-500/10 px-1.5 py-0.5 rounded">{roomId}</span> to invite.</p>
                {statusMessage && <p className="text-yellow-500 text-xs mt-4 animate-pulse">{statusMessage}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Panel (Chat) */}
        <div 
          className={`
            absolute top-0 right-0 h-full bg-[#0b101b]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl z-40 transition-transform duration-500 ease-in-out transform
            w-full md:w-[360px]
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
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-fit px-4 pointer-events-none">
        <div className="pointer-events-auto shadow-2xl shadow-black/50 rounded-full">
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