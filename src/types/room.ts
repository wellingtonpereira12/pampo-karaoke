import type { VideoItem } from '../audio/types';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

export interface RoomParticipant extends User {
  socketId?: string;
  joinedAt: string;
  isHost: boolean;
}

export interface Room {
  id: string;
  name: string;
  hasPassword: boolean;
  password?: string;
  hostId: string;
  hostName: string;
  participants: RoomParticipant[];
  currentSong: VideoItem | null;
  isPlaying: boolean;
  currentTime: number;
  playlist: VideoItem[];
  lastUpdatedBy?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
  type: 'chat' | 'song_change' | 'system' | 'applause';
}
