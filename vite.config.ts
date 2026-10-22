import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import ytSearch from 'yt-search';

function karaokeApiPlugin(): Plugin {
  return {
    name: 'karaoke-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/search')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const query = urlObj.searchParams.get('q') || '';
            const limit = parseInt(urlObj.searchParams.get('limit') || '12', 10);

            if (!query.trim()) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ results: [] }));
              return;
            }

            // Ensure karaoke is in search terms if not specified
            const lowerQuery = query.toLowerCase();
            let effectiveQuery = query;
            if (!lowerQuery.includes('karaoke') && !lowerQuery.includes('karaokê') && !lowerQuery.includes('instrumental')) {
              effectiveQuery = `${query} karaoke`;
            }

            const searchResults = await ytSearch(effectiveQuery);
            const rawVideos = (searchResults && searchResults.videos) || [];
            const videos = rawVideos.slice(0, limit).map((v: {
              videoId: string;
              title: string;
              author?: { name: string };
              timestamp?: string;
              thumbnail?: string;
              url: string;
            }) => ({
              id: v.videoId,
              title: v.title,
              channel: v.author?.name || 'Karaokê Oficial',
              duration: v.timestamp || '',
              thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              url: v.url,
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: videos }));
          } catch (err: unknown) {
            console.error('Error handling /api/search:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Erro ao buscar no YouTube', details: String(err) }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), karaokeApiPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
