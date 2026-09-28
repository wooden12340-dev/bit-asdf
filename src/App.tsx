import React, { useState, useEffect } from 'react';
import { SongMetadata, GameSettings, GameStats } from './types/game';
import { PRESET_SONGS } from './utils/songs';
import { RhythmGame } from './components/RhythmGame';
import { SongSelect } from './components/SongSelect';
import { SettingsModal } from './components/SettingsModal';
import { ResultModal } from './components/ResultModal';
import { audioEngine } from './utils/audioEngine';

const DEFAULT_SETTINGS: GameSettings = {
  scrollSpeed: 1.5,
  audioOffset: 0,
  bgmVolume: 0.7,
  sfxVolume: 0.85,
  keyBindings: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  keyLabels: ['D', 'F', 'J', 'K'],
};

export default function App() {
  const [gameState, setGameState] = useState<'SELECT' | 'PLAYING' | 'RESULT'>('SELECT');
  const [selectedSong, setSelectedSong] = useState<SongMetadata>(PRESET_SONGS[0]);
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('beatsmiles_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('beatsmiles_highscores');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Save settings on update
  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('beatsmiles_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  // Start game
  const handleStartGame = () => {
    audioEngine.init();
    setGameState('PLAYING');
  };

  // Exit game back to song select
  const handleExitGame = () => {
    audioEngine.stopBgm();
    setGameState('SELECT');
  };

  // Finish game
  const handleFinishGame = (stats: GameStats) => {
    setLastStats(stats);
    setGameState('RESULT');

    // Update high scores
    const currentHigh = highScores[selectedSong.id] || 0;
    if (stats.score > currentHigh) {
      const updated = { ...highScores, [selectedSong.id]: stats.score };
      setHighScores(updated);
      try {
        localStorage.setItem('beatsmiles_highscores', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden font-sans">
      {gameState === 'SELECT' && (
        <SongSelect
          songs={PRESET_SONGS}
          selectedSong={selectedSong}
          settings={settings}
          highScores={highScores}
          onSelectSong={setSelectedSong}
          onStartGame={handleStartGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {gameState === 'PLAYING' && (
        <RhythmGame
          song={selectedSong}
          settings={settings}
          highScore={highScores[selectedSong.id] || 0}
          onExit={handleExitGame}
          onFinish={handleFinishGame}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {gameState === 'RESULT' && lastStats && (
        <ResultModal
          stats={lastStats}
          song={selectedSong}
          onRetry={() => {
            setGameState('PLAYING');
          }}
          onSongSelect={() => {
            setGameState('SELECT');
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
