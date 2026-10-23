import React, { useState, useEffect } from 'react';
import { Search, Loader2, Play, Link as LinkIcon, Music } from 'lucide-react';
import type { VideoItem } from '../audio/types';
import { searchKaraokeVideos, extractYouTubeId } from '../services/youtubeService';

interface SearchBarProps {
  onSelectSong: (video: VideoItem) => void;
  isCompact?: boolean;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSelectSong, 
  isCompact = false,
  initialQuery = '' 
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const directId = extractYouTubeId(trimmed);
    if (directId) {
      const directVideo: VideoItem = {
        id: directId,
        title: 'Música do YouTube',
        channel: 'Link Direto',
        duration: 'Vídeo',
        thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${directId}`,
      };
      onSelectSong(directVideo);
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const found = await searchKaraokeVideos(trimmed);
      setResults(found);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(query);
  };

  const handlePick = (video: VideoItem) => {
    onSelectSong(video);
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className={`w-full max-w-3xl mx-auto transition-all ${isCompact ? 'mb-2' : 'my-4'}`}>
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          ) : query.includes('http') ? (
            <LinkIcon className="w-5 h-5 text-emerald-400" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Escolha seu som..."
          className={`w-full pl-12 pr-28 rounded-full bg-[#141823]/95 border border-slate-700/80 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 placeholder-slate-400 outline-none shadow-xl transition-all ${
            isCompact ? 'py-3 text-sm' : 'py-4 text-base md:text-lg'
          }`}
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-semibold text-xs md:text-sm shadow-glow-green transition"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Search Results Dropdown / Grid */}
      {hasSearched && results.length > 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-[#12151f]/95 border border-slate-800 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs text-slate-400 font-medium">
            <span>Resultados de Karaokê com Letra</span>
            <button 
              onClick={() => { setResults([]); setHasSearched(false); }}
              className="text-slate-400 hover:text-slate-200"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {results.map(video => (
              <div
                key={video.id}
                onClick={() => handlePick(video)}
                className="group relative cursor-pointer rounded-xl overflow-hidden bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/80 transition-all duration-200 flex flex-col hover:scale-[1.02] shadow-md"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-black overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:opacity-80 transition"
                  />
                  {video.duration && (
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-200">
                      {video.duration}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-glow-green">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2.5 flex flex-col justify-between flex-1">
                  <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-emerald-400 transition">
                    {video.title}
                  </h4>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span className="truncate max-w-[130px]">{video.channel}</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Music className="w-3 h-3" /> Cantar
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="mt-4 p-6 rounded-2xl bg-[#12151f] border border-slate-800 text-center text-sm text-slate-400">
          Nenhuma versão de karaokê encontrada para essa busca. Tente digitar outro nome ou cole diretamente o link do YouTube!
        </div>
      )}
    </div>
  );
};
