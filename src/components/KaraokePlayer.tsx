import React, { useRef, useState, useEffect } from 'react';
import { 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Search, 
  Sparkles, 
  ExternalLink, 
  RectangleHorizontal,
  Users,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { VideoItem } from '../audio/types';
import type { Room } from '../types/room';
import { ensureYouTubeApi } from '../utils/youtubeApi';

interface KaraokePlayerProps {
  currentSong: VideoItem | null;
  onChangeSong: () => void;
  onSearchAlternative?: (title: string) => void;
  isStudioMode?: boolean;
  onToggleStudioMode?: () => void;
  currentRoom?: Room | null;
  syncEvent?: { action: string; currentTime?: number; isPlaying?: boolean; timestamp: number } | null;
  onBroadcastSync?: (action: 'play' | 'pause' | 'seek', currentTime?: number, isPlaying?: boolean) => void;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({ 
  currentSong, 
  onChangeSong,
  onSearchAlternative,
  isStudioMode = false,
  onToggleStudioMode,
  currentRoom,
  syncEvent,
  onBroadcastSync,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const isRemoteSyncRef = useRef<boolean>(false);
  const lastReportedTimeRef = useRef<number>(0);
  const lastBroadcastTimeRef = useRef<number>(0);
  const currentVideoIdRef = useRef<string | null>(null);

  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);

  // Sync fullscreen state of the player container
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPlayerFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts: 'T' (studio/theater), 'F' (fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToggleStudioMode?.();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFullscreenPlayer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleStudioMode]);

  // Handle incoming synchronization events from other room participants
  useEffect(() => {
    if (!syncEvent || !ytPlayerRef.current) return;
    const player = ytPlayerRef.current;
    isRemoteSyncRef.current = true;

    try {
      if (syncEvent.action === 'play') {
        if (syncEvent.currentTime !== undefined) {
          const cur = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
          if (Math.abs(cur - syncEvent.currentTime) > 1.5) {
            player.seekTo?.(syncEvent.currentTime, true);
          }
        }
        player.playVideo?.();
        lastReportedTimeRef.current = syncEvent.currentTime || 0;
      } else if (syncEvent.action === 'pause') {
        if (syncEvent.currentTime !== undefined) {
          player.seekTo?.(syncEvent.currentTime, true);
        }
        player.pauseVideo?.();
        lastReportedTimeRef.current = syncEvent.currentTime || 0;
      } else if (syncEvent.action === 'seek') {
        if (syncEvent.currentTime !== undefined) {
          player.seekTo?.(syncEvent.currentTime, true);
          lastReportedTimeRef.current = syncEvent.currentTime;
        }
        if (syncEvent.isPlaying === true) {
          player.playVideo?.();
        } else if (syncEvent.isPlaying === false) {
          player.pauseVideo?.();
        }
      }
    } catch (err) {
      console.warn('[KaraokePlayer] Erro ao sincronizar vídeo remoto:', err);
    }

    const t = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 1000);
    return () => clearTimeout(t);
  }, [syncEvent]);

  // Initialize or update YouTube Player
  useEffect(() => {
    if (!currentSong) {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.stopVideo?.(); } catch (e) {}
      }
      currentVideoIdRef.current = null;
      return;
    }

    let isSubscribed = true;

    const setupPlayer = async () => {
      await ensureYouTubeApi();
      if (!isSubscribed) return;

      // If player already exists and is healthy, just load the new video ID (Fast switch like FakeDC)
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        if (currentVideoIdRef.current !== currentSong.id) {
          currentVideoIdRef.current = currentSong.id;
          isRemoteSyncRef.current = true;
          try {
            ytPlayerRef.current.loadVideoById({
              videoId: currentSong.id,
              startSeconds: 0,
            });
          } catch (e) {
            console.warn('[KaraokePlayer] Falha ao chamar loadVideoById:', e);
          }
          lastReportedTimeRef.current = 0;
          setTimeout(() => {
            isRemoteSyncRef.current = false;
          }, 1200);
        }
        return;
      }

      // Initial Player Creation
      if (!playerWrapperRef.current) return;
      currentVideoIdRef.current = currentSong.id;
      playerWrapperRef.current.innerHTML = '<div id="karaoke-yt-frame" style="width: 100%; height: 100%;"></div>';

      const origin = (typeof window !== 'undefined' && !window.location.origin.startsWith('file:')) 
        ? window.location.origin 
        : undefined;

      try {
        ytPlayerRef.current = new (window as any).YT.Player('karaoke-yt-frame', {
          width: '100%',
          height: '100%',
          videoId: currentSong.id,
          playerVars: {
            autoplay: 1,
            controls: 1,
            disablekb: 0,
            enablejsapi: 1,
            fs: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.playVideo?.();
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              if (isRemoteSyncRef.current || !onBroadcastSync) return;

              // YT.PlayerState.PLAYING = 1 (Play nativo ou retomada)
              if (event.data === 1) {
                const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
                // Se o tempo pulou significativamente, foi um seek seguido de play
                if (Math.abs(time - lastReportedTimeRef.current) > 2) {
                  onBroadcastSync('seek', time, true);
                } else {
                  onBroadcastSync('play', time, true);
                }
                lastReportedTimeRef.current = time;
              }
              // YT.PlayerState.PAUSED = 2 (Pause nativo ao clicar no vídeo)
              else if (event.data === 2) {
                const time = Math.floor(event.target.getCurrentTime ? event.target.getCurrentTime() : 0);
                onBroadcastSync('pause', time, false);
                lastReportedTimeRef.current = time;
              }
              // YT.PlayerState.ENDED = 0 (Vídeo finalizado)
              else if (event.data === 0) {
                handleApplause();
              }
            },
          },
        });
      } catch (err) {
        console.error('[KaraokePlayer] Erro ao instanciar YT.Player:', err);
      }
    };

    setupPlayer();

    return () => {
      isSubscribed = false;
    };
  }, [currentSong?.id, onBroadcastSync]);

  // Periodic Scrubber/Timeline Sync Check (Detecção em tempo real de avançar/retroceder na barra do YouTube)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!ytPlayerRef.current || isRemoteSyncRef.current || !onBroadcastSync) return;
      try {
        const player = ytPlayerRef.current;
        const curTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : null;
        const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : null;

        if (typeof curTime !== 'number' || isNaN(curTime)) return;

        // Se está tocando (state 1) e o usuário pulou a barra do YouTube (delta inesperado)
        if (state === 1) {
          const expected = lastReportedTimeRef.current + 0.35;
          if (Math.abs(curTime - expected) > 1.8) {
            const floored = Math.floor(curTime);
            if (Math.abs(floored - lastBroadcastTimeRef.current) >= 1) {
              lastBroadcastTimeRef.current = floored;
              onBroadcastSync('seek', floored, true);
            }
          }
          lastReportedTimeRef.current = curTime;
        } 
        // Se está pausado (state 2) e o usuário arrastou a barra para outro minuto/segundo
        else if (state === 2) {
          if (Math.abs(curTime - lastReportedTimeRef.current) > 1.0) {
            const floored = Math.floor(curTime);
            if (Math.abs(floored - lastBroadcastTimeRef.current) >= 1) {
              lastBroadcastTimeRef.current = floored;
              onBroadcastSync('seek', floored, false);
            }
          }
          lastReportedTimeRef.current = curTime;
        }
      } catch (e) {}
    }, 350);

    return () => clearInterval(timer);
  }, [onBroadcastSync]);

  if (!currentSong) return null;

  const handleApplause = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10b981', '#34d399', '#38bdf8', '#c084fc', '#f59e0b'],
    });
  };

  const handleFullscreenPlayer = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  const handleAlternative = () => {
    if (onSearchAlternative) {
      const cleanTitle = currentSong.title
        .replace(/\(Karaok[eê].*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .trim();
      onSearchAlternative(cleanTitle);
    } else {
      onChangeSong();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full mx-auto overflow-hidden bg-black border transition-all duration-300 ${
        isStudioMode 
          ? 'max-w-none rounded-2xl border-pink-500/50 shadow-[0_0_50px_rgba(236,72,153,0.3)]' 
          : 'max-w-6xl rounded-3xl border-slate-800 shadow-2xl'
      }`}
    >
      {/* Top Floating Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2 truncate max-w-[60%] sm:max-w-[70%]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <h3 className="text-sm md:text-base font-semibold text-white truncate drop-shadow">
            {currentSong.title}
          </h3>
          {currentRoom && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold shrink-0">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              Sincronizado na Sala ({currentRoom.name})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Confetti / Applause button */}
          <button
            onClick={handleApplause}
            title="Palmas / Parabéns!"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 text-xs font-semibold backdrop-blur border border-slate-700/80 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Palmas!</span>
          </button>

          {/* Modo Estúdio Button (Theater Mode) */}
          {onToggleStudioMode && (
            <button
              onClick={onToggleStudioMode}
              title={isStudioMode ? "Voltar ao Modo Normal [Atalho: T]" : "Modo Estúdio (Esticar vídeo) [Atalho: T]"}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur border transition duration-200 ${
                isStudioMode
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.6)]'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-pink-500/50'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isStudioMode ? 'Modo Normal' : 'Modo Estúdio'}
              </span>
            </button>
          )}

          {/* Change Song Button */}
          <button
            onClick={onChangeSong}
            title="Trocar Música"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold backdrop-blur border border-slate-700/80 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar</span>
          </button>

          {/* Fullscreen Video Button */}
          <button
            onClick={handleFullscreenPlayer}
            title={isPlayerFullscreen ? "Sair da Tela Cheia [Atalho: F]" : "Tela Cheia do Vídeo [Atalho: F]"}
            className="p-1.5 sm:p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur border border-slate-700/80 transition"
          >
            {isPlayerFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Native YouTube Player Container - Full Control & Direct Interaction */}
      <div className={`relative w-full bg-black transition-all duration-300 ${
        isStudioMode 
          ? 'aspect-video min-h-[460px] md:min-h-[72vh] lg:min-h-[80vh]' 
          : 'aspect-video min-h-[380px] md:min-h-[520px] lg:min-h-[620px]'
      }`}>
        <div ref={playerWrapperRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* Bottom Bar Details */}
      <div className="p-3 bg-[#11141c] border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-300 font-medium truncate">{currentSong.channel}</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Controles nativos do YouTube sincronizados para todos</span>
          {isStudioMode && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400">
                <RectangleHorizontal className="w-3 h-3" />
                Modo Estúdio Ativo
              </span>
            </>
          )}
          {currentRoom && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                <Users className="w-3 h-3" />
                Sala: {currentRoom.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Alternative Search Button */}
          <button
            onClick={handleAlternative}
            title="Buscar outra versão de karaokê desta música"
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Outra versão desta música</span>
          </button>

          {/* Open in YouTube */}
          <a
            href={currentSong.url || `https://www.youtube.com/watch?v=${currentSong.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir diretamente no YouTube em nova aba"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir no YouTube</span>
          </a>
        </div>
      </div>
    </div>
  );
};
