import { joinRoom, selfId, Room } from 'trystero';

// --- MESH_PROTOCOL_V4: Ultra-Discovery signaling pool ---
const config = { 
  appId: 'sync-meet-industrial-v4', // Fresh namespace to clear any legacy state
  trackerUrls: [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.files.fm:7073/announce',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.fastcast.nz',
    'wss://tracker.novage.com.ua:8443/announce', // Alternative global tracker
    'wss://tracker.gbitt.info:443/announce'       // High availability tracker
  ]
};

type Listener = (data: any) => void;

class PeerSignalingService {
  userId: string;
  rooms: Record<string, Room> = {};
  actions: Record<string, any> = {};
  listeners: Record<string, Listener[]> = {};

  constructor() {
    this.userId = selfId;
  }

  on(event: string, callback: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return this;
  }

  off(event: string, callback: Listener) {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    return this;
  }

  emit(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }

  joinRoom(roomId: string, name: string) {
    // Robust room re-entry logic
    if (this.rooms[roomId]) {
        console.log(`MESH_PROTOCOL: Signaling already active for ${roomId}`);
        return;
    }

    try {
      const room = joinRoom(config, roomId);
      this.rooms[roomId] = room;

      const types = [
        'join', 'offer', 'answer', 'ice-candidate', 
        'media-status', 'reaction', 'hand-raise', 
        'system-log', 'file-transfer', 'media-sync',
        'caption-update', 'poll-update', 'poll-vote',
        'screen-status', 'typing', 'draw-line',
        'clear-board', 'sync-notes', 'chat', 'chat-status'
      ];

      types.forEach(type => {
        const [send, receive] = room.makeAction(type);
        this.actions[`${roomId}_${type}`] = send;
        receive((payload: any, senderId: string) => {
          this.emit(type, { roomId, senderId, payload });
        });
      });

      room.onPeerJoin((peerId: string) => {
          console.log(`MESH_PROTOCOL: Peer ${peerId} discovered on tracker mesh`);
          this.emit('peer-joined', { peerId });
          // Immediate broadcast after joining to settle presence
          setTimeout(() => this.send(roomId, 'join', { name }), 500);
      });

      room.onPeerLeave((peerId: string) => {
          console.log(`MESH_PROTOCOL: Peer ${peerId} lost contact`);
          this.emit('leave', { senderId: peerId });
      });

    } catch (error) {
        console.error("MESH_PROTOCOL_CRITICAL_FAILURE", error);
        this.emit('system-log', { message: `PROTOCOL_JOIN_FAILURE: Check network firewall`, type: 'error' });
    }
  }

  leaveRoom(roomId: string) {
      if (this.rooms[roomId]) {
          this.rooms[roomId].leave();
          delete this.rooms[roomId];
      }
  }

  send(roomId: string, type: string, payload: any) {
    const action = this.actions[`${roomId}_${type}`];
    if (action) {
      try {
        action(payload);
      } catch (e) {
        console.warn(`SIGNAL_MESSAGING_FAILURE: [${type}]`, e);
      }
    }
  }

  // Predefined protocols
  sendOffer(r: string, t: string, s: any) { this.send(r, 'offer', { targetUserId: t, sdp: s }); }
  sendAnswer(r: string, t: string, s: any) { this.send(r, 'answer', { targetUserId: t, sdp: s }); }
  sendIceCandidate(r: string, t: string, c: any) { this.send(r, 'ice-candidate', { targetUserId: t, candidate: c }); }
  sendMediaStatus(r: string, k: any, e: boolean) { this.send(r, 'media-status', { kind: k, enabled: e }); }
  sendReaction(r: string, e: string) { this.send(r, 'reaction', { emoji: e }); }
  sendHandRaise(r: string, i: boolean) { this.send(r, 'hand-raise', { isRaised: i }); }
  sendSystemLog(r: string, m: string, t: any = 'info') { this.send(r, 'system-log', { message: m, type: t }); }
  sendMediaSync(r: string, d: any) { this.send(r, 'media-sync', d); }
  sendCaption(r: string, t: string) { this.send(r, 'caption-update', { text: t }); }
  sendPollUpdate(r: string, p: any) { this.send(r, 'poll-update', { poll: p }); }
  sendPollVote(r: string, p: string, o: string) { this.send(r, 'poll-vote', { pollId: p, optionId: o }); }
  sendDrawLine(r: string, d: any) { this.send(r, 'draw-line', d); }
  sendClearBoard(r: string) { this.send(r, 'clear-board', {}); }
  sendNoteUpdate(r: string, c: string) { this.send(r, 'sync-notes', { content: c }); }
  sendChatMessage(r: string, d: any) { this.send(r, 'chat', d); }
  sendChatStatus(r: string, s: string, i: string[]) { this.send(r, 'chat-status', { status: s, messageIds: i }); }
  sendTyping(r: string, i: boolean) { this.send(r, 'typing', { isTyping: i }); }
  sendScreenShareStatus(r: string, i: boolean) { this.send(r, 'screen-status', { isScreenSharing: i }); }
}

export const signaling = new PeerSignalingService();