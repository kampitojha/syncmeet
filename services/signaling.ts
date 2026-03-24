import io, { Socket } from 'socket.io-client';
import Peer from 'simple-peer';

type Listener = (data: any) => void;

class ProSignalingService {
  userId: string;
  userName: string = 'User';
  socket: Socket | null = null;
  
  // Storage for all active peer connections in the mesh
  // Record<SocketID, PeerInstance>
  peers: Record<string, Peer.Instance> = {};
  
  // Metadata map to link socket IDs to user IDs
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
    if (!this.listeners[event]) return this;
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

    if (this.socket) {
        this.socket.disconnect();
    }

    // Connect to professional signaling backend
    // In production, this should be your deployed server URL (Render, Heroku, etc.)
    this.socket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10
    });

    this.socket.on('connect', () => {
        this.trigger('system-log', { message: `MESH_INIT: Connected to signaling hub. Status: ONLINE.`, type: 'success' });
        this.socket?.emit('join-room', normalizedRoomId, this.userId, this.userName);
    });

    // Received when we first join: contains all current peers in the room
    this.socket.on('mesh-manifest', (users: any[]) => {
        this.trigger('system-log', { message: `MESH_SYNC: Received manifest of ${users.length} existing nodes.`, type: 'info' });
        users.forEach(user => {
            // As the newcomer, WE initiate connections to everyone already there
            this.createPeerConnection(user.socketId, user.userId, user.userName, true);
        });
    });

    // Received when someone else joins after us
    this.socket.on('user-entered-mesh', ({ socketId, userId, userName }) => {
        this.trigger('system-log', { message: `PEER_DETECTED: ${userName} entering the mesh. Waiting for handshake.`, type: 'info' });
        // As an existing member, we WAIT for the newcomer to initiate
        this.createPeerConnection(socketId, userId, userName, false);
    });

    // Signal processing for WebRTC handshakes (SDP/ICE)
    this.socket.on('signal', ({ fromSocketId, fromUid, fromName, signal }) => {
        if (this.peers[fromSocketId]) {
            this.peers[fromSocketId].signal(signal);
        } else {
            // Edge case: if signal arrives before room manifest, initialize peer as non-initiator
            this.createPeerConnection(fromSocketId, fromUid, fromName, false);
            this.peers[fromSocketId].signal(signal);
        }
    });

    this.socket.on('user-left-mesh', ({ socketId, userId }) => {
        this.trigger('system-log', { message: `PEER_LOST: Connection with node ${userId} severed.`, type: 'warn' });
        this.destroyPeerConnection(socketId);
    });

    // Handle high-level broadcasts from server
    this.socket.on('broadcast-action', (payload: any) => {
        this.trigger(payload.type, { roomId: this.activeRoom, senderId: payload.senderId, payload: payload.data });
    });

    this.socket.on('disconnect', () => {
        this.trigger('system-log', { message: `SIGNAL_LOST: Signaling server unreachable. Reconnecting...`, type: 'error' });
    });
  }

  private createPeerConnection(targetSocketId: string, peerUid: string, peerName: string, isInitiator: boolean) {
    if (this.peers[targetSocketId]) return;

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
                { urls: 'stun:stun.voiparound.com:3478' },
                { urls: 'stun:stun.voipstunt.com:3478' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ] 
        }
    });

    // WebRTC Signaling Phase
    peer.on('signal', (data) => {
        this.socket?.emit('signal', { 
            toSocketId: targetSocketId, 
            signal: data, 
            fromUid: this.userId, 
            fromName: this.userName 
        });
    });

    // Stream Handling
    peer.on('stream', (stream) => {
        this.trigger('track_received', { peerId: peerUid, stream });
    });

    // P2P Data Channel Communication
    peer.on('data', (raw) => {
        try {
            const data = JSON.parse(raw.toString());
            this.trigger(data.type, { roomId: this.activeRoom, senderId: peerUid, payload: data.payload });
        } catch (e) {
            console.error('P2P Protocol Error:', e);
        }
    });

    // Peer Connection Lifecycle
    peer.on('connect', () => {
        this.trigger('join', { roomId: this.activeRoom, senderId: peerUid, payload: { name: peerName } });
    });

    peer.on('close', () => this.destroyPeerConnection(targetSocketId));
    peer.on('error', (err) => {
        console.error(`P2P_ERR [${peerUid}]:`, err);
        this.destroyPeerConnection(targetSocketId);
    });

    // Metadata management for lookups
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

  // Multi-Path Communication: P2P for Low Latency, Server-Broadcast for Reliability
  send(type: string, payload: any, useRelay: boolean = false) {
    const data = JSON.stringify({ type, payload });
    
    // 1. Send via direct P2P Data Channels (lowest latency)
    Object.values(this.peers).forEach(peer => {
        if (peer.connected) {
            peer.send(data);
        }
    });

    // 2. If P2P is not yet established or relay is requested, use Server Broadcast
    if (useRelay && this.socket) {
        this.socket.emit('broadcast-action', this.activeRoom, { type, senderId: this.userId, data: payload });
    }
  }

  // High-Level Communication Interface
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

export const signaling = new ProSignalingService();