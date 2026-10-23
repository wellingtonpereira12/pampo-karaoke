import React, { useState } from 'react';
import { Plus, Speaker, Maximize2, Minimize2, Music, Users, LogIn, LogOut, ListMusic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenAddInput: () => void;
  onOpenSpeakerModal: () => void;
  onOpenRoomsModal: () => void;
  onOpenPlaylist?: () => void;
  playlistCount?: number;
  connectedMicCount: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isInRoom?: boolean;
  roomName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddInput,
  onOpenSpeakerModal,
  onOpenRoomsModal,
  onOpenPlaylist,
  playlistCount = 0,
  connectedMicCount,
  isFullscreen,
  onToggleFullscreen,
  isInRoom = false,
  roomName = '',
}) => {
  const { user, openAuthModal, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="w-full bg-[#10131b]/95 border-b border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      {/* Brand: Pampo Karaokê */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-glow-purple">
          <Music className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
            Pampo Karaokê
            {isInRoom ? (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 flex items-center gap-1">
                <Users className="w-3 h-3 text-pink-400" />
                {roomName || 'Sala Online'}
              </span>
            ) : (
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ao Vivo
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Right Actions: Minimalist round buttons & Online Rooms & Login */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Playlist & Fila Button */}
        {onOpenPlaylist && (
          <button
            onClick={onOpenPlaylist}
            title="Ver Playlist & Fila de Músicas [Atalho: P]"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-pink-600/20 border border-pink-500/30 hover:border-pink-500 text-pink-300 text-xs font-bold transition shadow-sm group"
          >
            <ListMusic className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Playlist</span>
            {playlistCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center shadow-glow-pink">
                {playlistCount}
              </span>
            )}
          </button>
        )}

        {/* Salas Online Button (Discord style rooms) */}
        <button
          onClick={onOpenRoomsModal}
          title="Ver Salas de Karaokê Online"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/40 text-pink-300 text-xs font-bold transition shadow-sm"
        >
          <Users className="w-4 h-4 text-pink-400" />
          <span className="hidden sm:inline">Salas Online</span>
        </button>

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

        {/* Google User Authentication Pill */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-white transition"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-full bg-slate-700 object-cover"
              />
              <span className="text-xs font-semibold max-w-[80px] md:max-w-[110px] truncate hidden sm:inline">
                {user.name.split(' ')[0]}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#161a27] border border-slate-800 shadow-2xl p-2 z-50 text-slate-200 animate-fadeIn"
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="p-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full mt-1.5 flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Entrar com Google</span>
          </button>
        )}

        {/* Fullscreen Toggle Button */}
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-400 hover:text-slate-100 transition hidden lg:flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
