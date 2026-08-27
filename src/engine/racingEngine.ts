import { AICar, CarStats, GestureControls, Particle, TrackData, TrackSegment } from '../types';
import { AI_NAMES } from './trackData';
import { sound } from '../utils/sound';

export interface GameEngineCallbacks {
  onLapComplete: (lap: number, lapTime: number, bestLapTime: number) => void;
  onRaceFinish: (position: number, totalTime: number, bestLap: number, score: number) => void;
  onCollision: (type: 'CAR' | 'OBSTACLE' | 'BOOST' | 'OIL') => void;
}

export class RacingEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  // Track & Road constants
  private segmentLength: number = 200;
  private roadWidth: number = 2200;
  private cameraHeight: number = 1000;
  private drawDistance: number = 300;
  private fieldOfView: number = 100;
  private cameraDepth: number = 0;

  // Track data
  private segments: TrackSegment[] = [];
  private trackLength: number = 0;
  private currentTrack: TrackData;
  private playerCar: CarStats;

  // Player state
  private playerX: number = 0; // -1 to 1 (center is 0)
  private playerZ: number = 0;
  private playerSpeed: number = 0;
  private maxSpeed: number = 0;
  private accel: number = 0;
  private decel: number = 0;
  private breakingDecel: number = 0;
  private offRoadDecel: number = 0;
  private offRoadLimit: number = 1.05;

  // Nitro & Turbo
  private nitroFuel: number = 100; // 0 to 100
  private isNitroActive: boolean = false;
  private nitroCooldown: number = 0;

  // Drifting & Steering
  private playerSteerLean: number = 0;
  private isDrifting: boolean = false;
  private driftScore: number = 0;
  private totalScore: number = 0;
  private topSpeedAchieved: number = 0;

  // Race stats
  private currentLap: number = 1;
  private lapStartTime: number = 0;
  private raceStartTime: number = 0;
  private bestLapTime: number = 0;
  private totalRaceTime: number = 0;
  private playerRank: number = 1;
  private totalRacers: number = 6;
  private isFinished: boolean = false;

  // Visual effects
  private particles: Particle[] = [];
  private screenShake: number = 0;
  private horizonOffset: number = 0;
  private collisionCooldown: number = 0;
  private spinOutTime: number = 0; // If hit oil slick

  // AI Rivals
  private aiCars: AICar[] = [];

  // Callbacks
  private callbacks: GameEngineCallbacks;

  constructor(track: TrackData, car: CarStats, callbacks: GameEngineCallbacks) {
    this.currentTrack = track;
    this.playerCar = car;
    this.callbacks = callbacks;
    this.cameraDepth = 1 / Math.tan((this.fieldOfView / 2) * Math.PI / 180);
    this.initPhysics();
    this.buildTrack();
    this.initAICars();
  }

  private initPhysics() {
    // Map car stats to physics units
    this.maxSpeed = (this.playerCar.topSpeed / 200) * (this.segmentLength / (1 / 60)) * 0.95;
    this.accel = (this.playerCar.acceleration / 100) * (this.maxSpeed / 5.2);
    this.breakingDecel = -this.maxSpeed * 0.9;
    this.decel = -this.maxSpeed / 5.5;
    this.offRoadDecel = -this.maxSpeed / 1.8;
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
  }

  public resetRace() {
    this.playerX = 0;
    this.playerZ = 0;
    this.playerSpeed = 0;
    this.nitroFuel = 100;
    this.currentLap = 1;
    this.isFinished = false;
    this.totalRaceTime = 0;
    this.driftScore = 0;
    this.totalScore = 0;
    this.topSpeedAchieved = 0;
    this.particles = [];
    this.spinOutTime = 0;
    this.lapStartTime = performance.now();
    this.raceStartTime = performance.now();
    this.bestLapTime = 0;
    this.initAICars();
  }

  private buildTrack() {
    this.segments = [];
    const len = this.currentTrack.lengthSegments;

    // Helper functions to build smooth curves and hills
    const addSegment = (curve: number, elevation: number) => {
      const n = this.segments.length;
      const theme = this.currentTrack.weather;

      let roadColor = (Math.floor(n / 3) % 2 === 0) ? '#27272a' : '#18181b';
      let rumbleColor = (Math.floor(n / 3) % 2 === 0) ? this.currentTrack.primaryColor : '#ffffff';
      let laneColor = (Math.floor(n / 3) % 2 === 0) ? '#e4e4e7' : 'transparent';
      let grassColor = (Math.floor(n / 3) % 2 === 0) ? '#09090b' : '#040405';

      if (theme === 'SUNSET') {
        grassColor = (Math.floor(n / 3) % 2 === 0) ? '#451a03' : '#290e03';
        roadColor = (Math.floor(n / 3) % 2 === 0) ? '#262626' : '#171717';
      } else if (theme === 'DESERT_HAZE') {
        grassColor = (Math.floor(n / 3) % 2 === 0) ? '#78350f' : '#451a03';
      } else if (theme === 'CLEAR') { // Glacier
        grassColor = (Math.floor(n / 3) % 2 === 0) ? '#082f49' : '#031a29';
      }

      this.segments.push({
        index: n,
        p1: { world: { x: 0, y: this.lastY(), z: n * this.segmentLength }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        p2: { world: { x: 0, y: elevation, z: (n + 1) * this.segmentLength }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        curve,
        elevation,
        color: { road: roadColor, grass: grassColor, rumble: rumbleColor, lane: laneColor },
        sprites: [],
      });
    };

    const addRoad = (enter: number, hold: number, leave: number, curve: number, elevation: number = 0) => {
      const startY = this.lastY();
      const endY = startY + elevation * this.segmentLength;
      const total = enter + hold + leave;
      for (let i = 0; i < enter; i++) {
        addSegment(this.easeIn(0, curve, i / enter), this.easeInOut(startY, endY, i / total));
      }
      for (let i = 0; i < hold; i++) {
        addSegment(curve, this.easeInOut(startY, endY, (enter + i) / total));
      }
      for (let i = 0; i < leave; i++) {
        addSegment(this.easeInOut(curve, 0, i / leave), this.easeInOut(startY, endY, (enter + hold + i) / total));
      }
    };

    // Construct track sections
    addRoad(30, 40, 30, 0, 0); // Start straight
    addRoad(40, 50, 40, 2.5, 20); // Right uphill curve
    addRoad(30, 40, 30, 0, -20); // Straight downhill
    addRoad(50, 60, 50, -3.2, 35); // Left sweep over hill
    addRoad(30, 30, 30, 1.8, -35); // S-curve part 1
    addRoad(30, 30, 30, -2.2, 10); // S-curve part 2
    addRoad(40, 50, 40, 0, 0); // High-speed straightaway
    addRoad(50, 70, 50, 3.8, -15); // Hairpin bend right
    addRoad(40, 50, 40, -1.5, 0); // Sweeper
    addRoad(30, 30, 30, 0, 0); // Final straight to finish line

    this.trackLength = this.segments.length * this.segmentLength;

    // Decorate roadside sprites, obstacles, boost pads
    const spriteTypes = this.currentTrack.weather === 'SUNSET' ? ['PALM', 'NEON_BILLBOARD'] :
      this.currentTrack.weather === 'DESERT_HAZE' ? ['ROCK', 'NEON_BILLBOARD', 'BARRIER'] :
      this.currentTrack.weather === 'CLEAR' ? ['TREE', 'BARRIER', 'ARCH'] :
      ['NEON_BILLBOARD', 'BUILDING', 'ARCH'];

    for (let i = 20; i < this.segments.length - 20; i += 3) {
      const seg = this.segments[i];

      // Side scenery
      if (i % 6 === 0) {
        const type = spriteTypes[Math.floor(Math.random() * spriteTypes.length)] as any;
        seg.sprites.push({
          source: type,
          offset: -1.6 - Math.random() * 1.5,
          scale: 1.2 + Math.random() * 0.5,
          type,
        });
      }
      if (i % 7 === 0) {
        const type = spriteTypes[Math.floor(Math.random() * spriteTypes.length)] as any;
        seg.sprites.push({
          source: type,
          offset: 1.6 + Math.random() * 1.5,
          scale: 1.2 + Math.random() * 0.5,
          type,
        });
      }

      // Overhead Cyber Arches
      if (i % 120 === 0) {
        seg.sprites.push({
          source: 'ARCH',
          offset: 0,
          scale: 2.2,
          type: 'ARCH',
        });
      }

      // Boost Pads on straights
      if (i % 85 === 0 && Math.abs(seg.curve) < 1) {
        seg.sprites.push({
          source: 'BOOST_PAD',
          offset: (Math.random() - 0.5) * 1.2,
          scale: 0.8,
          type: 'BOOST_PAD',
        });
      }

      // Oil slicks / Obstacles on turns
      if (i % 70 === 0 && Math.abs(seg.curve) > 1.5) {
        seg.sprites.push({
          source: 'OIL_SLICK',
          offset: (Math.random() - 0.5) * 1.4,
          scale: 0.9,
          type: 'OIL_SLICK',
        });
      }
    }
  }

  private lastY(): number {
    return this.segments.length === 0 ? 0 : this.segments[this.segments.length - 1].p2.world.y;
  }

  private easeIn(a: number, b: number, percent: number) {
    return a + (b - a) * Math.pow(percent, 2);
  }

  private easeInOut(a: number, b: number, percent: number) {
    return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
  }

  private initAICars() {
    this.aiCars = [];
    const carColors = ['#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#f97316'];
    const carStyles: Array<'SUPER' | 'CYBER' | 'MUSCLE' | 'FORMULA'> = ['SUPER', 'CYBER', 'MUSCLE', 'FORMULA'];

    // Place AI cars on starting grid formation right in front of player (player is at Z=0)
    const gridPositions = [
      { z: 360, offset: -0.42 }, // Row 1 Left
      { z: 360, offset: 0.42 },  // Row 1 Right
      { z: 240, offset: -0.36 }, // Row 2 Left
      { z: 240, offset: 0.36 },  // Row 2 Right
      { z: 120, offset: -0.40 }, // Row 3 Left (just ahead of player)
    ];

    for (let i = 0; i < this.totalRacers - 1; i++) {
      const grid = gridPositions[i % gridPositions.length];
      const name = AI_NAMES[i % AI_NAMES.length];
      const maxSpd = this.maxSpeed * (0.88 + Math.random() * 0.14);

      this.aiCars.push({
        id: i + 1,
        name,
        color: carColors[i % carColors.length],
        accentColor: '#ffffff',
        offset: grid.offset,
        z: grid.z + (Math.random() * 15 - 7),
        speed: 0, // Parked on grid ready for launch!
        maxSpeed: maxSpd,
        percent: 0,
        personality: (i % 3 === 0 ? 'AGGRESSIVE' : i % 2 === 0 ? 'SPEEDER' : 'BALANCED'),
        carStyle: carStyles[i % carStyles.length],
        lap: 1,
        totalDistance: grid.z,
        isFinished: false,
        finishTime: 0,
      });
    }
  }

  private findSegment(z: number): TrackSegment {
    return this.segments[Math.floor(z / this.segmentLength) % this.segments.length];
  }

  // Main update loop
  public update(dt: number, controls: GestureControls) {
    if (this.isFinished) return;

    const currentSegment = this.findSegment(this.playerZ);
    const speedRatio = this.playerSpeed / this.maxSpeed;

    // Record top speed achieved
    const speedMph = Math.round(speedRatio * this.playerCar.topSpeed);
    if (speedMph > this.topSpeedAchieved) {
      this.topSpeedAchieved = speedMph;
    }

    // Cooldowns
    if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
    if (this.screenShake > 0) this.screenShake -= dt * 4;
    if (this.spinOutTime > 0) this.spinOutTime -= dt;

    // 1. NITRO BOOST HANDLING
    if (controls.isNitro && this.nitroFuel > 2 && !controls.isBraking && this.spinOutTime <= 0) {
      if (!this.isNitroActive) {
        sound.playNitroBoost();
      }
      this.isNitroActive = true;
      this.nitroFuel = Math.max(0, this.nitroFuel - dt * 20);
      this.screenShake = Math.max(this.screenShake, 0.45);
      this.spawnNitroParticles();
    } else {
      this.isNitroActive = false;
      // Slowly regenerate nitro when driving smoothly at speed
      if (!controls.isBraking && this.playerSpeed > this.maxSpeed * 0.35) {
        this.nitroFuel = Math.min(100, this.nitroFuel + dt * 6.5);
      }
    }

    // 2. ACCELERATION / BRAKING PHYSICS
    const currentMaxSpeed = this.isNitroActive ? this.maxSpeed * 1.45 : this.maxSpeed;
    const currentAccel = this.isNitroActive ? this.accel * 2.4 : this.accel;

    if (this.spinOutTime > 0) {
      // Spinning out from oil
      this.playerSpeed += this.decel * 2.5 * dt;
      this.playerX += Math.sin(performance.now() * 0.02) * 0.05;
    } else if (controls.isBraking) {
      this.playerSpeed += this.breakingDecel * dt;
      if (Math.abs(controls.steer) > 0.25 && this.playerSpeed > this.maxSpeed * 0.4) {
        this.isDrifting = true;
        this.driftScore += Math.round(dt * 500 * Math.abs(controls.steer));
        sound.playTireScreech();
      } else {
        this.isDrifting = false;
      }
    } else {
      this.isDrifting = false;
      // Natural forward acceleration
      if (this.playerSpeed < currentMaxSpeed) {
        this.playerSpeed += currentAccel * dt;
      } else {
        this.playerSpeed += this.decel * dt;
      }
    }

    // Off-road penalty (grass friction)
    if ((this.playerX < -1 || this.playerX > 1) && this.playerSpeed > this.maxSpeed * 0.3) {
      this.playerSpeed += this.offRoadDecel * dt;
      this.screenShake = Math.max(this.screenShake, 0.2);
    }

    this.playerSpeed = Math.max(0, this.playerSpeed);

    // 3. STEERING & CENTRIFUGAL FORCE
    const steerForce = controls.steer;
    const centrifugal = currentSegment.curve * (this.playerSpeed / this.maxSpeed) * 0.035;

    // Steer responsiveness scales with speed
    const steerSpeedFactor = Math.min(1.2, this.playerSpeed / (this.maxSpeed * 0.3));
    this.playerX += (steerForce * 0.028 * steerSpeedFactor) - centrifugal;
    this.playerSteerLean = this.playerSteerLean * 0.8 + steerForce * 0.2;

    // Keep within reasonable screen bounds
    this.playerX = Math.max(-2.2, Math.min(2.2, this.playerX));

    // Update Z distance
    this.playerZ += this.playerSpeed * dt;
    this.horizonOffset += currentSegment.curve * (this.playerSpeed / this.maxSpeed) * 0.005;

    // Check Lap / Track completion
    if (this.playerZ >= this.trackLength) {
      this.playerZ -= this.trackLength;
      const now = performance.now();
      const lapTime = (now - this.lapStartTime) / 1000;
      this.lapStartTime = now;

      if (this.bestLapTime === 0 || lapTime < this.bestLapTime) {
        this.bestLapTime = lapTime;
      }

      if (this.currentLap < this.currentTrack.laps) {
        this.currentLap++;
        sound.playLapChime();
        this.callbacks.onLapComplete(this.currentLap, lapTime, this.bestLapTime);
      } else {
        // RACE FINISHED!
        this.isFinished = true;
        this.totalRaceTime = (now - this.raceStartTime) / 1000;
        // Count how many AI cars finished before the player
        let finalRank = 1;
        for (const ai of this.aiCars) {
          if (ai.isFinished) {
            finalRank++;
          }
        }
        this.playerRank = Math.min(this.totalRacers, finalRank);

        this.totalScore = Math.max(500, Math.round(
          (10000 / Math.max(30, this.totalRaceTime)) * 100 +
          (this.totalRacers - this.playerRank + 1) * 2500 +
          this.driftScore +
          this.topSpeedAchieved * 10
        ));
        this.callbacks.onRaceFinish(this.playerRank, this.totalRaceTime, this.bestLapTime, this.totalScore);
        sound.stopEngine();
        return;
      }
    }

    // 4. UPDATE AI CARS
    this.updateAICars(dt);

    // 5. COLLISION DETECTION
    this.checkCollisions(currentSegment);

    // 6. UPDATE PARTICLES
    this.updateParticles(dt);

    // Update procedural sound engine
    sound.updateEnginePitch(speedRatio, controls.isBraking, this.isNitroActive);

    // Calculate Rank
    this.updateRankings();
  }

  private updateAICars(dt: number) {
    this.aiCars.forEach((ai) => {
      if (ai.isFinished) {
        ai.speed = Math.max(0, ai.speed - this.decel * 1.5 * dt);
        return;
      }

      const aiSegment = this.findSegment(ai.z);

      // AI Acceleration & Launch from grid
      if (ai.speed < ai.maxSpeed) {
        const launchTorque = ai.speed < this.maxSpeed * 0.4 ? 1.6 : 1.0;
        ai.speed += this.accel * launchTorque * dt;
      }

      // Centrifugal push for AI on corners
      ai.offset -= aiSegment.curve * (ai.speed / this.maxSpeed) * 0.022;

      // Smart lane keeping & road boundary defense
      if (ai.offset < -0.78) ai.offset += dt * 0.8;
      if (ai.offset > 0.78) ai.offset -= dt * 0.8;

      // AI reaction to player position (drafting or defending lane)
      const distToPlayer = ai.z - this.playerZ;
      if (Math.abs(distToPlayer) < 500 && Math.abs(ai.offset - this.playerX) < 0.35) {
        const swerveDir = ai.offset > this.playerX ? 0.35 : -0.35;
        ai.offset += swerveDir * dt;
      }

      ai.z += ai.speed * dt;
      ai.totalDistance += ai.speed * dt;

      if (ai.z >= this.trackLength) {
        ai.z -= this.trackLength;
        ai.lap++;
        if (ai.lap > this.currentTrack.laps) {
          ai.isFinished = true;
          ai.finishTime = (performance.now() - this.raceStartTime) / 1000;
        }
      }
      ai.percent = ai.z / this.trackLength;
    });
  }

  private checkCollisions(currentSegment: TrackSegment) {
    if (this.collisionCooldown > 0) return;

    // 1. Check AI Car Collisions
    for (const ai of this.aiCars) {
      const zDiff = Math.abs(ai.z - this.playerZ);
      if (zDiff < 180 && Math.abs(ai.offset - this.playerX) < 0.35) {
        // Crash / Bump!
        sound.playCrash();
        this.collisionCooldown = 0.5;
        this.screenShake = 0.5;
        this.callbacks.onCollision('CAR');

        // Physics impulse
        if (this.playerSpeed > ai.speed) {
          this.playerSpeed = (this.playerSpeed + ai.speed) * 0.5;
          ai.speed += this.accel * 1.5;
        } else {
          this.playerSpeed *= 0.65;
        }

        // Lateral bump
        const pushDir = this.playerX > ai.offset ? 0.3 : -0.3;
        this.playerX += pushDir;
        ai.offset -= pushDir;

        // Spark particles
        this.spawnSparks(15);
        break;
      }
    }

    // 2. Check Roadside / Road Obstacles in current & nearby segments
    const checkSegments = [currentSegment, this.findSegment(this.playerZ + 100)];
    for (const seg of checkSegments) {
      for (const spr of seg.sprites) {
        if (spr.type === 'BOOST_PAD' && Math.abs(spr.offset - this.playerX) < 0.4) {
          // Hit Boost Pad!
          sound.playBonus();
          this.nitroFuel = Math.min(100, this.nitroFuel + 35);
          this.playerSpeed = Math.min(this.maxSpeed * 1.45, this.playerSpeed + this.maxSpeed * 0.3);
          this.screenShake = 0.3;
          this.callbacks.onCollision('BOOST');
          this.collisionCooldown = 0.4;
          break;
        } else if (spr.type === 'OIL_SLICK' && Math.abs(spr.offset - this.playerX) < 0.4) {
          // Hit Oil Slick!
          sound.playTireScreech();
          this.spinOutTime = 1.2;
          this.playerSpeed *= 0.55;
          this.screenShake = 0.4;
          this.callbacks.onCollision('OIL');
          this.collisionCooldown = 0.8;
          this.spawnSmoke(20, '#3f3f46');
          break;
        } else if ((spr.type === 'BARRIER' || spr.type === 'ROCK') && Math.abs(spr.offset - this.playerX) < 0.35) {
          // Hit Road Hazard!
          sound.playCrash();
          this.playerSpeed *= 0.35;
          this.screenShake = 0.6;
          this.callbacks.onCollision('OBSTACLE');
          this.collisionCooldown = 0.6;
          this.spawnSparks(25);
          break;
        }
      }
    }
  }

  private updateRankings() {
    const playerTotalDist = (this.currentLap - 1) * this.trackLength + this.playerZ;
    let rank = 1;
    for (const ai of this.aiCars) {
      if (ai.isFinished) {
        rank++;
      } else if (ai.totalDistance > playerTotalDist) {
        rank++;
      }
    }
    this.playerRank = Math.min(this.totalRacers, rank);
  }

  private spawnSparks(count: number) {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.78;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 2,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
        alpha: 1,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.3,
        type: 'SPARK',
      });
    }
  }

  private spawnSmoke(count: number, color: string = '#e4e4e7') {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.82;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 2 - 1,
        size: 8 + Math.random() * 15,
        color,
        alpha: 0.7,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
        type: 'SMOKE',
      });
    }
  }

  private spawnNitroParticles() {
    if (!this.canvas) return;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height * 0.82;
    for (let i = 0; i < 3; i++) {
      const offsetX = (i % 2 === 0 ? -28 : 28) + (Math.random() - 0.5) * 6;
      this.particles.push({
        x: cx + offsetX,
        y: cy + 22,
        vx: (Math.random() - 0.5) * 20,
        vy: 120 + Math.random() * 140,
        size: 6 + Math.random() * 8,
        color: Math.random() > 0.4 ? '#38bdf8' : '#ec4899',
        alpha: 0.9,
        life: 0,
        maxLife: 0.25,
        type: 'NITRO_FIRE',
      });
    }
  }

  private updateParticles(dt: number) {
    // Add active nitro flames or drift tire smoke
    if (this.canvas) {
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height * 0.8;

      if (this.isNitroActive) {
        // Dual exhaust rocket flames
        for (let i = 0; i < 4; i++) {
          const offsetX = (i % 2 === 0 ? -28 : 28) + (Math.random() - 0.5) * 8;
          this.particles.push({
            x: cx + offsetX,
            y: cy + 18,
            vx: (Math.random() - 0.5) * 3,
            vy: 6 + Math.random() * 8,
            size: 6 + Math.random() * 10,
            color: Math.random() > 0.4 ? '#38bdf8' : '#6366f1',
            alpha: 0.9,
            life: 0,
            maxLife: 0.2 + Math.random() * 0.15,
            type: 'NITRO_FIRE',
          });
        }
      }

      if (this.isDrifting || (controlsBraking() && this.playerSpeed > 100)) {
        this.spawnSmoke(2, '#d4d4d8');
      }
    }

    // Update existing
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 1 - (p.life / p.maxLife);
      if (p.type === 'SMOKE') {
        p.size += dt * 25;
      }
    }
  }

  // MAIN RENDER LOOP
  public render() {
    if (!this.canvas || !this.ctx) return;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Apply Screen Shake if active
    ctx.save();
    if (this.screenShake > 0) {
      const shakeAmt = this.screenShake * 12;
      ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
    }

    // 1. Render Sky & Dynamic Horizon Background
    this.renderSky(width, height);

    // 2. Render 3D Pseudo Road
    this.renderRoad(width, height);

    // 3. Render Particles Behind Player
    this.renderParticles(ctx);

    // 4. Render Player Car Cockpit/Rear View
    this.renderPlayerCar(width, height);

    // 5. Render Blindspot / Beside Opponent Radar Indicators
    for (const ai of this.aiCars) {
      const zDiff = Math.abs(ai.z - this.playerZ);
      if (zDiff < 220) {
        const isLeft = ai.offset < this.playerX;
        const arrowX = isLeft ? 36 : width - 36;
        const arrowY = height * 0.78;

        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        if (isLeft) {
          ctx.moveTo(arrowX + 16, arrowY - 12);
          ctx.lineTo(arrowX - 10, arrowY);
          ctx.lineTo(arrowX + 16, arrowY + 12);
        } else {
          ctx.moveTo(arrowX - 16, arrowY - 12);
          ctx.lineTo(arrowX + 10, arrowY);
          ctx.lineTo(arrowX - 16, arrowY + 12);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px Rajdhani, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = isLeft ? 'left' : 'right';
        ctx.fillText(`RIVAL: ${ai.name}`, isLeft ? arrowX + 22 : arrowX - 22, arrowY + 4);
        ctx.restore();
      }
    }

    // 6. Render Speed Streaks / High Speed Warp
    if (this.playerSpeed > this.maxSpeed * 0.85 || this.isNitroActive) {
      this.renderSpeedWarp(width, height);
    }

    ctx.restore();
  }

  private renderSky(width: number, height: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const skyGradients = this.currentTrack.skyGradient;

    const grad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    grad.addColorStop(0, skyGradients[0]);
    grad.addColorStop(0.6, skyGradients[1]);
    grad.addColorStop(1, skyGradients[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height * 0.55);

    // Render distant skyline or mountain silhouettes
    ctx.save();
    const horizonY = height * 0.52;
    const hOffset = (this.horizonOffset * 400) % width;

    if (this.currentTrack.horizonType === 'CITY') {
      ctx.fillStyle = '#090d16';
      // Futuristic cyber building silhouettes with glowing windows
      for (let x = -width; x < width * 2; x += 60) {
        const bHeight = 40 + Math.abs(Math.sin(x * 123.45)) * 90;
        const bWidth = 45 + Math.abs(Math.cos(x * 54.32)) * 30;
        ctx.fillRect(x + hOffset, horizonY - bHeight, bWidth, bHeight);

        // Windows
        ctx.fillStyle = (x % 3 === 0) ? '#06b6d4' : '#a855f7';
        for (let wy = horizonY - bHeight + 10; wy < horizonY - 10; wy += 14) {
          ctx.fillRect(x + hOffset + 6, wy, 4, 4);
          ctx.fillRect(x + hOffset + 16, wy, 4, 4);
        }
        ctx.fillStyle = '#090d16';
      }
    } else if (this.currentTrack.horizonType === 'CANYON') {
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let x = 0; x <= width; x += 40) {
        const y = horizonY - 40 - Math.sin((x + hOffset) * 0.015) * 50 - Math.cos((x + hOffset) * 0.04) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizonY);
      ctx.closePath();
      ctx.fill();
    } else if (this.currentTrack.horizonType === 'MOUNTAINS') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let x = 0; x <= width; x += 50) {
        const y = horizonY - 60 - Math.sin((x + hOffset) * 0.01) * 80;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, horizonY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private project(p: any, cameraX: number, cameraY: number, cameraZ: number, width: number, height: number) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    p.screen.scale = this.cameraDepth / p.camera.z;
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round((p.screen.scale * this.roadWidth * width / 2));
  }

  private renderRoad(width: number, height: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const baseSegment = this.findSegment(this.playerZ);
    const basePercent = (this.playerZ % this.segmentLength) / this.segmentLength;
    const playerSegment = this.findSegment(this.playerZ + (this.cameraHeight * this.cameraDepth));
    const playerPercent = ((this.playerZ + (this.cameraHeight * this.cameraDepth)) % this.segmentLength) / this.segmentLength;
    const playerY = this.easeInOut(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);

    let dx = -(baseSegment.curve * basePercent);
    let x = 0;
    let maxY = height;

    const cameraX = this.playerX * this.roadWidth;
    const cameraY = this.cameraHeight + playerY;

    // Project visible segments
    for (let n = 0; n < this.drawDistance; n++) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];
      const looped = segment.index < baseSegment.index;
      const cameraZ = this.playerZ - (looped ? this.trackLength : 0);

      this.project(segment.p1, cameraX - x, cameraY, cameraZ, width, height);
      this.project(segment.p2, cameraX - x - dx, cameraY, cameraZ, width, height);

      x += dx;
      dx += segment.curve;

      if ((segment.p1.camera.z <= this.cameraDepth) || (segment.p2.screen.y >= maxY) || (segment.p2.screen.y >= segment.p1.screen.y)) {
        continue;
      }

      // Draw Grass
      ctx.fillStyle = segment.color.grass;
      ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y);

      // Draw Rumble Strips
      const r1 = segment.p1.screen.w / 6;
      const r2 = segment.p2.screen.w / 6;
      ctx.fillStyle = segment.color.rumble;
      this.drawPolygon(
        segment.p1.screen.x - segment.p1.screen.w - r1, segment.p1.screen.y,
        segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y,
        segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y,
        segment.p2.screen.x - segment.p2.screen.w - r2, segment.p2.screen.y
      );
      this.drawPolygon(
        segment.p1.screen.x + segment.p1.screen.w + r1, segment.p1.screen.y,
        segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
        segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
        segment.p2.screen.x + segment.p2.screen.w + r2, segment.p2.screen.y
      );

      // Draw Road Surface
      ctx.fillStyle = segment.color.road;
      this.drawPolygon(
        segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y,
        segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
        segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
        segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y
      );

      // Draw Center Lane Markings
      if (segment.color.lane !== 'transparent') {
        const l1 = segment.p1.screen.w / 32;
        const l2 = segment.p2.screen.w / 32;
        ctx.fillStyle = segment.color.lane;
        this.drawPolygon(
          segment.p1.screen.x - l1, segment.p1.screen.y,
          segment.p1.screen.x + l1, segment.p1.screen.y,
          segment.p2.screen.x + l2, segment.p2.screen.y,
          segment.p2.screen.x - l2, segment.p2.screen.y
        );
      }

      maxY = segment.p1.screen.y;
    }

    // Render roadside sprites & AI cars from back to front
    for (let n = this.drawDistance - 1; n >= 0; n--) {
      const segment = this.segments[(baseSegment.index + n) % this.segments.length];

      // Draw AI Cars on this segment
      for (const ai of this.aiCars) {
        const aiSegIdx = Math.floor(ai.z / this.segmentLength) % this.segments.length;
        if (aiSegIdx === segment.index) {
          const segPercent = (ai.z % this.segmentLength) / this.segmentLength;
          // Interpolate between p1 and p2 for smooth motion
          const roadW = segment.p1.screen.w + (segment.p2.screen.w - segment.p1.screen.w) * segPercent;
          const roadX = segment.p1.screen.x + (segment.p2.screen.x - segment.p1.screen.x) * segPercent;
          const carX = roadX + (roadW * ai.offset);
          const carY = segment.p1.screen.y + (segment.p2.screen.y - segment.p1.screen.y) * segPercent;
          // Calculate proportional screen scale based on road pixel width
          const carScale = Math.max(0.04, (roadW * 0.32) / 100);
          if (carY > height * 0.35 && carY < height + 80) {
            this.renderAICar(carX, carY, carScale, ai);
          }
        }
      }

      // Draw Roadside sprites
      for (const spr of segment.sprites) {
        const spriteX = segment.p1.screen.x + (segment.p1.screen.w * spr.offset);
        const spriteY = segment.p1.screen.y;
        const spriteScale = Math.max(0.04, (segment.p1.screen.w / 100) * 0.42 * spr.scale);
        if (spriteY > height * 0.35 && spriteY < height + 150) {
          this.renderRoadsideSprite(spriteX, spriteY, spriteScale, spr.type);
        }
      }
    }
  }

  private drawPolygon(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.lineTo(x3, y3);
    this.ctx.lineTo(x4, y4);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderRoadsideSprite(x: number, y: number, scale: number, type: string) {
    if (!this.ctx || scale <= 0.001) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (type === 'PALM') {
      // Stylized Palm Tree
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-6, -100, 12, 100);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, -105, 38, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'NEON_BILLBOARD') {
      // Glowing Neon Billboard
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -110, 16, 110);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-60, -160, 120, 60);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.strokeRect(-60, -160, 120, 60);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AI RUSH', 0, -125);
    } else if (type === 'ARCH') {
      // Massive Overhead Cyber Gateway
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(-220, -180, 28, 180);
      ctx.fillRect(192, -180, 28, 180);
      ctx.fillRect(-220, -200, 440, 30);
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(-200, -192, 400, 12);
      ctx.shadowBlur = 0;
    } else if (type === 'BOOST_PAD') {
      // Road surface boost chevron
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(30, 0);
      ctx.lineTo(15, 0);
      ctx.lineTo(15, 20);
      ctx.lineTo(-15, 20);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-30, 0);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'OIL_SLICK') {
      // Dark reflective oil slick
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 45, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.beginPath();
      ctx.ellipse(5, -2, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'ROCK') {
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(-20, -40);
      ctx.lineTo(10, -50);
      ctx.lineTo(35, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Tree / Building
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.moveTo(0, -90);
      ctx.lineTo(35, 0);
      ctx.lineTo(-35, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private renderAICar(x: number, y: number, scale: number, car: AICar) {
    if (!this.ctx || scale <= 0.005) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 1. Shadow beneath car
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 58, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Underglow Neon (Matching car color)
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = car.color;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 3. Wide Racing Tires
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-54, -22, 14, 26, 4);
    ctx.roundRect(40, -22, 14, 26, 4);
    ctx.fill();

    // 4. Rear Diffuser & Twin Exhaust
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(-42, -18, 84, 18, 3);
    ctx.fill();

    // Chrome Exhaust Tips
    ctx.fillStyle = '#71717a';
    ctx.fillRect(-22, -8, 8, 6);
    ctx.fillRect(14, -8, 8, 6);

    // Dynamic AI Exhaust Flame bursts when speeding
    if (car.speed > car.maxSpeed * 0.5) {
      const flameH = 8 + Math.random() * 14;
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-22, -2);
      ctx.lineTo(-18, flameH);
      ctx.lineTo(-14, -2);
      ctx.moveTo(14, -2);
      ctx.lineTo(18, flameH);
      ctx.lineTo(22, -2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Main Car Chassis
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-46, -46, 92, 36, 8);
    ctx.fill();

    // Lower Aero Skirt
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(-46, -26, 92, 10);

    // 6. Cabin Glass Canopy / Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-30, -68, 60, 26, 7);
    ctx.fill();

    // Glass specular reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-22, -66);
    ctx.lineTo(-4, -66);
    ctx.lineTo(-12, -44);
    ctx.lineTo(-24, -44);
    ctx.closePath();
    ctx.fill();

    // 7. Aerodynamic GT Wing / Spoiler
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(-52, -54, 104, 7, 3);
    ctx.fill();
    // Struts
    ctx.fillRect(-28, -50, 6, 8);
    ctx.fillRect(22, -50, 6, 8);

    // 8. Glowing LED Tail Lights & Lightbar
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(-42, -36, 84, 6, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 9. Floating Holographic Driver Name Tag
    if (scale > 0.07) {
      ctx.save();
      const tagText = `${car.name}`;
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      const textMetrics = ctx.measureText(tagText);
      const bgW = textMetrics.width + 16;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeStyle = car.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-bgW / 2, -88, bgW, 18, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, 0, -79);
      ctx.restore();
    }

    ctx.restore();
  }

  private renderPlayerCar(width: number, height: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const carX = width / 2;
    const carY = height * 0.82;
    const lean = this.playerSteerLean * 24; // Lean roll angle in degrees
    const bounce = Math.sin(performance.now() * 0.03) * (this.playerSpeed > 10 ? 2 : 0);

    ctx.save();
    ctx.translate(carX, carY + bounce);
    ctx.rotate((lean * Math.PI) / 180);

    // 1. Neon Underglow
    ctx.fillStyle = this.playerCar.accentColor;
    ctx.shadowColor = this.playerCar.accentColor;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.ellipse(0, 8, 90, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. Wide Racing Tires
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(-98, -25, 24, 45, 6);
    ctx.roundRect(74, -25, 24, 45, 6);
    ctx.fill();

    // 3. Aerodynamic Rear Diffuser & Exhaust
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(-80, -18, 160, 32, 6);
    ctx.fill();

    // Dual Twin Exhausts
    ctx.fillStyle = '#71717a';
    ctx.fillRect(-35, -2, 14, 10);
    ctx.fillRect(21, -2, 14, 10);

    // 4. Main Chiseled Car Body
    const carGrad = ctx.createLinearGradient(0, -70, 0, 0);
    carGrad.addColorStop(0, this.playerCar.color);
    carGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = carGrad;
    ctx.beginPath();
    ctx.moveTo(-84, -15);
    ctx.lineTo(-76, -55);
    ctx.lineTo(-45, -65);
    ctx.lineTo(45, -65);
    ctx.lineTo(76, -55);
    ctx.lineTo(84, -15);
    ctx.closePath();
    ctx.fill();

    // Accent lines
    ctx.strokeStyle = this.playerCar.accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 5. Cockpit Canopy & Rear Glass
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.moveTo(-45, -65);
    ctx.lineTo(-30, -105);
    ctx.lineTo(30, -105);
    ctx.lineTo(45, -65);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. GT Carbon Wing / Spoiler
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-92, -80, 184, 14);
    ctx.fillStyle = this.playerCar.color;
    ctx.fillRect(-92, -72, 184, 4);

    // Spoiler Struts
    ctx.fillStyle = '#27272a';
    ctx.fillRect(-45, -70, 8, 20);
    ctx.fillRect(37, -70, 8, 20);

    // 7. Active Dynamic Brake / Tail Lights
    const isBraking = controlsBraking();
    ctx.fillStyle = isBraking ? '#ff0033' : '#ef4444';
    ctx.shadowColor = isBraking ? '#ff0033' : '#ef4444';
    ctx.shadowBlur = isBraking ? 25 : 10;

    // Sleek LED Lightbar
    ctx.beginPath();
    ctx.roundRect(-70, -42, 140, isBraking ? 10 : 6, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderSpeedWarp(width: number, height: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.isNitroActive ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;

    const cx = width / 2;
    const cy = height * 0.55;

    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const len = 80 + Math.random() * 120;
      const dist = 140 + Math.random() * 200;

      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const ex = cx + Math.cos(angle) * (dist + len);
      const ey = cy + Math.sin(angle) * (dist + len);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  public getHUDData() {
    const speedRatio = this.playerSpeed / this.maxSpeed;
    const speedMph = Math.round(speedRatio * this.playerCar.topSpeed);
    const rpm = Math.min(9500, Math.round(2000 + speedRatio * 7500));
    const gear = speedMph === 0 ? 'N' : speedMph < 45 ? '1' : speedMph < 90 ? '2' : speedMph < 135 ? '3' : speedMph < 175 ? '4' : speedMph < 210 ? '5' : '6';

    const now = performance.now();
    const currentLapTime = this.lapStartTime > 0 ? (now - this.lapStartTime) / 1000 : 0;
    const totalTime = this.raceStartTime > 0 ? (now - this.raceStartTime) / 1000 : 0;

    return {
      speedMph,
      rpm,
      gear,
      currentLap: this.currentLap,
      totalLaps: this.currentTrack.laps,
      lapProgress: (this.playerZ / this.trackLength) * 100,
      currentLapTime,
      bestLapTime: this.bestLapTime,
      totalTime,
      nitroFuel: this.nitroFuel,
      isNitroActive: this.isNitroActive,
      isDrifting: this.isDrifting,
      driftScore: this.driftScore,
      rank: this.playerRank,
      totalRacers: this.totalRacers,
      score: this.totalScore,
      isOffRoad: this.playerX < -1 || this.playerX > 1,
    };
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    sound.stopEngine();
  }
}

// Global helper for quick brake state
let currentBrakeState = false;
export function setControlsBraking(braking: boolean) {
  currentBrakeState = braking;
}
export function controlsBraking() {
  return currentBrakeState;
}
