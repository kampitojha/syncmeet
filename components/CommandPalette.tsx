import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Command, Zap, ArrowRight, X } from 'lucide-react';

interface CommandPaletteProps {
  onCommand: (command: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const COMMANDS = [
  { cmd: '/mute', desc: 'TOGGLE_MICROPHONE_STREAM', icon: <Zap size={14} /> },
  { cmd: '/cam', desc: 'TOGGLE_CAMERA_CAPTURE', icon: <Zap size={14} /> },
  { cmd: '/share', desc: 'INITIALIZE_SCREEN_BROADCAST', icon: <Zap size={14} /> },
  { cmd: '/hand', desc: 'REQUEST_SPEECH_PROTOCOL', icon: <Zap size={14} /> },
  { cmd: '/leave', desc: 'TERMINATE_CRYPTO_LINK', icon: <Zap size={14} /> },
  { cmd: '/clear', desc: 'PURGE_PROTOCOL_LOGS', icon: <Zap size={14} /> },
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-mono" onClick={onClose}>
      <div 
        className="brutal-card bg-white w-full max-w-2xl overflow-hidden p-6 md:p-8 animate-slide-up border-[6px] border-black shadow-[12px_12px_0px_black]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8 border-b-4 border-black pb-4">
          <div className="flex items-center gap-3">
             <div className="bg-[#ffdf1e] p-2 border-2 border-black">
                <Command className="text-black" size={24} strokeWidth={3} />
             </div>
             <span className="font-black text-xl uppercase tracking-widest">COMMAND_PALETTE</span>
          </div>
          <button onClick={onClose} className="brutal-btn p-2 hover:bg-[#ff5e5e] hover:text-white transition-all">
             <X size={24} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mb-6">
          <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-black opacity-40" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="TYPE_COMMAND_HERE..."
            className="w-full brutal-input p-5 pl-14 text-black font-black uppercase text-lg italic outline-none"
          />
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredCommands.length > 0 ? (
              filteredCommands.map((c, i) => (
                <div 
                  key={c.cmd}
                  onClick={() => { setSelectedIndex(i); handleSubmit(); }}
                  className={`
                    p-4 border-2 border-black flex items-center justify-between cursor-pointer transition-all
                    ${i === selectedIndex ? 'bg-[#ffdf1e] shadow-[4px_4px_0px_black] -translate-y-1' : 'bg-white hover:bg-[#f0f0f0] shadow-none'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg italic">{c.cmd}</span>
                    <span className="text-[10px] md:text-xs font-black opacity-50 tracking-widest">{c.desc}</span>
                  </div>
                  {i === selectedIndex && <ArrowRight size={18} strokeWidth={3} />}
                </div>
              ))
          ) : (
              <div className="text-center py-10 border-4 border-dashed border-black/20 italic font-black opacity-40">
                  NO_MATCHING_COMMANDS
              </div>
          )}
        </div>

        <div className="mt-8 flex justify-between items-center text-[10px] font-black opacity-30 tracking-widest uppercase">
           <span className="italic flex items-center gap-2"> <Zap size={10} strokeWidth={3} /> ENCRYPTED_LINK_v4.5</span>
           <span>SYNCMEET_BRUTAL_v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
