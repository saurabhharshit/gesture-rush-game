import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, Flame, Gauge, Hand, HelpCircle, Keyboard, MapPin, Play, RotateCcw, Shield, Sliders, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { CalibrationSettings, CarStats, GameMode, GestureControls, LeaderboardEntry, TrackData } from './types';
import { CARS, TRACKS } from './engine/trackData';
import { RacingEngine, setControlsBraking } from './engine/racingEngine';
import { HandLandmarks, handTracker } from './utils/handTracker';
import { sound } from './utils/sound';
import { CameraTrackerOverlay } from './components/CameraTrackerOverlay';
import { RacingHUD } from './components/RacingHUD';
import { CalibrationModal } from './components/CalibrationModal';
import { TrackSelectModal } from './components/TrackSelectModal';
import { CarSelectModal } from './components/CarSelectModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { CountdownOverlay } from './components/CountdownOverlay';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { VirtualControls } from './components/VirtualControls';

export default function App() {
  // Game States
  const [gameMode, setGameMode] = useState<GameMode>('MENU');
  const [selectedTrack, setSelectedTrack] = useState<TrackData>(TRACKS[0]);
  const [selectedCar, setSelectedCar] = useState<CarStats>(CARS[0]);

  // Modal Sub-states
  const [showCalibration, setShowCalibration] = useState<boolean>(false);
  const [showTrackSelect, setShowTrackSelect] = useState<boolean>(false);
  const [showCarSelect, setShowCarSelect] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showVirtualTouch, setShowVirtualTouch] = useState<boolean>(false);

  // Audio State
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Post Race Results
  const [raceResults, setRaceResults] = useState<{
    position: number;
    totalTime: number;
    bestLap: number;
    score: number;
  }>({
    position: 1,
    totalTime: 0,
    bestLap: 0,
    score: 0,
  });

  // Camera & Tracking State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [gestureControls, setGestureControls] = useState<GestureControls>({
    handDetected: false,
    steer: 0,
    rawSteer: 0,
    isBraking: false,
    isNitro: false,
    gestureName: 'NEUTRAL',
    confidence: 0,
    handX: 0.5,
    handY: 0.5,
    handTilt: 0,
    fistRatio: 0,
    handScale: 0.2,
  });
  const [handLandmarks, setHandLandmarks] = useState<HandLandmarks | null>(null);
  const [calibrationSettings, setCalibrationSettings] = useState<CalibrationSettings>(() => handTracker.getSettings());

  // Racing HUD Real-time Telemetry
  const [hudTelemetry, setHudTelemetry] = useState({
    speedMph: 0,
    rpm: 0,
    gear: 'N',
    currentLap: 1,
    totalLaps: 3,
    lapProgress: 0,
    currentLapTime: 0,
    bestLapTime: 0,
    totalTime: 0,
    nitroFuel: 100,
    isNitroActive: false,
    isDrifting: false,
    driftScore: 0,
    rank: 1,
    totalRacers: 6,
    score: 0,
    isOffRoad: false,
  });

  // Leaderboard Data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gesturerush_leaderboard');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    // Default initial champions
    return [
      {
        id: 'seed-1',
        playerName: 'Cyber_Phantom',
        trackId: 'neo_tokyo',
        trackName: 'Neo Tokyo Expressway',
        carName: 'Cyber Phantom X',
        totalTime: 92.4,
        bestLap: 28.1,
        topSpeed: 232,
        date: '2026-08-20',
        difficulty: 'EASY',
        score: 18450,
      },
      {
        id: 'seed-2',
        playerName: 'Apex_Viper',
        trackId: 'sunset_coast',
        trackName: 'Sunset Coastline Drive',
        carName: 'Apex GT-R',
        totalTime: 114.2,
        bestLap: 34.8,
        topSpeed: 214,
        date: '2026-08-22',
        difficulty: 'MEDIUM',
        score: 16200,
      },
      {
        id: 'seed-3',
        playerName: 'GhostRider_99',
        trackId: 'red_rock',
        trackName: 'Red Rock Canyon Run',
        carName: 'Viper Fury 700',
        totalTime: 138.6,
        bestLap: 41.2,
        topSpeed: 208,
        date: '2026-08-24',
        difficulty: 'HARD',
        score: 15100,
      },
    ];
  });

  // Canvas & Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RacingEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const controlsRef = useRef<GestureControls>(gestureControls);
  const virtualStateRef = useRef<{
    active: boolean;
    steer: number;
    isBraking: boolean;
    isNitro: boolean;
    fistRatio: number;
    lastActiveTime: number;
  }>({
    active: false,
    steer: 0,
    isBraking: false,
    isNitro: false,
    fistRatio: 0,
    lastActiveTime: 0,
  });

  // Keep ref up to date
  useEffect(() => {
    controlsRef.current = gestureControls;
    setControlsBraking(gestureControls.isBraking);
  }, [gestureControls]);

  // Initialize Camera & Hand Tracker on startup
  const initCamera = async () => {
    if (!videoRef.current) return;
    const ok = await handTracker.initialize(videoRef.current);
    setIsCameraActive(ok);
  };

  useEffect(() => {
    // Set frame callback on hand tracker
    handTracker.setOnFrameCallback((camCtrls, lm) => {
      const v = virtualStateRef.current;
      const isVirtualActive = v.active && (Date.now() - v.lastActiveTime < 800);

      const effectiveSteer = isVirtualActive && Math.abs(v.steer) > 0.1 ? v.steer : camCtrls.steer;
      const effectiveNitro = camCtrls.isNitro || (isVirtualActive && v.isNitro);
      const effectiveBrake = camCtrls.isBraking || (isVirtualActive && v.isBraking);

      let effectiveGesture = camCtrls.gestureName;
      if (effectiveNitro) effectiveGesture = 'NITRO_BOOST';
      else if (effectiveBrake) effectiveGesture = 'BRAKE_DRIFT';
      else if (effectiveSteer < -0.2) effectiveGesture = 'STEER_LEFT';
      else if (effectiveSteer > 0.2) effectiveGesture = 'STEER_RIGHT';

      const merged: GestureControls = {
        ...camCtrls,
        steer: effectiveSteer,
        isNitro: effectiveNitro,
        isBraking: effectiveBrake,
        gestureName: effectiveGesture,
        handDetected: camCtrls.handDetected || isVirtualActive,
      };

      controlsRef.current = merged;
      setControlsBraking(merged.isBraking);
      setGestureControls(merged);
      setHandLandmarks(lm);
    });

    if (videoRef.current) {
      initCamera();
    }

    return () => {
      handTracker.stop();
      if (engineRef.current) engineRef.current.destroy();
    };
  }, []);

  // Update calibration settings
  const handleUpdateCalibration = (newSettings: Partial<CalibrationSettings>) => {
    handTracker.updateSettings(newSettings);
    setCalibrationSettings(handTracker.getSettings());
  };

  // Start Race Session
  const handleStartRace = () => {
    sound.playClick();
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new RacingEngine(selectedTrack, selectedCar, {
      onLapComplete: (lap, lapTime, bestLap) => {
        // Callback
      },
      onRaceFinish: (position, totalTime, bestLap, score) => {
        setRaceResults({ position, totalTime, bestLap, score });
        setGameMode('GAMEOVER');
      },
      onCollision: (type) => {
        // Collision
      },
    });

    if (canvasRef.current) {
      engine.setCanvas(canvasRef.current);
    }
    engineRef.current = engine;
    setHudTelemetry(engine.getHUDData());
    setGameMode('COUNTDOWN');
  };

  const handleCountdownComplete = useCallback(() => {
    setGameMode('PLAYING');
  }, []);

  // Game Loop
  useEffect(() => {
    let lastHudUpdateTime = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (engineRef.current && (gameMode === 'PLAYING' || gameMode === 'COUNTDOWN')) {
        if (gameMode === 'PLAYING') {
          engineRef.current.update(dt, controlsRef.current);
          // Throttle HUD state updates to ~30fps to avoid excessive React tree re-renders
          if (now - lastHudUpdateTime >= 33) {
            lastHudUpdateTime = now;
            setHudTelemetry(engineRef.current.getHUDData());
          }
        }
        engineRef.current.render();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameMode]);

  // Handle ResizeObserver for Canvas
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (engineRef.current) {
          engineRef.current.render();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save Score Handler
  const handleSaveScore = (playerName: string) => {
    const newEntry: LeaderboardEntry = {
      id: `entry-${Date.now()}`,
      playerName,
      trackId: selectedTrack.id,
      trackName: selectedTrack.name,
      carName: selectedCar.name,
      totalTime: raceResults.totalTime,
      bestLap: raceResults.bestLap,
      topSpeed: selectedCar.topSpeed,
      date: new Date().toISOString().split('T')[0],
      difficulty: selectedTrack.difficulty,
      score: raceResults.score,
    };

    const updated = [newEntry, ...leaderboard].sort((a, b) => b.score - a.score).slice(0, 50);
    setLeaderboard(updated);
    try {
      localStorage.setItem('gesturerush_leaderboard', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const handleClearLeaderboard = () => {
    setLeaderboard([]);
    try {
      localStorage.removeItem('gesturerush_leaderboard');
    } catch {
      // Ignore
    }
  };

  // Toggle Sound Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMuted(nextMute);
  };

  // Touch & Key Inputs
  const handleVirtualInput = (update: Partial<GestureControls>) => {
    const isEngaged = Boolean(
      (update.steer !== undefined && Math.abs(update.steer) > 0.05) ||
      update.isBraking ||
      update.isNitro
    );

    virtualStateRef.current = {
      active: isEngaged,
      steer: update.steer ?? 0,
      isBraking: Boolean(update.isBraking),
      isNitro: Boolean(update.isNitro),
      fistRatio: update.fistRatio ?? (update.isBraking ? 1 : 0),
      lastActiveTime: Date.now(),
    };

    setGestureControls((prev) => {
      const merged: GestureControls = {
        ...prev,
        ...update,
        handDetected: prev.handDetected || isEngaged,
      };
      controlsRef.current = merged;
      setControlsBraking(Boolean(merged.isBraking));
      return merged;
    });
  };

  return (
    <div
      ref={containerRef}
      id="app-root-container"
      className="relative w-screen h-screen overflow-hidden bg-[#0A0A0F] bg-elegant-grid text-white select-none flex flex-col items-center justify-center font-sans"
    >
      {/* Background dot grid overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-elegant-grid" />

      {/* Hidden Video element for Camera Capture */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden pointer-events-none"
      />

      {/* Main 3D Racing Canvas Viewport */}
      <canvas
        ref={canvasRef}
        id="racing-canvas"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Picture-in-Picture AI Camera Overlay */}
      <CameraTrackerOverlay
        controls={gestureControls}
        landmarks={handLandmarks}
        videoRef={videoRef}
        isCameraActive={isCameraActive}
        onOpenCalibration={() => setShowCalibration(true)}
        onRequestCamera={initCamera}
      />

      {/* Virtual Touch & Keyboard Controls */}
      <VirtualControls
        onVirtualInput={handleVirtualInput}
        isEnabled={showVirtualTouch || gameMode === 'PLAYING'}
        onToggleEnabled={() => setShowVirtualTouch(!showVirtualTouch)}
      />

      {/* ======================================================== */}
      {/* MAIN MENU SCREEN */}
      {/* ======================================================== */}
      {gameMode === 'MENU' && (
        <div id="main-menu-overlay" className="absolute inset-0 z-30 flex flex-col justify-between bg-black/60 backdrop-blur-[2px]">
          {/* Top Header Bar */}
          <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sm:px-8 z-20">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500 w-3 h-8 skew-x-[-20deg] shadow-[0_0_15px_#06b6d4]"></div>
              <h1 className="text-xl sm:text-2xl font-black font-racing tracking-tighter italic uppercase text-white">
                GESTURE<span className="text-cyan-400">RUSH</span>
              </h1>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold tracking-widest text-white/40 uppercase">
                AI Tracking Engine v2.4
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-menu-mute"
                onClick={handleToggleMute}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 backdrop-blur-md transition-all"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </header>

          {/* Center Interactive Hero Showcase */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto gap-4 sm:gap-6 px-4 py-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-white/5 border border-white/10 text-cyan-400 text-[10px] font-bold font-racing uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              VISION-BASED RACING • NATURAL HAND GESTURES
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black font-racing tracking-tight text-white leading-none drop-shadow-2xl">
              DRIVE WITH <span className="text-cyan-400 italic">PURE GESTURE</span>
            </h2>

            {/* Gesture Quick Guide Cards */}
            <div className="grid grid-cols-3 gap-3 w-full pt-1">
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl flex flex-col items-center gap-1 shadow-2xl">
                <Hand className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold font-racing text-white tracking-wide">STEER</span>
                <span className="text-[9px] text-white/40">Tilt Hand Left & Right</span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl flex flex-col items-center gap-1 shadow-2xl">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold font-racing text-white tracking-wide">NITRO BOOST</span>
                <span className="text-[9px] text-white/40">Push Hand Towards Cam</span>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl flex flex-col items-center gap-1 shadow-2xl">
                <Shield className="w-5 h-5 text-rose-400" />
                <span className="text-xs font-bold font-racing text-white tracking-wide">FIST BRAKE</span>
                <span className="text-[9px] text-white/40">Clench Fist to Drift</span>
              </div>
            </div>

            {/* Main Race Launch Button */}
            <button
              id="btn-start-race"
              onClick={handleStartRace}
              className="px-10 sm:px-14 py-3.5 sm:py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black font-racing text-lg sm:text-xl tracking-wider shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_45px_rgba(6,182,212,0.9)] hover:scale-102 transition-all flex items-center gap-3 mt-1"
            >
              <Play className="w-5 h-5 fill-current" />
              LAUNCH AI RACE
            </button>
          </div>

          {/* Bottom Menu Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto w-full px-4 mb-2">
            {/* Track Selector */}
            <button
              id="btn-menu-track"
              onClick={() => setShowTrackSelect(true)}
              className="p-3 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 hover:border-cyan-500/40 backdrop-blur-md flex items-center gap-3 transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">CIRCUIT</span>
                <span className="text-xs font-bold font-racing text-white truncate">
                  {selectedTrack.name}
                </span>
              </div>
            </button>

            {/* Car Garage */}
            <button
              id="btn-menu-car"
              onClick={() => setShowCarSelect(true)}
              className="p-3 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 hover:border-cyan-500/40 backdrop-blur-md flex items-center gap-3 transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">VEHICLE</span>
                <span className="text-xs font-bold font-racing text-white truncate">
                  {selectedCar.name}
                </span>
              </div>
            </button>

            {/* Gesture Calibration */}
            <button
              id="btn-menu-calibration"
              onClick={() => setShowCalibration(true)}
              className="p-3 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 hover:border-cyan-500/40 backdrop-blur-md flex items-center gap-3 transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">SENSORS</span>
                <span className="text-xs font-bold font-racing text-white truncate">
                  Calibrate Gestures
                </span>
              </div>
            </button>

            {/* Leaderboards */}
            <button
              id="btn-menu-leaderboard"
              onClick={() => setShowLeaderboard(true)}
              className="p-3 rounded-xl bg-black/60 hover:bg-black/80 border border-white/10 hover:border-cyan-500/40 backdrop-blur-md flex items-center gap-3 transition-all text-left"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-white/40 font-tech tracking-wider">RECORDS</span>
                <span className="text-xs font-bold font-racing text-white truncate">
                  High Scores ({leaderboard.length})
                </span>
              </div>
            </button>
          </div>

          {/* Elegant Dark Footer */}
          <footer className="h-10 bg-black/90 border-t border-white/5 flex items-center justify-between px-6 sm:px-8 text-[9px] font-medium text-white/40 tracking-[0.2em] z-20">
            <div>HINTS: <span className="text-white/60">PALM FORWARD FOR NITRO • FIST TO BRAKE • TILT HAND TO STEER</span></div>
            <div>GESTURE RUSH // AI RACING ENGINE v2.4</div>
          </footer>
        </div>
      )}

      {/* ======================================================== */}
      {/* COUNTDOWN OVERLAY */}
      {/* ======================================================== */}
      {gameMode === 'COUNTDOWN' && (
        <CountdownOverlay
          onComplete={handleCountdownComplete}
        />
      )}

      {/* ======================================================== */}
      {/* IN-GAME ACTIVE HUD TELEMETRY */}
      {/* ======================================================== */}
      {(gameMode === 'PLAYING' || gameMode === 'COUNTDOWN') && (
        <RacingHUD
          speedMph={hudTelemetry.speedMph}
          rpm={hudTelemetry.rpm}
          gear={hudTelemetry.gear}
          currentLap={hudTelemetry.currentLap}
          totalLaps={hudTelemetry.totalLaps}
          lapProgress={hudTelemetry.lapProgress}
          currentLapTime={hudTelemetry.currentLapTime}
          bestLapTime={hudTelemetry.bestLapTime}
          totalTime={hudTelemetry.totalTime}
          nitroFuel={hudTelemetry.nitroFuel}
          isNitroActive={hudTelemetry.isNitroActive}
          isDrifting={hudTelemetry.isDrifting}
          driftScore={hudTelemetry.driftScore}
          rank={hudTelemetry.rank}
          totalRacers={hudTelemetry.totalRacers}
          score={hudTelemetry.score}
          isOffRoad={hudTelemetry.isOffRoad}
          controls={gestureControls}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={() => {
            sound.stopEngine();
            setGameMode('PAUSED');
          }}
        />
      )}

      {/* ======================================================== */}
      {/* PAUSE MODAL */}
      {/* ======================================================== */}
      {gameMode === 'PAUSED' && (
        <PauseModal
          onResume={() => {
            sound.startEngine();
            setGameMode('PLAYING');
          }}
          onCalibrate={() => setShowCalibration(true)}
          onRestart={() => handleStartRace()}
          onMainMenu={() => {
            sound.stopEngine();
            setGameMode('MENU');
          }}
        />
      )}

      {/* ======================================================== */}
      {/* GAME OVER & PODIUM MODAL */}
      {/* ======================================================== */}
      {gameMode === 'GAMEOVER' && (
        <GameOverModal
          position={raceResults.position}
          totalTime={raceResults.totalTime}
          bestLap={raceResults.bestLap}
          score={raceResults.score}
          track={selectedTrack}
          car={selectedCar}
          onSaveScore={handleSaveScore}
          onRestart={() => handleStartRace()}
          onMainMenu={() => setGameMode('MENU')}
        />
      )}

      {/* ======================================================== */}
      {/* SUB-MODALS */}
      {/* ======================================================== */}
      {showCalibration && (
        <CalibrationModal
          settings={calibrationSettings}
          controls={gestureControls}
          onUpdateSettings={handleUpdateCalibration}
          onClose={() => setShowCalibration(false)}
        />
      )}

      {showTrackSelect && (
        <TrackSelectModal
          selectedTrack={selectedTrack}
          onSelectTrack={(t) => {
            setSelectedTrack(t);
            setShowTrackSelect(false);
          }}
          onClose={() => setShowTrackSelect(false)}
        />
      )}

      {showCarSelect && (
        <CarSelectModal
          selectedCar={selectedCar}
          onSelectCar={(c) => {
            setSelectedCar(c);
            setShowCarSelect(false);
          }}
          onClose={() => setShowCarSelect(false)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          entries={leaderboard}
          onClearLeaderboard={handleClearLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}
