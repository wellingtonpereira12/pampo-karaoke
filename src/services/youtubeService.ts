import type { VideoItem } from '../audio/types';

export const POPULAR_KARAOKE_HITS: VideoItem[] = [
  {
    id: 'tfhwXKd1W_o',
    title: 'Evidências - Chitãozinho e Xororó (Karaokê Oficial com Letra)',
    channel: 'Muramatsu Karaokê',
    duration: '4:58',
    thumbnail: 'https://i.ytimg.com/vi/tfhwXKd1W_o/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=tfhwXKd1W_o',
  },
  {
    id: 'b8L1e_l0lGk',
    title: 'Bohemian Rhapsody - Queen (Karaoke With Lyrics)',
    channel: 'Sing King',
    duration: '6:02',
    thumbnail: 'https://i.ytimg.com/vi/b8L1e_l0lGk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=b8L1e_l0lGk',
  },
  {
    id: 'm1Lh6VjR8q8',
    title: 'Temporal de Amor - Leandro & Leonardo (Karaokê)',
    channel: 'Ponto do Karaokê',
    duration: '4:05',
    thumbnail: 'https://i.ytimg.com/vi/m1Lh6VjR8q8/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=m1Lh6VjR8q8',
  },
  {
    id: 'L0MK7qz13bU',
    title: 'Shallow - Lady Gaga, Bradley Cooper (Karaoke Version)',
    channel: 'Sing King',
    duration: '3:37',
    thumbnail: 'https://i.ytimg.com/vi/L0MK7qz13bU/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=L0MK7qz13bU',
  },
  {
    id: 'qK2VbO9U2yY',
    title: 'Como Nossos Pais - Elis Regina (Karaokê com Letra)',
    channel: 'Muramatsu Karaokê',
    duration: '4:40',
    thumbnail: 'https://i.ytimg.com/vi/qK2VbO9U2yY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=qK2VbO9U2yY',
  },
  {
    id: '1w7OgIMMRc4',
    title: 'Sweet Child O\' Mine - Guns N\' Roses (Karaoke Instrumental)',
    channel: 'Sing King',
    duration: '5:56',
    thumbnail: 'https://i.ytimg.com/vi/1w7OgIMMRc4/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=1w7OgIMMRc4',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Boate Azul - Bruno & Marrone (Karaokê Acústico)',
    channel: 'Ponto do Karaokê',
    duration: '3:30',
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  },
  {
    id: 'nfWlot6h_JM',
    title: 'Shake It Off - Taylor Swift (Karaoke Version)',
    channel: 'Sing King',
    duration: '3:39',
    thumbnail: 'https://i.ytimg.com/vi/nfWlot6h_JM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=nfWlot6h_JM',
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
