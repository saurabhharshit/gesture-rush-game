import React from 'react';
import { Check, Flame, Hand, RotateCcw, ShieldAlert, Sliders, X, Zap } from 'lucide-react';
import { CalibrationSettings, GestureControls } from '../types';

interface CalibrationModalProps {
  settings: CalibrationSettings;
  controls: GestureControls;
  onUpdateSettings: (newSettings: Partial<CalibrationSettings>) => void;
  onClose: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  settings,
  controls,
  onUpdateSettings,
  onClose,
}) => {
  const handleResetDefaults = () => {
    onUpdateSettings({
      deadzone: 0.08,
      sensitivity: 1.25,
      fistThreshold: 0.62,
      boostThreshold: 0.25,
      invertSteer: false,
      mirrorCamera: true,
      controlMode: 'GESTURE',
    });
  };

  return (
    <div id="calibration-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="calibration-modal-card"
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-racing text-white uppercase tracking-wide">
                Gesture Calibration
              </h2>
              <p className="text-xs text-white/50">
                Calibrate AI gesture responsiveness to your camera and distance
              </p>
            </div>
          </div>
          <button
            id="btn-close-calibration"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Interactive Gesture Feedback Visualizer */}
        <div className="p-4 rounded-xl bg-black/60 border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-cyan-400 font-tech text-[10px]">
              Live Sensor Feedback
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest font-mono ${
              controls.handDetected ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {controls.handDetected ? 'HAND_DETECTED' : 'SEARCHING_HAND'}
            </span>
          </div>

          {/* Steer Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-white/50 font-mono">
              <span>STEER: {Math.round(controls.steer * 100)}%</span>
              <span className="text-cyan-400 uppercase font-racing">{controls.gestureName}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full relative overflow-hidden border border-white/10">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 -translate-x-1/2 z-10" />
              <div
                className="h-full bg-cyan-400 transition-all duration-75"
                style={{
                  width: `${Math.abs(controls.steer) * 50}%`,
                  marginLeft: controls.steer >= 0 ? '50%' : `${50 - Math.abs(controls.steer) * 50}%`,
                }}
              />
            </div>
          </div>

          {/* Fist Ratio (Brake) & Boost Test Meters */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 font-bold text-rose-400">
                  <Hand className="w-3.5 h-3.5" />
                  <span>Fist Brake</span>
                </div>
                <span className="font-mono text-white/60">
                  {Math.round(controls.fistRatio * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    controls.isBraking ? 'bg-rose-500' : 'bg-white/20'
                  }`}
                  style={{ width: `${controls.fistRatio * 100}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1 font-bold text-amber-400">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Boost Trigger</span>
                </div>
                <span className="font-mono text-white/60">
                  {controls.isNitro ? 'ACTIVE' : 'READY'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    controls.isNitro ? 'bg-amber-400' : 'bg-white/20'
                  }`}
                  style={{ width: controls.isNitro ? '100%' : '30%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sliders & Calibration Controls */}
        <div className="flex flex-col gap-4">
          {/* Steering Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-white/80">
              <span>Steering Sensitivity</span>
              <span className="text-cyan-400 font-mono">{settings.sensitivity.toFixed(2)}x</span>
            </div>
            <input
              id="slider-sensitivity"
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={settings.sensitivity}
              onChange={(e) => onUpdateSettings({ sensitivity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-white/10 rounded-lg cursor-pointer h-2"
            />
            <span className="text-[10px] text-white/40">
              Higher values make small hand movements produce sharper turns.
            </span>
          </div>

          {/* Steering Deadzone (Anti-Jitter) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-white/80">
              <span>Center Deadzone (Anti-Jitter)</span>
              <span className="text-cyan-400 font-mono">{Math.round(settings.deadzone * 100)}%</span>
            </div>
            <input
              id="slider-deadzone"
              type="range"
              min="0.02"
              max="0.25"
              step="0.01"
              value={settings.deadzone}
              onChange={(e) => onUpdateSettings({ deadzone: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-white/10 rounded-lg cursor-pointer h-2"
            />
            <span className="text-[10px] text-white/40">
              Prevents involuntary hand twitches while driving straight down roads.
            </span>
          </div>

          {/* Fist Brake Threshold */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-white/80">
              <span>Fist Brake Sensitivity</span>
              <span className="text-rose-400 font-mono">{Math.round(settings.fistThreshold * 100)}%</span>
            </div>
            <input
              id="slider-fist-threshold"
              type="range"
              min="0.4"
              max="0.85"
              step="0.02"
              value={settings.fistThreshold}
              onChange={(e) => onUpdateSettings({ fistThreshold: parseFloat(e.target.value) })}
              className="w-full accent-rose-500 bg-white/10 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Forward Push Boost Threshold */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-bold text-white/80">
              <span>Forward Push Boost Distance</span>
              <span className="text-amber-400 font-mono">{Math.round(settings.boostThreshold * 100)}%</span>
            </div>
            <input
              id="slider-boost-threshold"
              type="range"
              min="0.30"
              max="0.65"
              step="0.02"
              value={settings.boostThreshold}
              onChange={(e) => onUpdateSettings({ boostThreshold: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 bg-white/10 rounded-lg cursor-pointer h-2"
            />
            <span className="text-[10px] text-white/40">
              Move open palm close towards camera OR point index finger to trigger Nitro. Open palm at normal distance drives normally.
            </span>
          </div>

          {/* Toggles: Mirror Camera & Invert Steer */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-cyan-500/40 transition-colors">
              <input
                id="toggle-mirror-camera"
                type="checkbox"
                checked={settings.mirrorCamera}
                onChange={(e) => onUpdateSettings({ mirrorCamera: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-xs font-medium text-white/80">Mirror Camera View</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-cyan-500/40 transition-colors">
              <input
                id="toggle-invert-steer"
                type="checkbox"
                checked={settings.invertSteer}
                onChange={(e) => onUpdateSettings({ invertSteer: e.target.checked })}
                className="w-4 h-4 rounded accent-cyan-500"
              />
              <span className="text-xs font-medium text-white/80">Invert Steering</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            id="btn-reset-calibration"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <button
            id="btn-save-calibration"
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-racing text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            <Check className="w-4 h-4" />
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
