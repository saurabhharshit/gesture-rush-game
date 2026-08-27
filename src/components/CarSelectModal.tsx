import React from 'react';
import { Award, Compass, Flame, Gauge, Shield, Sparkles, X, Zap } from 'lucide-react';
import { CarStats } from '../types';
import { CARS } from '../engine/trackData';

interface CarSelectModalProps {
  selectedCar: CarStats;
  onSelectCar: (car: CarStats) => void;
  onClose: () => void;
}

export const CarSelectModal: React.FC<CarSelectModalProps> = ({
  selectedCar,
  onSelectCar,
  onClose,
}) => {
  return (
    <div id="car-select-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="car-select-card"
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/85 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-racing text-white uppercase tracking-wide">Garage & Vehicle Selection</h2>
              <p className="text-xs text-white/50">Choose your racing chassis with tuned aerodynamics</p>
            </div>
          </div>
          <button
            id="btn-close-car-select"
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Car Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CARS.map((car) => {
            const isSelected = selectedCar.id === car.id;
            return (
              <div
                key={car.id}
                id={`car-card-${car.id}`}
                onClick={() => onSelectCar(car)}
                className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col gap-3.5 relative overflow-hidden ${
                  isSelected
                    ? 'bg-black/90 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                    : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                {/* Neon Glow */}
                <div
                  className="absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
                  style={{ backgroundColor: car.color }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold font-racing text-white group-hover:text-cyan-300 transition-colors">
                      {car.name}
                    </h3>
                    <span className="text-[10px] text-white/50 font-tech uppercase tracking-wider">
                      {car.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-md"
                      style={{ backgroundColor: car.color }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-md"
                      style={{ backgroundColor: car.accentColor }}
                    />
                  </div>
                </div>

                {/* Stats Bars */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* Top Speed */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                        Top Speed
                      </span>
                      <span className="font-mono font-bold text-cyan-400">{car.topSpeed} MPH</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${(car.topSpeed / 240) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Acceleration */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Acceleration
                      </span>
                      <span className="font-mono font-bold text-amber-400">{car.acceleration}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${car.acceleration}%` }}
                      />
                    </div>
                  </div>

                  {/* Handling */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-emerald-400" />
                        Handling
                      </span>
                      <span className="font-mono font-bold text-emerald-400">{car.handling}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${car.handling}%` }}
                      />
                    </div>
                  </div>

                  {/* Nitro Boost Power */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] text-white/70">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        Boost Efficiency
                      </span>
                      <span className="font-mono font-bold text-rose-400">{car.nitroPower}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${car.nitroPower}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            id="btn-confirm-car"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-racing text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            Select Vehicle
          </button>
        </div>
      </div>
    </div>
  );
};
