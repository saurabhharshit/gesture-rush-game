import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, Hand, RefreshCw, Sliders, Zap } from 'lucide-react';
import { GestureControls } from '../types';
import { HandLandmarks } from '../utils/handTracker';

interface CameraTrackerOverlayProps {
  controls: GestureControls;
  landmarks: HandLandmarks | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCameraActive: boolean;
  onOpenCalibration: () => void;
  onRequestCamera: () => void;
}

export const CameraTrackerOverlay: React.FC<CameraTrackerOverlayProps> = ({
  controls,
  landmarks,
  videoRef,
  isCameraActive,
  onOpenCalibration,
  onRequestCamera,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Draw hand skeleton landmarks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    // Connections between landmarks for hand skeleton
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17], // Palm base
    ];

    const w = canvas.width;
    const h = canvas.height;

    // Draw Skeleton bones
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = controls.isNitro ? '#f59e0b' : controls.isBraking ? '#ef4444' : '#06b6d4';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;

    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // Draw Joint Dots
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.fillStyle = isTip ? '#ffffff' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isTip ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [landmarks, controls.isNitro, controls.isBraking]);

  return (
    <div
      id="camera-tracker-container"
      className={`fixed top-20 right-4 sm:right-8 z-40 transition-all duration-300 ${
        isMinimized ? 'w-14 h-14' : 'w-60 sm:w-64'
      }`}
    >
      <div
        id="camera-tracker-card"
        className={`relative overflow-hidden rounded-xl border backdrop-blur-xl shadow-2xl p-3.5 flex flex-col gap-2.5 transition-all duration-150 ${
          controls.isNitro
            ? 'border-amber-400/80 bg-amber-950/40 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
            : controls.isBraking
            ? 'border-rose-500/80 bg-rose-950/40 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
            : 'border-white/10 bg-black/60'
        }`}
      >
        {/* Header bar */}
        <div id="camera-header" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full ${controls.handDetected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
            {!isMinimized && (
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-tighter font-tech">
                AI Vision Feed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <button
                id="btn-calibrate"
                onClick={onOpenCalibration}
                title="Calibrate Controls"
                className="p-1 text-white/40 hover:text-cyan-300 hover:bg-white/5 rounded transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              id="btn-toggle-cam-view"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-white/40 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              {isMinimized ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Video & Skeleton Viewport */}
            <div className="relative aspect-video w-full bg-[#111] rounded-lg overflow-hidden border border-cyan-500/30">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1] opacity-75"
              />
              <canvas
                ref={canvasRef}
                width={240}
                height={135}
                className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
              />

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/85 gap-2">
                  <Camera className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <p className="text-[10px] text-white/60">Camera required for gesture steering</p>
                  <button
                    id="btn-request-camera"
                    onClick={onRequestCamera}
                    className="px-2.5 py-1 text-[10px] font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded transition-all shadow-md font-racing uppercase"
                  >
                    Enable Camera
                  </button>
                </div>
              )}

              {/* Real-time Status Badges on Camera Screen */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  {controls.handDetected ? 'HAND_DETECTED' : 'SEARCHING'}
                </span>
                <span className="text-[8px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded font-mono">
                  LATENCY: 4ms
                </span>
              </div>
            </div>

            {/* Live Gesture & Steering Status */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-white/40 uppercase tracking-wider font-tech">GESTURE</span>
                <span className="font-bold text-cyan-400 font-racing">
                  {controls.gestureName.replace('_', ' ')}
                </span>
              </div>

              <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-75 ${
                    controls.isNitro ? 'bg-amber-400' : controls.isBraking ? 'bg-rose-500' : 'bg-cyan-500'
                  }`}
                  style={{
                    width: `${Math.max(10, Math.abs(controls.steer) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
