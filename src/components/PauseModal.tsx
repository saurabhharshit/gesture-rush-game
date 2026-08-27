import React from 'react';
import { Play, RotateCcw, Sliders, Trophy, X, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onCalibrate: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onCalibrate,
  onRestart,
  onMainMenu,
}) => {
  return (
    <div id="pause-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div
        id="pause-modal-card"
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-5 text-center"
      >
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-black font-racing text-white tracking-wider uppercase">
            RACE PAUSED
          </h2>
          <p className="text-xs text-white/50">Position your hands in camera frame</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            id="btn-resume-race"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-racing font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Race
          </button>

          <button
            id="btn-pause-calibrate"
            onClick={onCalibrate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-racing font-bold text-xs border border-white/10 transition-all"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            Calibrate Gestures
          </button>

          <button
            id="btn-pause-restart"
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-racing font-bold text-xs border border-white/10 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            Restart Race
          </button>

          <button
            id="btn-pause-main-menu"
            onClick={onMainMenu}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black hover:bg-white/5 text-rose-400 font-racing font-bold text-xs border border-white/10 transition-all"
          >
            <Home className="w-4 h-4" />
            Quit to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
