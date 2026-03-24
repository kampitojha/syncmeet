import io, { Socket } from 'socket.io-client';
import Peer from 'simple-peer';

type Listener = (data: any) => void;

class RobustMeshSignaling {
  userId: string;
  userName: string = 'User';
  socket: Socket | null = null;
  peers: Record<string, Peer.Instance> = {};
  peerMetadata: Record<string, { userId: string, userName: string }> = {};
  peerStatus: Record<string, { connected: boolean, streamReceived: boolean, retryCount: number }> = {};
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
    const normalizedRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    this.userName = name;
    this.activeRoom = normalizedRoomId;
    this.localStream = localStream;

    if (this.socket) this.socket.disconnect();

    const BACKEND_URL = (import.meta as any).env.VITE_SIGNALING_SERVER || 'http://localhost:3001';
    this.trigger('system-log', { message: `CONNECT_TARGET: ${BACKEND_URL}`, type: 'info' });

    this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20
    });

    this.socket.on('connect', () => {
        this.trigger('system-log', { message: `HUB_SYNC: Online. Entry as ${this.userName}_${this.userId.slice(-4)}`, type: 'success' });
        this.socket?.emit('join-room', normalizedRoomId, this.userId, this.userName);
    });

    this.socket.on('mesh-manifest', (users: any[]) => {
        this.trigger('system-log', { message: `MESH_SCAN: Found ${users.length} peers in orbit. Handshaking...`, type: 'info' });
        users.forEach(user => this.createPeerConnection(user.socketId, user.userId, user.userName, true));
    });

    this.socket.on('user-entered-mesh', ({ socketId, userId, userName }) => {
        this.trigger('system-log', { message: `ORBIT_ENTRY: ${userName} detected. Initiating link.`, type: 'info' });
        this.createPeerConnection(socketId, userId, userName, false);
    });

    this.socket.on('signal', ({ fromSocketId, fromUid, fromName, signal }) => {
        if (!this.peers[fromSocketId]) this.createPeerConnection(fromSocketId, fromUid, fromName, false);
        this.peers[fromSocketId].signal(signal);
    });

    this.socket.on('user-left-mesh', ({ socketId, userId }) => {
        this.trigger('system-log', { message: `ORBIT_EXIT: Peer ${userId} de-synced.`, type: 'warn' });
        this.destroyPeerConnection(socketId);
    });

    this.socket.on('broadcast-action', (payload: any) => {
        this.trigger(payload.type, { ...payload, roomId: this.activeRoom });
    });
  }

  private createPeerConnection(targetSocketId: string, peerUid: string, peerName: string, isInitiator: boolean) {
    if (this.peers[targetSocketId]) this.peers[targetSocketId].destroy();

    const peer = new Peer({
        initiator: isInitiator,
        trickle: true,
        stream: this.localStream || undefined,
        config: { 
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ] 
        }
    });

    this.peerStatus[targetSocketId] = { connected: false, streamReceived: false, retryCount: 0 };

    peer.on('signal', (data) => {
        this.socket?.emit('signal', { toSocketId: targetSocketId, signal: data, fromUid: this.userId, fromName: this.userName });
    });

    peer.on('stream', (stream) => {
        this.peerStatus[targetSocketId].streamReceived = true;
        this.trigger('system-log', { message: `VIDEO_LINK: Stream RX from ${peerName}. Sync complete.`, type: 'success' });
        this.trigger('track_received', { peerId: peerUid, stream });
    });

    peer.on('connect', () => {
        this.peerStatus[targetSocketId].connected = true;
        this.trigger('system-log', { message: `DATA_LINK: P2P Tunnel secured with ${peerName}.`, type: 'info' });
        this.trigger('join', { roomId: this.activeRoom, senderId: peerUid, payload: { name: peerName } });
    });

    peer.on('close', () => this.destroyPeerConnection(targetSocketId));
    peer.on('error', (err) => {
        this.trigger('system-log', { message: `P2P_FAIL: Link error with ${peerName}. Retrying...`, type: 'error' });
        this.destroyPeerConnection(targetSocketId);
    });

    setTimeout(() => {
        if (this.socket && this.peerStatus[targetSocketId] && !this.peerStatus[targetSocketId].streamReceived && this.peerStatus[targetSocketId].retryCount < 2) {
            this.peerStatus[targetSocketId].retryCount++;
            this.trigger('system-log', { message: `LINK_RECOVERY: No video payload after 8s. Re-initiating mesh for ${peerName}.`, type: 'warn' });
            this.destroyPeerConnection(targetSocketId);
            this.createPeerConnection(targetSocketId, peerUid, peerName, isInitiator);
        }
    }, 8000);

    this.peers[targetSocketId] = peer;
    this.peerMetadata[targetSocketId] = { userId: peerUid, userName: peerName };
    return peer;
  }

  private destroyPeerConnection(targetSocketId: string) {
    const meta = this.peerMetadata[targetSocketId];
    if (meta) this.trigger('leave', { senderId: meta.userId });
    if (this.peers[targetSocketId]) {
        this.peers[targetSocketId].destroy();
        delete this.peers[targetSocketId];
        delete this.peerMetadata[targetSocketId];
        delete this.peerStatus[targetSocketId];
    }
  }

  leaveRoom() {
    this.socket?.disconnect();
    this.socket = null;
    Object.keys(this.peers).forEach(sid => this.destroyPeerConnection(sid));
  }

  send(type: string, payload: any, useRelay: boolean = false) {
    const data = JSON.stringify({ type, payload });
    Object.values(this.peers).forEach(p => { if (p.connected) p.send(data); });
    if (useRelay && this.socket?.connected) {
        this.socket.emit('broadcast-action', this.activeRoom, { type, senderId: this.userId, senderName: this.userName, data: payload });
    }
  }

  sendMediaStatus(r: string, k: any, e: boolean) { this.send('media-status', { kind: k, enabled: e }); }
  sendReaction(r: string, e: string) { this.send('reaction', { emoji: e }, true); }
  sendHandRaise(r: string, i: boolean) { this.send('hand-raise', { isRaised: i }); }
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