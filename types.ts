export interface User {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'seen';
  file?: {
    name: string;
    type: string;
    size: number;
    data: string; // Base64 Data URL
  };
}

// Signaling Payload Types
export interface SignalPayload {
  type: 
    | 'join' | 'joined' | 'offer' | 'answer' | 'ice-candidate' | 'leave' // Connection
    | 'media-status' | 'screen-share-status' | 'ice-restart' // Media
    | 'chat' | 'typing' | 'chat-status' // Chat
    | 'draw-line' | 'clear-board' // Whiteboard
    | 'sync-notes' // Notes
    | 'reaction'; // Emojis
  roomId: string;
  senderId: string;
  senderName?: string;
  payload?: any;
}

export interface DrawLinePayload {
  prev: { x: number; y: number };
  curr: { x: number; y: number };
  color: string;
  width: number;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInit;
}

export interface SessionDescriptionPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface MediaStatusPayload {
  kind: 'audio' | 'video';
  enabled: boolean;
}

// Props Types
export interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  username?: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isMirrored?: boolean;
  isTyping?: boolean; 
  isScreenShare?: boolean; 
  networkQuality?: number; 
  connectionState?: RTCIceConnectionState;
  reactions?: string[]; // New: Active reactions to display
}