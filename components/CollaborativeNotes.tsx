import React, { useState, useEffect, useRef } from 'react';
import { signaling } from '../services/signaling';
import { SignalPayload } from '../types';
import { 
  FileText, Save, Download, Bold, Italic, List, 
  CheckSquare, Eye, Type, Clock, Users, Zap, Maximize2 
} from 'lucide-react';

interface NotesProps {
  roomId: string;
}

const CollaborativeNotes: React.FC<NotesProps> = ({ roomId }) => {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('READY');
  const [showPreview, setShowPreview] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setReadTime(Math.ceil(words / 200)); // Average 200 wpm
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setStatus('SYNC_IN_PROGRESS');
    signaling.sendNoteUpdate(roomId, newContent);
    
    // Throttle status reset
    const timer = setTimeout(() => setStatus('READY'), 1000);
    return () => clearTimeout(timer);
  };

  const insertText = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newContent = `${before}${prefix}${selection}${suffix}${after}`;
    setContent(newContent);
    signaling.sendNoteUpdate(roomId, newContent);
    
    // Restore focus
    setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SYNCMEET_PROTOCOLS_${new Date().toISOString().split('T')[0]}.md`;
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
    <div className="flex flex-col h-full bg-[#f8f8f8] font-mono overflow-hidden text-black brutal-grid-dot">
        {/* TOOLBAR_HEADER */}
        <div className="bg-white p-4 flex flex-wrap items-center justify-between border-b-[6px] border-black z-[70] shadow-[0_6px_0px_#000]">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="bg-[var(--brutal-yellow)] p-2.5 border-4 border-black shadow-[4px_4px_0px_#000]"> 
                        <FileText size={20} strokeWidth={3} /> 
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-xs uppercase tracking-tighter italic leading-none">MASTER_PROTOCOLS_V4</span>
                        <span className="text-[9px] font-black uppercase opacity-20 mt-1">UPLINK_STABLE</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-1 border-4 border-black bg-white p-1 shadow-[4px_4px_0px_#000]">
                   {[
                     { icon: <Bold size={16} strokeWidth={3} />, action: () => insertText('**', '**'), label: 'BOLD' },
                     { icon: <Italic size={16} strokeWidth={3} />, action: () => insertText('_', '_'), label: 'ITALIC' },
                     { icon: <List size={16} strokeWidth={3} />, action: () => insertText('\n- '), label: 'LIST' },
                     { icon: <CheckSquare size={16} strokeWidth={3} />, action: () => insertText('\n- [ ] '), label: 'TODO' }
                   ].map((btn, i) => (
                      <button key={i} onClick={btn.action} className="p-2 hover:bg-[var(--brutal-cyan)] transition-colors border-2 border-transparent hover:border-black" title={btn.label}>
                         {btn.icon}
                      </button>
                   ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPreview(!showPreview)} 
                  className={`brutal-btn flex items-center gap-2 text-[10px] ${showPreview ? 'bg-[var(--brutal-violet)] text-white shadow-none translate-x-1 translate-y-1' : ''}`}
                >
                    <Eye size={16} strokeWidth={3} /> {showPreview ? 'EDITOR' : 'PREVIEW'}
                </button>
                <button onClick={handleDownload} className="brutal-btn p-2 bg-white" title="EXPORT_LEDGER">
                    <Download size={20} strokeWidth={3} />
                </button>
            </div>
        </div>

        {/* PRESENCE_BAR */}
        <div className="bg-black text-[var(--brutal-green)] py-1.5 px-4 flex items-center justify-between border-b-4 border-black">
            <div className="flex items-center gap-2">
                <Users size={12} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] italic">ACTIVE_NODES_IN_LEDGER</span>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                    <Type size={12} strokeWidth={3} className="text-[var(--brutal-pink)]" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{wordCount} WORDS</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} strokeWidth={3} className="text-[var(--brutal-cyan)]" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{readTime} MIN READ</span>
                </div>
            </div>
        </div>
        
        <div className="flex-1 flex overflow-hidden relative">
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                placeholder="TYPE_PROTOCOLS_HERE_"
                className={`flex-1 w-full bg-white text-black p-8 md:p-12 resize-none outline-none font-black text-xl leading-relaxed placeholder-black/5 custom-scrollbar transition-all
                    ${showPreview ? 'md:border-r-8 border-black opacity-30 blur-sm' : 'opacity-100'}`}
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px)', 
                    backgroundSize: '100% 2.8em' 
                }}
            />

            {showPreview && (
                <div className="absolute md:relative inset-0 md:flex-1 bg-[#f0f0f0] p-8 md:p-12 overflow-y-auto custom-scrollbar animate-slide-up z-50">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-10 opacity-30 select-none">
                            <Maximize2 size={24} strokeWidth={3} />
                            <span className="font-black uppercase tracking-[0.5em] text-sm italic">PREVIEW_MODE_ENABLED</span>
                        </div>
                        <div className="prose prose-xl prose-stone font-mono uppercase tracking-tighter italic leading-relaxed text-black">
                            {content.split('\n').map((line, i) => (
                                <p key={i} className={`mb-4 ${line.startsWith('#') ? 'text-4xl font-black text-[var(--brutal-pink)] mb-8 bg-black pl-4 py-2 text-white' : ''}`}>
                                    {line}
                                </p>
                            ))}
                            {content.length === 0 && <span className="opacity-10">NULL_DATA_STREAM...</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* FOOTER_STATS */}
        <div className="p-4 border-t-8 border-black flex items-center justify-between bg-white overflow-hidden">
           <div className="flex items-center gap-4">
              <div className={`w-4 h-4 border-2 border-black ${status === 'READY' ? 'bg-[var(--brutal-green)] animate-pulse' : 'bg-[var(--brutal-red)] brutal-shake'}`} />
              <span className="text-[10px] font-black text-black tracking-[0.3em] uppercase italic opacity-40">LEDGER_SYNC_STATE: {status}</span>
           </div>
           <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Zap size={14} strokeWidth={3} className="text-[var(--brutal-yellow)]" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic opacity-20">ENCRYPTED_P2P_MESH</span>
                </div>
                <div className="flex gap-1.5 opacity-20 hidden md:flex">
                   {[...Array(6)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-black rotate-45" />)}
                </div>
           </div>
        </div>
    </div>
  );
};

export default CollaborativeNotes;