import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, ArrowRight, Paperclip, FileText, Download, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string, file?: any) => void;
  onClose: () => void;
  onTyping: () => void;
  isRemoteTyping: boolean;
}

const LinkPreview: React.FC<{ text: string }> = ({ text }) => {
    // Regex to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-black font-black underline decoration-black underline-offset-4 hover:bg-[#ffdf00] break-all inline-flex items-center gap-1"
                        >
                            {part}
                            <ExternalLink size={10} strokeWidth={3} />
                        </a>
                    );
                }
                return part;
            })}
        </span>
    );
};

const Chat: React.FC<ChatProps> = ({ 
  messages, 
  currentUserId, 
  onSendMessage, 
  onClose,
  onTyping,
  isRemoteTyping
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isRemoteTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large. Max 5MB.");
            return;
        }
        setAttachedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    let filePayload = undefined;
    if (attachedFile) {
        const reader = new FileReader();
        reader.readAsDataURL(attachedFile);
        reader.onload = () => {
             const base64 = reader.result as string;
             filePayload = {
                 name: attachedFile.name,
                 type: attachedFile.type,
                 size: attachedFile.size,
                 data: base64
             };
             onSendMessage(inputText, filePayload);
             setInputText('');
             setAttachedFile(null);
        };
    } else {
        onSendMessage(inputText);
        setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white font-bold">
      {/* Header */}
      <div className="p-6 border-b-[6px] border-black flex justify-between items-center bg-[#ffdf00]">
        <div className="flex items-center gap-4">
           <div className="bg-black p-2">
                <MessageSquare className="text-[#ffdf00]" size={24} strokeWidth={3} />
           </div>
           <h2 className="text-3xl font-black text-black uppercase italic -skew-x-6 tracking-tight">
            COMMS_LOG
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 border-4 border-black bg-white hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          <X size={24} strokeWidth={3} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#f0f0f0]">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale translate-y-[-20px]">
            <div className="bg-black p-10 rotate-12 mb-8">
                <MessageSquare size={64} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-3xl font-black uppercase italic tracking-tighter">EMPTY_CHANNEL_</p>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUserId;
          const isSequence = index > 0 && messages[index-1].senderId === msg.senderId;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
              {!isSequence && (
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs font-black uppercase px-2 py-0.5 border-2 border-black ${isMe ? 'bg-[#ffdf00]' : 'bg-black text-white'}`}>
                    {isMe ? 'AUTH_USER' : msg.senderName.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-black font-black uppercase tracking-widest">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
              
              <div 
                className={`
                  p-4 text-sm font-bold border-4 border-black break-words relative group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
                  ${isMe 
                    ? 'bg-white text-black' 
                    : 'bg-white text-black'}
                `}
                style={{ maxWidth: '90%' }}
              >
                {/* File Attachment */}
                {msg.file && (
                    <div className="mb-4 p-4 bg-[#ffdf00] border-4 border-black flex items-center gap-4">
                        <div className="p-3 bg-black">
                            <FileText size={24} className="text-white" strokeWidth={3} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-black uppercase truncate text-xs italic">{msg.file.name}</p>
                            <p className="text-[10px] uppercase font-black">{(msg.file.size / 1024).toFixed(1)} KB_DATA_STREAM</p>
                        </div>
                        <a 
                            href={msg.file.data} 
                            download={msg.file.name}
                            className="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors"
                        >
                            <Download size={16} strokeWidth={3} />
                        </a>
                    </div>
                )}

                {/* Text Content */}
                <div className="font-bold leading-relaxed">
                   {msg.text && <LinkPreview text={msg.text} />}
                </div>
                
                {/* Status Indicator */}
                {isMe && (
                    <div className="flex justify-end mt-2 opacity-30">
                        {msg.status === 'seen' ? (
                             <CheckCheck size={14} strokeWidth={3} />
                        ) : msg.status === 'delivered' ? (
                             <CheckCheck size={14} strokeWidth={3} />
                        ) : (
                             <Check size={14} strokeWidth={3} />
                        )}
                    </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Remote Typing */}
        {isRemoteTyping && (
           <div className="flex flex-col items-start animate-fade-in pl-1">
              <span className="text-[10px] font-black uppercase text-black mb-2 px-2 bg-red-400 border-2 border-black italic">PEER_IS_UPLOADING_THOUGHTS_</span>
              <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                 <div className="flex gap-2">
                    <div className="w-3 h-3 bg-black animate-pulse" />
                    <div className="w-3 h-3 bg-black animate-pulse delay-75" />
                    <div className="w-3 h-3 bg-black animate-pulse delay-150" />
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#ffdf00] border-t-[6px] border-black pb-32 md:pb-8">
        {attachedFile && (
            <div className="mb-4 px-4 py-3 bg-white border-4 border-black flex justify-between items-center text-xs font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <span className="flex items-center gap-3 truncate">
                    <Paperclip size={14} strokeWidth={3} />
                    FILE: {attachedFile.name}
                </span>
                <button onClick={() => setAttachedFile(null)} className="p-1 border-2 border-black hover:bg-black hover:text-white"><X size={14} strokeWidth={3} /></button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-4 items-start">
          <div className="flex-1 flex flex-col gap-2">
             <div className="relative group">
                <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="TYPE_MESSAGE_HERE_"
                    className="w-full bg-white border-4 border-black p-4 text-sm font-black uppercase placeholder-black/30 outline-none focus:bg-[#f0f0f0] transition-colors shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1"
                />
             </div>
          </div>

          <div className="flex flex-col gap-3">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-4 border-black bg-white hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                <Paperclip size={24} strokeWidth={3} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileSelect} 
              />

              <button 
                type="submit" 
                disabled={!inputText.trim() && !attachedFile}
                className="p-4 border-4 border-black bg-black text-[#ffdf00] hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-20"
              >
                <Send size={24} strokeWidth={3} />
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Chat;