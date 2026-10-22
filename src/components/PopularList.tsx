import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import type { VideoItem } from '../audio/types';
import { POPULAR_KARAOKE_HITS } from '../services/youtubeService';

interface PopularListProps {
  onSelectSong: (video: VideoItem) => void;
}

export const PopularList: React.FC<PopularListProps> = ({ onSelectSong }) => {
  return (
    <div className="w-full max-w-5xl mx-auto mt-6 mb-10 px-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Clássicos Mais Pedidos do Karaokê
        </h3>
        <span className="text-xs text-slate-500">Clique para soltar a voz</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {POPULAR_KARAOKE_HITS.map(song => (
          <div
            key={song.id}
            onClick={() => onSelectSong(song)}
            className="group relative cursor-pointer rounded-2xl overflow-hidden bg-[#131622]/90 border border-slate-800/80 hover:border-emerald-500/70 transition-all duration-200 flex flex-col hover:scale-[1.02] shadow-lg"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full bg-black overflow-hidden">
              <img
                src={song.thumbnail}
                alt={song.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-glow-green scale-75 group-hover:scale-100">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
              <span className="absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-slate-300">
                {song.duration}
              </span>
            </div>

            {/* Title & Info */}
            <div className="p-2.5">
              <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-emerald-400 transition">
                {song.title}
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 truncate">
                {song.channel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
