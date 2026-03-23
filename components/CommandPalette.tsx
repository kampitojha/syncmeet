import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Command, Zap, ArrowRight, X, ShieldAlert } from 'lucide-react';

interface CommandPaletteProps {
  onCommand: (command: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const COMMANDS = [
  { cmd: '/mute', desc: 'TOGGLE_MICROPHONE_STREAM', icon: <Zap size={14} />, category: 'COMM' },
  { cmd: '/cam', desc: 'TOGGLE_CAMERA_CAPTURE', icon: <Zap size={14} />, category: 'COMM' },
  { cmd: '/share', desc: 'INITIALIZE_SCREEN_BROADCAST', icon: <Zap size={14} />, category: 'MEDIA' },
  { cmd: '/hand', desc: 'REQUEST_SPEECH_PROTOCOL', icon: <Zap size={14} />, category: 'PROTOCOL' },
  { cmd: '/leave', desc: 'TERMINATE_CRYPTO_LINK', icon: <Zap size={14} />, category: 'SYSTEM' },
  { cmd: '/clear', desc: 'PURGE_PROTOCOL_LOGS', icon: <Zap size={14} />, category: 'MAINT' },
];

const CommandPalette: React.FC<CommandPaletteProps> = ({ onCommand, onClose, isOpen }) => {
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setInput('');
    }
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter(c => 
    c.cmd.toLowerCase().includes(input.toLowerCase()) || 
    c.desc.toLowerCase().includes(input.toLowerCase())
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cmd = filteredCommands[selectedIndex]?.cmd || input;
    if (cmd) {
      onCommand(cmd);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-mono" onClick={onClose}>
      <div 
        className="brutal-card bg-white w-full max-w-4xl overflow-hidden p-10 md:p-14 animate-slide-up border-[10px] border-black shadow-[30px_30px_0px_var(--brutal-violet)] rotate-1"
        onClick={e => e.stopPropagation()}
      >
        {/* PALETTE_HEADER */}
        <div className="flex items-center justify-between mb-12 border-b-8 border-black pb-8">
          <div className="flex items-center gap-6">
             <div className="bg-[var(--brutal-yellow)] p-4 border-4 border-black shadow-[8px_8px_0px_#000]">
                <Command className="text-black" size={36} strokeWidth={4} />
             </div>
             <div className="flex flex-col">
                <h2 className="font-black text-4xl uppercase tracking-tighter italic leading-none">COMMAND_CORE_v4</h2>
                <span className="text-[10px] font-black uppercase opacity-30 mt-2 tracking-widest italic">DIRECT_TERMINAL_ACCESS_PROTOCOL</span>
             </div>
          </div>
          <button onClick={onClose} className="brutal-btn p-3 bg-[var(--brutal-red)] text-white hover:bg-black transition-colors border-4">
             <X size={32} strokeWidth={4} />
          </button>
        </div>

        {/* SEARCH_INTERFACE */}
        <form onSubmit={handleSubmit} className="relative mb-10 group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black opacity-30 group-focus-within:opacity-100 transition-opacity">
            <Terminal size={28} strokeWidth={3} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="EXECUTE_COMMAND_STRING..."
            className="w-full brutal-input p-8 pl-20 text-black font-black uppercase text-2xl italic outline-none border-[6px] shadow-[12px_12px_0px_#000] focus:shadow-none focus:translate-x-[6px] focus:translate-y-[6px]"
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 hidden md:block">
            <kbd className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase border-2 border-white">ENTER [TX]</kbd>
          </div>
        </form>

        {/* COMMAND_BUFFER_LIST */}
        <div className="space-y-6 max-h-[450px] overflow-y-auto pr-6 custom-scrollbar p-2">
          {filteredCommands.length > 0 ? (
              filteredCommands.map((c, i) => (
                <div 
                  key={c.cmd}
                  onClick={() => { setSelectedIndex(i); handleSubmit(); }}
                  className={`
                    p-6 border-[6px] border-black flex items-center justify-between cursor-pointer transition-all relative overflow-hidden transform
                    ${i === selectedIndex ? 'bg-[var(--brutal-violet)] text-white shadow-none translate-x-3 -rotate-1' : 'bg-white hover:bg-[#f0f0f0] shadow-[8px_8px_0px_#000] hover:shadow-none hover:translate-x-2'}
                  `}
                >
                  <div className="flex items-center gap-8 relative z-10">
                    <div className={`p-4 border-4 border-black shadow-[4px_4px_0px_#000] ${i === selectedIndex ? 'bg-white text-black' : 'bg-[var(--brutal-yellow)] text-black'}`}>
                        {c.icon}
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <span className="font-black text-2xl tracking-tighter italic uppercase">{c.cmd}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 border-2 border-black ${i === selectedIndex ? 'bg-black text-white' : 'bg-[#f0f0f0]'}`}>{c.category}</span>
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${i === selectedIndex ? 'opacity-70' : 'opacity-40'}`}>{c.desc}</span>
                    </div>
                  </div>
                  {i === selectedIndex && (
                    <div className="flex items-center gap-4 animate-bounce-right relative z-10">
                        <ArrowRight size={32} strokeWidth={4} />
                    </div>
                  )}
                  {/* Background Decal */}
                  <div className="absolute right-[-20px] top-[-20px] opacity-5 pointer-events-none scale-150 rotate-12">
                     <Command size={100} strokeWidth={1} />
                  </div>
                </div>
              ))
          ) : (
              <div className="text-center py-20 border-[8px] border-dashed border-black/10 bg-[#fcfcfc] flex flex-col items-center gap-4">
                  <ShieldAlert size={64} strokeWidth={3} className="opacity-10" />
                  <span className="italic font-black text-2xl uppercase tracking-[0.2em] opacity-20">NULL_RESULTS_FOUND</span>
                  <p className="text-[10px] font-black uppercase opacity-20">CHECK_LOCAL_UPLINK_STRING_CONSISTENCY</p>
              </div>
          )}
        </div>

        {/* PALETTE_FOOTER */}
        <div className="mt-12 flex justify-between items-center text-[11px] font-black uppercase tracking-[.3em] italic border-t-4 border-black pt-8">
           <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-black animate-pulse" />
                <span className="opacity-40">AES_256_LINK_ENCRYPTED_v4.5</span>
           </div>
           <span className="text-[var(--brutal-violet)]">SYNCMEET_SYS_TERMINAL_2024</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
