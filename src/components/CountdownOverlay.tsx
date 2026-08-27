import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/sound';

interface CountdownOverlayProps {
  onComplete: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ onComplete }) => {
  const [count, setCount] = useState<number>(3);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    sound.playCountdownBeep(false);

    const timer1 = setTimeout(() => {
      setCount(2);
      sound.playCountdownBeep(false);
    }, 1000);

    const timer2 = setTimeout(() => {
      setCount(1);
      sound.playCountdownBeep(false);
    }, 2000);

    const timer3 = setTimeout(() => {
      setCount(0); // GO!
      sound.playCountdownBeep(true);
      sound.startEngine();
    }, 3000);

    const timer4 = setTimeout(() => {
      onCompleteRef.current();
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  return (
    <div id="countdown-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none select-none">
      <div className="flex flex-col items-center gap-4 animate-scale-in">
        {count > 0 ? (
          <div key={`count-${count}`} className="flex flex-col items-center animate-pulse">
            <span className="text-8xl sm:text-9xl font-black font-racing tracking-tight text-white drop-shadow-[0_0_35px_rgba(6,182,212,0.9)]">
              {count}
            </span>
            <span className="text-sm font-bold font-racing uppercase tracking-widest text-cyan-400 mt-2">
              GET READY • HANDS IN SIGHT
            </span>
          </div>
        ) : (
          <div key="count-go" className="flex flex-col items-center animate-bounce">
            <span className="text-8xl sm:text-9xl font-black font-racing tracking-tight text-amber-400 drop-shadow-[0_0_45px_rgba(245,158,11,1)]">
              GO!
            </span>
            <span className="text-sm font-bold font-racing uppercase tracking-widest text-emerald-400 mt-2">
              RACE ACTIVE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

