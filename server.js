import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3130;

app.use(cors());
app.use(express.json());

// In-memory Room State
const rooms = new Map();

// Health check endpoint for Docker & CI/CD pipeline
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pampo-karaoke',
    activeRooms: rooms.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// YouTube karaoke search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const rawQuery = String(req.query.q || '').trim();
    const limit = parseInt(String(req.query.limit || '12'), 10);

    if (!rawQuery) {
      return res.json({ results: [] });
    }

    let query = rawQuery;
    const lower = rawQuery.toLowerCase();
    if (!lower.includes('karaoke') && !lower.includes('karaokê') && !lower.includes('instrumental')) {
      query = `${rawQuery} karaoke instrumental`;
    }

    const searchResults = await ytSearch(query);
    const rawVideos = searchResults.videos || [];
    // Prioritize videos from real karaoke channels
    const videos = rawVideos
      .filter(v => !v.author?.name?.includes('VEVO') || v.title.toLowerCase().includes('karaoke'))
      .slice(0, limit)
      .map(v => ({
        id: v.videoId,
        title: v.title,
        channel: v.author?.name || 'Karaokê',
        duration: v.timestamp || '',
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        url: v.url,
      }));

    return res.json({ results: videos });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Erro ao buscar músicas', results: [] });
  }
});

// Serve frontend dist if available
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Express 5 fallback route
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Helper to serialize room for client consumption
function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    hasPassword: room.hasPassword,
    hostId: room.hostId,
    hostName: room.hostName,
    participantCount: room.participants.size,
    participants: Array.from(room.participants.values()).map(p => ({
      socketId: p.socketId,
      id: p.id,
      name: p.name,
      email: p.email,
      avatar: p.avatar,
      isSpeaking: p.isSpeaking,
      isMuted: p.isMuted,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
    })),
    currentSong: room.currentSong,
    isPlaying: room.isPlaying,
    currentTime: room.currentTime,
    createdAt: room.createdAt,
  };
}

function broadcastRoomsList() {
  const roomList = Array.from(rooms.values()).map(serializeRoom);
  io.emit('rooms_list', roomList);
}

