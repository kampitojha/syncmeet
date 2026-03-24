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
    this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`ERR_LISTENER: ${event}`, e); }
    });
  }

  private systemLog(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    this.trigger('system-log', { payload: { message, type }, roomId: this.activeRoom });
  }

  async joinRoom(roomId: string, name: string, localStream: MediaStream | null = null) {
    const normalizedRoomId = roomId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    this.userName = name;
    this.activeRoom = normalizedRoomId;
    this.localStream = localStream;

    if (this.socket) this.socket.disconnect();

    const BACKEND_URL = (import.meta as any).env.VITE_SIGNALING_SERVER || 'http://localhost:3001';
    this.systemLog(`CONNECT_TARGET: ${BACKEND_URL}`, 'info');

    this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20
    });

    this.socket.on('connect', () => {
        this.systemLog(`HUB_SYNC: Online. Entry as ${this.userName}_${this.userId.slice(-4)}`, 'success');
        this.socket?.emit('join-room', normalizedRoomId, this.userId, this.userName);
    });

    this.socket.on('mesh-manifest', (users: any[]) => {
        this.systemLog(`MESH_SCAN: Found ${users.length} peers in orbit. Handshaking...`, 'info');
        users.forEach(user => this.createPeerConnection(user.socketId, user.userId, user.userName, true));
    });

    this.socket.on('user-entered-mesh', ({ socketId, userId, userName }) => {
        this.systemLog(`ORBIT_ENTRY: ${userName} detected. Initiating link.`, 'info');
        this.createPeerConnection(socketId, userId, userName, false);
    });

    this.socket.on('signal', ({ fromSocketId, fromUid, fromName, signal }) => {
        try {
            if (!this.peers[fromSocketId]) {
                this.createPeerConnection(fromSocketId, fromUid, fromName, false);
            }
            const peer = this.peers[fromSocketId];
            if (peer && !peer.destroyed) {
                peer.signal(signal);
            }
        } catch (e) {
            this.systemLog(`SIGNAL_SYNC_WARN: ${fromName}`, 'warn');
        }
    });

    this.socket.on('user-left-mesh', ({ socketId, userId }) => {
        this.systemLog(`ORBIT_EXIT: Peer ${userId} de-synced.`, 'warn');
        this.destroyPeerConnection(socketId);
    });

    this.socket.on('broadcast-action', (payload: any) => {
        this.trigger(payload.type, { ...payload, roomId: this.activeRoom });
    });
  }

  private createPeerConnection(targetSocketId: string, peerUid: string, peerName: string, isInitiator: boolean) {
    if (this.peers[targetSocketId]) {
        try { this.peers[targetSocketId].destroy(); } catch (e) {}
        delete this.peers[targetSocketId];
    }

    this.peerStatus[targetSocketId] = { connected: false, streamReceived: false, retryCount: 0 };

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
                { urls: 'stun:global.stun.twilio.com:3478' },
                { urls: 'stun:stun.services.mozilla.com' }
            ] 
        }
    });

    this.peers[targetSocketId] = peer;
    this.peerMetadata[targetSocketId] = { userId: peerUid, userName: peerName };

    peer.on('signal', (data) => {
        this.socket?.emit('signal', { toSocketId: targetSocketId, signal: data, fromUid: this.userId, fromName: this.userName });
    });

    peer.on('stream', (stream) => {
        this.peerStatus[targetSocketId].streamReceived = true;
        this.systemLog(`PEER_VIDEO: Link verified with ${peerName}.`, 'success');
        this.trigger('track_received', { peerId: peerUid, stream });
    });

    peer.on('connect', () => {
        this.peerStatus[targetSocketId].connected = true;
        this.systemLog(`DATA_LINK: Secure tunnel with ${peerName}.`, 'info');
        this.trigger('join', { roomId: this.activeRoom, senderId: peerUid, payload: { name: peerName } });
        
        // Final fallback if stream didn't catch on init
        if (this.localStream && peer.connected) {
            try { peer.addStream(this.localStream); } catch (e) {}
        }
    });

    peer.on('data', (data) => {
        try {
            const parsed = JSON.parse(data.toString());
            this.trigger(parsed.type, { ...parsed, senderId: peerUid, senderName: peerName, roomId: this.activeRoom });
        } catch (e) {}
    });

    peer.on('close', () => this.destroyPeerConnection(targetSocketId));
    peer.on('error', (err) => {
        this.destroyPeerConnection(targetSocketId);
    });

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
        this.socket.emit('broadcast-action', this.activeRoom, { type, senderId: this.userId, senderName: this.userName, payload });
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