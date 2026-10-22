import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3130;

app.use(cors());
app.use(express.json());

// Health check endpoint for Docker & CI/CD pipeline
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pampo-karaoke',
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
      query = `${rawQuery} karaoke`;
    }

    const searchResults = await ytSearch(query);
    const videos = (searchResults.videos || []).slice(0, limit).map(v => ({
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎤 Servidor Pampo Karaokê rodando em http://0.0.0.0:${PORT}`);
});
