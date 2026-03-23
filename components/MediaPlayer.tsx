import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Tv, X, Globe, Link, MonitorUp } from 'lucide-react';

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
      setActiveUrl(url);
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  const youtubeId = activeUrl ? getYoutubeId(activeUrl) : null;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] font-sans overflow-hidden">
      <div className="glass-card-bright p-5 flex items-center justify-between border-b border-white/10 z-[70]">
        <div className="flex items-center gap-4 text-white">
           <div className="bg-cyan-400 p-2 rounded-xl"> <Tv size={18} className="text-black" /> </div>
           <span className="font-extrabold text-sm uppercase tracking-widest text-white/90 italic">SYNCCAST_RECEIVER_v1.0</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all hover:rotate-90">
           <X size={20} className="text-white/40 hover:text-white" />
        </button>
      </div>

      {!activeUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-[#0a0a0a] to-[#111]">
              <div className="mb-12 opacity-10 animate-pulse"> <MonitorUp size={100} className="text-cyan-400" strokeWidth={1} /> </div>
              <p className="text-white/20 font-black uppercase text-[10px] mb-8 tracking-[0.4em] italic">Awaiting Media Interface Link_</p>
              <form onSubmit={loadMedia} className="w-full max-w-sm flex flex-col gap-6">
                  <div className="relative group">
                      <Link className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                      <input 
                        type="text" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)}
                        placeholder="ENTER_RAW_OR_YT_URL_"
                        className="w-full bg-white/5 border border-white/10 p-6 pl-14 text-white font-bold uppercase text-[10px] outline-none rounded-3xl focus:border-cyan-500/30 focus:bg-white/10 transition-all shadow-inner"
                      />
                  </div>
                  <button type="submit" className="bg-cyan-400 text-black p-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-xl shadow-cyan-400/10 active:scale-95">
                      BOOT_MEDIA_PROTOCOL
                  </button>
              </form>
          </div>
      ) : (
          <div className="flex-1 flex flex-col relative group overflow-hidden">
              {youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                  className="w-full h-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={activeUrl}
                  className="w-full h-full object-contain bg-black"
                  onPlay={() => handleAction('play')}
                  onPause={() => handleAction('pause')}
                  controls
                />
              )}
              <div className="absolute top-6 left-6 glass-card p-3 px-5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                  <span className="text-cyan-400 text-[9px] font-black uppercase flex items-center gap-3 tracking-widest italic">
                     <Globe size={12} /> STREAM_SOURCE: {activeUrl.slice(0, 40)}...
                  </span>
              </div>
          </div>
      )}

      <div className="glass-card p-4 flex items-center gap-4 border-t border-white/5 bg-white/5 backdrop-blur-3xl">
         <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
         <span className="text-[9px] font-bold text-white/20 tracking-[0.3em] uppercase">LINKED_TO_CRYPTO_MESH_SYNC_CORE</span>
      </div>
    </div>
  );
};

export default MediaPlayer;
