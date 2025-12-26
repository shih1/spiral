import React from 'react';
import { RotateCcw, Power } from 'lucide-react';

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
    return `linear-gradient(to right, #22d3ee 0%, #22d3ee ${percentage}%, #1f2937 ${percentage}%, #1f2937 100%)`;
  };

  return (
    <div
      className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-5 border border-gray-700 shadow-xl ${className}`}
    >
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 font-semibold text-sm">FILTER ENVELOPE</h3>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200 transition-colors"
            title="Reset to Default"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={toggleActive}
            className={`p-1.5 rounded transition-all ${
              filterEnv.active
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}
          >
            <Power size={14} />
          </button>
        </div>
      </div>

      {/* PARAMETER GRID */}
      <div
        className={`space-y-4 transition-opacity ${
          filterEnv.active ? 'opacity-100' : 'opacity-30'
        }`}
      >
        {/* Amount Slider (Bipolar) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-xs font-medium">Mod Amount</label>
            <span className="text-cyan-400 text-xs font-mono">
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
            disabled={!filterEnv.active}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #1f2937 0%, #1f2937 50%, #22d3ee 50%, #22d3ee ${
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
              <div className="flex justify-between mb-1.5">
                <label className="text-gray-400 text-xs font-medium">{param.label}</label>
                <span className="text-cyan-400 text-xs font-mono">
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
                disabled={!filterEnv.active}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
                style={{ background: getLinearBg(filterEnv[param.id], param.max) }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* VISUALIZER */}
      <div className="mt-5 h-20 bg-black rounded-lg border border-gray-700 relative overflow-hidden">
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
            stroke="#22d3ee"
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
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex justify-around items-end pb-1 pointer-events-none opacity-20">
          <span className="text-xs text-gray-400 font-mono">A</span>
          <span className="text-xs text-gray-400 font-mono">D</span>
          <span className="text-xs text-gray-400 font-mono">S</span>
          <span className="text-xs text-gray-400 font-mono">R</span>
        </div>
      </div>
    </div>
  );
};

export default FilterEnvelope;
