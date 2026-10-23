import React, { useState, useEffect } from 'react';
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
  onToggle,
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
  const [pulseCount, setPulseCount] = useState(false);

  // Trigger brief bounce/pulse on the tab badge whenever playlist length increases
  useEffect(() => {
    if (playlist.length > 0) {
      setPulseCount(true);
      const timer = setTimeout(() => setPulseCount(false), 800);
      return () => clearTimeout(timer);
    }
  }, [playlist.length]);

  // Global hotkey: 'P' toggles playlist
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

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
    <>
      {/* 1. Floating Right-Edge Button (Always accessible & stylized like a neon sound rack tab) */}
      <aside 
        aria-label="Controle de Playlist"
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 pointer-events-auto ${
          isOpen ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
        }`}
      >
        <button
          onClick={onToggle}
          title="Abrir Playlist & Fila de Músicas [Atalho: P]"
          className={`group relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-l-2xl bg-[#0f131f]/90 hover:bg-[#161c2d] text-slate-200 border-y border-l border-pink-500/40 hover:border-pink-400 shadow-[-6px_0_24px_rgba(236,72,153,0.35)] backdrop-blur-md transition-all hover:pr-3.5 hover:shadow-[-8px_0_30px_rgba(236,72,153,0.55)] ${
            pulseCount ? 'scale-110 border-pink-300' : ''
          }`}
        >
          {/* Glowing indicator line */}
          <span className="absolute top-2 bottom-2 left-0.5 w-1 rounded-full bg-gradient-to-b from-pink-500 via-purple-500 to-cyan-400" />

          {/* Icon with spin/pulse */}
          <div className="relative">
            <ListMusic className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
            {currentSong && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Vertical Label */}
          <span className="text-[10px] font-black tracking-widest uppercase text-slate-300 [writing-mode:vertical-rl] group-hover:text-pink-300 transition">
            Playlist
          </span>

          {/* Badge count */}
          <span
            className={`min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
              playlist.length > 0
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-glow-pink animate-pulse'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {playlist.length}
          </span>
        </button>
      </aside>

      {/* 2. Slide-over Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity animate-fadeIn"
        />
      )}

      {/* 3. Slide-In Playlist Drawer */}
      <aside
        aria-label="Painel de Fila de Reprodução"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] max-w-[92vw] bg-[#0c0f18]/95 border-l border-pink-500/30 backdrop-blur-2xl shadow-[-15px_0_45px_rgba(0,0,0,0.8)] flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shadow-glow-pink">
              <ListMusic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-wide uppercase">
                  Fila do Palco
                </h3>
                {isInRoom && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> Sala
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {playlist.length === 0
                  ? 'Fila vazia'
                  : `${playlist.length} ${playlist.length === 1 ? 'música na fila' : 'músicas na fila'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {playlist.length > 0 && (
              <button
                onClick={onClearPlaylist}
                title="Limpar todas as músicas da fila"
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-medium transition"
              >
                Limpar
              </button>
            )}
            <button
              onClick={onClose}
              title="Fechar Playlist [Esc / P]"
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Add Input inside Drawer */}
        <div className="p-3.5 bg-[#121624] border-b border-slate-800/80">
          <form onSubmit={handleQuickAdd} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                {quickInput.includes('http') ? (
                  <LinkIcon className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>
              <input
                type="text"
                value={quickInput}
                onChange={e => setQuickInput(e.target.value)}
                placeholder="Cole o link do YouTube ou digite..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition"
              />
            </div>
            <button
              type="submit"
              disabled={!quickInput.trim() || isSearching}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                justAddedFeedback
                  ? 'bg-emerald-500 text-slate-950 shadow-glow-green'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-glow-pink disabled:opacity-40'
              }`}
            >
              {justAddedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Adicionou!
                </>
              ) : isSearching ? (
                'Buscando...'
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> + Fila
                </>
              )}
            </button>
          </form>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pr-3 custom-scrollbar">
          {/* "Tocando Agora" Card */}
          {currentSong ? (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/30 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-pink-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Tocando Agora
                </span>
                {/* Dancing Equalizer Bars */}
                <div className="flex items-end gap-1 h-3.5">
                  <span className="w-1 bg-pink-400 rounded-full animate-[bounce_0.8s_infinite]" />
                  <span className="w-1 bg-purple-400 rounded-full animate-[bounce_0.5s_infinite]" />
                  <span className="w-1 bg-cyan-400 rounded-full animate-[bounce_0.7s_infinite]" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite]" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-16 h-12 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-700">
                  <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Disc3 className="w-5 h-5 text-white/90 animate-[spin_4s_linear_infinite]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {currentSong.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
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
                    title="Pular para a próxima música da fila"
                    className="p-2 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold transition shadow-glow-pink shrink-0"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              Nenhuma música tocando no momento. Escolha uma abaixo ou pesquise para começar!
            </div>
          )}

          {/* Section: A Seguir (Fila) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-cyan-400" />
                A Seguir na Fila ({playlist.length})
              </h4>
              <span className="text-[10px] text-slate-500">Toca em sequência</span>
            </div>

            {playlist.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                  <Disc3 className="w-6 h-6 animate-[spin_10s_linear_infinite]" />
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  Sua fila de karaokê está vazia
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                  Pesquise no topo ou clique em "+ Fila" para enfileirar as músicas que você quer cantar!
                </p>

                {/* Quick Hit Suggestions */}
                <div className="mt-4 w-full">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Sugestões rápidas:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {POPULAR_KARAOKE_HITS.slice(0, 3).map(hit => (
                      <button
                        key={hit.id}
                        onClick={() => onAddSong(hit)}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-left border border-slate-700/60 hover:border-pink-500/40 text-xs transition group"
                      >
                        <span className="truncate text-slate-300 group-hover:text-pink-300 pr-2">
                          {hit.title}
                        </span>
                        <span className="text-[10px] text-pink-400 font-bold shrink-0 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Fila
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {playlist.map((item, index) => (
                  <div
                    key={item.queueId || `${item.id}-${index}`}
                    className="group relative flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-pink-500/50 transition-all duration-200"
                  >
                    {/* Index Badge */}
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-700">
                      #{index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-14 h-10 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-700/80">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => onPlaySong(item)}
                        title="Tocar agora (Furar a fila)"
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-emerald-400 hover:scale-110"
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                    </div>

                    {/* Title & Channel */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-slate-200 line-clamp-1 group-hover:text-pink-300 transition">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="truncate max-w-[110px]">{item.channel}</span>
                        {item.duration && <span>• {item.duration}</span>}
                        {item.addedBy && (
                          <span className="text-pink-400 truncate">
                            • {item.addedBy}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Reorder up/down & Remove */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <div className="flex flex-col">
                        <button
                          disabled={index === 0}
                          onClick={() => onReorderPlaylist(index, index - 1)}
                          title="Mover para cima"
                          className="p-1 hover:text-cyan-400 disabled:opacity-20 transition"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === playlist.length - 1}
                          onClick={() => onReorderPlaylist(index, index + 1)}
                          title="Mover para baixo"
                          className="p-1 hover:text-cyan-400 disabled:opacity-20 transition"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveFromPlaylist(item.queueId, index)}
                        title="Remover da playlist"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer info & hotkey note */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-center flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" /> Auto-avanço ativado
          </span>
          <span className="text-slate-500">
            Atalho: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">P</kbd>
          </span>
        </div>
      </aside>
    </>
  );
};
