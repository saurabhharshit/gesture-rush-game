import React from 'react';
import { Flame, Gauge, Pause, Trophy, Volume2, VolumeX, Zap, AlertTriangle } from 'lucide-react';
import { GestureControls } from '../types';

interface RacingHUDProps {
  speedMph: number;
  rpm: number;
  gear: string;
  currentLap: number;
  totalLaps: number;
  lapProgress: number;
  currentLapTime: number;
  bestLapTime: number;
  totalTime: number;
  nitroFuel: number;
  isNitroActive: boolean;
  isDrifting: boolean;
  driftScore: number;
  rank: number;
  totalRacers: number;
  score: number;
  isOffRoad: boolean;
  controls: GestureControls;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
}

export const RacingHUD: React.FC<RacingHUDProps> = ({
  speedMph,
  rpm,
  gear,
  currentLap,
  totalLaps,
  lapProgress,
  currentLapTime,
  bestLapTime,
  totalTime,
  nitroFuel,
  isNitroActive,
  isDrifting,
  driftScore,
  rank,
  totalRacers,
  score,
  isOffRoad,
  controls,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00.00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  // 5 discrete nitro segments
  const activeSegments = Math.ceil((nitroFuel / 100) * 5);

  return (
    <div id="racing-hud-root" className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <header
        id="hud-top-bar"
        className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 z-20 pointer-events-auto"
      >
        {/* Brand & Tracking status */}
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 w-2.5 h-7 skew-x-[-20deg] shadow-[0_0_12px_#06b6d4]"></div>
          <h1 className="text-xl sm:text-2xl font-black font-racing tracking-tighter italic uppercase text-white">
            GESTURE<span className="text-cyan-400">RUSH</span>
          </h1>
          <span className="hidden md:inline-block ml-3 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold tracking-widest text-white/40 uppercase">
            AI TRACKING ENGINE v2.4
          </span>
        </div>

        {/* Telemetry Numbers */}
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Quick-glance Top Speedometer Badge */}
          <div id="hud-top-speed-badge" className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-cyan-500/30 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-sm font-black font-racing italic tracking-wider text-white">
              {speedMph} <span className="text-[10px] text-cyan-400 font-sans not-italic font-bold">MPH</span>
            </span>
          </div>

          <div className="text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">CURRENT LAP</p>
            <p className="text-base sm:text-lg font-bold font-racing text-white">
              {currentLap.toString().padStart(2, '0')} <span className="text-white/30">/ {totalLaps.toString().padStart(2, '0')}</span>
            </p>
          </div>

          <div className="text-center">
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">POSITION</p>
            <p className="text-base sm:text-lg font-bold font-racing text-cyan-400">
              {rank.toString().padStart(2, '0')} <span className="text-white/30">/ {totalRacers.toString().padStart(2, '0')}</span>
            </p>
          </div>

          <div className="text-center hidden sm:block">
            <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">TIME</p>
            <p className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
              {formatTime(currentLapTime)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-hud-mute"
              onClick={onToggleMute}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
            <button
              id="btn-hud-pause"
              onClick={onPause}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all"
              title="Pause Race"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Center Tactical Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-25">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 border border-white/40 rounded-full flex items-center justify-center relative">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]"></div>
            <div className="absolute -top-1 w-2 h-0.5 bg-white"></div>
            <div className="absolute -bottom-1 w-2 h-0.5 bg-white"></div>
            <div className="absolute -left-1 w-0.5 h-2 bg-white"></div>
            <div className="absolute -right-1 w-0.5 h-2 bg-white"></div>
          </div>
          <p className="text-[8px] font-bold tracking-[0.4em] text-white/60 uppercase">CENTER POINT</p>
        </div>
      </div>

      {/* Active Skill & Drift Combo Floating Alerts */}
      <div className="flex flex-col items-center justify-center gap-2 z-20">
        {isOffRoad && (
          <div
            id="hud-offroad-alert"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-rose-600/90 border border-rose-400/50 text-white font-racing font-bold text-xs tracking-wider animate-bounce shadow-2xl"
          >
            <AlertTriangle className="w-4 h-4" />
            OFF-ROAD GRASS PENALTY
          </div>
        )}

        {isDrifting && (
          <div
            id="hud-drift-combo"
            className="flex flex-col items-center px-4 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/40 backdrop-blur-md text-orange-300 animate-pulse-glow"
          >
            <span className="text-[10px] font-bold font-racing uppercase tracking-widest text-orange-400">
              DRIFT BONUS
            </span>
            <span className="text-xl font-black font-racing tracking-tight text-white">
              +{driftScore} PTS
            </span>
          </div>
        )}
      </div>

      {/* Elevated Central Cockpit Telemetry Hub (Never blocked by touch buttons) */}
      <footer id="hud-bottom-bar" className="relative pb-4 sm:pb-6 px-4 flex flex-col items-center justify-end z-20 pointer-events-none">
        {/* Main Central Instrument Cluster */}
        <div className="relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-black/75 border border-white/15 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-auto">
          {/* Top of cluster: Digital Speed + Gear + Tachometer */}
          <div className="flex items-center gap-4 sm:gap-6 px-2">
            {/* Left Tag: Gear */}
            <div className="flex flex-col items-end">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold font-tech">GEAR</span>
              <span className="text-base sm:text-lg font-black font-racing text-cyan-400">{gear}</span>
            </div>

            {/* Central Prominent Digital Speedometer */}
            <div id="hud-speedometer" className="flex flex-col items-center px-3">
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl sm:text-5xl font-black font-racing italic tracking-tighter transition-colors duration-100 ${
                    isNitroActive
                      ? 'text-amber-400 drop-shadow-[0_0_15px_#f59e0b]'
                      : 'text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  {speedMph}
                </span>
                <span className="text-xs sm:text-sm font-black font-racing italic text-cyan-400">MPH</span>
              </div>
            </div>

            {/* Right Tag: Active Skill / Status */}
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold font-tech">SYSTEM</span>
              <span className={`text-[11px] sm:text-xs font-black font-racing tracking-wide uppercase ${
                isNitroActive ? 'text-amber-400 animate-pulse' : isDrifting ? 'text-orange-400' : 'text-emerald-400'
              }`}>
                {isNitroActive ? 'NITRO' : isDrifting ? 'DRIFT' : 'DRIVE'}
              </span>
            </div>
          </div>

          {/* Segmented Nitro Energy Bar */}
          <div id="hud-nitro-gauge" className="flex flex-col items-center gap-1 w-full max-w-xs">
            <div className="flex justify-between items-center w-full px-1">
              <span className="text-[8px] uppercase font-bold text-white/40 font-tech tracking-wider">NITRO BOOST</span>
              <span className={`text-[9px] font-black italic tracking-wider font-racing ${
                isNitroActive ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
              }`}>
                {isNitroActive ? 'ENGAGED' : nitroFuel > 15 ? `${Math.round(nitroFuel)}% READY` : 'RECHARGING'}
              </span>
            </div>
            <div className="flex gap-1.5 h-3 sm:h-3.5 w-full items-center">
              {[1, 2, 3, 4, 5].map((seg) => {
                const isActive = seg <= activeSegments;
                return (
                  <div
                    key={seg}
                    className={`flex-1 h-full rounded-xs transition-all duration-150 ${
                      isActive
                        ? isNitroActive
                          ? 'bg-gradient-to-r from-orange-500 to-amber-300 shadow-[0_0_12px_#f59e0b]'
                          : 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                        : 'bg-white/5 border border-white/5'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Minimal Lap Progress Line */}
          <div className="w-full max-w-xs flex flex-col gap-0.5 pt-1 border-t border-white/5">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_8px_#06b6d4]"
                style={{ width: `${lapProgress}%` }}
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

