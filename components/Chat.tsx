import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Paperclip, Download, Activity } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-[#f8f8f8] font-mono text-black relative brutal-grid-dot">
      {/* MESSAGES_PORT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.senderId === 'local' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-3 mb-2 ${msg.senderId === 'local' ? 'flex-row-reverse' : ''}`}>
              <div className={`px-3 py-1 border-2 border-black font-black text-[9px] uppercase tracking-widest italic shadow-[2px_2px_0px_#000] ${msg.senderId === 'local' ? 'bg-[var(--brutal-yellow)]' : 'bg-[var(--brutal-violet)] text-white'}`}>
                {msg.senderName}
              </div>
              <span className="text-[8px] font-black uppercase opacity-30 mt-1">[{msg.timestamp}]</span>
            </div>
            
            <div className={`
                max-w-[90%] p-4 border-[4px] border-black transition-all transform
                ${msg.senderId === 'local' ? 'bg-white shadow-[6px_6px_0px_var(--brutal-yellow)] -rotate-1' : 'bg-white shadow-[6px_6px_0px_var(--brutal-violet)] rotate-1'}
            `}>
              {msg.text.startsWith('FILE_PROTO:') ? (
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-black text-white border-2 border-white shadow-[3px_3px_0px_#000]">
                         <Paperclip size={18} strokeWidth={3} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[12px] font-black uppercase italic leading-none">{msg.text.replace('FILE_PROTO: ', '')}</span>
                          <span className="text-[8px] font-black uppercase opacity-40 mt-1">P2P_INTEL_STREAM_ACTIVE</span>
                      </div>
                      <button className="ml-4 brutal-btn p-2 bg-[var(--brutal-cyan)] text-xs"> <Download size={16} strokeWidth={3} /> </button>
                  </div>
              ) : (
                  <p className="text-sm font-black leading-tight whitespace-pre-wrap lowercase">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isRemoteTyping && (
          <div className="flex items-center gap-2 px-2 opacity-80">
             <div className="bg-black text-white px-3 py-1 text-[9px] font-black uppercase border-2 border-black shadow-[4px_4px_0px_var(--brutal-orange)] animate-pulse">
                INCOMING_DATA_STREAM...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CHAT_INPUT_CONTROLLER */}
      <div className="p-6 bg-white border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <div className="flex flex-col items-center gap-2">
            <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-14 h-14 brutal-card border-4 bg-[#f0f0f0] flex items-center justify-center shadow-[4px_4px_0px_#000] hover:bg-[var(--brutal-cyan)]"
            >
                <Paperclip size={24} strokeWidth={3} />
            </button>
            <span className="text-[8px] font-black uppercase opacity-30">ATTACH</span>
          </div>
          
          <div className="flex-1 flex flex-col gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); onNotifyTyping(); }}
                placeholder="PROMPT_MESSAGE_COMMAND..."
                className="w-full brutal-input p-4 text-[14px] font-black placeholder:text-black/10 bg-[#fcfcfc] border-4"
            />
            <div className="flex justify-between px-1">
                <span className="text-[7px] font-black uppercase tracking-widest text-black/40">AES_256_ENCRYPTED_UPLINK</span>
                {input.length > 0 && <span className="text-[7px] font-black text-[var(--brutal-green)]">BUFFER_READY</span>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button type="submit" className="w-14 h-14 brutal-btn-primary flex items-center justify-center border-4 shadow-[4px_4px_0px_#000] hover:bg-black hover:text-white transition-all">
                <Send size={24} strokeWidth={3} />
            </button>
            <span className="text-[8px] font-black uppercase opacity-30">TRANSMIT</span>
          </div>
        </form>
      </div>

      {/* DECORATIVE_FLOW */}
      <div className="absolute top-10 right-4 hidden lg:flex flex-col gap-2 opacity-10 select-none pointer-events-none">
         {[...Array(5)].map((_, i) => (
             <div key={i} className="flex gap-2">
                 <div className="w-1 h-1 bg-black rounded-full" />
                 <div className="w-8 h-1 bg-black" />
             </div>
         ))}
      </div>
    </div>
  );
};

export default Chat;