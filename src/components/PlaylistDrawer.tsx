import React, { useState } from 'react';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Disc3,
  SkipForward,
  Sparkles,
  Link as LinkIcon,
  Search,
  Check,
  Radio,
  Music2,
} from 'lucide-react';
import type { VideoItem } from '../audio/types';
import { extractYouTubeId, searchKaraokeVideos, POPULAR_KARAOKE_HITS } from '../services/youtubeService';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  playlist: VideoItem[];
  currentSong: VideoItem | null;
  onPlaySong: (song: VideoItem) => void;
  onPlayNextSong: () => void;
  onRemoveFromPlaylist: (queueId?: string, index?: number) => void;
  onReorderPlaylist: (fromIndex: number, toIndex: number) => void;
  onClearPlaylist: () => void;
  onAddSong: (song: VideoItem) => void;
  isInRoom?: boolean;
}

export const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({
  isOpen,
  onClose,
  playlist,
  currentSong,
  onPlaySong,
  onPlayNextSong,
  onRemoveFromPlaylist,
  onReorderPlaylist,
  onClearPlaylist,
  onAddSong,
  isInRoom = false,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [justAddedFeedback, setJustAddedFeedback] = useState(false);

  if (!isOpen) return null;

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = quickInput.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const directId = extractYouTubeId(query);
      if (directId) {
        const item: VideoItem = {
          id: directId,
          title: 'Música do YouTube',
          channel: 'Link Direto',
          duration: 'Vídeo',
          thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${directId}`,
        };
        onAddSong(item);
        setQuickInput('');
        showSuccessAnimation();
        return;
      }

      const results = await searchKaraokeVideos(query);
      if (results && results.length > 0) {
        onAddSong(results[0]);
        setQuickInput('');
        showSuccessAnimation();
      } else {
        alert('Não encontramos nenhuma versão de karaokê para essa busca.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const showSuccessAnimation = () => {
    setJustAddedFeedback(true);
    setTimeout(() => setJustAddedFeedback(false), 1400);
  };

  return (
    <div 
      aria-label="Fila de Reprodução"
      className="w-full rounded-3xl bg-[#0d101a]/95 border border-slate-800/90 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden transition-all duration-300 hover:border-pink-500/30 animate-fadeIn"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 to-transparent flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shadow-glow-pink">
            <ListMusic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Fila de Músicas
              </h3>
              {isInRoom && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> Sala
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {playlist.length === 0
                ? 'Nenhuma música na fila'
                : `${playlist.length} ${playlist.length === 1 ? 'música na fila' : 'músicas na fila'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {playlist.length > 0 && (
            <button
              onClick={onClearPlaylist}
              title="Limpar todas as músicas da fila"
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/40 text-[11px] font-medium transition"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            title="Recolher Playlist [Atalho: P]"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="p-3 bg-[#111422] border-b border-slate-800/80">
        <form onSubmit={handleQuickAdd} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              {quickInput.includes('http') ? (
                <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              placeholder="Cole o link do YouTube ou busque..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition"
            />
          </div>
          <button
            type="submit"
            disabled={!quickInput.trim() || isSearching}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              justAddedFeedback
                ? 'bg-emerald-500 text-slate-950 shadow-glow-green'
                : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-glow-pink disabled:opacity-40'
            }`}
          >
            {justAddedFeedback ? (
              <>
                <Check className="w-3 h-3" /> Salvo!
              </>
            ) : isSearching ? (
              'Buscando...'
            ) : (
              <>
                <Plus className="w-3 h-3" /> + Fila
              </>
            )}
          </button>
        </form>
      </div>

      {/* Scrollable Song List */}
      <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-3.5 sm:p-4 space-y-3.5 custom-scrollbar">
        {/* Tocando Agora Card */}
        {currentSong ? (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/30 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-pink-400 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Tocando Agora
              </span>
              {/* Dancing Equalizer Bars */}
              <div className="flex items-end gap-1 h-3">
                <span className="w-1 bg-pink-400 rounded-full animate-[bounce_0.8s_infinite]" />
                <span className="w-1 bg-purple-400 rounded-full animate-[bounce_0.5s_infinite]" />
                <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.7s_infinite]" />
                <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite]" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-14 h-10 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-700">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Disc3 className="w-4 h-4 text-white/90 animate-[spin_4s_linear_infinite]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white line-clamp-1">
                  {currentSong.title}
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentSong.channel}
                </p>
                {currentSong.addedBy && (
                  <span className="text-[10px] text-pink-300 font-medium">
                    Pedido por: {currentSong.addedBy}
                  </span>
                )}
              </div>

              {playlist.length > 0 && (
                <button
                  onClick={onPlayNextSong}
                  title="Pular para a próxima da fila"
                  className="p-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold transition shadow-glow-pink shrink-0"
                >
                  <SkipForward className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* Section: A Seguir na Fila */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-cyan-400" />
              A Seguir ({playlist.length})
            </h4>
            <span className="text-[10px] text-slate-500">Toca em sequência</span>
          </div>

          {playlist.length === 0 ? (
            <div className="py-6 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2">
                <Disc3 className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Sua fila está vazia
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                Adicione músicas pelo botão "+ Fila" ou escolha uma sugestão rápida:
              </p>

              {/* Quick suggestions */}
              <div className="mt-3 w-full flex flex-col gap-1.5">
                {POPULAR_KARAOKE_HITS.slice(0, 3).map(hit => (
                  <button
                    key={hit.id}
                    onClick={() => onAddSong(hit)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left border border-slate-700/60 hover:border-pink-500/40 text-xs transition group"
                  >
                    <span className="truncate text-slate-300 group-hover:text-pink-300 pr-2 text-[11px]">
                      {hit.title}
                    </span>
                    <span className="text-[10px] text-pink-400 font-bold shrink-0 flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Fila
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {playlist.map((item, index) => (
                <div
                  key={item.queueId || `${item.id}-${index}`}
                  className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-pink-500/50 transition-all duration-200"
                >
                  {/* Position */}
                  <div className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative w-12 h-9 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-700/80">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onPlaySong(item)}
                      title="Cantar agora (furar fila)"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-emerald-400"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-pink-300 transition">
                      {item.title}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="truncate max-w-[100px]">{item.channel}</span>
                      {item.addedBy && (
                        <span className="text-pink-400 truncate">
                          • {item.addedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                    <div className="flex flex-col">
                      <button
                        disabled={index === 0}
                        onClick={() => onReorderPlaylist(index, index - 1)}
                        title="Subir posição"
                        className="p-0.5 hover:text-cyan-400 disabled:opacity-20 transition"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        disabled={index === playlist.length - 1}
                        onClick={() => onReorderPlaylist(index, index + 1)}
                        title="Descer posição"
                        className="p-0.5 hover:text-cyan-400 disabled:opacity-20 transition"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveFromPlaylist(item.queueId, index)}
                      title="Remover da fila"
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400 font-medium text-[10px] sm:text-[11px]">
          <Sparkles className="w-3 h-3" /> Auto-avanço ativado
        </span>
        <span className="text-slate-500 text-[10px]">
          Atalho: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[9px]">P</kbd>
        </span>
      </div>
    </div>
  );
};
