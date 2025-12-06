import { useState, useEffect, useRef, useCallback } from 'react';
import { signaling } from '../services/signaling';
import { ChatMessage, SignalPayload } from '../types';

export const useChat = (roomId: string, currentUserId: string, userName: string, isChatOpen: boolean) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Mark messages as seen when chat is open
  useEffect(() => {
    if (isChatOpen && messages.length > 0) {
      const unseenIds = messages
        .filter(m => m.senderId !== currentUserId && m.status !== 'seen')
        .map(m => m.id);
      
      if (unseenIds.length > 0) {
        signaling.sendChatStatus(roomId, 'seen', unseenIds);
        setMessages(prev => prev.map(m => 
          unseenIds.includes(m.id) ? { ...m, status: 'seen' } : m
        ));
      }
    }
  }, [isChatOpen, messages.length, roomId, currentUserId]);

  const sendMessage = (text: string, file?: { name: string, type: string, size: number, data: string }) => {
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      senderId: currentUserId,
      senderName: userName,
      text,
      timestamp: Date.now(),
      status: 'sent',
      file
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // We send the whole message object (excluding local-only properties if any)
    signaling.sendChatMessage(roomId, {
        id: newMessage.id,
        senderName: userName,
        text,
        timestamp: newMessage.timestamp,
        file
    });
  };

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      signaling.sendTyping(roomId, true);
      lastTypingSentRef.current = now;
    }
  }, [roomId]);

  const clearMessages = () => {
    setMessages([]);
    setIsRemoteTyping(false);
  };

  useEffect(() => {
    const handleChat = (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      
      setIsRemoteTyping(false);
      
      const newMsg: ChatMessage = {
        id: payload.payload.id || Math.random().toString(),
        senderId: payload.senderId,
        senderName: payload.payload.senderName,
        text: payload.payload.text,
        timestamp: payload.payload.timestamp,
        status: isChatOpen ? 'seen' : 'delivered',
        file: payload.payload.file
      };

      setMessages(prev => [...prev, newMsg]);

      // If chat is open, immediately acknowledge
      if (isChatOpen) {
        signaling.sendChatStatus(roomId, 'seen', [newMsg.id]);
      }
    };

    const handleChatStatus = (payload: SignalPayload) => {
        if (payload.roomId !== roomId) return;
        const { status, messageIds } = payload.payload;
        
        if (status === 'seen') {
            setMessages(prev => prev.map(msg => 
                messageIds.includes(msg.id) ? { ...msg, status: 'seen' } : msg
            ));
        }
    };

    const handleTyping = (payload: SignalPayload) => {
      if (payload.roomId !== roomId) return;
      const { isTyping } = payload.payload;

      if (isTyping) {
        setIsRemoteTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => setIsRemoteTyping(false), 3000);
      } else {
        setIsRemoteTyping(false);
      }
    };

    signaling.on('chat', handleChat);
    signaling.on('chat-status', handleChatStatus);
    signaling.on('typing', handleTyping);
    
    return () => {
      signaling.off('chat', handleChat);
      signaling.off('chat-status', handleChatStatus);
      signaling.off('typing', handleTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, isChatOpen]);

  return { 
    messages, 
    sendMessage, 
    clearMessages,
    notifyTyping,
    isRemoteTyping
  };
};