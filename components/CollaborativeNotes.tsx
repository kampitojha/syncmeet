import React, { useState, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';
import { FileText, Save, Download } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-white font-mono overflow-hidden text-black">
        <div className="brutal-card bg-white p-4 flex items-center justify-between border-b-4 border-black z-[70] shadow-none">
            <div className="flex items-center gap-3">
                <div className="bg-[#ffdf1e] p-2 border-2 border-black"> <FileText size={18} strokeWidth={3} /> </div>
                <span className="font-black text-sm uppercase tracking-widest italic">SHARED_NOTES_v4</span>
            </div>
            <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 border-2 border-black text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${status === 'SYNC_OK' ? 'bg-[#00ff9d]' : 'bg-[#ff5e5e] text-white brutal-shake'}`}>
                    <Save size={14} strokeWidth={3} className={status === 'SYNCING...' ? 'animate-spin' : ''} /> {status}
                </div>
                <button onClick={handleDownload} className="brutal-btn p-2 bg-white" title="Export">
                    <Download size={18} strokeWidth={3} />
                </button>
            </div>
        </div>
        
        <textarea
            value={content}
            onChange={handleChange}
            placeholder="TYPE_PROTOCOLS_HERE_"
            className="flex-1 w-full bg-white text-black p-8 resize-none outline-none font-bold text-lg leading-relaxed placeholder-black/10 custom-scrollbar"
            style={{ 
                backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px)', 
                backgroundSize: '100% 2.8em' 
            }}
        />
        
        <div className="p-3 border-t-4 border-black flex items-center gap-3 bg-[#f0f0f0]">
           <div className="w-3 h-3 bg-[#ffdf1e] border-2 border-black animate-pulse" />
           <span className="text-[9px] font-black text-black/40 tracking-widest uppercase italic">P2P_SYNC_STREAMING_v4</span>
        </div>
    </div>
  );
};

export default CollaborativeNotes;