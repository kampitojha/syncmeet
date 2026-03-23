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
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar pb-10">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.senderId === 'local' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-2 md:gap-3 mb-1.5 md:mb-2 ${msg.senderId === 'local' ? 'flex-row-reverse' : ''}`}>
              <div className={`px-2 md:px-3 py-0.5 md:py-1 border-2 border-black font-black text-[8px] md:text-[9px] uppercase tracking-widest italic shadow-[2px_2px_0px_#000] ${msg.senderId === 'local' ? 'bg-[var(--brutal-yellow)]' : 'bg-[var(--brutal-violet)] text-white'}`}>
                {msg.senderName}
              </div>
              <span className="text-[7px] md:text-[8px] font-black uppercase opacity-30 mt-1">[{msg.timestamp}]</span>
            </div>
            
            <div className={`
                max-w-[95%] md:max-w-[90%] p-3 md:p-4 border-[3px] md:border-[4px] border-black transition-all transform
                ${msg.senderId === 'local' ? 'bg-white shadow-[4px_4px_0px_var(--brutal-yellow)] md:shadow-[6px_6px_0px_var(--brutal-yellow)] md:-rotate-1' : 'bg-white shadow-[4px_4px_0px_var(--brutal-violet)] md:shadow-[6px_6px_0px_var(--brutal-violet)] md:rotate-1'}
            `}>
              {msg.text.startsWith('FILE_PROTO:') ? (
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div className="p-2 md:p-3 bg-black text-white border border-white shadow-[2px_2px_0px_#000] shrink-0">
                         <Paperclip className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={3} />
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-[10px] md:text-[12px] font-black uppercase italic leading-none truncate">{msg.text.replace('FILE_PROTO: ', '')}</span>
                          <span className="text-[7px] md:text-[8px] font-black uppercase opacity-40 mt-1">PROTO_UPLINK</span>
                      </div>
                      <button className="ml-2 md:ml-4 brutal-btn p-1.5 md:p-2 bg-[var(--brutal-cyan)] text-[10px] shrink-0"> <Download className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={3} /> </button>
                  </div>
              ) : (
                  <p className="text-xs md:text-sm font-black leading-tight whitespace-pre-wrap lowercase">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isRemoteTyping && (
          <div className="flex items-center gap-2 px-1 opacity-80">
             <div className="bg-black text-white px-2 md:px-3 py-1 text-[8px] md:text-[9px] font-black uppercase border-2 border-black shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_var(--brutal-orange)] animate-pulse">
                UPLINK_READY...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* CHAT_INPUT_CONTROLLER */}
      <div className="p-4 md:p-6 bg-white border-t-[4px] md:border-t-[6px] border-black shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-20">
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-4 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <div className="flex flex-col items-center gap-1 md:gap-2">
            <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                className="w-10 h-10 md:w-14 md:h-14 brutal-card border-2 md:border-4 bg-[#f0f0f0] flex items-center justify-center shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] hover:bg-[var(--brutal-cyan)]"
            >
                <Paperclip className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </button>
            <span className="text-[7px] md:text-[8px] font-black uppercase opacity-30">CLIP</span>
          </div>
          
          <div className="flex-1 flex flex-col gap-1 md:gap-2">
            <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); onNotifyTyping(); }}
                placeholder="PROMPT..."
                className="w-full brutal-input p-3 md:p-4 text-[12px] md:text-[14px] font-black placeholder:text-black/10 bg-[#fcfcfc] border-2 md:border-4"
            />
            <div className="flex justify-between px-1">
                <span className="text-[6px] md:text-[7px] font-black uppercase tracking-widest text-black/40">AES_256_ENCRYPTED</span>
                {input.length > 0 && <span className="text-[6px] md:text-[7px] font-black text-[var(--brutal-green)] underline">RDY</span>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 md:gap-2">
            <button type="submit" className="w-10 h-10 md:w-14 md:h-14 brutal-btn-primary flex items-center justify-center border-2 md:border-4 shadow-[3px_3px_0px_#000] md:shadow-[4px_4px_0px_#000] hover:bg-black hover:text-white transition-all">
                <Send className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </button>
            <span className="text-[7px] md:text-[8px] font-black uppercase opacity-30 italic">SEND</span>
          </div>
        </form>
      </div>

      {/* DECORATIVE_FLOW */}
      <div className="absolute top-10 right-4 hidden xl:flex flex-col gap-2 opacity-10 select-none pointer-events-none">
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