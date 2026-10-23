import React, { useRef, useMemo, useState, useEffect } from 'react';
import { 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Search, 
  Sparkles, 
  ExternalLink, 
  RectangleHorizontal,
  Play,
  Pause,
  FastForward,
  Rewind,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { VideoItem } from '../audio/types';
import type { Room } from '../types/room';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentTimeRef = useRef<number>(0);
  const isRemoteSyncRef = useRef<boolean>(false);

  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTimeFormatted, setPlaybackTimeFormatted] = useState<string>('0:00');

  // Sync fullscreen state of the player container
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPlayerFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // PostMessage helper for YouTube iframe API
  const sendIframeCommand = (func: string, args: unknown = '') => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
      }
    } catch (e) {
      console.warn('Failed to send command to YouTube iframe:', e);
    }
  };

  const handlePlay = (fromRemote = false) => {
    setIsPlaying(true);
    sendIframeCommand('playVideo');
    if (!fromRemote && onBroadcastSync) {
      onBroadcastSync('play', currentTimeRef.current, true);
    }
  };

  const handlePause = (fromRemote = false) => {
    setIsPlaying(false);
    sendIframeCommand('pauseVideo');
    if (!fromRemote && onBroadcastSync) {
      onBroadcastSync('pause', currentTimeRef.current, false);
    }
  };

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      handlePause(false);
    } else {
      handlePlay(false);
    }
  };

  const handleSeek = (seconds: number, fromRemote = false) => {
    const target = Math.max(0, seconds);
    currentTimeRef.current = target;
    sendIframeCommand('seekTo', [target, true]);
    if (!fromRemote && onBroadcastSync) {
      onBroadcastSync('seek', target, isPlaying);
    }
  };

  const handleSeekDelta = (delta: number) => {
    handleSeek(currentTimeRef.current + delta, false);
  };

  // Handle incoming synchronization events from other room participants
  useEffect(() => {
    if (!syncEvent) return;
    isRemoteSyncRef.current = true;

    if (syncEvent.action === 'play') {
      setIsPlaying(true);
      sendIframeCommand('playVideo');
      if (syncEvent.currentTime !== undefined && Math.abs(currentTimeRef.current - syncEvent.currentTime) > 2) {
        currentTimeRef.current = syncEvent.currentTime;
        sendIframeCommand('seekTo', [syncEvent.currentTime, true]);
      }
    } else if (syncEvent.action === 'pause') {
      setIsPlaying(false);
      sendIframeCommand('pauseVideo');
      if (syncEvent.currentTime !== undefined) {
        currentTimeRef.current = syncEvent.currentTime;
        sendIframeCommand('seekTo', [syncEvent.currentTime, true]);
      }
    } else if (syncEvent.action === 'seek' && syncEvent.currentTime !== undefined) {
      currentTimeRef.current = syncEvent.currentTime;
      sendIframeCommand('seekTo', [syncEvent.currentTime, true]);
      if (syncEvent.isPlaying !== undefined) {
        setIsPlaying(syncEvent.isPlaying);
        sendIframeCommand(syncEvent.isPlaying ? 'playVideo' : 'pauseVideo');
      }
    }

    const t = setTimeout(() => {
      isRemoteSyncRef.current = false;
    }, 1200);
    return () => clearTimeout(t);
  }, [syncEvent]);

  // Listen for YouTube player events sent via postMessage
  useEffect(() => {
    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleWindowMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data?.event === 'infoDelivery' && data?.info?.currentTime !== undefined) {
          currentTimeRef.current = data.info.currentTime;
          setPlaybackTimeFormatted(formatTime(data.info.currentTime));
        }

        // On native iframe player state change (1: playing, 2: paused)
        if (data?.event === 'onStateChange' && !isRemoteSyncRef.current) {
          if (data.info === 1) {
            setIsPlaying(true);
            if (onBroadcastSync) onBroadcastSync('play', currentTimeRef.current, true);
          } else if (data.info === 2) {
            setIsPlaying(false);
            if (onBroadcastSync) onBroadcastSync('pause', currentTimeRef.current, false);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [onBroadcastSync]);

  // Keyboard shortcuts: Space (play/pause), Left/Right (seek -5s/+5s), 'T' (theater), 'F' (fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlayPause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeekDelta(-5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeekDelta(5);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        onToggleStudioMode?.();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFullscreenPlayer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, onToggleStudioMode]);

  const embedUrl = useMemo(() => {
    if (!currentSong) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      enablejsapi: '1',
      playsinline: '1',
    });
    if (origin && !origin.startsWith('file://')) {
      params.set('origin', origin);
    }
    // youtube-nocookie provides higher compatibility across browsers and privacy settings
    return `https://www.youtube-nocookie.com/embed/${currentSong.id}?${params.toString()}`;
  }, [currentSong]);

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
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2 truncate max-w-[45%] sm:max-w-[55%]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <h3 className="text-sm md:text-base font-semibold text-white truncate drop-shadow">
            {currentSong.title}
          </h3>
          {currentRoom && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold shrink-0">
              <Users className="w-3 h-3" />
              Sincronizado na Sala
            </span>
          )}
        </div>

        {/* Central Synchronized Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur border border-slate-700/80 shadow-lg">
          {/* Rewind -10s */}
          <button
            onClick={() => handleSeekDelta(-10)}
            title="Voltar 10 segundos (Sincronizado para todos) [←]"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={handleTogglePlayPause}
            title={isPlaying ? "Pausar para todos na sala [Espaço]" : "Dar Play para todos na sala [Espaço]"}
            className="p-1.5 sm:px-2.5 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(236,72,153,0.5)] active:scale-95 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pausar' : 'Play'}</span>
          </button>

          {/* Fast Forward +10s */}
          <button
            onClick={() => handleSeekDelta(10)}
            title="Avançar 10 segundos (Sincronizado para todos) [→]"
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition"
          >
            <FastForward className="w-4 h-4" />
          </button>

          {/* Restart 0s */}
          <button
            onClick={() => handleSeek(0)}
            title="Recomeçar do início (Sincronizado)"
            className="p-1.5 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-800 active:scale-95 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Current Time Display */}
          <span className="text-[11px] font-mono text-slate-400 px-1 hidden sm:inline">
            {playbackTimeFormatted}
          </span>
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

      {/* Embedded YouTube Iframe - Sized Large for clear lyrics reading */}
      <div className={`relative w-full bg-black transition-all duration-300 ${
        isStudioMode 
          ? 'aspect-video min-h-[460px] md:min-h-[72vh] lg:min-h-[80vh]' 
          : 'aspect-video min-h-[380px] md:min-h-[520px] lg:min-h-[620px]'
      }`}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={currentSong.title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>

      {/* Bottom Bar Details & Fallback Helpers */}
      <div className="p-3 bg-[#11141c] border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-300 font-medium truncate">{currentSong.channel}</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Pronto para cantar com seus microfones</span>
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

          {/* Open in YouTube (fallback if uploader restricts embed) */}
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
