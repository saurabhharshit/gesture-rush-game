import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Flame, Hand, Keyboard, ShieldAlert } from 'lucide-react';
import { GestureControls } from '../types';

interface VirtualControlsProps {
  onVirtualInput: (update: Partial<GestureControls>) => void;
  isEnabled: boolean;
  onToggleEnabled: () => void;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onVirtualInput,
  isEnabled,
  onToggleEnabled,
}) => {
  const activeKeys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrow keys and space
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      activeKeys.current[e.key.toLowerCase()] = true;
      activeKeys.current[e.code] = true;
      processKeyInputs();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current[e.key.toLowerCase()] = false;
      activeKeys.current[e.code] = false;
      processKeyInputs();
    };

    const processKeyInputs = () => {
      const keys = activeKeys.current;
      let steer = 0;
      if (keys['arrowleft'] || keys['a'] || keys['keya']) steer -= 0.85;
      if (keys['arrowright'] || keys['d'] || keys['keyd']) steer += 0.85;

      const isBraking = Boolean(keys['arrowdown'] || keys['s'] || keys['keys'] || keys[' '] || keys['space']);
      const isNitro = Boolean(keys['arrowup'] || keys['w'] || keys['keyw'] || keys['shiftleft'] || keys['shiftright']);

      let gestureName: GestureControls['gestureName'] = 'NEUTRAL';
      if (isNitro) gestureName = 'NITRO_BOOST';
      else if (isBraking) gestureName = 'BRAKE_DRIFT';
      else if (steer < -0.1) gestureName = 'STEER_LEFT';
      else if (steer > 0.1) gestureName = 'STEER_RIGHT';

      if (steer !== 0 || isBraking || isNitro) {
        onVirtualInput({
          handDetected: true,
          steer,
          isBraking,
          isNitro,
          gestureName,
          confidence: 1,
          fistRatio: isBraking ? 1 : 0,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onVirtualInput]);

  return (
    <>
      {/* On-screen touch buttons for mobile / quick testing */}
      {isEnabled && (
        <div id="virtual-touch-controls" className="fixed inset-x-0 bottom-6 z-40 px-6 flex justify-between pointer-events-none select-none">
          {/* Left / Right Steering Pads */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              id="btn-touch-steer-left"
              onTouchStart={() => onVirtualInput({ steer: -0.9, gestureName: 'STEER_LEFT', handDetected: true })}
              onTouchEnd={() => onVirtualInput({ steer: 0, gestureName: 'NEUTRAL' })}
              onMouseDown={() => onVirtualInput({ steer: -0.9, gestureName: 'STEER_LEFT', handDetected: true })}
              onMouseUp={() => onVirtualInput({ steer: 0, gestureName: 'NEUTRAL' })}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-cyan-500/30 text-cyan-400 border border-white/10 hover:border-cyan-500/50 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform active:scale-95"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <button
              id="btn-touch-steer-right"
              onTouchStart={() => onVirtualInput({ steer: 0.9, gestureName: 'STEER_RIGHT', handDetected: true })}
              onTouchEnd={() => onVirtualInput({ steer: 0, gestureName: 'NEUTRAL' })}
              onMouseDown={() => onVirtualInput({ steer: 0.9, gestureName: 'STEER_RIGHT', handDetected: true })}
              onMouseUp={() => onVirtualInput({ steer: 0, gestureName: 'NEUTRAL' })}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-cyan-500/30 text-cyan-400 border border-white/10 hover:border-cyan-500/50 backdrop-blur-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform active:scale-95"
            >
              <ArrowRight className="w-8 h-8" />
            </button>
          </div>

          {/* Brake & Nitro Pads */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <button
              id="btn-touch-brake"
              onTouchStart={() => onVirtualInput({ isBraking: true, gestureName: 'BRAKE_DRIFT', fistRatio: 0.9, handDetected: true })}
              onTouchEnd={() => onVirtualInput({ isBraking: false, gestureName: 'NEUTRAL', fistRatio: 0 })}
              onMouseDown={() => onVirtualInput({ isBraking: true, gestureName: 'BRAKE_DRIFT', fistRatio: 0.9, handDetected: true })}
              onMouseUp={() => onVirtualInput({ isBraking: false, gestureName: 'NEUTRAL', fistRatio: 0 })}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-rose-500/30 text-rose-400 border border-white/10 hover:border-rose-500/50 backdrop-blur-2xl flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform active:scale-95 font-racing"
            >
              <Hand className="w-6 h-6" />
              <span className="text-[10px] font-bold">BRAKE</span>
            </button>
            <button
              id="btn-touch-nitro"
              onTouchStart={() => onVirtualInput({ isNitro: true, gestureName: 'NITRO_BOOST', handDetected: true })}
              onTouchEnd={() => onVirtualInput({ isNitro: false, gestureName: 'NEUTRAL' })}
              onMouseDown={() => onVirtualInput({ isNitro: true, gestureName: 'NITRO_BOOST', handDetected: true })}
              onMouseUp={() => onVirtualInput({ isNitro: false, gestureName: 'NEUTRAL' })}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/80 active:bg-amber-500/30 text-amber-400 border border-white/10 hover:border-amber-500/50 backdrop-blur-2xl flex flex-col items-center justify-center gap-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform active:scale-95 font-racing"
            >
              <Flame className="w-6 h-6" />
              <span className="text-[10px] font-bold">BOOST</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