// Socket.io Real-time Multiplayer & WebRTC Signaling
io.on('connection', socket => {
  let currentRoomId = null;
  let currentUser = null;

  // Send available rooms on connect
  socket.emit('rooms_list', Array.from(rooms.values()).map(serializeRoom));

  // 1. Create Room
  socket.on('create_room', ({ name, password, user }, callback) => {
    try {
      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const hasPassword = Boolean(password && password.trim().length > 0);

      const newRoom = {
        id: roomId,
        name: name.trim() || 'Sala de Karaokê',
        password: hasPassword ? password.trim() : undefined,
        hasPassword,
        hostId: user.id,
        hostName: user.name,
        participants: new Map(),
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        createdAt: new Date().toISOString(),
      };

      const participant = {
        socketId: socket.id,
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isSpeaking: false,
        isMuted: false,
        isHost: true,
        joinedAt: new Date().toISOString(),
      };

      newRoom.participants.set(socket.id, participant);
      rooms.set(roomId, newRoom);
      currentRoomId = roomId;
      currentUser = user;

      socket.join(roomId);
      broadcastRoomsList();

      if (typeof callback === 'function') {
        callback({ success: true, room: serializeRoom(newRoom) });
      }
    } catch (err) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message });
      }
    }
  });

  // 2. Join Room
  socket.on('join_room', ({ roomId, password, user }, callback) => {
    const room = rooms.get(roomId);
    if (!room) {
      if (typeof callback === 'function') callback({ success: false, error: 'Sala não encontrada.' });
      return;
    }

    if (room.hasPassword && room.password !== (password || '').trim()) {
      if (typeof callback === 'function') callback({ success: false, error: 'Senha incorreta para esta sala.' });
      return;
    }

    // Leave any previous room
    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
      const prev = rooms.get(currentRoomId);
      if (prev) {
        prev.participants.delete(socket.id);
        if (prev.participants.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit('room_updated', serializeRoom(prev));
        }
      }
    }

    const participant = {
      socketId: socket.id,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isSpeaking: false,
      isMuted: false,
      isHost: room.participants.size === 0,
      joinedAt: new Date().toISOString(),
    };

    room.participants.set(socket.id, participant);
    currentRoomId = roomId;
    currentUser = user;

    socket.join(roomId);

    // Notify room of new participant
    io.to(roomId).emit('room_updated', serializeRoom(room));
    broadcastRoomsList();

    // Notify other peers in room to initiate WebRTC voice peer connections
    socket.to(roomId).emit('peer_joined', {
      socketId: socket.id,
      user: participant,
    });

    if (typeof callback === 'function') {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 3. Leave Room
  socket.on('leave_room', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (room) {
      room.participants.delete(socket.id);
      socket.leave(currentRoomId);

      socket.to(currentRoomId).emit('peer_left', { socketId: socket.id });

      if (room.participants.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        // Reassign host if host left
        const remaining = Array.from(room.participants.values());
        if (!remaining.some(p => p.isHost)) {
          remaining[0].isHost = true;
          room.hostId = remaining[0].id;
          room.hostName = remaining[0].name;
        }
        io.to(currentRoomId).emit('room_updated', serializeRoom(room));
      }
      broadcastRoomsList();
    }
    currentRoomId = null;
  });

  // 4. Synchronized Video Playback ("Assistir Juntos")
  socket.on('sync_video_action', ({ action, song, currentTime, isPlaying, user }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (action === 'change_song') {
      room.currentSong = song;
      room.currentTime = 0;
      room.isPlaying = true;
    } else if (action === 'play') {
      room.isPlaying = true;
      if (currentTime !== undefined) room.currentTime = currentTime;
    } else if (action === 'pause') {
      room.isPlaying = false;
      if (currentTime !== undefined) room.currentTime = currentTime;
    } else if (action === 'seek') {
      if (currentTime !== undefined) room.currentTime = currentTime;
    }

    // Broadcast sync event to all other members in room
    socket.to(currentRoomId).emit('sync_video_action', {
      action,
      song: room.currentSong,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      user,
    });

    // Also update room snapshot
    io.to(currentRoomId).emit('room_updated', serializeRoom(room));
  });

  // 5. Room Chat Message
  socket.on('send_chat_message', ({ text, type = 'chat' }) => {
    if (!currentRoomId || !currentUser) return;
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      roomId: currentRoomId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };
    io.to(currentRoomId).emit('chat_message', msg);
  });

  // 6. Voice Activity Indicator (Discord-style talking ring)
  socket.on('voice_activity', ({ isSpeaking }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (room) {
      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.isSpeaking = isSpeaking;
        socket.to(currentRoomId).emit('peer_voice_activity', {
          socketId: socket.id,
          userId: participant.id,
          isSpeaking,
        });
      }
    }
  });

  // 7. WebRTC Signaling (mesh audio between room members)
  socket.on('webrtc_signal', ({ targetSocketId, signal }) => {
    io.to(targetSocketId).emit('webrtc_signal', {
      senderSocketId: socket.id,
      signal,
    });
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.participants.delete(socket.id);
        socket.to(currentRoomId).emit('peer_left', { socketId: socket.id });

        if (room.participants.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          const remaining = Array.from(room.participants.values());
          if (!remaining.some(p => p.isHost)) {
            remaining[0].isHost = true;
            room.hostId = remaining[0].id;
            room.hostName = remaining[0].name;
          }
          io.to(currentRoomId).emit('room_updated', serializeRoom(room));
        }
        broadcastRoomsList();
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎤 Servidor Pampo Karaokê com Salas Online rodando em http://0.0.0.0:${PORT}`);
});
