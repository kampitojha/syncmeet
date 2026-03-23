import React, { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Paperclip, Download } from 'lucide-react';
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
    <div className="flex flex-col h-full bg-[#f0f0f0] font-mono text-black">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.senderId === 'local' ? 'items-end' : 'items-start'}`}
          >
            <div className={`flex items-center gap-2 mb-1 ${msg.senderId === 'local' ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-black uppercase tracking-widest text-black/60 truncate max-w-[150px]">
                {msg.senderName} • {msg.timestamp}
              </span>
            </div>
            
            <div className={`
                max-w-[85%] p-3 border-2 border-black shadow-[4px_4px_0px_black] transition-all
                ${msg.senderId === 'local' ? 'bg-[#ffdf1e]' : 'bg-white'}
            `}>
              {msg.text.startsWith('FILE_PROTO:') ? (
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-black text-white">
                         <Paperclip size={14} strokeWidth={3} />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase">{msg.text.replace('FILE_PROTO: ', '')}</span>
                          <span className="text-[8px] font-black uppercase opacity-60">TRANSFER_MODE_ENABLED</span>
                      </div>
                      <Download size={16} className="ml-2 cursor-pointer hover:text-[#ffdf1e]" />
                  </div>
              ) : (
                  <p className="text-sm font-bold leading-tight whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isRemoteTyping && (
          <div className="flex items-center gap-2 px-2 brutal-shake opacity-60">
             <div className="bg-black text-white px-2 py-0.5 text-[8px] font-black uppercase">DATA_LINK_ACTIVE...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t-4 border-black">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="brutal-btn p-3 bg-[#e0e0e0]">
            <Paperclip size={20} strokeWidth={3} />
          </button>
          
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); onNotifyTyping(); }}
            placeholder="TYPE_MESSAGE..."
            className="flex-1 brutal-input p-3 text-sm placeholder:text-black/30 bg-white"
          />
          <button type="submit" className="brutal-btn-primary p-3">
             <Send size={20} strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;