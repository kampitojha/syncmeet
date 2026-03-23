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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="cmd-palette w-full max-w-2xl overflow-hidden p-6 md:p-8 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8 border-b-4 border-[#ffdf00] pb-4">
          <div className="flex items-center gap-3">
             <Command className="text-[#ffdf00]" size={24} />
             <span className="font-black text-xl uppercase italic -skew-x-12 tracking-widest">SYSTEM_COMMAND_PALETTE</span>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
             <X size={24} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative mb-6">
          <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ffdf00] opacity-50" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="TYPE_PROTO_COMMAND_HERE..."
            className="w-full bg-black/40 border-4 border-[#ffdf00] p-5 pl-14 text-[#ffdf00] font-black uppercase text-lg italic outline-none focus:shadow-[0px_0px_20px_#ffdf00]"
          />
        </form>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
          {filteredCommands.length > 0 ? (
              filteredCommands.map((c, i) => (
                <div 
                  key={c.cmd}
                  onClick={() => { setSelectedIndex(i); handleSubmit(); }}
                  className={`
                    p-4 border-2 flex items-center justify-between cursor-pointer transition-all
                    ${i === selectedIndex ? 'bg-[#ffdf00] text-black border-black scale-[1.02]' : 'bg-transparent text-[#ffdf00] border-[#ffdf00]/30 hover:border-[#ffdf00]'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-black text-lg italic">{c.cmd}</span>
                    <span className="text-[10px] md:text-xs font-bold opacity-70 tracking-tighter">{c.desc}</span>
                  </div>
                  {i === selectedIndex && <ArrowRight size={18} strokeWidth={3} />}
                </div>
              ))
          ) : (
              <div className="text-center py-10 border-2 border-dashed border-[#ffdf00]/20 italic opacity-50 font-black">
                  NO_MATCHING_COMMANDS_FOUND
              </div>
          )}
        </div>

        <div className="mt-8 flex justify-between items-center text-[10px] font-bold opacity-30">
           <span className="italic flex items-center gap-2"> <Zap size={10} /> ENCRYPTED_TERMINAL_LINK</span>
           <span>SYNCMEET_v3.2_PROTO</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
