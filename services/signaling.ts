import Peer, { DataConnection, MediaConnection } from 'peerjs';

type Listener = (data: any) => void;

class PeerSignalingService {
  userId: string;
  peer: Peer | null = null;
  connections: Record<string, DataConnection> = {};
  calls: Record<string, MediaConnection> = {};
  listeners: Record<string, Listener[]> = {};
  activeRoom: string | null = null;
  userName: string = 'User';
  discoveryInterval: any = null;

  constructor() {
    this.userId = Math.random().toString(36).substring(2, 6);
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

  async joinRoom(roomId: string, name: string, localStream: MediaStream | null = null) {
    const normalizedRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.peer && this.activeRoom === normalizedRoomId) return;

    this.userName = name;
    this.activeRoom = normalizedRoomId;
    
    // Find an available slot (sm-[room]-[slot])
    this.initNode(normalizedRoomId, 0, localStream);
  }

  private initNode(roomId: string, slot: number, localStream: MediaStream | null) {
      if (slot > 10) {
          this.emit('system-log', { message: `MESH_PROTOCOL: Room capacity reached or unstable network.`, type: 'error' });
          return;
      }

      const peerId = `sm-${roomId}-${slot}`;
      const peer = new Peer(peerId, { host: '0.peerjs.com', port: 443, secure: true, debug: 1 });

      peer.on('open', (id) => {
          this.peer = peer;
          console.log(`MESH_V5_STABLE: Node Slot [${slot}] Taken as ${id}`);
          this.emit('system-log', { message: `MESH_PROTOCOL: Session Slot [${slot}] Active. Protocol V5-INDUSTRIAL.`, type: 'success' });
          this.startDiscovery(roomId, slot, localStream);
      });

      peer.on('connection', (conn) => this.handleConnection(conn, localStream));
      peer.on('call', (call) => {
          if (localStream) {
              call.answer(localStream);
              this.handleCall(call);
          }
      });

      peer.on('error', (err: any) => {
          if (err.type === 'id-taken') {
              peer.destroy();
              this.initNode(roomId, slot + 1, localStream);
          } else {
              console.error("PEERJS_TRANSPORT_ERROR", err.type);
          }
      });
  }

  private startDiscovery(roomId: string, mySlot: number, localStream: MediaStream | null) {
      if (this.discoveryInterval) clearInterval(this.discoveryInterval);
      
      const scan = () => {
          for (let i = 0; i <= 10; i++) {
              if (i === mySlot) continue;
              const targetId = `sm-${roomId}-${i}`;
              if (!this.connections[targetId]) {
                  const conn = this.peer!.connect(targetId, { reliable: true });
                  this.handleConnection(conn, localStream);
              }
          }
      };

      scan();
      this.discoveryInterval = setInterval(scan, 8000);
  }

  private handleConnection(conn: DataConnection, localStream: MediaStream | null) {
      conn.on('open', () => {
          this.connections[conn.peer] = conn;
          this.emit('system-log', { message: `MESH_PROTOCOL: Node contact established with SL_ID_${conn.peer.split('-').pop()}`, type: 'info' });
          
          conn.on('data', (data: any) => {
              if (data.type === 'metadata') {
                  this.emit('join', { roomId: this.activeRoom, senderId: conn.peer, payload: { name: data.name } });
              } else {
                  this.emit(data.type, { roomId: this.activeRoom, senderId: conn.peer, payload: data.payload });
              }
          });

          conn.send({ type: 'metadata', name: this.userName });

          // Initiate media handoff
          if (localStream && this.peer!.id < conn.peer) {
              const call = this.peer!.call(conn.peer, localStream);
              this.handleCall(call);
          }
      });

      conn.on('close', () => {
          this.emit('leave', { senderId: conn.peer });
          delete this.connections[conn.peer];
      });
      
      conn.on('error', () => {
          delete this.connections[conn.peer];
      });
  }

  private handleCall(call: MediaConnection) {
      this.calls[call.peer] = call;
      call.on('stream', (stream) => {
          this.emit('track_received', { peerId: call.peer, stream });
      });
  }

  leaveRoom() {
      if (this.discoveryInterval) clearInterval(this.discoveryInterval);
      if (this.peer) this.peer.destroy();
      this.peer = null;
      this.connections = {};
      this.calls = {};
      this.activeRoom = null;
  }

  send(type: string, payload: any) {
      Object.values(this.connections).forEach(conn => {
          if (conn.open) conn.send({ type, payload });
      });
  }

  // Legacy wrappers
  sendOffer() {}
  sendAnswer() {}
  sendIceCandidate() {}
  sendMediaStatus(r: string, k: any, e: boolean) { this.send('media-status', { kind: k, enabled: e }); }
  sendReaction(r: string, e: string) { this.send('reaction', { emoji: e }); }
  sendHandRaise(r: string, i: boolean) { this.send('hand-raise', { isRaised: i }); }
  sendSystemLog(r: string, m: string, t: any = 'info') { this.emit('system-log', { message: m, type: t }); }
  sendMediaSync(r: string, d: any) { this.send('media-sync', d); }
  sendCaption(r: string, t: string) { this.send('caption-update', { text: t }); }
  sendPollUpdate(r: string, p: any) { this.send('poll-update', { poll: p }); }
  sendPollVote(r: string, p: string, o: string) { this.send('poll-vote', { pollId: p, optionId: o }); }
  sendDrawLine(r: string, d: any) { this.send('draw-line', d); }
  sendClearBoard(r: string) { this.send('clear-board', {}); }
  sendNoteUpdate(r: string, c: string) { this.send('sync-notes', { content: c }); }
  sendChatMessage(r: string, d: any) { this.send('chat', d); }
  sendChatStatus(r: string, s: string, i: string[]) { this.send('chat-status', { status: s, messageIds: i }); }
  sendTyping(r: string, i: boolean) { this.send('typing', { isTyping: i }); }
  sendScreenShareStatus(r: string, i: boolean) { this.send('screen-status', { isScreenSharing: i }); }
}

export const signaling = new PeerSignalingService();