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
                    let domain = '';
                    try { domain = new URL(part).hostname; } catch(e) {}
                    return (
                        <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-indigo-300 hover:text-indigo-200 underline decoration-indigo-400/50 break-all inline-flex items-center gap-1"
                        >
                            {part}
                            <ExternalLink size={10} />
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
        // Simple size limit check (e.g. 5MB)
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
        // Convert to Base64
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/50 backdrop-blur-sm">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Messages
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all transform hover:rotate-90 duration-300"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="bg-gray-800 p-4 rounded-full">
                <MessageSquare size={32} className="text-indigo-400" />
            </div>
            <div className="space-y-1">
                <p className="text-gray-300 font-medium">No messages yet</p>
                <p className="text-xs text-gray-500 max-w-[200px]">Messages sent here will appear for everyone in the room.</p>
            </div>
          </div>
        )}
        
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUserId;
          const isSequence = index > 0 && messages[index-1].senderId === msg.senderId;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in-up`}>
              {!isSequence && (
                <div className="flex items-baseline gap-2 mb-1.5 px-1">
                  <span className={`text-xs font-bold ${isMe ? 'text-indigo-400' : 'text-purple-400'}`}>
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-gray-600 font-medium">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              
              <div 
                className={`
                  px-4 py-3 text-sm leading-relaxed shadow-sm max-w-[85%] break-words relative group
                  ${isMe 
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-gray-800 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700'}
                `}
              >
                {/* File Attachment */}
                {msg.file && (
                    <div className="mb-2 p-3 bg-black/20 rounded-xl flex items-center gap-3 border border-white/10">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-xs">{msg.file.name}</p>
                            <p className="text-[10px] opacity-70">{(msg.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <a 
                            href={msg.file.data} 
                            download={msg.file.name}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <Download size={14} />
                        </a>
                    </div>
                )}

                {/* Text Content with Link Preview Logic */}
                {msg.text && <LinkPreview text={msg.text} />}
                
                {/* Status Indicator (Only for sent messages) */}
                {isMe && (
                    <div className="flex justify-end mt-1 -mr-1">
                        {msg.status === 'seen' ? (
                             <CheckCheck size={12} className="text-blue-300" />
                        ) : msg.status === 'delivered' ? (
                             <CheckCheck size={12} className="text-gray-400" />
                        ) : (
                             <Check size={12} className="text-gray-400/70" />
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
              <span className="text-xs font-medium text-gray-500 mb-1.5 ml-1">Peer is typing</span>
              <div className="bg-gray-800/80 px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-700/50">
                 <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {/* 
          pb-28 on mobile gives enough clearance for the floating controls (usually ~80px tall)
          md:pb-6 resets it on desktop where controls are not overlapping this area as much or layout differs
      */}
      <div className="p-4 md:p-6 bg-gray-900/80 backdrop-blur-md border-t border-white/5 pb-28 md:pb-6 transition-all">
        {/* Attached File Preview */}
        {attachedFile && (
            <div className="mb-2 px-4 py-2 bg-gray-800 rounded-lg flex justify-between items-center text-xs text-gray-300 border border-gray-700">
                <span className="flex items-center gap-2 truncate">
                    <Paperclip size={12} />
                    {attachedFile.name}
                </span>
                <button onClick={() => setAttachedFile(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
            </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center shadow-lg rounded-full gap-2">
          {/* File Upload Button */}
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 bg-gray-800 text-gray-400 hover:text-white rounded-full border border-gray-700 hover:bg-gray-700 transition-all flex-shrink-0"
          >
            <Paperclip size={18} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 text-white rounded-full px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-gray-700 transition-all placeholder-gray-500 min-w-0"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() && !attachedFile}
            className="p-3.5 bg-indigo-600 rounded-full text-white hover:bg-indigo-500 disabled:opacity-50 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all transform active:scale-95 flex-shrink-0"
          >
            {inputText.trim() || attachedFile ? <Send size={18} /> : <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;