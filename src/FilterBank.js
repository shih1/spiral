import React, { useMemo } from 'react';
import { Filter, Power, Zap } from 'lucide-react';

const FilterBank = ({ filter, setFilter, className = '' }) => {
  const filterTypes = [
    { value: 'lowpass', label: 'LP' },
    { value: 'highpass', label: 'HP' },
    { value: 'bandpass', label: 'BP' },
    { value: 'notch', label: 'NT' },
  ];

  const handleChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  // Graphical EQ Visual Logic
  const curvePath = useMemo(() => {
    const width = 300;
    const height = 100;
    // Logarithmic frequency mapping for the X-axis
    const freqX = (Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * width;
    // Scale resonance height based on Q
    const qHeight = Math.min(height * 0.8, (filter.Q / 30) * height * 1.5);

    if (filter.type === 'lowpass') {
      return `M 0 50 L ${freqX - 30} 50 Q ${freqX} 50, ${freqX} ${50 - qHeight} Q ${freqX} 100, ${
        freqX + 70
      } 100 L ${width} 100`;
    } else if (filter.type === 'highpass') {
      return `M 0 100 L ${freqX - 70} 100 Q ${freqX} 100, ${freqX} ${50 - qHeight} Q ${freqX} 50, ${
        freqX + 30
      } 50 L ${width} 50`;
    } else if (filter.type === 'bandpass') {
      return `M 0 100 L ${freqX - 45} 100 Q ${freqX} 100, ${freqX} ${
        50 - qHeight
      } Q ${freqX} 100, ${freqX + 45} 100 L ${width} 100`;
    } else {
      // Notch
      return `M 0 50 L ${freqX - 25} 50 Q ${freqX} 50, ${freqX} 95 Q ${freqX} 50, ${
        freqX + 25
      } 50 L ${width} 50`;
    }
  }, [filter.frequency, filter.Q, filter.type]);

  return (
    <div
      className={`bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-2xl w-64 ${className}`}
    >
      {/* Header with Power Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className={filter.enabled ? 'text-purple-400' : 'text-gray-600'} />
          <h3 className="text-white font-bold text-[10px] uppercase tracking-widest">
            Filter Bank
          </h3>
        </div>
        <button
          onClick={() => handleChange('enabled', !filter.enabled)}
          className={`p-1.5 rounded-md transition-all ${
            filter.enabled
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
              : 'bg-gray-900 text-gray-600 border border-gray-700'
          }`}
        >
          <Power size={14} />
        </button>
      </div>

      {/* Parametric EQ Visualizer */}
      <div className="relative h-28 bg-gray-950 rounded-lg border border-gray-900 mb-5 overflow-hidden shadow-inner">
        <div className="absolute inset-0 grid grid-cols-6 opacity-[0.03] pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-r border-purple-300 h-full" />
          ))}
        </div>

        {filter.enabled ? (
          <svg viewBox="0 0 300 100" className="w-full h-full">
            <defs>
              <linearGradient id="filterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${curvePath} V 100 H 0 Z`}
              fill="url(#filterGrad)"
              className="transition-all duration-300 ease-in-out"
            />
            <path
              d={curvePath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-300 ease-in-out"
            />
            {/* The peak indicator node */}
            <circle
              cx={(Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * 300}
              cy={50 - (filter.type === 'notch' ? -45 : (filter.Q / 30) * 40)}
              r="3.5"
              className="fill-purple-300 shadow-lg animate-pulse"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-800 tracking-[0.3em] uppercase">
              Bypass
            </span>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* Filter Type Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {filterTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleChange('type', type.value)}
              className={`py-1.5 rounded text-[9px] font-black transition-all ${
                filter.type === type.value
                  ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                  : 'bg-gray-900 text-gray-500 hover:bg-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Frequency Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-gray-500">Frequency</span>
            <span className="text-purple-400 font-mono">{Math.round(filter.frequency)}Hz</span>
          </div>
          <input
            type="range"
            min="20"
            max="20000"
            step="1"
            value={filter.frequency}
            onChange={(e) => handleChange('frequency', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${
                ((filter.frequency - 20) / 19980) * 100
              }%, #111827 ${((filter.frequency - 20) / 19980) * 100}%, #111827 100%)`,
            }}
          />
        </div>

        {/* Resonance Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-gray-500">Resonance</span>
            <span className="text-purple-400 font-mono">{filter.Q.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="30"
            step="0.1"
            value={filter.Q}
            onChange={(e) => handleChange('Q', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${
                ((filter.Q - 0.1) / 29.9) * 100
              }%, #111827 ${((filter.Q - 0.1) / 29.9) * 100}%, #111827 100%)`,
            }}
          />
        </div>

        {/* NEW: Drive Slider */}
        <div className="space-y-1.5 pt-2 border-t border-gray-700/50">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <div className="flex items-center gap-1 text-gray-500">
              <Zap size={10} className={filter.drive > 0 ? 'text-orange-400' : ''} />
              <span>Drive</span>
            </div>
            <span className="text-orange-400 font-mono">{Math.round(filter.drive || 0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={filter.drive || 0}
            onChange={(e) => handleChange('drive', parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
            style={{
              background: `linear-gradient(to right, #fb923c 0%, #fb923c ${
                filter.drive || 0
              }%, #111827 ${filter.drive || 0}%, #111827 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBank;

