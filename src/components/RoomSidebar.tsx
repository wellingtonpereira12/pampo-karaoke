import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Crown, 
  Music, 
  Send, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Radio,
  Lock,
  Unlock
} from 'lucide-react';
import { socketService } from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import type { Room, ChatMessage, RoomParticipant } from '../types/room';

interface RoomSidebarProps {
  room: Room;
  onLeaveRoom: () => void;
  onShareSongClick: () => void;
}

export const RoomSidebar: React.FC<RoomSidebarProps> = ({
  room,
  onLeaveRoom,
  onShareSongClick,
}) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
  const [participants, setParticipants] = useState<RoomParticipant[]>(room.participants);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParticipants(room.participants);
  }, [room.participants]);

  // Socket listeners for chat & room updates
  useEffect(() => {
    const socket = socketService.connect();

    const handleRoomUpdated = (updatedRoom: Room) => {
      setParticipants(updatedRoom.participants);
    };

    const handleChatMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    const handlePeerVoiceActivity = ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      setParticipants(prev =>
        prev.map(p => (p.id === userId ? { ...p, isSpeaking } : p))
      );
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('chat_message', handleChatMessage);
    socket.on('peer_voice_activity', handlePeerVoiceActivity);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('chat_message', handleChatMessage);
      socket.off('peer_voice_activity', handlePeerVoiceActivity);
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    socketService.sendChatMessage(inputText.trim(), 'chat');
    setInputText('');
  };

  const handleSendApplause = () => {
    socketService.sendChatMessage('👏 Palmas para a performance!', 'applause');
  };

  if (isCollapsed) {
    return (
      <aside className="fixed left-0 top-16 bottom-0 z-40 flex items-center">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Abrir painel da Sala (Discord)"
          className="p-2.5 rounded-r-2xl bg-[#141824] border-y border-r border-slate-700/80 text-pink-400 hover:text-white shadow-xl transition hover:scale-105"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 md:top-16 bottom-0 z-40 w-72 md:w-80 bg-[#10131d]/98 border-r border-slate-800 shadow-2xl flex flex-col text-slate-200 backdrop-blur-md transition-all">
      {/* Top Header: Room Title & Host */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#151926]/90">
        <div className="truncate pr-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {room.hasPassword ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-emerald-400" />}
            <span className="font-semibold uppercase tracking-wider text-[10px]">Sala Online</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate" title={room.name}>
            {room.name}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Leave Room Button */}
          <button
            onClick={onLeaveRoom}
            title="Sair da Sala"
            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 transition"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            title="Recolher aba lateral"
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Channel Active Banner (Discord Style) */}
      <div className="px-3.5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
          <span>Voz Conectada</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {participants.length} online
        </span>
      </div>

      {/* Tabs: Participantes (Voz) vs Chat da Música */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'voice'
              ? 'text-pink-400 border-b-2 border-pink-500 bg-pink-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Pessoas ({participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
            activeTab === 'chat'
              ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chat da Sala</span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'voice' ? (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 px-1">
              Participantes da Sala
            </div>

            {participants.map(p => {
              const isCurrentUser = p.id === user?.id;

              return (
                <div
                  key={p.socketId || p.id}
                  className={`flex items-center justify-between p-2 rounded-xl transition ${
                    p.isSpeaking
                      ? 'bg-emerald-500/15 border border-emerald-500/60 shadow-glow-green'
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {/* Avatar with Discord-style glowing green voice ring */}
                    <div className="relative shrink-0">
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className={`w-9 h-9 rounded-full bg-slate-800 object-cover border-2 transition-all duration-150 ${
                          p.isSpeaking
                            ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                            : 'border-slate-700'
                        }`}
                      />
                      {p.isSpeaking && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#10131d]" />
                      )}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-semibold text-white truncate">
                          {p.name}
                        </span>
                        {p.isHost && (
                          <span title="Líder da Sala">
                            <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            você
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {p.isSpeaking ? '🎤 Falando / Cantando' : 'Ouvindo'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    {p.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Shared Music Box */}
            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-pink-950/30 to-purple-950/30 border border-pink-500/30">
              <div className="flex items-center justify-between text-[11px] font-semibold text-pink-300 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  Música da Sala
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">
                  Sincronizado
                </span>
              </div>

              {room.currentSong ? (
                <div>
                  <p className="text-xs font-bold text-white line-clamp-2">
                    {room.currentSong.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    {room.currentSong.channel}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma música no palco. Escolha uma música para todos assistirem juntos!
                </p>
              )}

              <button
                onClick={onShareSongClick}
                className="mt-3 w-full py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-semibold transition"
              >
                + Compartilhar Música na Sala
              </button>
            </div>
          </div>
        ) : (
          /* Chat Tab */
          <div className="h-full flex flex-col justify-between">
            <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  Chat da sala livre. Envie palmas, comente as músicas ou mande reações!
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="flex items-start gap-2 text-xs">
                    <img
                      src={msg.userAvatar}
                      alt={msg.userName}
                      className="w-6 h-6 rounded-full bg-slate-800 shrink-0 mt-0.5"
                    />
                    <div className="flex-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-slate-200 text-[11px]">{msg.userName}</span>
                        <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                      </div>
                      <p className={`text-xs ${msg.type === 'applause' ? 'text-amber-300 font-bold' : 'text-slate-300'}`}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick reaction & Input */}
            <div className="pt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <button
                  onClick={handleSendApplause}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 transition"
                >
                  👏 Palmas!
                </button>
                <button
                  onClick={() => socketService.sendChatMessage('🔥 Arrebentou!! Que voz!', 'chat')}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-pink-500/20 text-slate-300 hover:text-pink-300 border border-slate-700/60 transition"
                >
                  🔥 Show!
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Mensagem..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-1.5 p-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Bar (Discord Profile) */}
      {user && (
        <div className="p-2.5 bg-[#0d1017] border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full bg-slate-800 object-cover"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            title="Desconectar da Sala"
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
