import io, { Socket } from 'socket.io-client';
import Peer from 'simple-peer';

type Listener = (data: any) => void;

class RobustMeshSignaling {
  userId: string;
  userName: string = 'User';
  socket: Socket | null = null;
  peers: Record<string, Peer.Instance> = {};
  peerMetadata: Record<string, { userId: string, userName: string }> = {};
  listeners: Record<string, Listener[]> = {};
  activeRoom: string | null = null;
  localStream: MediaStream | null = null;

  constructor() {
    this.userId = `sm-p-${Math.random().toString(36).substring(2, 6)}-${Date.now().toString(36).substring(5)}`;
  }

  on(event: string, callback: Listener) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return this;
  }

  off(event: string, callback: Listener) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    return this;
  }

  private trigger(event: string, data: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }

  async joinRoom(roomId: string, name: string, localStream: MediaStream | null = null) {
    // Robust room normalization (trim + lowercase)
    const normalizedRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    this.userName = name;
    this.activeRoom = normalizedRoomId;
    this.localStream = localStream;

    if (this.socket) {
        this.socket.disconnect();
    }

    // DYNAMIC URL DETECTION: Always prioritize the explicitly set env variable
    const BACKEND_URL = (import.meta as any).env.VITE_SIGNALING_SERVER || 'http://localhost:3001';
    
    this.trigger('system-log', { message: `CONNECT_ATTEMPT: Targeting hub at ${BACKEND_URL}`, type: 'info' });

    this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'], // Fallback to polling if WS is blocked
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
        this.trigger('system-log', { message: `SIGNAL_ACTIVE: Uplink secured. Identifying as NODE_${this.userId.substring(5, 9)}`, type: 'success' });
        this.socket?.emit('join-room', normalizedRoomId, this.userId, this.userName);
    });

    this.socket.on('mesh-manifest', (users: any[]) => {
        this.trigger('system-log', { message: `MANIFEST_RX: Syncing ${users.length} neighbors. Total mesh: ${users.length + 1}`, type: 'info' });
        users.forEach(user => {
            this.createPeerConnection(user.socketId, user.userId, user.userName, true);
        });
    });

    this.socket.on('user-entered-mesh', ({ socketId, userId, userName }) => {
        this.trigger('system-log', { message: `NODE_DISCOVERY: ${userName} entering local orbit.`, type: 'info' });
        this.createPeerConnection(socketId, userId, userName, false);
    });

    this.socket.on('signal', ({ fromSocketId, fromUid, fromName, signal }) => {
        if (!this.peers[fromSocketId]) {
            this.createPeerConnection(fromSocketId, fromUid, fromName, false);
        }
        this.peers[fromSocketId].signal(signal);
    });

    this.socket.on('user-left-mesh', ({ socketId, userId }) => {
        this.trigger('system-log', { message: `NODE_LOST: Peer ${userId} de-synced from mesh.`, type: 'warn' });
        this.destroyPeerConnection(socketId);
    });

    this.socket.on('broadcast-action', (payload: any) => {
        this.trigger(payload.type, { 
            roomId: this.activeRoom, 
            senderId: payload.senderId, 
            senderName: payload.senderName || 'Peer',
            payload: payload.data 
        });
    });

    this.socket.on('connect_error', (err) => {
        this.trigger('system-log', { message: `HUB_ERR: Protocol fail. Check if backend is live at ${BACKEND_URL}`, type: 'error' });
    });
  }

  private createPeerConnection(targetSocketId: string, peerUid: string, peerName: string, isInitiator: boolean) {
    if (this.peers[targetSocketId]) {
        console.warn('Peer collision detected. Re-syncing...');
        this.peers[targetSocketId].destroy();
    }

    const peer = new Peer({
        initiator: isInitiator,
        trickle: true,
        stream: this.localStream || undefined,
        config: { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ] 
        }
    });

    peer.on('signal', (data) => {
        this.socket?.emit('signal', { 
            toSocketId: targetSocketId, 
            signal: data, 
            fromUid: this.userId, 
            fromName: this.userName 
        });
    });

    peer.on('stream', (stream) => {
        this.trigger('track_received', { peerId: peerUid, stream });
    });

    peer.on('data', (raw) => {
        const data = JSON.parse(raw.toString());
        this.trigger(data.type, { roomId: this.activeRoom, senderId: peerUid, payload: data.payload });
    });

    peer.on('connect', () => {
        this.trigger('join', { roomId: this.activeRoom, senderId: peerUid, payload: { name: peerName } });
        this.trigger('peer-joined', { peerId: peerUid }); // Sync for App log
    });

    peer.on('close', () => this.destroyPeerConnection(targetSocketId));
    peer.on('error', (err) => this.destroyPeerConnection(targetSocketId));

    this.peers[targetSocketId] = peer;
    this.peerMetadata[targetSocketId] = { userId: peerUid, userName: peerName };

    return peer;
  }

  private destroyPeerConnection(targetSocketId: string) {
    const meta = this.peerMetadata[targetSocketId];
    if (meta) {
        this.trigger('leave', { senderId: meta.userId });
    }
    if (this.peers[targetSocketId]) {
        this.peers[targetSocketId].destroy();
        delete this.peers[targetSocketId];
        delete this.peerMetadata[targetSocketId];
    }
  }

  leaveRoom() {
    this.socket?.disconnect();
    this.socket = null;
    Object.keys(this.peers).forEach(sid => this.destroyPeerConnection(sid));
    this.activeRoom = null;
  }

  send(type: string, payload: any, useRelay: boolean = false) {
    const data = JSON.stringify({ type, payload });
    Object.values(this.peers).forEach(peer => {
        if (peer.connected) peer.send(data);
    });
    if (useRelay && this.socket?.connected) {
        this.socket.emit('broadcast-action', this.activeRoom, { 
            type, 
            senderId: this.userId, 
            senderName: this.userName,
            data: payload 
        });
    }
  }

  sendMediaStatus(r: string, k: any, e: boolean) { this.send('media-status', { kind: k, enabled: e }); }
  sendReaction(r: string, e: string) { this.send('reaction', { emoji: e }, true); }
  sendHandRaise(r: string, i: boolean) { this.send('hand-raise', { isRaised: i }); }
  sendSystemLog(r: string, m: string, t: any = 'info') { this.trigger('system-log', { message: m, type: t }); }
  sendCaption(r: string, t: string) { this.send('caption-update', { text: t }); }
  sendTyping(r: string, i: boolean) { this.send('typing', { isTyping: i }); }
  sendScreenShareStatus(r: string, i: boolean) { this.send('screen-status', { isScreenSharing: i }); }
  sendChatMessage(r: string, d: any) { this.send('chat', d, true); }
  sendChatStatus(r: string, s: string, i: string[]) { this.send('chat-status', { status: s, messageIds: i }); }
  sendPollUpdate(r: string, p: any) { this.send('poll-update', { poll: p }, true); }
  sendPollVote(r: string, p: string, o: string) { this.send('poll-vote', { pollId: p, optionId: o }, true); }
  sendDrawLine(r: string, d: any) { this.send('draw-line', d); }
  sendClearBoard(r: string) { this.send('clear-board', {}); }
  sendNoteUpdate(r: string, c: string) { this.send('sync-notes', { content: c }); }
  sendMediaSync(r: string, d: any) { this.send('media-sync', d); }
}

export const signaling = new RobustMeshSignaling();