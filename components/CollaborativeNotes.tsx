import React, { useState, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';
import { FileText, Save } from 'lucide-react';

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
    // Debounce success msg
    setTimeout(() => setStatus('SYNC_OK'), 1000);
  };

  useEffect(() => {
    const handleSync = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        if (payload.payload.content !== content) {
            setContent(payload.payload.content);
        }
    };

    signaling.on('sync-notes', handleSync);
    return () => signaling.off('sync-notes', handleSync);
  }, [roomId, content]);

  return (
    <div className="flex flex-col h-full bg-white border-[6px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] font-bold">
        <div className="p-6 border-b-[6px] border-black bg-[#ffdf00] flex justify-between items-center overflow-hidden">
            <div className="flex items-center gap-4 text-black font-black uppercase italic -skew-x-6 text-2xl">
                <FileText size={24} strokeWidth={3} />
                <span>SHARED_INTEL_</span>
            </div>
            <div className={`px-4 py-1 border-4 border-black text-xs font-black uppercase italic ${status === 'SYNC_OK' ? 'bg-green-400' : 'bg-red-400'}`}>
                {status}
            </div>
        </div>
        <textarea
            value={content}
            onChange={handleChange}
            placeholder="TYPE_PROTOCOLS_HERE_"
            className="flex-1 w-full bg-white text-black p-10 resize-none focus:outline-none font-mono text-lg leading-relaxed placeholder-black/20"
            style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px)', backgroundSize: '100% 2em' }}
        />
        <div className="p-4 bg-black text-[#ffdf00] text-[10px] font-black uppercase tracking-[0.3em] flex justify-center">
            ENCRYPTED_P2P_DATA_SYNC_ACTIVE
        </div>
    </div>
  );
};

export default CollaborativeNotes;