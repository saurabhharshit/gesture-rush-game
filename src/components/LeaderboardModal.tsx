import React, { useState } from 'react';
import { Award, Flame, Medal, RotateCcw, Trash2, Trophy, X } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  onClearLeaderboard: () => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  onClearLeaderboard,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const filteredEntries = entries.filter((e) => {
    if (selectedFilter === 'ALL') return true;
    return e.trackId === selectedFilter;
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  return (
    <div id="leaderboard-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="leaderboard-card"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-racing text-white uppercase tracking-wide">Hall of Champions</h2>
              <p className="text-xs text-white/50">Local leaderboards & fastest lap records</p>
            </div>
          </div>
          <button
            id="btn-close-leaderboard"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-racing">
          {[
            { id: 'ALL', name: 'All Tracks' },
            { id: 'neo_tokyo', name: 'Neo Tokyo' },
            { id: 'sunset_coast', name: 'Sunset Coast' },
            { id: 'red_rock', name: 'Red Rock' },
            { id: 'glacier_peak', name: 'Glacier Peak' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                selectedFilter === f.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Entries Table */}
        <div className="flex flex-col gap-2 min-h-[220px]">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-white/40 gap-2">
              <Medal className="w-8 h-8 text-white/20" />
              <p className="text-sm">No recorded races yet for this track.</p>
              <p className="text-xs text-white/40">Complete a race to register your top score!</p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const isPodium = index < 3;
              const podiumColor = index === 0 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                                  index === 1 ? 'text-slate-300 border-slate-400/40 bg-slate-500/10' :
                                  index === 2 ? 'text-amber-600 border-amber-700/40 bg-amber-700/10' :
                                  'text-white/40 border-white/10 bg-white/5';

              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isPodium ? 'bg-white/5' : 'bg-black/40'
                  } border-white/10`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-racing font-bold text-sm border ${podiumColor}`}>
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-racing text-sm">
                          {entry.playerName}
                        </span>
                        <span className="text-[11px] text-cyan-400 font-tech">
                          {entry.carName}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40">
                        {entry.trackName} • {entry.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black font-racing text-amber-400">
                      {entry.score.toLocaleString()} PTS
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      Time: {formatTime(entry.totalTime)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            id="btn-clear-leaderboard"
            onClick={onClearLeaderboard}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Records
          </button>

          <button
            id="btn-close-leaderboard-footer"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-racing font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
