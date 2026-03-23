import React, { useState, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';
import { FileText, Save, Download, RefreshCw } from 'lucide-react';

interface NotesProps {
  roomId: string;
}

const CollaborativeNotes: React.FC<NotesProps> = ({ roomId }) => {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('SYNC_OK');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('SYNCING...');
    signaling.sendNoteUpdate(roomId, newContent);
    setTimeout(() => setStatus('SYNC_OK'), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-notes-${new Date().getTime()}.txt`;
    a.click();
  };

  useEffect(() => {
    const handleSync = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        if (payload.payload.content !== content) {
            setContent(payload.payload.content);
        }
    };
    signaling.on('sync-notes', handleSync);
    return () => { signaling.off('sync-notes', handleSync); };
  }, [roomId, content]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] font-sans overflow-hidden">
        <div className="glass-card-bright p-5 flex items-center justify-between border-b border-white/10 z-[70]">
            <div className="flex items-center gap-4 text-white">
                <div className="bg-cyan-400 p-2 rounded-xl"> <FileText size={18} className="text-black" /> </div>
                <span className="font-extrabold text-sm uppercase tracking-widest text-white/90 italic">SHARED_INTEL_SYSTEM_</span>
            </div>
            <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${status === 'SYNC_OK' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-red-500/30 text-red-500 bg-red-500/5 pulse-accent'}`}>
                    <Save size={14} className={status === 'SYNCING...' ? 'animate-spin' : ''} /> {status}
                </div>
                <button onClick={handleDownload} className="p-3 bg-cyan-400 text-black rounded-xl hover:bg-white transition-all shadow-lg shadow-cyan-400/10 active:scale-95" title="Export Notes">
                    <Download size={18} strokeWidth={2.5} />
                </button>
            </div>
        </div>
        <textarea
            value={content}
            onChange={handleChange}
            placeholder="TYPE_PROTOCOLS_HERE_"
            className="flex-1 w-full bg-[#0a0a0a] text-white/90 p-10 resize-none outline-none font-mono text-lg leading-relaxed placeholder-white/10 custom-scrollbar"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px)', backgroundSize: '100% 2.8em' }}
        />
        <div className="glass-card p-4 border-t border-white/5 flex items-center gap-4 bg-white/5 backdrop-blur-3xl">
           <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
           <span className="text-[9px] font-bold text-white/20 tracking-[0.4em] uppercase italic">P2P_NOTE_SYNC_DATA_STREAMING_ACTIVE</span>
        </div>
    </div>
  );
};

export default CollaborativeNotes;