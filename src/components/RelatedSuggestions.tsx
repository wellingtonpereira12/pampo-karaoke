import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Play, Plus, Check, RotateCw, Music } from 'lucide-react';
import type { VideoItem } from '../audio/types';

interface RelatedSuggestionsProps {
  currentSong: VideoItem;
  playlist?: VideoItem[];
  onSelectSong: (song: VideoItem) => void;
  onAddToPlaylist?: (song: VideoItem) => void;
}

export const RelatedSuggestions: React.FC<RelatedSuggestionsProps> = ({
  currentSong,
  playlist = [],
  onSelectSong,
  onAddToPlaylist,
}) => {
  const [suggestions, setSuggestions] = useState<VideoItem[]>([]);
  const [contextArtist, setContextArtist] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const seenIdsRef = useRef<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!currentSong) return;
    setLoading(true);
    try {
      const excludeList = [
        currentSong.id,
        ...(playlist || []).map(p => p.id),
        ...Array.from(seenIdsRef.current),
      ].filter(Boolean);

      const excludeIds = Array.from(new Set(excludeList)).slice(-35).join(',');

      const playlistContext = (playlist || [])
        .slice(0, 3)
        .map(p => p.title)
        .join(';');

      const res = await fetch(
        `/api/suggestions?title=${encodeURIComponent(currentSong.title)}&excludeIds=${encodeURIComponent(excludeIds)}&playlistContext=${encodeURIComponent(playlistContext)}&limit=5&t=${Date.now()}`
      );
      if (res.ok) {
        const data = await res.json();
        const incoming = data.suggestions || [];
        if (incoming.length > 0) {
          incoming.forEach((s: VideoItem) => seenIdsRef.current.add(s.id));
          setSuggestions(incoming);
        } else if (seenIdsRef.current.size > 0) {
          // If pool exhausted with all seen, reset cache and fetch fresh batch
          seenIdsRef.current.clear();
          const fallbackRes = await fetch(
            `/api/suggestions?title=${encodeURIComponent(currentSong.title)}&excludeIds=${encodeURIComponent(currentSong.id)}&playlistContext=${encodeURIComponent(playlistContext)}&limit=5&t=${Date.now()}`
          );
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const fallbackItems = fallbackData.suggestions || [];
            fallbackItems.forEach((s: VideoItem) => seenIdsRef.current.add(s.id));
            setSuggestions(fallbackItems);
          }
        }
        if (data.contextArtist) {
          setContextArtist(data.contextArtist);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar sugestões relacionadas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    seenIdsRef.current.clear();
    fetchSuggestions();
  }, [currentSong.id]);

  const handleQueue = (e: React.MouseEvent, song: VideoItem) => {
    e.stopPropagation();
    if (onAddToPlaylist) {
      onAddToPlaylist(song);
      setAddedMap(prev => ({ ...prev, [song.id]: true }));
      setTimeout(() => {
        setAddedMap(prev => ({ ...prev, [song.id]: false }));
      }, 2000);
    }
  };

  return (
    <div className="w-full rounded-3xl bg-[#0d101a]/90 border border-slate-800/90 shadow-2xl backdrop-blur-md p-4 sm:p-5 flex flex-col transition-all hover:border-pink-500/30 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shadow-glow-pink">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Sugestões a Seguir
            </h4>
            {contextArtist && (
              <span className="text-[10px] text-pink-400 font-medium truncate block max-w-[200px]">
                Baseado em: <strong className="text-pink-300">{contextArtist}</strong>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={fetchSuggestions}
          disabled={loading}
          title="Recarregar sugestões"
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-pink-300 border border-slate-700/80 transition disabled:opacity-30"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-pink-400' : ''}`} />
        </button>
      </div>

      {/* Loading Skeleton if no items yet */}
      {loading && suggestions.length === 0 ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="flex items-center gap-3 p-2 rounded-2xl bg-slate-900/60 animate-pulse">
              <div className="w-16 h-11 rounded-xl bg-slate-800 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-800 rounded w-4/5" />
                <div className="h-2 bg-slate-800/60 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        /* Suggestions List (keeps visible while background loading) */
        <div className={`space-y-2.5 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
          {suggestions.map(song => {
            const isAdded = !!addedMap[song.id];

            return (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group relative cursor-pointer flex items-center gap-3 p-2 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-pink-500/50 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative w-18 h-12 rounded-xl bg-black overflow-hidden shrink-0 border border-slate-800">
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {song.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                      {song.duration}
                    </span>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-glow-green scale-75 group-hover:scale-100">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-1">
                  <h5 className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-pink-300 transition">
                    {song.title}
                  </h5>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {song.channel}
                  </p>
                </div>

                {/* Quick + Fila Button */}
                {onAddToPlaylist && (
                  <button
                    type="button"
                    onClick={e => handleQueue(e, song)}
                    title="Adicionar à Playlist / Fila"
                    className={`p-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center justify-center ${
                      isAdded
                        ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-105'
                        : 'bg-slate-800/90 hover:bg-pink-600 text-slate-300 hover:text-white border border-slate-700 hover:border-pink-500/50'
                    }`}
                  >
                    {isAdded ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 px-4 rounded-2xl border border-dashed border-slate-800 text-center">
          <p className="text-xs text-slate-400">Buscando mais sugestões...</p>
          <button
            onClick={fetchSuggestions}
            className="mt-2 px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold transition"
          >
            Carregar Novas
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <Music className="w-3 h-3 text-cyan-400" />
          Músicas do mesmo estilo
        </span>
        <span className="text-slate-400">Clique para cantar</span>
      </div>
    </div>
  );
};
