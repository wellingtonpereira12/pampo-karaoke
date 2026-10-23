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
  Radio,
  ListMusic,
  SkipForward,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { VideoItem } from '../audio/types';
import type { Room } from '../types/room';
import type { VideoPalette } from '../utils/colorExtractor';
import { ensureYouTubeApi } from '../utils/youtubeApi';
import { searchKaraokeVideos } from '../services/youtubeService';

interface KaraokePlayerProps {
  currentSong: VideoItem | null;
  onChangeSong: () => void;
  onSearchAlternative?: (title: string) => void;
  onAutoSwitchSong?: (video: VideoItem) => void;
  isStudioMode?: boolean;
  onToggleStudioMode?: () => void;
  currentRoom?: Room | null;
  videoPalette?: VideoPalette | null;
  playlistCount?: number;
  onOpenPlaylist?: () => void;
  onPlayNextSong?: () => void;
  onSongEnded?: () => void;
  syncEvent?: { 
    action: string; 
    currentTime?: number; 
    isPlaying?: boolean; 
    timestamp: number;
    sentAt?: number;
    serverTime?: number;
  } | null;
  onBroadcastSync?: (
    action: 'play' | 'pause' | 'seek' | 'heartbeat', 
    currentTime?: number, 
    isPlaying?: boolean
  ) => void;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({ 
  currentSong, 
  onChangeSong,
  onSearchAlternative,
  onAutoSwitchSong,
  isStudioMode = false,
  onToggleStudioMode,
  currentRoom,
  videoPalette = null,
  playlistCount = 0,
  onOpenPlaylist,
  onPlayNextSong,
  onSongEnded,
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
  const [embedBlockedError, setEmbedBlockedError] = useState<{ isBlocked: boolean; code?: number } | null>(null);
  const [isFindingAlternative, setIsFindingAlternative] = useState(false);

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

  // Handle incoming synchronization events with centisecond precision & network latency compensation
  useEffect(() => {
    if (!syncEvent || !ytPlayerRef.current) return;
    const player = ytPlayerRef.current;

    const now = Date.now();
    const transitLatencySec = syncEvent.sentAt ? Math.max(0, (now - syncEvent.sentAt) / 1000) : 0;
    
    // When playing, compensate for the network transit time so both computers are on the exact same millisecond!
    const targetTime = syncEvent.currentTime !== undefined
      ? (syncEvent.isPlaying && syncEvent.action !== 'pause'
          ? Math.round((syncEvent.currentTime + transitLatencySec) * 100) / 100
          : syncEvent.currentTime)
      : undefined;

    isRemoteSyncRef.current = true;

    try {
      if (syncEvent.action === 'play') {
        if (targetTime !== undefined) {
          const cur = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
          if (Math.abs(cur - targetTime) > 0.15) {
            player.seekTo?.(targetTime, true);
          }
        }
        player.playVideo?.();
        lastReportedTimeRef.current = targetTime || 0;
      } else if (syncEvent.action === 'pause') {
        if (targetTime !== undefined) {
          player.seekTo?.(targetTime, true);
        }
        player.pauseVideo?.();
        lastReportedTimeRef.current = targetTime || 0;
      } else if (syncEvent.action === 'seek') {
        if (targetTime !== undefined) {
          player.seekTo?.(targetTime, true);
          lastReportedTimeRef.current = targetTime;
        }
        if (syncEvent.isPlaying === true) {
          player.playVideo?.();
        } else if (syncEvent.isPlaying === false) {
          player.pauseVideo?.();
        }
      } else if (syncEvent.action === 'heartbeat') {
        // Continuous Equalization Engine: if players drift apart by more than 180ms, micro-align them
        if (targetTime !== undefined && syncEvent.isPlaying) {
          const cur = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
          const drift = cur - targetTime;
          if (Math.abs(drift) > 0.18) {
            player.seekTo?.(targetTime, true);
            lastReportedTimeRef.current = targetTime;
          }
        }
      }
    } catch (err) {
      console.warn('[KaraokePlayer] Erro ao sincronizar vídeo remoto:', err);
    }

    const t = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 700);
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
          setEmbedBlockedError(null);
          setIsFindingAlternative(false);
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
      setEmbedBlockedError(null);
      setIsFindingAlternative(false);
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
            onError: async (event: any) => {
              console.warn('[KaraokePlayer] Erro retornado pelo YouTube Player:', event.data);
              // 101 e 150: O proprietário do vídeo desativou a incorporação em outros sites
              // 100: Vídeo não encontrado ou removido
              // 2 ou 5: Erro de parâmetros/reprodução
              if (event.data === 101 || event.data === 150 || event.data === 100) {
                setEmbedBlockedError({ isBlocked: true, code: event.data });
                setIsFindingAlternative(true);

                try {
                  const cleanTitle = (currentSong.title || '')
                    .replace(/\(Karaok[eê].*?\)/gi, '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/\|\s*Karaoke.*$/gi, '')
                    .trim();

                  const results = await searchKaraokeVideos(cleanTitle);
                  const candidate = results.find(v => v.id !== currentSong.id);

                  if (candidate && onAutoSwitchSong) {
                    setTimeout(() => {
                      setEmbedBlockedError(null);
                      setIsFindingAlternative(false);
                      onAutoSwitchSong(candidate);
                    }, 2000);
                    return;
                  }
                } catch (e) {
                  console.warn('[KaraokePlayer] Erro na busca de substituto:', e);
                }

                setIsFindingAlternative(false);
              }
            },
            onStateChange: (event: any) => {
              if (isRemoteSyncRef.current || !onBroadcastSync) return;

              // Se voltou a tocar com sucesso, limpa qualquer erro anterior
              if (event.data === 1 || event.data === 2) {
                setEmbedBlockedError(null);
              }

              // YT.PlayerState.PLAYING = 1 (Play nativo ou retomada)
              if (event.data === 1) {
                const time = Math.round((event.target.getCurrentTime ? event.target.getCurrentTime() : 0) * 100) / 100;
                // Se o tempo pulou significativamente, foi um seek seguido de play
                if (Math.abs(time - lastReportedTimeRef.current) > 1.2) {
                  onBroadcastSync('seek', time, true);
                } else {
                  onBroadcastSync('play', time, true);
                }
                lastReportedTimeRef.current = time;
              }
              // YT.PlayerState.PAUSED = 2 (Pause nativo ao clicar no vídeo)
              else if (event.data === 2) {
                const time = Math.round((event.target.getCurrentTime ? event.target.getCurrentTime() : 0) * 100) / 100;
                onBroadcastSync('pause', time, false);
                lastReportedTimeRef.current = time;
              }
              // YT.PlayerState.ENDED = 0 (Vídeo finalizado)
              else if (event.data === 0) {
                handleApplause();
                if (onSongEnded) {
                  onSongEnded();
                }
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

  // Periodic Scrubber/Timeline Sync Check (Detecção em tempo real com alta resolução)
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
          const expected = lastReportedTimeRef.current + 0.3;
          if (Math.abs(curTime - expected) > 1.2) {
            const precise = Math.round(curTime * 100) / 100;
            if (Math.abs(precise - lastBroadcastTimeRef.current) >= 0.3) {
              lastBroadcastTimeRef.current = precise;
              onBroadcastSync('seek', precise, true);
            }
          }
          lastReportedTimeRef.current = curTime;
        } 
        // Se está pausado (state 2) e o usuário arrastou a barra para outro centésimo
        else if (state === 2) {
          if (Math.abs(curTime - lastReportedTimeRef.current) > 0.25) {
            const precise = Math.round(curTime * 100) / 100;
            if (Math.abs(precise - lastBroadcastTimeRef.current) >= 0.15) {
              lastBroadcastTimeRef.current = precise;
              onBroadcastSync('seek', precise, false);
            }
          }
          lastReportedTimeRef.current = curTime;
        }
      } catch (e) {}
    }, 300);

    return () => clearInterval(timer);
  }, [onBroadcastSync]);

