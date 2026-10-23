import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Lock, 
  Unlock, 
  Music, 
  Search, 
  X, 
  LogIn, 
  KeyRound,
  Sparkles
} from 'lucide-react';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import type { Room } from '../types/room';

interface RoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomJoined: (room: Room) => void;
}

export const RoomsModal: React.FC<RoomsModalProps> = ({ isOpen, onClose, onRoomJoined }) => {
  const { user, openAuthModal } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  
  // Create Room state
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [createError, setCreateError] = useState('');
  
  // Password Prompt for locked rooms
  const [targetLockedRoom, setTargetLockedRoom] = useState<Room | null>(null);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const socket = socketService.connect();
    
    const handleRoomsList = (list: Room[]) => {
      setRooms(list);
    };

    socket.on('rooms_list', handleRoomsList);
    socket.emit('get_rooms');

    return () => {
      socket.off('rooms_list', handleRoomsList);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }

    if (!newRoomName.trim()) {
      setCreateError('Dê um nome para sua sala.');
      return;
    }

    const res = await socketService.createRoom(newRoomName, newRoomPassword, user);
    if (res.success && res.room) {
      setIsCreating(false);
      setNewRoomName('');
      setNewRoomPassword('');
      onRoomJoined(res.room);
      onClose();
    } else {
      setCreateError(res.error || 'Erro ao criar sala.');
    }
  };

  const handleJoinClick = (room: Room) => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (room.hasPassword) {
      setTargetLockedRoom(room);
      setInputPassword('');
      setPasswordError('');
      return;
    }

    executeJoin(room.id);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLockedRoom) return;

    const res = await socketService.joinRoom(targetLockedRoom.id, inputPassword, user || undefined);
    if (res.success && res.room) {
      setTargetLockedRoom(null);
      onRoomJoined(res.room);
      onClose();
    } else {
      setPasswordError(res.error || 'Senha incorreta.');
    }
  };

  const executeJoin = async (roomId: string) => {
    const res = await socketService.joinRoom(roomId, undefined, user || undefined);
    if (res.success && res.room) {
      onRoomJoined(res.room);
      onClose();
    } else {
      alert(res.error || 'Não foi possível entrar na sala.');
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.hostName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-[#12151f] border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8 text-slate-100 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-pink-400" />
              Salas de Karaokê Online
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Cante ao vivo com seus amigos pela internet com voz e vídeo sincronizados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!user) {
                  openAuthModal();
                  return;
                }
                setIsCreating(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs md:text-sm shadow-glow-purple transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Criar Nova Sala</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            placeholder="Pesquisar salas ou anfitriões..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs md:text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-pink-500/80 transition"
          />
        </div>

        {/* Rooms Grid (Quadradinhos de Salas) */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                <Music className="w-8 h-8 text-pink-400/80" />
              </div>
              <h4 className="text-base font-semibold text-slate-200">Nenhuma sala aberta no momento</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Seja o primeiro a abrir o show! Crie uma sala e convide seus amigos para cantar.
              </p>
              <button
                onClick={() => {
                  if (!user) openAuthModal();
                  else setIsCreating(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-semibold transition"
              >
                + Criar Primeira Sala
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredRooms.map(room => (
                <div
                  key={room.id}
                  className="group relative flex flex-col justify-between p-4 rounded-2xl bg-[#161a27] border border-slate-800/90 hover:border-pink-500/70 transition-all duration-200 shadow-md hover:scale-[1.01]"
                >
                  <div>
                    {/* Top row: password badge & participant count */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        room.hasPassword 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {room.hasPassword ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {room.hasPassword ? 'Com Senha' : 'Aberta'}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <strong>{room.participants.length}</strong> cantando
                      </span>
                    </div>

                    {/* Room Name */}
                    <h4 className="text-base font-bold text-white group-hover:text-pink-300 transition line-clamp-1">
                      {room.name}
                    </h4>

                    {/* Host Info */}
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
                      Líder: <strong className="text-slate-300">{room.hostName}</strong>
                    </p>

                    {/* Current Song */}
                    <div className="mt-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 truncate">
                      <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span className="text-[11px] text-slate-300 truncate">
                        {room.currentSong ? room.currentSong.title : 'Palco livre (Escolha seu som)'}
                      </span>
                    </div>
                  </div>

                  {/* Join Action */}
                  <button
                    onClick={() => handleJoinClick(room)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-pink-500 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition duration-150"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Entrar na Sala</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Room */}
        {isCreating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rounded-3xl animate-fadeIn">
            <div className="w-full max-w-md bg-[#161a26] border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                Criar Sala de Karaokê
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Configure o nome e se deseja proteger sua sala com senha
              </p>

              {createError && (
                <div className="mb-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateRoom} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Nome da Sala
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    placeholder="Ex: Karaokê dos Amigos, Show do Lucas..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-pink-500 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                    Senha da Sala <span className="text-slate-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="password"
                    value={newRoomPassword}
                    onChange={e => setNewRoomPassword(e.target.value)}
                    placeholder="Deixe em branco para sala pública aberta"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-pink-500 text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsCreating(false); setCreateError(''); }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-glow-purple"
                  >
                    Criar e Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Password Prompt */}
        {targetLockedRoom && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm rounded-3xl animate-fadeIn">
            <div className="w-full max-w-sm bg-[#161a26] border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Sala Protegida por Senha
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Digite a senha para entrar na sala <strong className="text-slate-200">{targetLockedRoom.name}</strong>
              </p>

              {passwordError && (
                <div className="mb-3 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  required
                  autoFocus
                  value={inputPassword}
                  onChange={e => setInputPassword(e.target.value)}
                  placeholder="Senha da sala..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-sm text-white placeholder-slate-500 outline-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTargetLockedRoom(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
