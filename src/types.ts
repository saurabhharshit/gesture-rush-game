export type GameMode = 'MENU' | 'CALIBRATION' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY' | 'LEADERBOARD';

export type WeatherType = 'CLEAR' | 'NEON_NIGHT' | 'SUNSET' | 'CYBER_RAIN' | 'DESERT_HAZE';

export interface GestureControls {
  handDetected: boolean;
  steer: number; // -1 (hard left) to +1 (hard right)
  rawSteer: number;
  isBraking: boolean;
  isNitro: boolean;
  gestureName: 'NEUTRAL' | 'STEER_LEFT' | 'STEER_RIGHT' | 'NITRO_BOOST' | 'BRAKE_DRIFT';
  confidence: number;
  handX: number; // 0 to 1
  handY: number; // 0 to 1
  handTilt: number; // in degrees
  fistRatio: number; // 0 (open) to 1 (tight fist)
  handScale: number; // distance/size
}

export interface CalibrationSettings {
  deadzone: number; // e.g. 0.08
  sensitivity: number; // e.g. 1.3
  fistThreshold: number; // e.g. 0.65 for brake
  boostThreshold: number; // e.g. 0.75 or forward push
  invertSteer: boolean;
  mirrorCamera: boolean;
  controlMode: 'GESTURE' | 'TOUCH_KEYBOARD';
}

export interface CarStats {
  id: string;
  name: string;
  category: string;
  topSpeed: number; // mph equivalent
  acceleration: number;
  handling: number;
  nitroPower: number;
  color: string;
  accentColor: string;
  bodyStyle: 'SUPER' | 'CYBER' | 'MUSCLE' | 'FORMULA';
}

export interface TrackSegment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  elevation: number;
  color: { road: string; grass: string; rumble: string; lane: string };
  sprites: Array<{
    source: string;
    offset: number; // -1 to 1 across road, >1 or <-1 for roadside
    scale: number;
    type: 'TREE' | 'NEON_BILLBOARD' | 'PALM' | 'ROCK' | 'BARRIER' | 'BOOST_PAD' | 'OIL_SLICK' | 'ARCH' | 'BUILDING';
  }>;
}

export interface AICar {
  id: number;
  name: string;
  color: string;
  accentColor: string;
  offset: number; // -0.8 to 0.8 on road
  z: number;
  speed: number;
  maxSpeed: number;
  percent: number;
  personality: 'AGGRESSIVE' | 'BALANCED' | 'SPEEDER' | 'ROOKIE';
  carStyle: 'SUPER' | 'CYBER' | 'MUSCLE' | 'FORMULA';
  lap: number;
  totalDistance: number;
  isFinished: boolean;
  finishTime: number;
}

export interface TrackData {
  id: string;
  name: string;
  location: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  lengthSegments: number;
  laps: number;
  weather: WeatherType;
  primaryColor: string;
  skyGradient: [string, string, string];
  horizonType: 'CITY' | 'MOUNTAINS' | 'NEON_GRID' | 'CANYON';
  description: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'SMOKE' | 'NITRO_FIRE' | 'SPARK' | 'SKID_MARK' | 'RAIN';
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  trackId: string;
  trackName: string;
  carName: string;
  totalTime: number; // in seconds
  bestLap: number;
  topSpeed: number;
  date: string;
  difficulty: string;
  score: number;
}
