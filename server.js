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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

app.use(cors());
app.use(express.json());

// In-memory Room State
const rooms = new Map();

// Helper to determine base redirect URI
function getRedirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'karaoke.pampo.tech';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${host}/api/auth/google/callback`;
}

// Health check endpoint for Docker & CI/CD pipeline
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pampo-karaoke',
    activeRooms: rooms.size,
    googleOAuthConfigured: Boolean(GOOGLE_CLIENT_ID),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// REST endpoint to get active public rooms list
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(serializeRoom);
  res.json(roomList);
});

// Official Google OAuth 2.0 Auth Redirect
app.get('/api/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).send('Google Client ID não configurado no servidor.');
  }

  const redirectUri = getRedirectUri(req);
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;

  return res.redirect(googleAuthUrl);
});

// Official Google OAuth 2.0 Callback
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.warn('Google auth error received from Google:', error);
      return res.send(`
        <!doctype html>
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error}' }, '*');
                window.close();
              } else {
                window.location.href = '/?error=${encodeURIComponent(String(error))}';
              }
            </script>
            <p>Erro no login com Google. Fechando janela...</p>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.redirect('/?error=no_code_from_google');
    }

    const redirectUri = getRedirectUri(req);

    // Exchange authorization code for Google access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return res.send(`
        <!doctype html>
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: 'Falha na autenticação do Google' }, '*');
                window.close();
              } else {
                window.location.href = '/?error=google_token_exchange_failed';
              }
            </script>
            <p>Falha ao validar conta no Google. Fechando janela...</p>
          </body>
        </html>
      `);
    }

    // Fetch official Google profile info (name, email, verified picture)
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userInfoRes.json();

    if (!googleUser.email) {
      return res.redirect('/?error=no_google_email');
    }

    const safeUser = {
      id: `google-${googleUser.id || Math.random().toString(36).substr(2, 9)}`,
      name: googleUser.name || googleUser.email.split('@')[0],
      email: googleUser.email.toLowerCase(),
      avatar: googleUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleUser.email)}`,
    };

    // Return HTML that communicates with popup opener or redirects
    res.send(`
      <!doctype html>
      <html>
        <head><title>Login Google Concluído</title></head>
        <body style="background:#0c0e14;color:#fff;font-family:sans-serif;text-align:center;padding-top:40px;">
          <p>Autenticado com sucesso no Google! Entrando no Pampo Karaokê...</p>
          <script>
            const userPayload = ${JSON.stringify(safeUser)};
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', user: userPayload }, '*');
              window.close();
            } else {
              localStorage.setItem('pampo_karaoke_user', JSON.stringify(userPayload));
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?error=oauth_internal_error');
  }
});

// Helper to verify if YouTube video allows external embedding
async function isVideoEmbeddable(videoId) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1300);
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      }
    );
    clearTimeout(timeout);
    // 200 = Embed permitida; 401 = Bloqueada pelo autor/gravadora; 404 = Privado/removido
    return response.status === 200;
  } catch (err) {
    // Se der timeout ou falha transitória, mantém para não descartar indevidamente
    return true;
  }
}

// YouTube karaoke search endpoint com filtro de vídeos com reprodução liberada
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
    
    // Filtra candidatos prioritários de canais de karaokê
    const candidateVideos = rawVideos
      .filter(v => !v.author?.name?.includes('VEVO') || v.title.toLowerCase().includes('karaoke'))
      .slice(0, 16);

    // Verificação rápida paralela de incorporação liberada (elimina os vídeos com erro 401)
    const verifiedCandidates = await Promise.all(
      candidateVideos.map(async v => {
        const embeddable = await isVideoEmbeddable(v.videoId);
        return { video: v, embeddable };
      })
    );

    const playable = verifiedCandidates.filter(c => c.embeddable).map(c => c.video);
    const finalCandidates = (playable.length > 0 ? playable : candidateVideos).slice(0, limit);

    const videos = finalCandidates.map(v => ({
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

// YouTube related karaoke suggestions endpoint (baseado na música atual, mas excluindo a mesma faixa)
app.get('/api/suggestions', async (req, res) => {
  try {
    const rawTitle = String(req.query.title || '').trim();
    const excludeId = String(req.query.excludeId || '').trim();
    const limit = parseInt(String(req.query.limit || '5'), 10);

    if (!rawTitle) {
      return res.json({ suggestions: [], contextArtist: '' });
    }

    const norm = str => str.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

    let clean = rawTitle
      .replace(/\(Karaok[eê].*?\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\|.*$/g, '')
      .replace(/Karaok[eê].*$/gi, '')
      .trim();

    const parts = clean.split(/[-–—]/).map(p => p.trim()).filter(Boolean);
    let searchTerms = [];
    let excludedParts = [];
    let contextArtist = '';

    if (parts.length >= 2) {
      searchTerms.push(`${parts[0]} maiores sucessos karaoke instrumental`);
      searchTerms.push(`${parts[1]} maiores sucessos karaoke instrumental`);
      searchTerms.push(`${parts[0]} karaoke`);
      searchTerms.push(`${parts[1]} karaoke`);
      excludedParts = parts.map(norm);
      contextArtist = parts[0];
    } else {
      searchTerms.push(`${clean} karaoke hits`);
      excludedParts = [norm(clean)];
      contextArtist = clean;
    }

    const allVideos = [];
    for (const term of searchTerms) {
      try {
        const r = await ytSearch(term);
        if (r && Array.isArray(r.videos)) {
          allVideos.push(...r.videos);
        }
      } catch (e) {}
      if (allVideos.length >= 16) break;
    }

    const seen = new Set();
    const candidateList = [];

    for (const v of allVideos) {
      if (!v || !v.videoId) continue;
      if (v.videoId === excludeId) continue;
      if (seen.has(v.videoId)) continue;
      seen.add(v.videoId);

      const titleNorm = norm(v.title);

      // Se contém ambas as partes normalizadas, é outra versão da MESMA música! Exclui!
      if (excludedParts.length >= 2) {
        if (titleNorm.includes(excludedParts[0]) && titleNorm.includes(excludedParts[1])) {
          continue;
        }
      }

      candidateList.push(v);
      if (candidateList.length >= 12) break;
    }

    // Verificação rápida de incorporação para entregar apenas sugestões 100% tocáveis
    const verified = await Promise.all(
      candidateList.map(async v => {
        const embeddable = await isVideoEmbeddable(v.videoId);
        return { video: v, embeddable };
      })
    );

    const playable = verified.filter(c => c.embeddable).map(c => c.video).slice(0, limit);

    const suggestions = playable.map(v => ({
      id: v.videoId,
      title: v.title,
      channel: v.author?.name || 'Karaokê',
      duration: v.timestamp || '',
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      url: v.url,
    }));

    return res.json({ 
      suggestions, 
      contextArtist: contextArtist || 'Mesmo Estilo'
    });
  } catch (err) {
    console.error('Suggestions error:', err);
    return res.status(500).json({ suggestions: [], contextArtist: '', error: err.message });
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
  let currentTime = room.currentTime || 0;
  if (room.isPlaying && room.startedAt > 0) {
    currentTime = Math.max(0, Math.round(((Date.now() - room.startedAt) / 1000) * 100) / 100);
  }
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
    currentTime: currentTime,
    playlist: room.playlist || [],
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

  // Client requests rooms list explicitly
  socket.on('get_rooms', () => {
    socket.emit('rooms_list', Array.from(rooms.values()).map(serializeRoom));
  });

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
        playlist: [],
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

  // 4. Synchronized Video Playback ("Assistir Juntos" no estilo FakeDC com Equalização Contínua)
  socket.on('sync_video_action', ({ action, song, currentTime, isPlaying, user, sentAt }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const curTime = typeof currentTime === 'number' ? currentTime : (room.currentTime || 0);
    const originTimestamp = sentAt || Date.now();

    if (action === 'change_song') {
      room.currentSong = song;
      room.currentTime = 0;
      room.isPlaying = true;
      room.startedAt = Date.now();
    } else if (action === 'play') {
      room.isPlaying = true;
      room.currentTime = curTime;
      room.startedAt = Date.now() - (curTime * 1000);
    } else if (action === 'pause') {
      room.isPlaying = false;
      room.currentTime = curTime;
      room.startedAt = 0;
    } else if (action === 'seek') {
      room.currentTime = curTime;
      if (room.isPlaying) {
        room.startedAt = Date.now() - (curTime * 1000);
      }
    } else if (action === 'heartbeat') {
      room.currentTime = curTime;
      if (room.isPlaying && room.startedAt > 0) {
        // Continuously calibrate startedAt reference timeline with micro-precision
        room.startedAt = Date.now() - (curTime * 1000);
      }
    }

    // Broadcast sync event to all other members in room with precise timestamp & transit tracking
    socket.to(currentRoomId).emit('sync_video_action', {
      action,
      song: room.currentSong,
      currentTime: curTime,
      isPlaying: room.isPlaying,
      user,
      sentAt: originTimestamp,
      serverTime: Date.now(),
    });

    // Broadcast room_updated snapshot on discrete user actions
    if (action !== 'heartbeat') {
      io.to(currentRoomId).emit('room_updated', serializeRoom(room));
    }
  });

  // 4.1. Shared Room Playlist & Queue Management
  socket.on('add_to_playlist', ({ song, user }) => {
    if (!currentRoomId || !song) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!Array.isArray(room.playlist)) room.playlist = [];

    const item = {
      ...song,
      queueId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      addedBy: user?.name || currentUser?.name || 'Alguém',
    };

    // Se nenhuma música estiver tocando na sala, começa tocando imediatamente!
    if (!room.currentSong) {
      room.currentSong = item;
      room.currentTime = 0;
      room.isPlaying = true;
      room.startedAt = Date.now();

      io.to(currentRoomId).emit('sync_video_action', {
        action: 'change_song',
        song: item,
        currentTime: 0,
        isPlaying: true,
        user: user || currentUser,
        sentAt: Date.now(),
        serverTime: Date.now(),
      });

      io.to(currentRoomId).emit('chat_message', {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        roomId: currentRoomId,
        userId: 'system',
        userName: 'Pampo Karaokê',
        userAvatar: '',
        text: `🎶 ${item.addedBy} iniciou a reprodução com: "${item.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'song_change',
      });
    } else {
      room.playlist.push(item);

      io.to(currentRoomId).emit('chat_message', {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        roomId: currentRoomId,
        userId: 'system',
        userName: 'Pampo Karaokê',
        userAvatar: '',
        text: `📑 ${item.addedBy} adicionou à playlist (#${room.playlist.length}): "${item.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'system',
      });
    }

    io.to(currentRoomId).emit('room_updated', serializeRoom(room));
  });

  socket.on('remove_from_playlist', ({ queueId, index }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || !Array.isArray(room.playlist)) return;

    if (queueId) {
      room.playlist = room.playlist.filter(item => item.queueId !== queueId);
    } else if (typeof index === 'number' && index >= 0 && index < room.playlist.length) {
      room.playlist.splice(index, 1);
    }

    io.to(currentRoomId).emit('room_updated', serializeRoom(room));
  });

  socket.on('reorder_playlist', ({ fromIndex, toIndex }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || !Array.isArray(room.playlist)) return;

    if (
      typeof fromIndex === 'number' &&
      typeof toIndex === 'number' &&
      fromIndex >= 0 &&
      fromIndex < room.playlist.length &&
      toIndex >= 0 &&
      toIndex < room.playlist.length
    ) {
      const [moved] = room.playlist.splice(fromIndex, 1);
      room.playlist.splice(toIndex, 0, moved);
      io.to(currentRoomId).emit('room_updated', serializeRoom(room));
    }
  });

  socket.on('clear_playlist', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.playlist = [];
    io.to(currentRoomId).emit('room_updated', serializeRoom(room));
  });

  socket.on('play_next_song', ({ user }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (Array.isArray(room.playlist) && room.playlist.length > 0) {
      const nextSong = room.playlist.shift();
      room.currentSong = nextSong;
      room.currentTime = 0;
      room.isPlaying = true;
      room.startedAt = Date.now();

      io.to(currentRoomId).emit('sync_video_action', {
        action: 'change_song',
        song: nextSong,
        currentTime: 0,
        isPlaying: true,
        user: user || currentUser,
        sentAt: Date.now(),
        serverTime: Date.now(),
      });

      io.to(currentRoomId).emit('chat_message', {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        roomId: currentRoomId,
        userId: 'system',
        userName: 'Pampo Karaokê',
        userAvatar: '',
        text: `⏭ Tocando a próxima da playlist: "${nextSong.title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'song_change',
      });
    } else {
      // Fila terminou
      room.currentSong = null;
      room.isPlaying = false;
      room.currentTime = 0;
      room.startedAt = 0;

      io.to(currentRoomId).emit('sync_video_action', {
        action: 'change_song',
        song: null,
        currentTime: 0,
        isPlaying: false,
        user: user || currentUser,
        sentAt: Date.now(),
        serverTime: Date.now(),
      });
    }

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
          // Grace period: keep room alive for 3 minutes so it does not disappear if creator refreshes or switches device
          setTimeout(() => {
            const current = rooms.get(currentRoomId);
            if (current && current.participants.size === 0) {
              rooms.delete(currentRoomId);
              broadcastRoomsList();
            }
          }, 3 * 60 * 1000);
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
