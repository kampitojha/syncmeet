import { selfId } from 'trystero';
import { getPeerManager } from './peer-manager';
import EventEmitter from 'events';

class PeerSignalingService extends EventEmitter {
  userId: string;
  peerManagers: Record<string, any> = {};

  constructor() {
    super();
    this.userId = selfId;
  }

  joinRoom(roomId: string, name: string) {
    if (!this.peerManagers[roomId]) {
      this.peerManagers[roomId] = getPeerManager(roomId);
      this.setupListeners(roomId);
    }
    this.send(roomId, 'join', { name });
  }

  leaveRoom(roomId: string) {
    this.send(roomId, 'leave', { senderId: this.userId });
    if (this.peerManagers[roomId]) {
      this.peerManagers[roomId].leave();
      delete this.peerManagers[roomId];
    }
  }

  private setupListeners(roomId: string) {
    const pm = this.peerManagers[roomId];
    const types = [
      'join', 'offer', 'answer', 'ice-candidate', 
      'media-status', 'reaction', 'hand-raise', 
      'system-log', 'file-transfer', 'media-sync',
      'caption-update', 'poll-update', 'poll-vote',
      'screen-status', 'typing'
    ];

    types.forEach(type => {
      pm.on(type, (payload: any, senderId: string) => {
        this.emit(type, { roomId, senderId, payload });
      });
    });
  }

  send(roomId: string, type: string, payload: any) {
    if (this.peerManagers[roomId]) {
      this.peerManagers[roomId].send(type, payload);
    }
  }

  sendOffer(roomId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) {
    this.send(roomId, 'offer', { targetUserId, sdp });
  }

  sendAnswer(roomId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) {
    this.send(roomId, 'answer', { targetUserId, sdp });
  }

  sendIceCandidate(roomId: string, targetUserId: string, candidate: RTCIceCandidate) {
    this.send(roomId, 'ice-candidate', { targetUserId, candidate });
  }

  sendMediaStatus(roomId: string, kind: 'audio' | 'video', enabled: boolean) {
    this.send(roomId, 'media-status', { kind, enabled });
  }

  sendReaction(roomId: string, emoji: string) {
    this.send(roomId, 'reaction', { emoji });
  }

  sendHandRaise(roomId: string, isRaised: boolean) {
    this.send(roomId, 'hand-raise', { isRaised });
  }

  sendSystemLog(roomId: string, message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') {
    this.send(roomId, 'system-log', { message, type });
  }

  sendMediaSync(roomId: string, data: { time: number, state: 'play' | 'pause' }) {
    this.send(roomId, 'media-sync', data);
  }

  sendCaption(roomId: string, text: string) {
    this.send(roomId, 'caption-update', { text });
  }

  sendPollUpdate(roomId: string, poll: any) {
    this.send(roomId, 'poll-update', { poll });
  }

  sendPollVote(roomId: string, pollId: string, optionId: string) {
    this.send(roomId, 'poll-vote', { pollId, optionId });
  }
}

export const signaling = new PeerSignalingService();