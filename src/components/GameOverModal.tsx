import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, Check, Flame, Gauge, Medal, Play, RotateCcw, Trophy, User } from 'lucide-react';
import { CarStats, LeaderboardEntry, TrackData } from '../types';

interface GameOverModalProps {
  position: number;
  totalTime: number;
  bestLap: number;
  score: number;
  track: TrackData;
  car: CarStats;
  onSaveScore: (name: string) => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  position,
  totalTime,
  bestLap,
  score,
  track,
  car,
  onSaveScore,
  onRestart,
  onMainMenu,
}) => {
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('gesturerush_player_name') || 'ApexRacer';
  });
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  useEffect(() => {
    if (position <= 3) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ffffff'],
        });
      } catch {
        // Safe ignore
      }
    }
  }, [position]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || hasSaved) return;
    localStorage.setItem('gesturerush_player_name', playerName.trim());
    onSaveScore(playerName.trim());
    setHasSaved(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const isPodium = position <= 3;

  return (
    <div id="gameover-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div
        id="gameover-modal-card"
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
      >
        {/* Podium / Victory Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className={`p-3 rounded-2xl border shadow-xl ${
            position === 1
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
              : position === 2
              ? 'bg-slate-400/20 text-slate-300 border-slate-400/40 shadow-[0_0_20px_rgba(203,213,225,0.2)]'
              : position === 3
              ? 'bg-amber-700/20 text-amber-500 border-amber-700/40 shadow-[0_0_20px_rgba(180,83,9,0.2)]'
              : 'bg-white/5 text-white/50 border-white/10'
          }`}>
            {position === 1 ? (
              <Trophy className="w-10 h-10 animate-bounce text-amber-400" />
            ) : position <= 3 ? (
              <Medal className="w-10 h-10 text-slate-200" />
            ) : (
              <Award className="w-10 h-10 text-white/50" />
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-racing text-white tracking-tight uppercase">
            {position === 1
              ? 'VICTORY! 1ST PLACE'
              : position === 2
              ? '2ND PLACE PODIUM'
              : position === 3
              ? '3RD PLACE PODIUM'
              : `POSITION #${position} OF 6`}
          </h2>
          <p className="text-xs text-white/50 font-tech">
            {track.name} • {car.name}
          </p>

          {position > 3 && (
            <div className="mt-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 font-tech">
              ⚡ <strong>Racer Tip:</strong> Push your palm forward or point your index finger to unleash Nitro Boost!
            </div>
          )}
        </div>

        {/* Score & Telemetry Breakdown */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">TOTAL SCORE</span>
            <span className="text-xl sm:text-2xl font-black font-racing text-amber-400">
              {score.toLocaleString()} PTS
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">TOTAL TIME</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {formatTime(totalTime)}
            </span>
          </div>

          <div className="flex flex-col pt-2 border-t border-white/10">
            <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">BEST LAP</span>
            <span className="text-sm font-mono font-bold text-cyan-400">
              {formatTime(bestLap)}
            </span>
          </div>

          <div className="flex flex-col pt-2 border-t border-white/10">
            <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">CIRCUIT</span>
            <span className="text-sm font-bold font-racing text-white/80 truncate">
              {track.location}
            </span>
          </div>
        </div>

        {/* Save to Leaderboard Form */}
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <label className="text-xs font-bold text-white/80 flex items-center gap-1.5 font-tech">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            Save Score to Local Leaderboard
          </label>
          <div className="flex gap-2">
            <input
              id="input-player-name"
              type="text"
              maxLength={18}
              value={playerName}
              disabled={hasSaved}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter Racer Name"
              className="flex-1 px-4 py-2 rounded-xl bg-black border border-white/10 text-white font-racing text-sm focus:outline-none focus:border-cyan-400 disabled:opacity-50"
            />
            <button
              id="btn-save-score"
              type="submit"
              disabled={hasSaved || !playerName.trim()}
              className={`px-5 py-2 rounded-xl font-racing font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                hasSaved
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              }`}
            >
              {hasSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            id="btn-restart-race"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-racing font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Race Again
          </button>

          <button
            id="btn-main-menu"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-racing font-bold text-sm border border-white/10 transition-all"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
