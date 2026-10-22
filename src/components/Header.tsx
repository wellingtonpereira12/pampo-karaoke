import React from 'react';
import { Plus, Speaker, Maximize2, Minimize2, Music } from 'lucide-react';

interface HeaderProps {
  onOpenAddInput: () => void;
  onOpenSpeakerModal: () => void;
  connectedMicCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddInput,
  onOpenSpeakerModal,
  connectedMicCount,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <header className="w-full bg-[#10131b]/95 border-b border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Brand: Pampo Karaokê */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-glow-green">
          <Music className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Pampo Karaokê
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ao Vivo
            </span>
          </h1>
        </div>
      </div>

      {/* Right Actions: Minimalist round buttons */}
      <div className="flex items-center gap-3">
        {/* Speaker / Caixa de Som Button */}
        <button
          onClick={onOpenSpeakerModal}
          title="Configurar Caixas de Som"
          className="relative p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-cyan-400 transition flex items-center justify-center shadow-sm"
        >
          <Speaker className="w-5 h-5" />
          <span className="sr-only">Caixas de Som</span>
        </button>

        {/* Add Input (+) Button */}
        <button
          onClick={onOpenAddInput}
          title="Conectar Microfone (+)"
          className="relative p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center justify-center shadow-glow-green group"
        >
          <Plus className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          {connectedMicCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-emerald-400 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
              {connectedMicCount}
            </span>
          )}
          <span className="sr-only">Conectar Microfone</span>
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-400 hover:text-slate-100 transition hidden sm:flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
