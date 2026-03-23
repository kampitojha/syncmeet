export type SignalPayload = {
  roomId: string;
  senderId: string;
  senderName: string;
  type: 
    | 'join' 
    | 'offer' 
    | 'answer' 
    | 'ice-candidate' 
    | 'media-status' 
    | 'reaction' 
    | 'hand-raise' 
    | 'system-log' 
    | 'file-transfer' 
    | 'media-sync'
    | 'caption-update'
    | 'poll-update'
    | 'poll-vote'
    | 'screen-status'
    | 'typing'
    | 'draw-line'
    | 'clear-board'
    | 'sync-notes'
    | 'chat'
    | 'chat-status';
  payload: any;
};

export interface DrawLinePayload {
  prev: { x: number, y: number };
  curr: { x: number, y: number };
  color: string;
  width: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'seen';
  file?: {
    name: string;
    type: string;
    size: number;
    data: string;
  };
}

export interface VideoTileProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  username: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isHandRaised?: boolean;
  isGlitching?: boolean;
  isMirrored?: boolean;
  isTyping?: boolean;
  isScreenShare?: boolean;
  networkQuality?: number;
  connectionState?: any;
  reactions?: string[];
  statusMessage?: string;
  onRetry?: () => void;
}

export interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  creatorName: string;
  totalVotes: number;
}