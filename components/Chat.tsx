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
          if (file.size > 1024 * 1024) { alert("ERROR: FILE_TOO_LARGE. MESH_LIMIT: 1MB"); return; }
          onSendMessage(`FILE_TRANSFER_PROTO: [${file.name}] (${(file.size/1024).toFixed(1)}KB)`);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white font-mono">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex flex-col ${msg.senderId === 'local' ? 'items-end' : 'items-start'} animate-slide-in`}
          >
            <div className={`flex items-center gap-2 mb-1.5 ${msg.senderId === 'local' ? 'flex-row-reverse' : ''}`}>
              <div className="bg-black p-1">
                <UserIcon size={12} className="text-[#ffdf00]" />
              </div>
              <span className="text-[10px] font-black uppercase italic tracking-tighter">
                {msg.senderName} [{msg.timestamp}]
              </span>
            </div>
            
            <div className={`
                max-w-[85%] p-3 md:p-4 border-2 md:border-4 border-black relative
                ${msg.senderId === 'local' ? 'bg-[#ffdf00] text-black shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}
            `}>
              {msg.text.startsWith('FILE_TRANSFER_PROTO:') ? (
                  <div className="flex items-center gap-3">
                      <div className="bg-black p-2 border-2 border-white">
                         <Paperclip size={16} className="text-[#ffdf00]" />
                      </div>
                      <span className="text-xs font-black uppercase italic">{msg.text.replace('FILE_TRANSFER_PROTO: ', '')}</span>
                      <Download size={16} className="ml-auto cursor-pointer" />
                  </div>
              ) : (
                  <p className="text-xs md:text-sm font-bold uppercase leading-tight break-words">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        
        {isRemoteTyping && (
          <div className="flex items-center gap-2 animate-pulse mb-4">
             <div className="w-1.5 h-1.5 bg-black" />
             <div className="w-1.5 h-1.5 bg-black" />
             <div className="w-1.5 h-1.5 bg-black" />
             <span className="text-[10px] font-black uppercase italic ml-2">REMOTE_PEER_TRANSMITTING...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-6 bg-[#f0f0f0] border-t-4 border-black">
        <form onSubmit={handleSubmit} className="flex gap-2 md:gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-black text-[#ffdf00] p-3 md:p-4 border-2 md:border-4 border-black hover:bg-white hover:text-black">
            <Paperclip size={20} md:size={24} strokeWidth={3} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onNotifyTyping(); }}
              placeholder="TYPE_PROTO_MSG_"
              className="w-full bg-white border-2 md:border-4 border-black p-3 md:p-4 text-xs md:text-sm font-black uppercase italic outline-none focus:bg-[#ffdf00]"
            />
          </div>
          <button type="submit" className="bg-black text-[#ffdf00] p-3 md:p-4 border-2 md:border-4 border-black">
            <Send size={20} md:size={24} strokeWidth={3} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;