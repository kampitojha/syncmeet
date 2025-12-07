import { SignalPayload, DrawLinePayload } from '../types';
// @ts-ignore
import { joinRoom } from 'trystero/mqtt';

class PeerSignalingService {
  private room: any = null;
  private sendAction: any = null;
  private listeners: Record<string, Function[]> = {};
  public userId: string;
  public isConnectedToSignaling: boolean = false;

  constructor() {
    this.userId = Math.random().toString(36).substr(2, 9);
  }

  public joinRoom(roomId: string, name: string) {
    if (this.room) {
        // Immediate broadcast if already connected
        this.send('join', roomId, { name });
        return;
    }

    try {
        // Using v3-robust app ID for clean slate
        const config = { 
            appId: 'syncmeet-v3-robust',
            brokerUrls: [
                'wss://broker.emqx.io:8084/mqtt',      // Primary
                'wss://test.mosquitto.org:8081/mqtt',  // Backup
            ] 
        };

        this.room = joinRoom(config, roomId);
        
        const [send, get] = this.room.makeAction('signal');
        this.sendAction = send;
        this.isConnectedToSignaling = true;

        get((data: SignalPayload, peerId: string) => {
          if (data.senderId === this.userId) return;
          this.emit(data.type, data);
        });

        this.room.onPeerJoin((peerId: string) => {
          console.log(`⚡ Instant: Peer ${peerId} detected`);
          this.emit('peer-joined', { peerId });
          // Immediate Reply
          this.send('join', roomId, { name });
        });

        this.room.onPeerLeave((peerId: string) => {
             this.emit('leave', { senderId: peerId, roomId });
        });

        // BURST STRATEGY: Send multiple announces quickly to ensure immediate discovery
        // Fire 0ms (Now)
        this.send('join', roomId, { name });
        
        // Fire 300ms (Backup for packet loss)
        setTimeout(() => this.send('join', roomId, { name }), 300);
        
        // Fire 800ms (Final check)
        setTimeout(() => this.send('join', roomId, { name }), 800);

    } catch (error) {
        console.error("Signaling Init Failed:", error);
        this.isConnectedToSignaling = false;
    }
  }

  private send(type: SignalPayload['type'], roomId: string, payload: any) {
    if (!this.sendAction) return;
    try {
        this.sendAction({ type, roomId, senderId: this.userId, payload });
    } catch (e) {
        console.warn(`Signaling Send Error (${type}):`, e);
    }
  }

  public sendOffer(roomId: string, targetUserId: string, offer: RTCSessionDescriptionInit) {
    this.send('offer', roomId, { targetUserId, sdp: offer });
  }

  public sendAnswer(roomId: string, targetUserId: string, answer: RTCSessionDescriptionInit) {
    this.send('answer', roomId, { targetUserId, sdp: answer });
  }

  public sendIceCandidate(roomId: string, targetUserId: string, candidate: RTCIceCandidate) {
    this.send('ice-candidate', roomId, { targetUserId, candidate });
  }

  public sendRestartRequest(roomId: string) {
      this.send('ice-restart', roomId, {});
  }

  // Chat & Tools
  public sendChatMessage(roomId: string, message: any) { this.send('chat', roomId, message); }
  public sendChatStatus(roomId: string, status: 'seen', messageIds: string[]) { this.send('chat-status', roomId, { status, messageIds }); }
  public sendTyping(roomId: string, isTyping: boolean) { this.send('typing', roomId, { isTyping }); }
  public sendMediaStatus(roomId: string, kind: 'audio' | 'video', enabled: boolean) { this.send('media-status', roomId, { kind, enabled }); }
  public sendScreenShareStatus(roomId: string, isScreenSharing: boolean) { this.send('screen-share-status', roomId, { isScreenSharing }); }
  public sendDrawLine(roomId: string, data: DrawLinePayload) { this.send('draw-line', roomId, data); }
  public sendClearBoard(roomId: string) { this.send('clear-board', roomId, {}); }
  public sendNoteUpdate(roomId: string, content: string) { this.send('sync-notes', roomId, { content }); }
  public sendReaction(roomId: string, emoji: string) { this.send('reaction', roomId, { emoji }); }

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