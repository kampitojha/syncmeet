import React, { useState, useEffect } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';
import { FileText, Save } from 'lucide-react';

interface NotesProps {
  roomId: string;
}

const CollaborativeNotes: React.FC<NotesProps> = ({ roomId }) => {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Saved');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('Syncing...');
    signaling.sendNoteUpdate(roomId, newContent);
    // Debounce success msg
    setTimeout(() => setStatus('Saved'), 1000);
  };

  useEffect(() => {
    const handleSync = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        // Simple strategy: Last write wins. 
        // In prod, use Operational Transformation (OT) or CRDTs (Yjs) for perfect sync.
        if (payload.payload.content !== content) {
            setContent(payload.payload.content);
        }
    };

    signaling.on('sync-notes', handleSync);
    return () => signaling.off('sync-notes', handleSync);
  }, [roomId, content]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/5 bg-gray-800/50 flex justify-between items-center">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <FileText size={18} />
                <span>Shared Notes</span>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1">
                {status === 'Saved' && <Save size={12} />}
                {status}
            </span>
        </div>
        <textarea
            value={content}
            onChange={handleChange}
            placeholder="Type here to collaborate..."
            className="flex-1 w-full bg-[#030712] text-gray-300 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
        />
    </div>
  );
};

export default CollaborativeNotes;