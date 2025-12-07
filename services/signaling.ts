import { SignalPayload, DrawLinePayload } from '../types';
// @ts-ignore
import { joinRoom } from 'trystero/mqtt';

class PeerSignalingService {
  private room: any = null;
  private sendAction: any = null;
  private listeners: Record<string, Function[]> = {};
  public userId: string;
  public isConnectedToSignaling: boolean = false;
  private pendingCandidates: any[] = [];

  constructor() {
    // Generate a shorter, cleaner ID to save bandwidth
    this.userId = Math.random().toString(36).substr(2, 9);
  }

  public joinRoom(roomId: string, name: string) {
    // Prevent re-joining loop
    if (this.room) {
        return;
    } 

    try {
        // Mosquitto is often the most reliable public broker for WebSockets
        const config = { 
            appId: 'syncmeet-v1',
            brokerUrls: [
                'wss://test.mosquitto.org:8081/mqtt', // Standard Secure WS
            ] 
        };

        this.room = joinRoom(config, roomId);
        
        const [send, get] = this.room.makeAction('signal');
        this.sendAction = send;
        this.isConnectedToSignaling = true;

        // Listen for messages
        get((data: SignalPayload, peerId: string) => {
          // Ignore own messages
          if (data.senderId === this.userId) return;
          this.emit(data.type, data);
        });

        // Peer Joined Event - This is the Trigger for connection
        this.room.onPeerJoin((peerId: string) => {
          console.log(`✅ Peer Joined: ${peerId}`);
          // Send a specific 'hello' signal to trigger the handshake
          this.send('join', roomId, { name });
        });

        this.room.onPeerLeave((peerId: string) => {
             console.log(`❌ Peer Left: ${peerId}`);
             this.emit('leave', { senderId: peerId, roomId });
        });

        // Announce presence once on mount
        setTimeout(() => {
          this.send('join', roomId, { name });
        }, 500);

    } catch (error) {
        console.error("Signaling Initialization Failed:", error);
        this.isConnectedToSignaling = false;
    }
  }

  // --- Wrapper to prevent crashes if socket is closed ---
  private send(type: SignalPayload['type'], roomId: string, payload: any) {
    if (!this.sendAction) return;
    try {
        // Small delay for candidates to prevent packet flooding
        if (type === 'ice-candidate') {
            this.sendAction({ type, roomId, senderId: this.userId, payload });
        } else {
            this.sendAction({ type, roomId, senderId: this.userId, payload });
        }
    } catch (e) {
        console.warn(`Failed to send ${type}`, e);
    }
  }

  // --- API Methods ---
  public sendOffer(roomId: string, targetUserId: string, offer: RTCSessionDescriptionInit) {
    this.send('offer', roomId, { targetUserId, sdp: offer });
  }

  public sendAnswer(roomId: string, targetUserId: string, answer: RTCSessionDescriptionInit) {
    this.send('answer', roomId, { targetUserId, sdp: answer });
  }

  public sendIceCandidate(roomId: string, targetUserId: string, candidate: RTCIceCandidate) {
    this.send('ice-candidate', roomId, { targetUserId, candidate });
  }

  public sendChatMessage(roomId: string, message: any) {
    this.send('chat', roomId, message);
  }

  public sendChatStatus(roomId: string, status: 'seen', messageIds: string[]) {
    this.send('chat-status', roomId, { status, messageIds });
  }

  public sendTyping(roomId: string, isTyping: boolean) {
    this.send('typing', roomId, { isTyping });
  }

  public sendMediaStatus(roomId: string, kind: 'audio' | 'video', enabled: boolean) {
    this.send('media-status', roomId, { kind, enabled });
  }

  public sendScreenShareStatus(roomId: string, isScreenSharing: boolean) {
    this.send('screen-share-status', roomId, { isScreenSharing });
  }

  public sendDrawLine(roomId: string, data: DrawLinePayload) {
    this.send('draw-line', roomId, data);
  }

  public sendClearBoard(roomId: string) {
    this.send('clear-board', roomId, {});
  }

  public sendNoteUpdate(roomId: string, content: string) {
    this.send('sync-notes', roomId, { content });
  }

  public sendReaction(roomId: string, emoji: string) {
    this.send('reaction', roomId, { emoji });
  }

  public leaveRoom(roomId: string) {
    if (this.room) {
        try { this.room.leave(); } catch(e) {}
    }
    this.room = null;
    this.sendAction = null;
    this.isConnectedToSignaling = false;
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export const signaling = new PeerSignalingService();