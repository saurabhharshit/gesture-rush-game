import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { CalibrationSettings, GestureControls } from '../types';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type HandLandmarks = Landmark[];

export class HandTrackerService {
  private videoElement: HTMLVideoElement | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private isModelLoading: boolean = false;
  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private lastVideoTime: number = -1;

  // Smoothing buffers
  private smoothedSteer: number = 0;
  private smoothedFistRatio: number = 0;
  private smoothedHandScale: number = 0.2;
  private smoothedHandX: number = 0.5;
  private smoothedHandY: number = 0.5;

  // Fallback canvas context for optical motion/color centroid
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;

  private latestLandmarks: HandLandmarks | null = null;
  private latestControls: GestureControls = {
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
  };

  private settings: CalibrationSettings = {
    deadzone: 0.08,
    sensitivity: 1.25,
    fistThreshold: 0.62,
    boostThreshold: 0.45,
    invertSteer: false,
    mirrorCamera: true,
    controlMode: 'GESTURE',
  };

  private onFrameCallback?: (controls: GestureControls, landmarks: HandLandmarks | null) => void;

  public updateSettings(newSettings: Partial<CalibrationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): CalibrationSettings {
    return { ...this.settings };
  }

  public setOnFrameCallback(callback: (controls: GestureControls, landmarks: HandLandmarks | null) => void) {
    this.onFrameCallback = callback;
  }

  public async initialize(video: HTMLVideoElement): Promise<boolean> {
    this.videoElement = video;

    try {
      // 1. Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      this.stream = stream;
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.isRunning = true;
      this.isInitialized = true;

      // 2. Setup fallback optical processor
      this.initFallbackCanvas();

      // 3. Start render loop
      this.startLoop();

      // 4. Asynchronously initialize modern HandLandmarker
      this.initHandLandmarker();

      return true;
    } catch (err) {
      console.warn('Camera access error:', err);
      this.isRunning = true;
      return false;
    }
  }

  private initFallbackCanvas() {
    if (!this.fallbackCanvas) {
      this.fallbackCanvas = document.createElement('canvas');
      this.fallbackCanvas.width = 160;
      this.fallbackCanvas.height = 120;
      this.fallbackCtx = this.fallbackCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  private async initHandLandmarker(): Promise<void> {
    if (this.isModelLoading || this.handLandmarker) return;
    this.isModelLoading = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      console.log('MediaPipe HandLandmarker loaded successfully with GPU delegate.');
    } catch (gpuErr) {
      console.warn('GPU delegate failed for HandLandmarker, attempting CPU delegate:', gpuErr);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        console.log('MediaPipe HandLandmarker loaded with CPU delegate.');
      } catch (cpuErr) {
        console.warn('HandLandmarker initialization failed, running in optical fallback mode:', cpuErr);
      }
    } finally {
      this.isModelLoading = false;
    }
  }

