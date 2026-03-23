import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Tv, X, Globe, Link, MonitorUp, Zap } from 'lucide-react';

interface MediaPlayerProps {
  onSync: (time: number, state: 'play' | 'pause') => void;
  syncData?: { time: number, state: 'play' | 'pause' };
  onClose: () => void;
}

const MediaPlayer: React.FC<MediaPlayerProps> = ({ onSync, syncData, onClose }) => {
  const [url, setUrl] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (syncData && videoRef.current && !isInternalChange.current) {
        const video = videoRef.current;
        if (Math.abs(video.currentTime - syncData.time) > 1) video.currentTime = syncData.time;
        if (syncData.state === 'play') video.play().catch(e => {});
        else video.pause();
    }
    isInternalChange.current = false;
  }, [syncData]);

  const handleAction = (state: 'play' | 'pause') => {
      if (videoRef.current) {
          isInternalChange.current = true;
          onSync(videoRef.current.currentTime, state);
      }
  };

  const loadMedia = (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) setActiveUrl(url);
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = activeUrl ? getYoutubeId(activeUrl) : null;

  return (
    <div className="flex flex-col bg-[#f8f8f8] font-mono text-black brutal-grid-dot h-full overflow-hidden">
      {/* MEDIA_HEADER */}
      <div className="p-6 bg-white border-b-[6px] border-black flex items-center justify-between z-[70] shadow-[0_6px_0px_#000]">
        <div className="flex items-center gap-4 text-black">
           <div className="bg-[var(--brutal-cyan)] p-3 border-4 border-black shadow-[4px_4px_0px_#000]"> 
             <Tv size={24} strokeWidth={3} /> 
           </div>
           <div className="flex flex-col">
             <span className="font-black text-lg uppercase tracking-tighter italic leading-none">SYNCCAST_ENGINE_v4</span>
             <span className="text-[9px] font-black uppercase opacity-30 mt-1">PROTO_MEDIA_UPLINK_READY</span>
           </div>
        </div>
        <button onClick={onClose} className="brutal-btn p-3 bg-[var(--brutal-red)] text-white hover:bg-black border-4 shadow-[4px_4px_0px_#000]">
           <X size={24} strokeWidth={3} />
        </button>
      </div>

      {!activeUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#f0f0f0] brutal-grid-dot">
              <div className="mb-12 opacity-10 animate-bounce"> 
                <MonitorUp size={120} strokeWidth={1} /> 
              </div>
              <h3 className="text-4xl font-black uppercase tracking-tighter italic mb-4">AWAITING_MEDIA_LINK</h3>
              <p className="max-w-xs font-black uppercase text-[10px] mb-12 tracking-[0.3em] opacity-40">INPUT_SOURCE_URL_FOR_P2P_SYNCHRONIZATION</p>
              
              <form onSubmit={loadMedia} className="w-full max-w-lg flex flex-col gap-6">
                  <div className="relative group">
                      <Link className="absolute left-6 top-1/2 -translate-y-1/2 text-black opacity-20 group-focus-within:opacity-100 transition-opacity" size={24} strokeWidth={3} />
                      <input 
                        type="text" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)}
                        placeholder="SOURCE_UPLINK_URL..."
                        className="w-full brutal-input p-6 pl-16 text-black font-black uppercase text-sm border-4 focus:bg-[var(--brutal-yellow)]"
                      />
                  </div>
                  <button type="submit" className="w-full py-6 brutal-btn-violet text-xl font-black shadow-[10px_10px_0px_#000]">
                      BOOT_MEDIA_INTERFACE_
                  </button>
              </form>
          </div>
      ) : (
          <div className="flex-1 flex flex-col relative group overflow-hidden bg-black border-[10px] border-black m-6 shadow-[20px_20px_0px_#000]">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1`}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={activeUrl}
                  className="w-full h-full object-contain"
                  onPlay={() => handleAction('play')}
                  onPause={() => handleAction('pause')}
                  controls
                />
              )}
              
              {/* SOURCE_OVERLAY */}
              <div className="absolute top-8 left-8 brutal-card bg-white p-4 border-4 border-black shadow-[8px_8px_0px_var(--brutal-cyan)] opacity-0 group-hover:opacity-100 transition-all transform -translate-y-4 group-hover:translate-y-0">
                  <span className="text-black text-[10px] font-black uppercase flex items-center gap-4 tracking-widest italic truncate max-w-md">
                     <Zap size={16} strokeWidth={3} className="text-[var(--brutal-cyan)]" /> {activeUrl}
                  </span>
              </div>
          </div>
      )}

      {/* MEDIA_FOOTER */}
      <div className="p-6 bg-white border-t-[6px] border-black flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-[var(--brutal-green)] animate-pulse border-2 border-black" />
            <span className="text-[10px] font-black text-black tracking-[0.3em] uppercase italic opacity-40">LINKED_TO_CRYPTO_MESH_SYNC_CORE_v4</span>
         </div>
         <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="w-2 h-2 bg-black rotate-45" />)}
         </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
