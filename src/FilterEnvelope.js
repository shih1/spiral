import React, { useMemo } from 'react';
import { Zap, RotateCcw, Power } from 'lucide-react';

const DEFAULTS = {
  active: true,
  amount: 2000,
  attack: 0.1,
  decay: 0.5,
  sustain: 0.3,
  release: 1.2,
};

const FilterEnvelope = ({ filterEnv, setFilterEnv, className = '' }) => {
  // 1. Handle state updates
  const handleChange = (key, value) => {
    setFilterEnv((prev) => ({ ...prev, [key]: value }));
  };

  // 2. Reset Function
  const handleReset = () => {
    setFilterEnv(DEFAULTS);
  };

  // Toggle Function
  const toggleActive = () => {
    handleChange('active', !filterEnv.active);
  };

  // Helper for background gradients
  const getLinearBg = (val, max, min = 0) => {
    const percentage = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, #eab308 0%, #eab308 ${percentage}%, #111827 ${percentage}%, #111827 100%)`;
  };

  return (
    <div
      className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-2xl transition-opacity ${
        !filterEnv.active ? 'opacity-60' : 'opacity-100'
      } ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={18} className={filterEnv.active ? 'text-yellow-400' : 'text-gray-600'} />
          <h3 className="text-white font-bold text-sm tracking-tight uppercase">Filter Env</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Reset to Default"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={toggleActive}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
              filterEnv.active ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'
            }`}
          >
            <Power size={10} />
            {filterEnv.active ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* PARAMETER GRID */}
      <div className="space-y-4">
        {/* Amount Slider (Bipolar) */}
        <div className="group">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">
              Mod Amount
            </label>
            <span className="text-yellow-400 text-xs font-mono bg-black/30 px-1.5 rounded">
              {filterEnv.amount > 0 ? '+' : ''}
              {Math.round(filterEnv.amount)} Hz
            </span>
          </div>
          <input
            type="range"
            min="-10000"
            max="10000"
            step="50"
            value={filterEnv.amount}
            onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
            style={{
              background: `linear-gradient(to right, #1f2937 0%, #1f2937 50%, #eab308 50%, #eab308 ${
                50 + (filterEnv.amount / 20000) * 50
              }%, #1f2937 ${50 + (filterEnv.amount / 20000) * 50}%, #1f2937 100%)`,
            }}
          />
        </div>

        {/* ADSR Controls */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { id: 'attack', label: 'Attack', max: 5 },
            { id: 'decay', label: 'Decay', max: 5 },
            { id: 'sustain', label: 'Sustain', max: 1 },
            { id: 'release', label: 'Release', max: 5 },
          ].map((param) => (
            <div key={param.id}>
              <div className="flex justify-between mb-1">
                <label className="text-gray-500 text-[9px] font-bold uppercase">
                  {param.label}
                </label>
                <span className="text-yellow-500/80 text-[10px] font-mono">
                  {param.id === 'sustain'
                    ? `${Math.round(filterEnv[param.id] * 100)}%`
                    : filterEnv[param.id] < 1
                    ? `${(filterEnv[param.id] * 1000).toFixed(0)}ms`
                    : `${filterEnv[param.id].toFixed(1)}s`}
                </span>
              </div>
              <input
                type="range"
                min="0.001"
                max={param.max}
                step="0.001"
                value={filterEnv[param.id]}
                onChange={(e) => handleChange(param.id, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                style={{ background: getLinearBg(filterEnv[param.id], param.max) }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* VISUALIZER */}
      <div className="mt-6 h-20 bg-black/40 rounded-lg border border-gray-900 relative overflow-hidden group">
        <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
          <path
            d={`
              M 0,60 
              L ${filterEnv.attack * 15},10 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15},${60 - 50 * filterEnv.sustain} 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15 + 40},${60 - 50 * filterEnv.sustain} 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15 + 40 + filterEnv.release * 15},60
            `}
            fill="none"
            stroke="#eab308"
            strokeWidth="2"
            className="transition-all duration-200"
          />
          <path
            d={`
              M 0,60 
              L ${filterEnv.attack * 15},10 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15},${60 - 50 * filterEnv.sustain} 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15 + 40},${60 - 50 * filterEnv.sustain} 
              L ${filterEnv.attack * 15 + filterEnv.decay * 15 + 40 + filterEnv.release * 15},60
              V 60 H 0 Z
            `}
            fill="url(#envGradient)"
            className="transition-all duration-200"
          />
          <defs>
            <linearGradient id="envGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex justify-around items-end pb-1 pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity">
          <span className="text-[8px] text-white font-mono">A</span>
          <span className="text-[8px] text-white font-mono">D</span>
          <span className="text-[8px] text-white font-mono">S</span>
          <span className="text-[8px] text-white font-mono">R</span>
        </div>
      </div>
    </div>
  );
};

export default FilterEnvelope;
