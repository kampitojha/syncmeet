import Peer, { DataConnection, MediaConnection } from 'peerjs';

type Listener = (data: any) => void;

class PeerSignalingService {
  userId: string; // This is the full, unique PeerID for this session
  peer: Peer | null = null;
  connections: Record<string, DataConnection> = {};
  calls: Record<string, MediaConnection> = {};
  listeners: Record<string, Listener[]> = {};
  activeRoom: string | null = null;
  userName: string = 'User';
  knownPeerIds: Set<string> = new Set();
  isLobbyMaster: boolean = false;
  lobbyPeer: Peer | null = null;

  constructor() {
    this.userId = `sm-p-${Math.random().toString(36).substring(2, 6)}-${Date.now().toString(36).substring(5)}`;
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
    this.userId = `sm-${normalizedRoomId}-p-${Math.random().toString(36).substring(2, 6)}`;
    
    this.initPeer(normalizedRoomId, localStream);
  }

  private initPeer(roomId: string, localStream: MediaStream | null) {
    this.peer = new Peer(this.userId, { host: '0.peerjs.com', port: 443, secure: true, debug: 1 });

    this.peer.on('open', (id) => {
        this.emit('system-log', { message: `MESH_V6: Node Active. Protocol LOBBY_GRID.`, type: 'success' });
        this.tryJoinLobby(roomId, localStream);
    });

    this.peer.on('connection', (conn) => this.handleIncomingConnection(conn, localStream));
    this.peer.on('call', (call) => {
        if (localStream) {
            call.answer(localStream);
            this.handleCall(call);
        }
    });

    this.peer.on('error', (err: any) => {
        if (err.type === 'id-taken') {
            this.userId = `sm-${roomId}-p-${Math.random().toString(36).substring(2, 6)}`;
            this.initPeer(roomId, localStream);
        }
    });
  }

  private tryJoinLobby(roomId: string, localStream: MediaStream | null) {
      const lobbyId = `sm-${roomId}-lobby-master`;
      const lobbyConn = this.peer!.connect(lobbyId, { reliable: true });
      
      const timeout = setTimeout(() => {
          if (!this.connections[lobbyId]) this.becomeLobbyMaster(roomId, localStream);
      }, 3000);

      lobbyConn.on('open', () => {
          clearTimeout(timeout);
          this.handleIncomingConnection(lobbyConn, localStream);
      });
  }

  private becomeLobbyMaster(roomId: string, localStream: MediaStream | null) {
      const lobbyId = `sm-${roomId}-lobby-master`;
      this.lobbyPeer = new Peer(lobbyId, { host: '0.peerjs.com', port: 443, secure: true, debug: 1 });

      this.lobbyPeer.on('open', (id) => {
          this.isLobbyMaster = true;
          this.emit('system-log', { message: `MESH_V6: Established Room Hub. Waiting for participants...`, type: 'success' });
          
          this.lobbyPeer!.on('connection', (conn) => {
              conn.on('open', () => {
                  conn.on('data', (data: any) => {
                      if (data.type === 'announce') {
                          this.knownPeerIds.add(data.peerId);
                          this.broadcastToAll({ type: 'new_peer', peerId: data.peerId });
                          conn.send({ type: 'peer_list', peers: Array.from(this.knownPeerIds) });
                      }
                  });
              });
          });
      });

      this.lobbyPeer.on('error', (err: any) => {
          if (err.type === 'id-taken') this.tryJoinLobby(roomId, localStream);
      });
  }

  private handleIncomingConnection(conn: DataConnection, localStream: MediaStream | null) {
      conn.on('open', () => {
          this.connections[conn.peer] = conn;
          
          conn.send({ type: 'metadata', name: this.userName, peerId: this.userId });
          
          if (conn.peer.includes('lobby-master')) {
              conn.send({ type: 'announce', peerId: this.userId });
          }

          conn.on('data', (data: any) => {
              switch(data.type) {
                  case 'metadata':
                      this.knownPeerIds.add(data.peerId);
                      this.emit('join', { roomId: this.activeRoom, senderId: conn.peer, payload: { name: data.name } });
                      if (!conn.peer.includes('lobby-master') && localStream && this.userId < conn.peer) {
                           const call = this.peer!.call(conn.peer, localStream);
                           this.handleCall(call);
                      }
                      break;
                  case 'new_peer':
                      if (data.peerId !== this.userId) this.connectToPeer(data.peerId, localStream);
                      break;
                  case 'peer_list':
                      data.peers.forEach((pid: string) => {
                          if (pid !== this.userId) this.connectToPeer(pid, localStream);
                      });
                      break;
                  default:
                      this.emit(data.type, { roomId: this.activeRoom, senderId: conn.peer, payload: data.payload });
              }
          });
      });

      conn.on('close', () => {
          this.emit('leave', { senderId: conn.peer });
          delete this.connections[conn.peer];
      });
  }

  private connectToPeer(targetId: string, localStream: MediaStream | null) {
      if (!this.peer || targetId === this.userId || this.connections[targetId]) return;
      const conn = this.peer.connect(targetId, { reliable: true });
      this.handleIncomingConnection(conn, localStream);
  }

  private handleCall(call: MediaConnection) {
      this.calls[call.peer] = call;
      call.on('stream', (stream) => {
          this.emit('track_received', { peerId: call.peer, stream });
      });
  }

  private broadcastToAll(data: any) {
      Object.values(this.connections).forEach(conn => {
          if (conn.open) conn.send(data);
      });
  }

  leaveRoom() {
      if (this.peer) this.peer.destroy();
      if (this.lobbyPeer) this.lobbyPeer.destroy();
      this.peer = null;
      this.lobbyPeer = null;
      this.connections = {};
      this.calls = {};
      this.activeRoom = null;
      this.isLobbyMaster = false;
  }

  send(type: string, payload: any) {
      Object.values(this.connections).forEach(conn => {
          if (conn.open && !conn.peer.includes('lobby-master')) {
              conn.send({ type, payload });
          }
      });
  }

  // Wrapper protocols
  sendMediaStatus(r: string, k: any, e: boolean) { this.send('media-status', { kind: k, enabled: e }); }
  sendReaction(r: string, e: string) { this.send('reaction', { emoji: e }); }
  sendHandRaise(r: string, i: boolean) { this.send('hand-raise', { isRaised: i }); }
  sendSystemLog(r: string, m: string, t: any = 'info') { this.emit('system-log', { message: m, type: t }); }
  sendCaption(r: string, t: string) { this.send('caption-update', { text: t }); }
  sendTyping(r: string, i: boolean) { this.send('typing', { isTyping: i }); }
  sendScreenShareStatus(r: string, i: boolean) { this.send('screen-status', { isScreenSharing: i }); }
  sendChatMessage(r: string, d: any) { this.send('chat', d); }
  sendChatStatus(r: string, s: string, i: string[]) { this.send('chat-status', { status: s, messageIds: i }); }
  sendPollUpdate(r: string, p: any) { this.send('poll-update', { poll: p }); }
  sendPollVote(r: string, p: string, o: string) { this.send('poll-vote', { pollId: p, optionId: o }); }
  sendDrawLine(r: string, d: any) { this.send('draw-line', d); }
  sendClearBoard(r: string) { this.send('clear-board', {}); }
  sendNoteUpdate(r: string, c: string) { this.send('sync-notes', { content: c }); }
  sendMediaSync(r: string, d: any) { this.send('media-sync', d); }
}

export const signaling = new PeerSignalingService();