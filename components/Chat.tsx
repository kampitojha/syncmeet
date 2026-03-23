import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Terminal, Paperclip, Download } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatProps {
  roomId: string;
  userName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onNotifyTyping: () => void;
  isRemoteTyping: boolean;
}

const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  onNotifyTyping,
  isRemoteTyping
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRemoteTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { alert("ERROR: MESH_TRANSFER_LIMIT: 1MB"); return; }
          onSendMessage(`FILE_PROTO: [${file.name}] (${(file.size/1024).toFixed(1)}KB)`);
      }
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans text-white/90">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.senderId === 'local' ? 'items-end' : 'items-start'} animate-fade-in`}
          >
            <div className={`flex items-center gap-2 mb-2 ${msg.senderId === 'local' ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center p-1">
                <UserIcon size={12} className="text-cyan-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 truncate max-w-[120px]">
                {msg.senderName} • {msg.timestamp}
              </span>
            </div>
            
            <div className={`
                max-w-[90%] p-4 rounded-2xl border border-white/5 shadow-xl transition-all hover:scale-[1.01]
                ${msg.senderId === 'local' ? 'bg-cyan-400 text-black font-semibold' : 'bg-white/5 text-white/90 backdrop-blur-md'}
            `}>
              {msg.text.startsWith('FILE_PROTO:') ? (
                  <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl border ${msg.senderId === 'local' ? 'bg-black text-cyan-400 border-black/10' : 'bg-white/10 text-cyan-400 border-white/10'}`}>
                         <Paperclip size={16} strokeWidth={2} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-tight">{msg.text.replace('FILE_PROTO: ', '')}</span>
                          <span className="text-[8px] opacity-40 uppercase font-black">Secure Transfer Ready</span>
                      </div>
                      <Download size={18} className="ml-4 cursor-pointer opacity-60 hover:opacity-100 transition-opacity" />
                  </div>
              ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isRemoteTyping && (
          <div className="flex items-center gap-3 animate-pulse px-2 opacity-40">
             <div className="flex gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                 <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest">TRANSMITTING_DATA</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex gap-3 glass-card p-2 rounded-3xl border border-white/10 shadow-2xl transition-all focus-within:border-cyan-500/30">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 rounded-2xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-cyan-400 transition-all">
            <Paperclip size={20} strokeWidth={2} />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); onNotifyTyping(); }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none p-4 text-sm text-white placeholder:text-white/20 outline-none"
          />
          <button type="submit" className="p-4 rounded-2xl bg-cyan-400 text-black hover:bg-white transition-all shadow-lg shadow-cyan-400/20 active:scale-95 group">
            <Send size={20} strokeWidth={2} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;