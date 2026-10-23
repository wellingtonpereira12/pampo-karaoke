import React, { useRef, useMemo } from 'react';
import { Maximize, RotateCcw, Search, Sparkles, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { VideoItem } from '../audio/types';

interface KaraokePlayerProps {
  currentSong: VideoItem | null;
  onChangeSong: () => void;
  onSearchAlternative?: (title: string) => void;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({ 
  currentSong, 
  onChangeSong,
  onSearchAlternative 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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
      // Clean title from extra tags
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
      className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl transition-all"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2 truncate max-w-[65%]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
          <h3 className="text-sm md:text-base font-semibold text-white truncate drop-shadow">
            {currentSong.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Confetti / Applause button */}
          <button
            onClick={handleApplause}
            title="Palmas / Parabéns!"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 text-xs font-semibold backdrop-blur border border-slate-700/80 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Palmas!</span>
          </button>

          {/* Change Song Button */}
          <button
            onClick={onChangeSong}
            title="Trocar Música"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold backdrop-blur border border-slate-700/80 transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trocar</span>
          </button>

          {/* Fullscreen Video Button */}
          <button
            onClick={handleFullscreenPlayer}
            title="Tela Cheia do Vídeo"
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur border border-slate-700/80 transition"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded YouTube Iframe - Sized Large for clear lyrics reading */}
      <div className="relative w-full aspect-video min-h-[380px] md:min-h-[520px] lg:min-h-[620px] bg-black">
        <iframe
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
