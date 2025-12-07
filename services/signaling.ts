import { SignalPayload, DrawLinePayload } from '../types';
// @ts-ignore
import { joinRoom } from 'trystero/mqtt';

/**
 * P2P Signaling Service using Trystero (MQTT Strategy)
 * MQTT is faster/more reliable for signaling than Torrent/Nostr in many network conditions.
 */
class PeerSignalingService {
  private room: any = null;
  private sendAction: any = null;
  private listeners: Record<string, Function[]> = {};
  public userId: string;
  public isConnectedToSignaling: boolean = false;

  constructor() {
    this.userId = 'user-' + Math.random().toString(36).substr(2, 9);
  }

  public joinRoom(roomId: string, name: string) {
    if (this.room) {
        if (this.sendAction) {
            this.send('join', roomId, { name });
        }
        return;
    } 

    try {
        // Using public MQTT brokers for signaling
        const config = { 
            appId: 'syncmeet-v1',
            brokerUrls: [
                'wss://broker.hivemq.com:8884/mqtt', // Secure WebSocket
                'wss://test.mosquitto.org:8081/mqtt'   // Backup
            ] 
        };

        this.room = joinRoom(config, roomId);
        
        // Setup actions
        const [send, get] = this.room.makeAction('signal');
        this.sendAction = send;
        this.isConnectedToSignaling = true;

        // Listen for messages
        get((data: SignalPayload, peerId: string) => {
          if (data.senderId !== this.userId) {
            this.emit(data.type, data);
          }
        });

        // Peer Joined Event
        this.room.onPeerJoin((peerId: string) => {
          console.log(`📡 Signaling: Peer ${peerId} joined`);
          this.emit('peer-joined', { peerId });
          // Announce ourselves immediately
          this.send('join', roomId, { name });
        });

        this.room.onPeerLeave((peerId: string) => {
             console.log(`📡 Signaling: Peer ${peerId} left`);
        });

        // Initial broadcast
        setTimeout(() => {
          this.send('join', roomId, { name });
        }, 1000);

    } catch (error) {
        console.error("Signaling Initialization Failed:", error);
        this.isConnectedToSignaling = false;
    }
  }

  // --- WebRTC Signaling ---
  public sendOffer(roomId: string, targetUserId: string, offer: RTCSessionDescriptionInit) {
    this.send('offer', roomId, { targetUserId, sdp: offer });
  }

  public sendAnswer(roomId: string, targetUserId: string, answer: RTCSessionDescriptionInit) {
    this.send('answer', roomId, { targetUserId, sdp: answer });
  }

  public sendIceCandidate(roomId: string, targetUserId: string, candidate: RTCIceCandidate) {
    this.send('ice-candidate', roomId, { targetUserId, candidate });
  }

  // --- Chat ---
  public sendChatMessage(roomId: string, message: any) {
    this.send('chat', roomId, message);
  }

  public sendChatStatus(roomId: string, status: 'seen', messageIds: string[]) {
    this.send('chat-status', roomId, { status, messageIds });
  }

  public sendTyping(roomId: string, isTyping: boolean) {
    this.send('typing', roomId, { isTyping });
  }

  // --- Media Status ---
  public sendMediaStatus(roomId: string, kind: 'audio' | 'video', enabled: boolean) {
    this.send('media-status', roomId, { kind, enabled });
  }

  public sendScreenShareStatus(roomId: string, isScreenSharing: boolean) {
    this.send('screen-share-status', roomId, { isScreenSharing });
  }

  // --- Collaboration Features ---
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
    try {
        this.send('leave', roomId, {});
        if (this.room) {
          this.room.leave();
        }
    } catch (e) {
        console.warn("Error leaving room:", e);
    }
    this.room = null;
    this.sendAction = null;
    this.isConnectedToSignaling = false;
  }

  private send(type: SignalPayload['type'], roomId: string, payload: any) {
    if (!this.sendAction) return;

    try {
        const message: SignalPayload = {
          type,
          roomId,
          senderId: this.userId,
          payload
        };
        
        this.sendAction(message);
    } catch (e) {
        console.error(`Error sending signal type ${type}:`, e);
    }
  }

  public on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
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