  private startLoop() {
    const loop = () => {
      if (!this.isRunning) return;

      if (this.videoElement && this.videoElement.readyState >= 2) {
        if (this.handLandmarker) {
          try {
            if (this.videoElement.currentTime !== this.lastVideoTime) {
              this.lastVideoTime = this.videoElement.currentTime;
              const startTimeMs = performance.now();
              const results = this.handLandmarker.detectForVideo(this.videoElement, startTimeMs);

              if (results && results.landmarks && results.landmarks.length > 0) {
                this.processLandmarks(results.landmarks[0]);
              } else {
                this.handleNoHandDetected();
              }
            }
          } catch {
            this.processFallbackFrame();
          }
        } else {
          this.processFallbackFrame();
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private processFallbackFrame() {
    if (!this.videoElement || !this.fallbackCtx || !this.fallbackCanvas) return;

    try {
      this.fallbackCtx.drawImage(this.videoElement, 0, 0, this.fallbackCanvas.width, this.fallbackCanvas.height);
      const imgData = this.fallbackCtx.getImageData(0, 0, this.fallbackCanvas.width, this.fallbackCanvas.height);
      const data = imgData.data;

      let totalX = 0;
      let totalY = 0;
      let skinPixels = 0;

      for (let i = 0; i < data.length; i += 8) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 60 && g > 40 && b > 20 && r > g && r > b && r - g >= 15 && Math.abs(r - g) > 10) {
          const pixelIndex = i / 4;
          const x = pixelIndex % this.fallbackCanvas.width;
          const y = Math.floor(pixelIndex / this.fallbackCanvas.width);
          totalX += x;
          totalY += y;
          skinPixels++;
        }
      }

      if (skinPixels > 120) {
        const avgX = totalX / skinPixels / this.fallbackCanvas.width;
        const avgY = totalY / skinPixels / this.fallbackCanvas.height;

        let rawSteer = (avgX - 0.5) * 2.2;
        if (this.settings.mirrorCamera) rawSteer = -rawSteer;
        if (this.settings.invertSteer) rawSteer = -rawSteer;

        this.smoothedSteer = this.smoothedSteer * 0.75 + rawSteer * 0.25;

        const isBraking = avgY > 0.76;
        // Nitro only on dramatic forward push close to camera
        const isNitro = skinPixels > 950;

        let gestureName: GestureControls['gestureName'] = 'NEUTRAL';
        if (isNitro) gestureName = 'NITRO_BOOST';
        else if (isBraking) gestureName = 'BRAKE_DRIFT';
        else if (this.smoothedSteer < -0.15) gestureName = 'STEER_LEFT';
        else if (this.smoothedSteer > 0.15) gestureName = 'STEER_RIGHT';

        this.latestControls = {
          handDetected: true,
          steer: Math.max(-1, Math.min(1, this.smoothedSteer * this.settings.sensitivity)),
          rawSteer,
          isBraking,
          isNitro,
          gestureName,
          confidence: Math.min(1, skinPixels / 1500),
          handX: avgX,
          handY: avgY,
          handTilt: 0,
          fistRatio: isBraking ? 0.8 : 0.2,
          handScale: Math.min(1, skinPixels / 2000),
        };

        if (this.onFrameCallback) {
          this.onFrameCallback(this.latestControls, null);
        }
      } else {
        this.handleNoHandDetected();
      }
    } catch {
      this.handleNoHandDetected();
    }
  }

  private handleNoHandDetected() {
    this.latestLandmarks = null;
    this.smoothedSteer *= 0.8;
    this.latestControls = {
      ...this.latestControls,
      handDetected: false,
      steer: Math.abs(this.smoothedSteer) < 0.01 ? 0 : this.smoothedSteer,
      gestureName: 'NEUTRAL',
      isBraking: false,
      isNitro: false,
      confidence: 0,
    };
    if (this.onFrameCallback) {
      this.onFrameCallback(this.latestControls, null);
    }
  }

  private processLandmarks(landmarks: HandLandmarks) {
    this.latestLandmarks = landmarks;

    // Landmark indices:
    // 0: Wrist
    // 4: Thumb tip
    // 5: Index MCP, 8: Index tip
    // 9: Middle MCP, 12: Middle tip
    // 13: Ring MCP, 16: Ring tip
    // 17: Pinky MCP, 20: Pinky tip
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const middleTip = landmarks[12];
    const middleMcp = landmarks[9];
    const ringTip = landmarks[16];
    const ringMcp = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMcp = landmarks[17];

    if (!wrist || !indexTip || !indexMcp || !middleTip || !middleMcp || !ringTip || !ringMcp || !pinkyTip || !pinkyMcp) {
      this.handleNoHandDetected();
      return;
    }

    // Palm Center
    const palmX = (wrist.x + indexMcp.x + pinkyMcp.x + middleMcp.x) / 4;
    const palmY = (wrist.y + indexMcp.y + pinkyMcp.y + middleMcp.y) / 4;

    // Fist / Open hand ratio
    const dWristMcp = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);
    const dIndex = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
    const dMiddle = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const dRing = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
    const dPinky = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

    const avgTipDistance = (dIndex + dMiddle + dRing + dPinky) / 4;
    const ratio = Math.max(0, Math.min(1, 1 - (avgTipDistance - dWristMcp * 0.8) / (dWristMcp * 1.5)));
    this.smoothedFistRatio = this.smoothedFistRatio * 0.65 + ratio * 0.35;

    // Hand Tilt angle (wrist to middle MCP vector angle in degrees)
    const dx = middleMcp.x - wrist.x;
    const dy = middleMcp.y - wrist.y;
    const angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);

    // Steer calculation: Combination of hand position X in frame and tilt angle
    const normalizedX = palmX;
    let posSteer = (normalizedX - 0.5) * 2.4;
    let tiltSteer = angleDeg / 40;

    if (this.settings.mirrorCamera) {
      posSteer = -posSteer;
      tiltSteer = -tiltSteer;
    }
    if (this.settings.invertSteer) {
      posSteer = -posSteer;
      tiltSteer = -tiltSteer;
    }

    let rawSteer = (posSteer * 0.65 + tiltSteer * 0.35) * this.settings.sensitivity;

    if (Math.abs(rawSteer) < this.settings.deadzone) {
      rawSteer = 0;
    } else {
      const sign = Math.sign(rawSteer);
      rawSteer = sign * ((Math.abs(rawSteer) - this.settings.deadzone) / (1 - this.settings.deadzone));
    }
    rawSteer = Math.max(-1, Math.min(1, rawSteer));

    this.smoothedSteer = this.smoothedSteer * 0.72 + rawSteer * 0.28;
    this.smoothedHandX = this.smoothedHandX * 0.75 + palmX * 0.25;
    this.smoothedHandY = this.smoothedHandY * 0.75 + palmY * 0.25;

    const handLength = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
    const handSpan = Math.hypot(pinkyTip.x - landmarks[4].x, pinkyTip.y - landmarks[4].y);
    const currentScale = Math.max(handLength * 0.9, handSpan * 0.75);
    this.smoothedHandScale = this.smoothedHandScale * 0.75 + currentScale * 0.25;

    const isBraking = this.smoothedFistRatio >= this.settings.fistThreshold;
    const isOpenHand = this.smoothedFistRatio < 0.42;

    // 1. Forward thrust: Moving open palm close towards camera (hand scale grows)
    const isForwardThrust = this.smoothedHandScale >= this.settings.boostThreshold && isOpenHand;

    // 2. Pointing Index Finger: Index finger extended while middle, ring, and pinky are curled in
    const isIndexExtended = dIndex > dWristMcp * 1.28;
    const isMiddleCurled = dMiddle < dWristMcp * 1.24;
    const isRingCurled = dRing < dWristMcp * 1.2;
    const isPinkyCurled = dPinky < dWristMcp * 1.2;
    const isPointingIndex = isIndexExtended && isMiddleCurled && isRingCurled && !isBraking;

    // Nitro Boost triggers ONLY on forward palm thrust towards camera OR pointing index finger
    const isNitro = !isBraking && (isForwardThrust || isPointingIndex);

    let gestureName: GestureControls['gestureName'] = 'NEUTRAL';
    if (isNitro) {
      gestureName = 'NITRO_BOOST';
    } else if (isBraking) {
      gestureName = 'BRAKE_DRIFT';
    } else if (this.smoothedSteer < -0.2) {
      gestureName = 'STEER_LEFT';
    } else if (this.smoothedSteer > 0.2) {
      gestureName = 'STEER_RIGHT';
    }

    this.latestControls = {
      handDetected: true,
      steer: this.smoothedSteer,
      rawSteer,
      isBraking,
      isNitro,
      gestureName,
      confidence: 0.95,
      handX: this.smoothedHandX,
      handY: this.smoothedHandY,
      handTilt: angleDeg,
      fistRatio: this.smoothedFistRatio,
      handScale: this.smoothedHandScale,
    };

    if (this.onFrameCallback) {
      this.onFrameCallback(this.latestControls, this.latestLandmarks);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.handLandmarker) {
      try {
        this.handLandmarker.close();
      } catch {
        // Safe ignore
      }
      this.handLandmarker = null;
    }
  }
}

export const handTracker = new HandTrackerService();
