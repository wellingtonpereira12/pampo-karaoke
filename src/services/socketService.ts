import { io, Socket } from 'socket.io-client';
import type { Room, ChatMessage, User } from '../types/room';
import type { VideoItem } from '../audio/types';

class SocketService {
  private static instance: SocketService | null = null;
  public socket: Socket | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteAudioStreams = new Map<string, MediaStream>();
  private peerAudioElements = new Map<string, HTMLAudioElement>();
  private localStream: MediaStream | null = null;

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(): Socket {
    if (!this.socket) {
      // Connect to the current domain (e.g. https://karaoke.pampo.tech or localhost:5173/3000)
      const url = typeof window !== 'undefined' ? window.location.origin : '';
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
      });

      this.setupWebRTCListeners();
    }
    return this.socket;
  }

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    // If we have active peer connections, replace tracks
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnections.forEach(pc => {
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track?.kind === 'audio');
          if (audioSender) {
            audioSender.replaceTrack(audioTrack);
          } else {
            pc.addTrack(audioTrack, stream);
          }
        });
      }
    }
  }

  private setupWebRTCListeners() {
    if (!this.socket) return;

    // Incoming WebRTC peer connection signal
    this.socket.on('webrtc_signal', async ({ senderSocketId, signal }) => {
      // Guard: strictly ignore any signal from oneself
      if (!senderSocketId || senderSocketId === this.socket?.id) return;

      let pc = this.peerConnections.get(senderSocketId);

      if (!pc) {
        pc = this.createPeerConnection(senderSocketId);
        this.peerConnections.set(senderSocketId, pc);
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.socket?.emit('webrtc_signal', {
            targetSocketId: senderSocketId,
            signal: answer,
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn('WebRTC signal handling error:', err);
      }
    });

    // When someone leaves the room, cleanup their peer connection and audio
    this.socket.on('peer_left', ({ socketId }) => {
      const pc = this.peerConnections.get(socketId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(socketId);
      }
      this.remoteAudioStreams.delete(socketId);

      const existingAudio = this.peerAudioElements.get(socketId);
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.srcObject = null;
        this.peerAudioElements.delete(socketId);
      }
    });

    // When someone joins, initiate offer if we are existing member
    this.socket.on('peer_joined', async ({ socketId }) => {
      // Guard: do not connect to oneself
      if (!socketId || socketId === this.socket?.id) return;

      const pc = this.createPeerConnection(socketId);
      this.peerConnections.set(socketId, pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit('webrtc_signal', {
          targetSocketId: socketId,
          signal: offer,
        });
      } catch (err) {
        console.warn('Error creating WebRTC offer:', err);
      }
    });
  }

  private createPeerConnection(targetSocketId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local mic track if available
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE candidate exchange
    pc.onicecandidate = event => {
      if (event.candidate) {
        this.socket?.emit('webrtc_signal', {
          targetSocketId,
          signal: { candidate: event.candidate },
        });
      }
    };

    // Play incoming audio from room participant (direct P2P peer, never looping back)
    pc.ontrack = event => {
      if (targetSocketId === this.socket?.id) return;

      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.remoteAudioStreams.set(targetSocketId, remoteStream);

      // Clean up previous element if exists to prevent duplicate audio loops
      const existingAudio = this.peerAudioElements.get(targetSocketId);
      if (existingAudio) {
        existingAudio.pause();
        existingAudio.srcObject = null;
      }

      // Create an invisible audio element to play peer voice
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.play().catch(e => console.warn('Autoplay error for peer audio:', e));
      this.peerAudioElements.set(targetSocketId, audio);
    };

    return pc;
  }

  public leaveCurrentRoom() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteAudioStreams.clear();
    this.peerAudioElements.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    this.peerAudioElements.clear();
    this.socket?.emit('leave_room');
  }

  // Room actions
  public createRoom(name: string, password?: string, user?: User): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise(resolve => {
      this.socket?.emit('create_room', { name, password, user }, (res: any) => resolve(res));
    });
  }

  public joinRoom(roomId: string, password?: string, user?: User): Promise<{ success: boolean; room?: Room; error?: string }> {
    return new Promise(resolve => {
      this.socket?.emit('join_room', { roomId, password, user }, (res: any) => resolve(res));
    });
  }

  public syncVideoAction(
    roomId: string, 
    action: 'play' | 'pause' | 'seek' | 'change_song' | 'heartbeat', 
    song?: VideoItem | null, 
    currentTime?: number, 
    isPlaying?: boolean, 
    user?: User,
    sentAt: number = Date.now()
  ) {
    this.socket?.emit('sync_video_action', {
      roomId,
      action,
      song,
      currentTime,
      isPlaying,
      user,
      sentAt,
    });
  }

  public sendChatMessage(text: string, type: ChatMessage['type'] = 'chat') {
    this.socket?.emit('send_chat_message', { text, type });
  }

  public reportVoiceActivity(isSpeaking: boolean) {
    this.socket?.emit('voice_activity', { isSpeaking });
  }

  // Playlist & Queue
  public addToPlaylist(song: VideoItem, user?: User) {
    this.socket?.emit('add_to_playlist', { song, user });
  }

  public removeFromPlaylist(queueId?: string, index?: number) {
    this.socket?.emit('remove_from_playlist', { queueId, index });
  }

  public reorderPlaylist(fromIndex: number, toIndex: number) {
    this.socket?.emit('reorder_playlist', { fromIndex, toIndex });
  }

  public clearPlaylist() {
    this.socket?.emit('clear_playlist');
  }

  public playNextSong(user?: User) {
    this.socket?.emit('play_next_song', { user });
  }
}

export const socketService = SocketService.getInstance();
