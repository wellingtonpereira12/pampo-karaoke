import React, { useState, useRef } from 'react';
import { Play, Sparkles, Plus, Check, RotateCw } from 'lucide-react';
import type { VideoItem } from '../audio/types';
import { POPULAR_KARAOKE_HITS } from '../services/youtubeService';

interface PopularListProps {
  onSelectSong: (video: VideoItem) => void;
  onAddToPlaylist?: (video: VideoItem) => void;
}

export const PopularList: React.FC<PopularListProps> = ({ 
  onSelectSong,
  onAddToPlaylist,
}) => {
  const [songs, setSongs] = useState<VideoItem[]>(POPULAR_KARAOKE_HITS);
  const [category, setCategory] = useState<string>('🌟 Clássicos');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});
  const pageRef = useRef<number>(0);

  const handleReload = async () => {
    if (isLoading) return;
    setIsLoading(true);
    pageRef.current += 1;

    try {
      const res = await fetch(`/api/popular-hits?page=${pageRef.current}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.songs) && data.songs.length > 0) {
          setSongs(data.songs);
          if (data.category) setCategory(data.category);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar novos clássicos:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
    <div className="w-full max-w-5xl mx-auto mt-6 mb-10 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Clássicos Mais Pedidos do Karaokê
          </h3>
          {category && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 shadow-sm animate-fadeIn">
              {category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto">
          <span className="text-xs text-slate-400 hidden md:inline">
            Clique para cantar ou adicione à sua playlist
          </span>

          {/* Botão de Reload / Recarregar */}
          <button
            type="button"
            onClick={handleReload}
            disabled={isLoading}
            title="Recarregar outros clássicos e dicas do karaokê"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-pink-600/20 text-slate-300 hover:text-pink-300 border border-slate-700 hover:border-pink-500/50 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm group cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 text-pink-400 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span>Recarregar</span>
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {songs.map(song => {
          const isAdded = !!addedMap[song.id];

          return (
            <div
              key={song.id}
              onClick={() => onSelectSong(song)}
              className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#131622]/90 border border-slate-800/80 hover:border-pink-500/70 transition-all duration-200 flex flex-col hover:scale-[1.02] shadow-lg animate-fadeIn"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Duration Badge */}
                <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-slate-300">
                  {song.duration}
                </span>

                {/* + Fila Quick Button */}
                {onAddToPlaylist && (
                  <button
                    type="button"
                    onClick={e => handleQueue(e, song)}
                    title="Adicionar à Playlist"
                    className={`absolute top-1.5 right-1.5 z-10 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur flex items-center gap-1 transition-all ${
                      isAdded
                        ? 'bg-emerald-500 text-slate-950 shadow-glow-green scale-105'
                        : 'bg-black/75 hover:bg-pink-600 text-slate-200 hover:text-white border border-white/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" /> Na Fila!
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" /> + Fila
                      </>
                    )}
                  </button>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-glow-green scale-75 group-hover:scale-100">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Title & Info */}
              <div className="p-2.5">
                <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-pink-400 transition">
                  {song.title}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {song.channel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
