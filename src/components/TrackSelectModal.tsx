import React from 'react';
import { Flag, Gauge, MapPin, Sparkles, Trophy, X } from 'lucide-react';
import { TrackData } from '../types';
import { TRACKS } from '../engine/trackData';

interface TrackSelectModalProps {
  selectedTrack: TrackData;
  onSelectTrack: (track: TrackData) => void;
  onClose: () => void;
}

export const TrackSelectModal: React.FC<TrackSelectModalProps> = ({
  selectedTrack,
  onSelectTrack,
  onClose,
}) => {
  const getDifficultyColor = (diff: TrackData['difficulty']) => {
    switch (diff) {
      case 'EASY':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'HARD':
        return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'EXTREME':
        return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    }
  };

  return (
    <div id="track-select-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="track-select-card"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-racing text-white uppercase tracking-wide">Select Race Circuit</h2>
              <p className="text-xs text-white/50">Choose your circuit environment & difficulty</p>
            </div>
          </div>
          <button
            id="btn-close-track-select"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Track Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TRACKS.map((track) => {
            const isSelected = selectedTrack.id === track.id;
            return (
              <div
                key={track.id}
                id={`track-card-${track.id}`}
                onClick={() => onSelectTrack(track)}
                className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col gap-3 relative overflow-hidden ${
                  isSelected
                    ? 'bg-black/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                    : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                {/* Circuit Accent Light */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: track.primaryColor }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold font-racing text-white group-hover:text-cyan-300 transition-colors">
                      {track.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{track.location}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border font-mono ${getDifficultyColor(track.difficulty)}`}>
                    {track.difficulty}
                  </span>
                </div>

                <p className="text-xs text-white/60 line-clamp-2">
                  {track.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-white/50 font-tech">
                  <div className="flex items-center gap-1">
                    <Flag className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{track.laps} LAPS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{track.lengthSegments * 0.2} KM</span>
                  </div>
                  {isSelected && (
                    <span className="text-cyan-400 font-bold text-[11px] font-racing">SELECTED</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            id="btn-confirm-track"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-racing text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            Confirm Circuit
          </button>
        </div>
      </div>
    </div>
  );
};
