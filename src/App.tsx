import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MicRack } from './components/MicRack';
import { SearchBar } from './components/SearchBar';
import { KaraokePlayer } from './components/KaraokePlayer';
import { PopularList } from './components/PopularList';
import { EffectsPanel } from './components/EffectsPanel';
import { AddInputModal } from './components/AddInputModal';
import { SpeakerModal } from './components/SpeakerModal';
import { DiscoBall } from './components/DiscoBall';
import { RoomsModal } from './components/RoomsModal';
import { RoomSidebar } from './components/RoomSidebar';
import { GoogleLoginModal } from './components/GoogleLoginModal';
import { PlaylistDrawer } from './components/PlaylistDrawer';
import { RelatedSuggestions } from './components/RelatedSuggestions';
import { useAuth } from './context/AuthContext';
import { socketService } from './services/socketService';
import { AudioEngine } from './audio/AudioEngine';
import type { ConnectedMicInfo, EffectPresetId, EffectSettings, VideoItem } from './audio/types';
import type { Room } from './types/room';
import { extractPaletteFromImage, type VideoPalette } from './utils/colorExtractor';

export function App() {
  const { user, isAuthModalOpen, closeAuthModal, openAuthModal } = useAuth();
  const [mics, setMics] = useState<ConnectedMicInfo[]>([]);
  const [selectedMicForEffects, setSelectedMicForEffects] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<VideoItem | null>(null);
  const [videoPalette, setVideoPalette] = useState<VideoPalette | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddInputModalOpen, setIsAddInputModalOpen] = useState(false);
  const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  
  // Online Room State (Discord Style)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [syncEvent, setSyncEvent] = useState<{ 
    action: string; 
    currentTime?: number; 
    isPlaying?: boolean; 
    timestamp: number;
    sentAt?: number;
    serverTime?: number;
  } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const lastSyncMessageTimeRef = useRef<number>(0);

  // Playlist & Queue state (Synced in room, persistent in local mode)
  const [localPlaylist, setLocalPlaylist] = useState<VideoItem[]>(() => {
    try {
      const saved = localStorage.getItem('pampo_karaoke_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const activePlaylist = currentRoom ? (currentRoom.playlist || []) : localPlaylist;
  
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStudioMode, setIsStudioMode] = useState(false);

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Extract dynamic color palette from currently playing video (for Ambilight & Stage Lighting)
  useEffect(() => {
    if (!currentSong) {
      setVideoPalette(null);
      return;
    }

    let isSubscribed = true;
    extractPaletteFromImage(currentSong.thumbnail, currentSong.title + currentSong.id).then(palette => {
      if (isSubscribed) {
        setVideoPalette(palette);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [currentSong?.id, currentSong?.thumbnail]);

  // Connect socket and handle synchronized events
  useEffect(() => {
    const socket = socketService.connect();

    const handleRoomUpdated = (updatedRoom: Room) => {
      setCurrentRoom(prev => {
        if (!prev || prev.id !== updatedRoom.id) return prev;
        return updatedRoom;
      });
    };

    const handleSyncVideo = ({ 
      action, 
      song, 
      currentTime, 
      isPlaying,
      sentAt,
      serverTime,
    }: { 
      action: string; 
      song: VideoItem | null; 
      currentTime?: number; 
      isPlaying?: boolean; 
      user?: unknown;
      sentAt?: number;
      serverTime?: number;
    }) => {
      if (action === 'change_song') {
        setCurrentSong(song);
        if (song) {
          setIsVideoPlaying(true);
        }
      } else {
        if (action === 'play') setIsVideoPlaying(true);
        if (action === 'pause') setIsVideoPlaying(false);
        setSyncEvent({
          action,
          currentTime,
          isPlaying,
          timestamp: Date.now(),
          sentAt: sentAt || Date.now(),
          serverTime: serverTime || Date.now(),
        });
      }
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('sync_video_action', handleSyncVideo);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('sync_video_action', handleSyncVideo);
    };
  }, []);

  // Voice activity detection (Discord green talking indicator)
  useEffect(() => {
    if (!currentRoom || mics.length === 0) return;

    let animId: number;
    let wasSpeaking = false;
    const engine = AudioEngine.getInstance();

    const checkVoice = () => {
      let maxLevel = 0;
      mics.forEach(m => {
        const lvl = engine.getMicLevel(m.id);
        if (lvl > maxLevel) maxLevel = lvl;
      });

      const isSpeaking = maxLevel > 14;
      if (isSpeaking !== wasSpeaking) {
        wasSpeaking = isSpeaking;
        socketService.reportVoiceActivity(isSpeaking);
      }

      animId = requestAnimationFrame(checkVoice);
    };

    animId = requestAnimationFrame(checkVoice);
    return () => cancelAnimationFrame(animId);
  }, [currentRoom, mics]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Global hotkey 'P' to toggle playlist
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setIsPlaylistOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Microphone management
  const handleAddMic = async (deviceId: string, label: string) => {
    const engine = AudioEngine.getInstance();
    try {
      const newMic = await engine.addMicrophone(deviceId, label);
      setMics(prev => [...prev, newMic]);
      if (!selectedMicForEffects) {
        setSelectedMicForEffects(newMic.id);
      }

      // If we are in an online room, stream our processed voice (with effects!) to peers
      if (currentRoom) {
        const processedStream = engine.getProcessedOutputStream();
        socketService.setLocalStream(processedStream);
      }
    } catch (err) {
      console.error('Failed to add microphone:', err);
      alert('Não foi possível conectar o microfone. Verifique se o microfone está conectado e se deu permissão ao navegador.');
    }
  };

  const handleRemoveMic = (id: string) => {
    const engine = AudioEngine.getInstance();
    engine.removeMicrophone(id);
    setMics(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (selectedMicForEffects === id) {
        setSelectedMicForEffects(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleVolumeChange = (id: string, volume: number) => {
    const engine = AudioEngine.getInstance();
    engine.setMicVolume(id, volume);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, volume } : m)));
  };

  const handleMonitorToggle = (id: string, monitor: boolean) => {
    const engine = AudioEngine.getInstance();
    engine.setMicMonitor(id, monitor);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, monitorVoice: monitor } : m)));
  };

  const handleMuteToggle = (id: string, muted: boolean) => {
    const engine = AudioEngine.getInstance();
    engine.setMicMute(id, muted);
    setMics(prev => prev.map(m => (m.id === id ? { ...m, muted } : m)));
  };

  // Master volume
  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    AudioEngine.getInstance().setMasterVolume(vol);
  };

  // Effects
  const handleApplyPreset = (micId: string, preset: EffectPresetId) => {
    const engine = AudioEngine.getInstance();
    engine.applyPreset(micId, preset);
    setMics(engine.getAllMics());
  };

  const handleUpdateEffectSettings = (micId: string, settings: Partial<EffectSettings>) => {
    const engine = AudioEngine.getInstance();
    engine.updateEffectSettings(micId, settings);
    setMics(engine.getAllMics());
  };

  // Song Selection (supports Watch Together in rooms!)
  const handleSelectSong = (song: VideoItem) => {
    setCurrentSong(song);
    setIsVideoPlaying(true);

    // If inside a room, broadcast song to everyone in the room!
    if (currentRoom) {
      socketService.syncVideoAction(currentRoom.id, 'change_song', song, 0, true, user || undefined);
      socketService.sendChatMessage(`🎶 Compartilhou a música: "${song.title}"`, 'song_change');
    }
  };

  const handleSearchAlternative = (title: string) => {
    setCurrentSong(null);
    setSearchQuery(title);
    if (currentRoom) {
      socketService.syncVideoAction(currentRoom.id, 'change_song', null, 0, false, user || undefined);
    }
  };

  // Playlist & Queue Management
  const handleAddToPlaylist = (song: VideoItem) => {
    if (currentRoom) {
      socketService.addToPlaylist(song, user || undefined);
    } else {
      if (!currentSong) {
        handleSelectSong(song);
      } else {
        setLocalPlaylist(prev => {
          const item: VideoItem = {
            ...song,
            queueId: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            addedBy: user?.name || 'Você',
          };
          const updated = [...prev, item];
          try {
            localStorage.setItem('pampo_karaoke_playlist', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    }
  };

  const handleRemoveFromPlaylist = (queueId?: string, index?: number) => {
    if (currentRoom) {
      socketService.removeFromPlaylist(queueId, index);
    } else {
      setLocalPlaylist(prev => {
        let updated: VideoItem[];
        if (queueId) {
          updated = prev.filter(item => item.queueId !== queueId);
        } else if (typeof index === 'number') {
          updated = [...prev];
          updated.splice(index, 1);
        } else {
          updated = prev;
        }
        try {
          localStorage.setItem('pampo_karaoke_playlist', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
  };

  const handleReorderPlaylist = (fromIndex: number, toIndex: number) => {
    if (currentRoom) {
      socketService.reorderPlaylist(fromIndex, toIndex);
    } else {
      setLocalPlaylist(prev => {
        if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
          return prev;
        }
        const updated = [...prev];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        try {
          localStorage.setItem('pampo_karaoke_playlist', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
    }
  };

  const handleClearPlaylist = () => {
    if (currentRoom) {
      socketService.clearPlaylist();
    } else {
      setLocalPlaylist([]);
      try {
        localStorage.removeItem('pampo_karaoke_playlist');
      } catch (e) {}
    }
  };

  const handlePlayNextSong = () => {
    if (currentRoom) {
      socketService.playNextSong(user || undefined);
    } else {
      if (localPlaylist.length > 0) {
        const nextSong = localPlaylist[0];
        const rest = localPlaylist.slice(1);
        setLocalPlaylist(rest);
        try {
          localStorage.setItem('pampo_karaoke_playlist', JSON.stringify(rest));
        } catch (e) {}
        handleSelectSong(nextSong);
      } else {
        setCurrentSong(null);
      }
    }
  };

  const handlePlaySongFromPlaylist = (song: VideoItem) => {
    if (currentRoom) {
      socketService.syncVideoAction(currentRoom.id, 'change_song', song, 0, true, user || undefined);
      socketService.removeFromPlaylist(song.queueId);
    } else {
      setLocalPlaylist(prev => {
        const updated = prev.filter(item => item.queueId !== song.queueId && item.id !== song.id);
        try {
          localStorage.setItem('pampo_karaoke_playlist', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      handleSelectSong(song);
    }
  };

  const handleSongEnded = () => {
    handlePlayNextSong();
  };

  const handleBroadcastSync = (action: 'play' | 'pause' | 'seek' | 'heartbeat', currentTime?: number, isPlaying?: boolean) => {
    if (action === 'play') setIsVideoPlaying(true);
    if (action === 'pause') setIsVideoPlaying(false);

    if (!currentRoom) return;
    socketService.syncVideoAction(currentRoom.id, action, currentSong, currentTime, isPlaying, user || undefined, Date.now());
    
    // Only send chat feedback on manual actions, never on automatic equalizing heartbeats
    if (action !== 'heartbeat') {
      const now = Date.now();
      if (now - lastSyncMessageTimeRef.current > 3000) {
        lastSyncMessageTimeRef.current = now;
        const actionLabel = action === 'play'
          ? '▶ Deu play no vídeo'
          : action === 'pause'
            ? '⏸ Pausou o vídeo'
            : `⏩ Sincronizou vídeo em ${Math.floor(currentTime || 0)}s`;
        socketService.sendChatMessage(actionLabel, 'system');
      }
    }
  };

  // Room Joined
  const handleRoomJoined = (room: Room) => {
    setCurrentRoom(room);
    if (room.currentSong) {
      setCurrentSong(room.currentSong);
      setIsVideoPlaying(room.isPlaying !== false);
      if (room.currentTime) {
        setSyncEvent({
          action: 'seek',
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          timestamp: Date.now(),
        });
      }
    }
    // Stream mic audio to room
    const engine = AudioEngine.getInstance();
    const stream = engine.getProcessedOutputStream();
    socketService.setLocalStream(stream);
  };

  const handleLeaveRoom = () => {
    socketService.leaveCurrentRoom();
    setCurrentRoom(null);
  };

  return (
    <div className="relative min-h-screen retro-80s-bg text-slate-100 flex flex-col justify-between selection:bg-pink-500 selection:text-slate-950 overflow-x-hidden">
      {/* 80s Disco Ball with Sweeping Light Beams & Concert Beat Flashes */}
      <DiscoBall 
        isPlaying={isVideoPlaying && !!currentSong} 
        videoPalette={videoPalette}
      />

      {/* Retro 80s Perspective Floor Grid */}
      <div className="retro-perspective-grid" />

      {/* Header (Hidden in Studio Mode to maximize stage view as requested) */}
      {(!isStudioMode || !currentSong) && (
        <Header
          onOpenAddInput={() => setIsAddInputModalOpen(true)}
          onOpenSpeakerModal={() => setIsSpeakerModalOpen(true)}
          onOpenRoomsModal={() => {
            if (!user) {
              openAuthModal();
            } else {
              setIsRoomsModalOpen(true);
            }
          }}
          onOpenPlaylist={() => setIsPlaylistOpen(prev => !prev)}
          isPlaylistOpen={isPlaylistOpen}
          playlistCount={activePlaylist.length}
          connectedMicCount={mics.length}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          isInRoom={!!currentRoom}
          roomName={currentRoom?.name}
        />
      )}

      {/* Discord-style Room Sidebar on the Left (When in Room) */}
      {currentRoom && (
        <RoomSidebar
          room={currentRoom}
          onLeaveRoom={handleLeaveRoom}
          onShareSongClick={() => setCurrentSong(null)}
        />
      )}

      {/* Main Content Area (shifted right if in room, with dynamic video ambilight in studio mode) */}
      <main 
        className={`relative z-10 flex-1 flex flex-col items-center justify-start w-full mx-auto px-2 sm:px-4 py-2 transition-all duration-300 ease-out ${
          isStudioMode && currentSong ? 'max-w-[99vw] md:px-4' : 'max-w-7xl'
        } ${
          currentRoom ? 'md:pl-80' : ''
        }`}
        style={
          isStudioMode && videoPalette ? {
            background: `radial-gradient(ellipse at 50% 35%, rgba(${videoPalette.primary[0]}, ${videoPalette.primary[1]}, ${videoPalette.primary[2]}, 0.14) 0%, rgba(${videoPalette.secondary[0]}, ${videoPalette.secondary[1]}, ${videoPalette.secondary[2]}, 0.07) 55%, transparent 80%)`,
          } : undefined
        }
      >
        {/* Microphone Rack (Visible in normal mode or when no song is playing) */}
        {(!isStudioMode || !currentSong) && (
          <MicRack
            mics={mics}
            onVolumeChange={handleVolumeChange}
            onMonitorToggle={handleMonitorToggle}
            onMuteToggle={handleMuteToggle}
            onSelectForEffects={id => setSelectedMicForEffects(id)}
            onRemove={handleRemoveMic}
            onOpenAddModal={() => setIsAddInputModalOpen(true)}
            activeEffectMicId={selectedMicForEffects}
          />
        )}

        {/* Dynamic Center Section: Search or Video Player */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-1">
          {currentSong ? (
            <div className="w-full flex flex-col items-center gap-2">
              {/* Compact Search Bar above video to easily change songs (only in normal mode) */}
              {!isStudioMode && (
                <div className="w-full max-w-4xl transition-all duration-300">
                  <SearchBar 
                    onSelectSong={handleSelectSong} 
                    onAddToPlaylist={handleAddToPlaylist}
                    isCompact 
                  />
                </div>
              )}

              {/* Stage Layout: In Normal Mode, 2-column grid with Suggestions in the right column */}
              {!isStudioMode ? (
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start max-w-7xl">
                  {/* Main Video Player */}
                  <div className={`w-full flex flex-col gap-2 transition-all duration-300 ${
                    isPlaylistOpen ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-8 xl:col-span-8'
                  }`}>
                    <KaraokePlayer
                      currentSong={currentSong}
                      onChangeSong={() => {
                        setCurrentSong(null);
                        if (currentRoom) {
                          socketService.syncVideoAction(currentRoom.id, 'change_song', null, 0, false, user || undefined);
                          socketService.sendChatMessage('⏹ Removeu a música atual', 'system');
                        }
                      }}
                      onSearchAlternative={handleSearchAlternative}
                      onAutoSwitchSong={handleSelectSong}
                      isStudioMode={isStudioMode}
                      onToggleStudioMode={() => setIsStudioMode(prev => !prev)}
                      currentRoom={currentRoom}
                      videoPalette={videoPalette}
                      syncEvent={syncEvent}
                      onBroadcastSync={handleBroadcastSync}
                      playlistCount={activePlaylist.length}
                      isPlaylistOpen={isPlaylistOpen}
                      onOpenPlaylist={() => setIsPlaylistOpen(prev => !prev)}
                      onPlayNextSong={handlePlayNextSong}
                      onSongEnded={handleSongEnded}
                    />
                  </div>

                  {/* Right Column: Playlist (when open) + Suggestions */}
                  <div className={`w-full flex flex-col gap-4 transition-all duration-300 ${
                    isPlaylistOpen ? 'lg:col-span-5 xl:col-span-4' : 'lg:col-span-4 xl:col-span-4'
                  }`}>
                    {isPlaylistOpen && (
                      <PlaylistDrawer
                        isOpen={isPlaylistOpen}
                        onClose={() => setIsPlaylistOpen(false)}
                        onToggle={() => setIsPlaylistOpen(prev => !prev)}
                        playlist={activePlaylist}
                        currentSong={currentSong}
                        onPlaySong={handlePlaySongFromPlaylist}
                        onPlayNextSong={handlePlayNextSong}
                        onRemoveFromPlaylist={handleRemoveFromPlaylist}
                        onReorderPlaylist={handleReorderPlaylist}
                        onClearPlaylist={handleClearPlaylist}
                        onAddSong={handleAddToPlaylist}
                        isInRoom={!!currentRoom}
                      />
                    )}

                    <RelatedSuggestions
                      currentSong={currentSong}
                      playlist={activePlaylist}
                      onSelectSong={handleSelectSong}
                      onAddToPlaylist={handleAddToPlaylist}
                    />
                  </div>
                </div>
              ) : (
                /* Studio Mode: Full stage width; if playlist is open, sits docked side-by-side on the right */
                <div className="w-full flex flex-col lg:flex-row gap-5 items-start transition-all duration-300 ease-out">
                  <div className="flex-1 min-w-0 w-full transition-all duration-300">
                    <KaraokePlayer
                      currentSong={currentSong}
                      onChangeSong={() => {
                        setCurrentSong(null);
                        if (currentRoom) {
                          socketService.syncVideoAction(currentRoom.id, 'change_song', null, 0, false, user || undefined);
                          socketService.sendChatMessage('⏹ Removeu a música atual', 'system');
                        }
                      }}
                      onSearchAlternative={handleSearchAlternative}
                      onAutoSwitchSong={handleSelectSong}
                      isStudioMode={isStudioMode}
                      onToggleStudioMode={() => setIsStudioMode(prev => !prev)}
                      currentRoom={currentRoom}
                      videoPalette={videoPalette}
                      syncEvent={syncEvent}
                      onBroadcastSync={handleBroadcastSync}
                      playlistCount={activePlaylist.length}
                      isPlaylistOpen={isPlaylistOpen}
                      onOpenPlaylist={() => setIsPlaylistOpen(prev => !prev)}
                      onPlayNextSong={handlePlayNextSong}
                      onSongEnded={handleSongEnded}
                    />
                  </div>

                  {isPlaylistOpen && (
                    <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 animate-fadeIn">
                      <PlaylistDrawer
                        isOpen={isPlaylistOpen}
                        onClose={() => setIsPlaylistOpen(false)}
                        onToggle={() => setIsPlaylistOpen(prev => !prev)}
                        playlist={activePlaylist}
                        currentSong={currentSong}
                        onPlaySong={handlePlaySongFromPlaylist}
                        onPlayNextSong={handlePlayNextSong}
                        onRemoveFromPlaylist={handleRemoveFromPlaylist}
                        onReorderPlaylist={handleReorderPlaylist}
                        onClearPlaylist={handleClearPlaylist}
                        onAddSong={handleAddToPlaylist}
                        isInRoom={!!currentRoom}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-6 md:py-8">
              {/* If Playlist is open without a song playing, display it nicely above search */}
              {isPlaylistOpen && (
                <div className="w-full max-w-3xl mx-auto mb-6 animate-fadeIn">
                  <PlaylistDrawer
                    isOpen={isPlaylistOpen}
                    onClose={() => setIsPlaylistOpen(false)}
                    onToggle={() => setIsPlaylistOpen(prev => !prev)}
                    playlist={activePlaylist}
                    currentSong={currentSong}
                    onPlaySong={handlePlaySongFromPlaylist}
                    onPlayNextSong={handlePlayNextSong}
                    onRemoveFromPlaylist={handleRemoveFromPlaylist}
                    onReorderPlaylist={handleReorderPlaylist}
                    onClearPlaylist={handleClearPlaylist}
                    onAddSong={handleAddToPlaylist}
                    isInRoom={!!currentRoom}
                  />
                </div>
              )}

              {/* Central Google-style Search Bar with 80s Retro Glow */}
              <div className="text-center mb-6">
                <div className="inline-block relative">
                  <h2 className="text-3xl md:text-5xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                    Pampo Karaokê
                  </h2>
                  <span className="block text-[11px] font-bold tracking-[0.3em] uppercase text-cyan-400/90 mt-1">
                    ★ DISCO & VINTAGE STAGE ★
                  </span>
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-2">
                  {currentRoom
                    ? `Você está na sala "${currentRoom.name}". Escolha uma música para todos assistirem juntos!`
                    : 'Pesquise seu hit favorito ou cole o link do YouTube para soltar a voz'}
                </p>
              </div>

              <SearchBar 
                onSelectSong={handleSelectSong} 
                onAddToPlaylist={handleAddToPlaylist}
                initialQuery={searchQuery}
              />

              {/* Quick Picks / Popular Karaoke Songs */}
              <PopularList 
                onSelectSong={handleSelectSong} 
                onAddToPlaylist={handleAddToPlaylist}
              />
            </div>
          )}
        </div>
      </main>

      {/* Effects Panel at the bottom */}
      <div className={`relative z-10 transition-all duration-300 ease-out ${currentRoom ? 'md:pl-80' : ''}`}>
        <EffectsPanel
          mics={mics}
          selectedMicId={selectedMicForEffects}
          onSelectMic={id => setSelectedMicForEffects(id)}
          onApplyPreset={handleApplyPreset}
          onUpdateSettings={handleUpdateEffectSettings}
        />
      </div>

      {/* Modals */}
      <AddInputModal
        isOpen={isAddInputModalOpen}
        onClose={() => setIsAddInputModalOpen(false)}
        onMicAdded={handleAddMic}
      />

      <SpeakerModal
        isOpen={isSpeakerModalOpen}
        onClose={() => setIsSpeakerModalOpen(false)}
        masterVolume={masterVolume}
        onMasterVolumeChange={handleMasterVolumeChange}
      />

      <RoomsModal
        isOpen={isRoomsModalOpen}
        onClose={() => setIsRoomsModalOpen(false)}
        onRoomJoined={handleRoomJoined}
      />

      <GoogleLoginModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
    </div>
  );
}

export default App;
