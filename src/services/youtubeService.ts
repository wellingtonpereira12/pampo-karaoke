import type { VideoItem } from '../audio/types';

export const POPULAR_KARAOKE_HITS: VideoItem[] = [
  {
    id: 'tfhwXKd1W_o',
    title: 'Evidências - Chitãozinho e Xororó (Karaokê Version)',
    channel: 'Singer! Karaokê',
    duration: '4:58',
    thumbnail: 'https://i.ytimg.com/vi/tfhwXKd1W_o/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=tfhwXKd1W_o',
  },
  {
    id: '20JSZ4u6Gy4',
    title: 'Bohemian Rhapsody (Instrumental Karaoke com Letra) - Queen',
    channel: 'My Karaoke',
    duration: '5:55',
    thumbnail: 'https://i.ytimg.com/vi/20JSZ4u6Gy4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=20JSZ4u6Gy4',
  },
  {
    id: 'TBxAAOOJzL8',
    title: "Sweet Child O' Mine - Guns N' Roses (Karaoke Songs With Lyrics)",
    channel: 'Musisi Karaoke',
    duration: '5:30',
    thumbnail: 'https://i.ytimg.com/vi/TBxAAOOJzL8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=TBxAAOOJzL8',
  },
  {
    id: '6dATAlSJiNs',
    title: 'Temporal de Amor - Leandro & Leonardo (Karaokê Oficial)',
    channel: 'Clubinho do Karaokê',
    duration: '3:50',
    thumbnail: 'https://i.ytimg.com/vi/6dATAlSJiNs/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=6dATAlSJiNs',
  },
  {
    id: '_nHT_k9Rswc',
    title: 'Shallow - Lady Gaga & Bradley Cooper (Karaoke Version)',
    channel: 'Sing King',
    duration: '3:37',
    thumbnail: 'https://i.ytimg.com/vi/_nHT_k9Rswc/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=_nHT_k9Rswc',
  },
  {
    id: 'f0zT_JwTYt4',
    title: 'Como Nossos Pais - Elis Regina (Karaokê com Letra)',
    channel: 'Clubinho do Karaokê',
    duration: '4:25',
    thumbnail: 'https://i.ytimg.com/vi/f0zT_JwTYt4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=f0zT_JwTYt4',
  },
  {
    id: 'UoSCSykFsLQ',
    title: 'Boate Azul - Bruno & Marrone (Karaokê com Letra)',
    channel: 'Karaokê Viny Teclas',
    duration: '3:20',
    thumbnail: 'https://i.ytimg.com/vi/UoSCSykFsLQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=UoSCSykFsLQ',
  },
  {
    id: 'wdP55AJBNhk',
    title: 'Garota de Ipanema - Tom Jobim (Karaokê Show)',
    channel: 'Karaokê Show Oficial',
    duration: '3:15',
    thumbnail: 'https://i.ytimg.com/vi/wdP55AJBNhk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=wdP55AJBNhk',
  },
];

export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already clean 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Matches youtube.com/watch?v=ID or youtu.be/ID or youtube.com/embed/ID
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function searchKaraokeVideos(query: string): Promise<VideoItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check if it is a direct YouTube URL
  const directId = extractYouTubeId(trimmed);
  if (directId) {
    return [
      {
        id: directId,
        title: 'Música do YouTube Selecionada',
        channel: 'Link Direto',
        duration: 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${directId}`,
      },
    ];
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=15`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('API search failed, falling back to local search / catalog', err);
  }

  // Fallback: search in popular list
  const lower = trimmed.toLowerCase();
  const matched = POPULAR_KARAOKE_HITS.filter(
    h => h.title.toLowerCase().includes(lower) || h.channel.toLowerCase().includes(lower)
  );

  return matched.length > 0 ? matched : POPULAR_KARAOKE_HITS;
}
