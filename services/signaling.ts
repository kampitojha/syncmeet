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

  private isSearchingLobby: boolean = false;

  private initPeer(roomId: string, localStream: MediaStream | null) {
    if (this.peer) {
        this.peer.destroy();
    }
    this.peer = new Peer(this.userId, { host: '0.peerjs.com', port: 443, secure: true, debug: 1 });

    this.peer.on('open', (id) => {
        this.emit('system-log', { message: `NODE_READY: Protocol established at ${id}.`, type: 'success' });
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
        this.emit('system-log', { message: `PEER_ERR: ${err.type || 'unknown'}. Restarting...`, type: 'error' });
        if (err.type === 'id-taken') {
            this.userId = `sm-${roomId}-p-${Math.random().toString(36).substring(2, 6)}`;
            setTimeout(() => this.initPeer(roomId, localStream), 1000);
        }
    });

    this.peer.on('disconnected', () => {
        this.peer?.reconnect();
    });
  }

  private tryJoinLobby(roomId: string, localStream: MediaStream | null) {
      if (this.isSearchingLobby) return;
      this.isSearchingLobby = true;

      const lobbyId = `sm-${roomId}-lobby-master`;
      this.emit('system-log', { message: `SEARCH_LOBBY: Looking for room hub...`, type: 'info' });

      let lobbyConn: DataConnection | null = this.peer!.connect(lobbyId, { reliable: true });
      
      const timeout = setTimeout(() => {
          if (this.isSearchingLobby && !this.connections[lobbyId]) {
              this.isSearchingLobby = false;
              if (lobbyConn) {
                  lobbyConn.close();
                  lobbyConn = null;
              }
              this.emit('system-log', { message: `LOBBY_EMPTY: No hub found. Self-promotional backoff...`, type: 'info' });
              // Random delay to prevent simultaneous promotion
              setTimeout(() => this.becomeLobbyMaster(roomId, localStream), Math.random() * 2000 + 500);
          }
      }, 6000);

      lobbyConn.on('open', () => {
          clearTimeout(timeout);
          this.isSearchingLobby = false;
          this.emit('system-log', { message: `LOBBY_FOUND: Hub connected. Syncing mesh...`, type: 'success' });
          this.handleIncomingConnection(lobbyConn!, localStream);
      });

      lobbyConn.on('error', () => {
          this.isSearchingLobby = false;
          clearTimeout(timeout);
      });
  }

  private becomeLobbyMaster(roomId: string, localStream: MediaStream | null) {
      if (this.isLobbyMaster || this.lobbyPeer) return;

      const lobbyId = `sm-${roomId}-lobby-master`;
      this.emit('system-log', { message: `PROMOTING: Establishing room hub authority...`, type: 'warn' });
      
      this.lobbyPeer = new Peer(lobbyId, { host: '0.peerjs.com', port: 443, secure: true, debug: 1 });

      this.lobbyPeer.on('open', (id) => {
          this.isLobbyMaster = true;
          this.knownPeerIds.add(this.userId);
          this.emit('system-log', { message: `HUB_ACTIVE: Authority established. Listening for nodes.`, type: 'success' });
          
          this.lobbyPeer!.on('connection', (conn) => {
              let announcerId: string | null = null;
              conn.on('open', () => {
                  conn.on('data', (data: any) => {
                      if (data.type === 'announce') {
                          announcerId = data.peerId;
                          this.knownPeerIds.add(announcerId);
                          this.emit('system-log', { message: `AUTH: Peer ${announcerId} verified. Updating mesh.`, type: 'info' });
                          
                          this.connectToPeer(announcerId, localStream);
                          this.broadcastToAll({ type: 'new_peer', peerId: announcerId });
                          conn.send({ type: 'peer_list', peers: Array.from(this.knownPeerIds) });
                      }
                  });
              });

              conn.on('close', () => {
                  if (announcerId) {
                      this.knownPeerIds.delete(announcerId);
                      this.emit('leave', { senderId: announcerId });
                      this.broadcastToAll({ type: 'peer_leave', peerId: announcerId });
                  }
              });
          });
      });

      this.lobbyPeer.on('error', (err: any) => {
          this.isLobbyMaster = false;
          if (this.lobbyPeer) {
              this.lobbyPeer.destroy();
              this.lobbyPeer = null;
          }
          if (err.type === 'id-taken') {
              this.emit('system-log', { message: `HUB_COLLISION: ID Taken. Hub already exists. Re-syncing...`, type: 'warn' });
              this.tryJoinLobby(roomId, localStream);
          } else {
              this.emit('system-log', { message: `HUB_ERR: ${err.type}. Protocol failed.`, type: 'error' });
          }
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
                          if (pid !== this.userId) {
                              this.knownPeerIds.add(pid);
                              this.connectToPeer(pid, localStream);
                          }
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
          this.knownPeerIds.delete(conn.peer);
      });
  }

  private connectToPeer(targetId: string, localStream: MediaStream | null) {
      if (!this.peer || targetId === this.userId || this.connections[targetId]) return;
      
      // Strict rule: Only initiate connection if our ID is "smaller" lexicographically
      // This prevents double connection attempts in most cases.
      if (this.userId > targetId) return;

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