  // Continuous Synchronization Equalizer Heartbeat (Runs every 1.5s when playing in an online room)
  useEffect(() => {
    if (!currentRoom || !onBroadcastSync) return;

    const heartbeatTimer = setInterval(() => {
      if (!ytPlayerRef.current || isRemoteSyncRef.current) return;
      try {
        const player = ytPlayerRef.current;
        const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : null;
        if (state === 1) { // Only while actively playing
          const curTime = typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : null;
          if (typeof curTime === 'number' && !isNaN(curTime) && curTime > 0) {
            const precise = Math.round(curTime * 100) / 100;
            onBroadcastSync('heartbeat', precise, true);
          }
        }
      } catch (e) {}
    }, 1500);

    return () => clearInterval(heartbeatTimer);
  }, [currentRoom?.id, onBroadcastSync]);

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
      className={`relative w-full mx-auto overflow-hidden bg-black border transition-all duration-500 ${
        isStudioMode 
          ? 'max-w-none rounded-2xl border-pink-500/50 shadow-[0_0_50px_rgba(236,72,153,0.3)]' 
          : 'max-w-6xl rounded-3xl border-slate-800 shadow-2xl'
      }`}
      style={
        isStudioMode && videoPalette ? {
          borderColor: `rgba(${videoPalette.primary[0]}, ${videoPalette.primary[1]}, ${videoPalette.primary[2]}, 0.85)`,
          boxShadow: `0 0 50px rgba(${videoPalette.primary[0]}, ${videoPalette.primary[1]}, ${videoPalette.primary[2]}, 0.45), 0 0 100px rgba(${videoPalette.secondary[0]}, ${videoPalette.secondary[1]}, ${videoPalette.secondary[2]}, 0.25)`
        } : undefined
      }
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
                  : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-pink-300 border-pink-500/40 hover:border-pink-400'
              }`}
            >
              <RectangleHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isStudioMode ? 'Modo Normal' : 'Modo Estúdio'}
              </span>
            </button>
          )}

          {/* Playlist & Fila Button */}
          {onOpenPlaylist && (
            <button
              onClick={onOpenPlaylist}
              title="Ver Playlist & Fila de Músicas [Atalho: P]"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-pink-600/80 text-slate-200 hover:text-white text-xs font-semibold backdrop-blur border border-pink-500/40 hover:border-pink-400 transition shadow-sm group"
            >
              <ListMusic className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Fila</span>
              {playlistCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-black shadow-glow-pink">
                  {playlistCount}
                </span>
              )}
            </button>
          )}

          {/* Skip / Next Song Button */}
          {playlistCount > 0 && onPlayNextSong && (
            <button
              onClick={onPlayNextSong}
              title="Pular para a Próxima Música na Fila"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-pink-500 hover:bg-pink-400 text-slate-950 text-xs font-bold transition shadow-glow-pink"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
              <span className="hidden md:inline">Próxima</span>
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

        {/* Embed Blocked / Owner Restriction Overlay */}
        {embedBlockedError?.isBlocked && (
          <div className="absolute inset-0 z-30 bg-[#0b0e17]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-3 animate-bounce">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2">
              Vídeo com Reprodução Restrita pelo Dono
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mb-4 leading-relaxed">
              O proprietário deste vídeo específico no YouTube (<span className="text-pink-400 font-semibold">{currentSong.channel}</span>) desativou a reprodução fora do YouTube (Erro {embedBlockedError.code || 150}).
            </p>

            {isFindingAlternative ? (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-semibold mb-5 shadow-glow-pink animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
                Localizando e trocando automaticamente para outra versão de karaokê liberada...
              </div>
            ) : (
              <p className="text-xs text-emerald-400 mb-5 font-medium">
                Temos outras versões excelentes disponíveis para esta mesma música!
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
              <button
                onClick={handleAlternative}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-glow-pink flex items-center gap-2 transition"
              >
                <Search className="w-4 h-4" />
                Buscar Outra Versão Desta Música
              </button>

              <a
                href={currentSong.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                Assistir no YouTube
              </a>

              <button
                onClick={onChangeSong}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Escolher Outra Música
              </button>
            </div>
          </div>
        )}
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
