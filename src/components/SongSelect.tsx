import React, { useState, useMemo } from 'react';
import { SongMetadata, GameSettings, DifficultyLevel } from '../types/game';
import { audioEngine } from '../utils/audioEngine';
import {
  Play,
  Sliders,
  Flame,
  Zap,
  Smartphone,
  Keyboard as KeyboardIcon,
  Search,
  Music2,
  Clock,
  Skull,
} from 'lucide-react';

interface SongSelectProps {
  songs: SongMetadata[];
  selectedSong: SongMetadata;
  settings: GameSettings;
  highScores: Record<string, number>;
  onSelectSong: (song: SongMetadata) => void;
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const SongSelect: React.FC<SongSelectProps> = ({
  songs,
  selectedSong,
  settings,
  highScores,
  onSelectSong,
  onStartGame,
  onOpenSettings,
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | DifficultyLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter songs based on difficulty and search query
  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      const matchDiff = difficultyFilter === 'ALL' || s.difficulty === difficultyFilter;
      const matchSearch =
        searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDiff && matchSearch;
    });
  }, [songs, difficultyFilter, searchQuery]);

  const handleSongClick = (song: SongMetadata) => {
    onSelectSong(song);
    audioEngine.init();
    audioEngine.playHitSound(1, 'PERFECT');
  };

  const getDifficultyBadge = (diff: DifficultyLevel) => {
    switch (diff) {
      case 'Master':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.4)] animate-pulse">
            <Skull className="w-3 h-3 text-rose-400" /> MASTER
          </span>
        );
      case 'Expert':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-fuchsia-500/25 text-fuchsia-300 border border-fuchsia-500/40">
            <Flame className="w-3 h-3 text-fuchsia-400" /> EXPERT
          </span>
        );
      case 'Hard':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40">
            <Zap className="w-3 h-3 text-amber-400" /> HARD
          </span>
        );
      case 'Normal':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            NORMAL
          </span>
        );
      case 'Easy':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            EASY
          </span>
        );
    }
  };

  const difficultyCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: songs.length };
    songs.forEach((s) => {
      counts[s.difficulty] = (counts[s.difficulty] || 0) + 1;
    });
    return counts;
  }, [songs]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-3 sm:p-5 max-w-xl mx-auto text-slate-200 select-none overflow-hidden">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between pt-1 pb-2 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">⚡</span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5 font-mono italic">
              BEAT <span className="text-amber-400">ARCADE</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">3D Perspective 4-Lane Rhythm Experience · 13 Tracks</p>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shadow-lg cursor-pointer"
          aria-label="Settings"
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold hidden sm:inline">설정</span>
        </button>
      </header>

      {/* Control Modes Indicator Banner */}
      <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-[11px]">화면 터치 지원</div>
            <div className="text-[10px] text-slate-400">화면 4분할 레인 직접 터치</div>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800" />

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-left group hover:bg-slate-800/50 p-1 -m-1 rounded-xl transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <KeyboardIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5 text-[11px]">
              <span>키보드 조작</span>
              <span className="text-[10px] text-amber-400 font-semibold group-hover:underline">
                [변경]
              </span>
            </div>
            <div className="text-[10px] text-amber-300 font-mono font-bold">
              {settings.keyLabels.join(' · ')}
            </div>
          </div>
        </button>
      </div>

      {/* Difficulty Filter Tabs */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 mb-2 shrink-0 scrollbar-none">
        {(['ALL', 'Master', 'Expert', 'Hard', 'Normal', 'Easy'] as const).map((diff) => {
          const isActive = difficultyFilter === diff;
          const count = difficultyCounts[diff] || 0;

          return (
            <button
              key={diff}
              onClick={() => setDifficultyFilter(diff)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer border ${
                isActive
                  ? diff === 'Master'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)] font-black'
                    : diff === 'Expert'
                    ? 'bg-fuchsia-500 text-white border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.5)] font-black'
                    : 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{diff === 'ALL' ? '전체' : diff}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Song List Scroll Container */}
      <div className="w-full flex-1 flex flex-col space-y-2.5 overflow-y-auto pr-1 my-1">
        {filteredSongs.map((song) => {
          const isSelected = song.id === selectedSong.id;
          const highScore = highScores[song.id] || 0;

          return (
            <div
              key={song.id}
              onClick={() => handleSongClick(song)}
              className={`relative p-3.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
                isSelected
                  ? 'bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/60 scale-[1.01]'
                  : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Color avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0"
                    style={{
                      backgroundColor: `${song.colorTheme}25`,
                      border: `2px solid ${song.colorTheme}`,
                    }}
                  >
                    <span>
                      {song.difficulty === 'Master'
                        ? '💀'
                        : song.difficulty === 'Expert'
                        ? '🔥'
                        : song.difficulty === 'Hard'
                        ? '⚡'
                        : song.difficulty === 'Normal'
                        ? '😎'
                        : '😊'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {song.title}
                      </h3>
                      {getDifficultyBadge(song.difficulty)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="truncate max-w-[120px]">{song.artist}</span>
                      <span>·</span>
                      <span className="font-mono text-cyan-300 font-semibold">{song.bpm} BPM</span>
                      <span>·</span>
                      <span className="font-mono text-amber-300">{song.notes.length} Notes</span>
                    </div>
                  </div>
                </div>

                {/* High score */}
                <div className="text-right shrink-0">
                  <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono">
                    HIGH SCORE
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-300 font-mono">
                    {highScore > 0 ? highScore.toLocaleString() : '---'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Song Preview & Start Section */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 mt-2 shadow-2xl shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">SELECTED TRACK</div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">{selectedSong.title}</span>
              {getDifficultyBadge(selectedSong.difficulty)}
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-[10px] text-slate-400">TOTAL NOTES</div>
            <div className="text-sm font-bold text-amber-400">{selectedSong.notes.length}</div>
          </div>
        </div>

        <button
          onClick={onStartGame}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all active:scale-[0.98] cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>게임 시작 (GAME START)</span>
        </button>
      </div>
    </div>
  );
};
