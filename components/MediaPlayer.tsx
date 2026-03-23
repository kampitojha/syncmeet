import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Tv, X, Globe, Link } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full bg-black font-mono border-4 border-black box-border">
      <div className="bg-[#ffdf00] p-4 flex items-center justify-between border-b-4 border-black">
        <div className="flex items-center gap-3 text-black">
           <Tv size={20} strokeWidth={3} />
           <span className="font-black text-xs md:text-sm uppercase italic tracking-tighter">MEDIA_BROADCAST_RECEIVER_v1.0</span>
        </div>
        <button onClick={onClose} className="hover:rotate-90 transition-transform">
           <X size={20} strokeWidth={3} className="text-black" />
        </button>
      </div>

      {!activeUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#111]">
              <div className="mb-8 opacity-20"> <Tv size={80} className="text-[#ffdf00]" /> </div>
              <p className="text-[#ffdf00] font-black uppercase text-xs mb-6 italic">AWAITING_MEDIA_SOURCE_INPUT_</p>
              <form onSubmit={loadMedia} className="w-full max-w-sm flex flex-col gap-4">
                  <div className="relative">
                      <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffdf00]" size={16} />
                      <input 
                        type="text" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)}
                        placeholder="SOURCE_URL_"
                        className="w-full bg-black/40 border-4 border-[#ffdf00] p-5 pl-12 text-[#ffdf00] font-black uppercase text-xs outline-none"
                      />
                  </div>
                  <button type="submit" className="bg-[#ffdf00] text-black p-4 font-black uppercase text-sm hover:translate-x-1 hover:-translate-y-1 transition-transform border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,223,0,0.3)]">
                      LOAD_MODULE_
                  </button>
              </form>
          </div>
      ) : (
          <div className="flex-1 flex flex-col relative group">
              <video 
                ref={videoRef}
                src={activeUrl}
                className="w-full h-full object-contain bg-black"
                onPlay={() => handleAction('play')}
                onPause={() => handleAction('pause')}
                controls
              />
              <div className="absolute top-4 left-4 bg-black/80 p-2 border-2 border-[#ffdf00] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[#ffdf00] text-[8px] font-black uppercase flex items-center gap-2 italic">
                     <Globe size={10} /> LINK_ACTIVE: {activeUrl.slice(0, 30)}...
                  </span>
              </div>
          </div>
      )}

      <div className="bg-[#ffdf00]/10 p-3 flex items-center gap-3 border-t border-[#ffdf00]/20">
         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
         <span className="text-[10px] font-bold text-[#ffdf00]/50 tracking-[0.2em] uppercase">SYNC_CHANNEL_READY</span>
      </div>
    </div>
  );
};

export default MediaPlayer;
