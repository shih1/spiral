import React, { useMemo } from 'react';
import { Power, Zap } from 'lucide-react';

const FilterBank = ({ filter, setFilter, className = '' }) => {
  const filterTypes = [
    { value: 'lowpass', label: 'LP' },
    { value: 'highpass', label: 'HP' },
    { value: 'bandpass', label: 'BP' },
    { value: 'notch', label: 'NT' },
  ];

  // Helper functions for Logarithmic Conversion
  const logScale = (value, min, max) => {
    const minLog = Math.log(min);
    const maxLog = Math.log(max);
    const scale = (maxLog - minLog) / 100;
    return Math.exp(minLog + scale * value);
  };

  const inverseLogScale = (value, min, max) => {
    const minLog = Math.log(min);
    const maxLog = Math.log(max);
    const scale = (maxLog - minLog) / 100;
    return (Math.log(value) - minLog) / scale;
  };

  const handleChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  // Graphical EQ Visual Logic
  const curvePath = useMemo(() => {
    const width = 300;
    const height = 100;
    // Logarithmic frequency mapping for the X-axis visual
    const freqX = (Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * width;
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
      return `M 0 50 L ${freqX - 25} 50 Q ${freqX} 50, ${freqX} 95 Q ${freqX} 50, ${
        freqX + 25
      } 50 L ${width} 50`;
    }
  }, [filter.frequency, filter.Q, filter.type]);

  return (
    <div
      className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-5 border border-gray-700 shadow-xl w-64 ${className}`}
    >
      {/* Header with Power Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 font-semibold text-sm">FILTER</h3>
        <button
          onClick={() => handleChange('enabled', !filter.enabled)}
          className={`p-1.5 rounded transition-all ${
            filter.enabled
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-gray-800 text-gray-500 border border-gray-700'
          }`}
        >
          <Power size={14} />
        </button>
      </div>

      {/* Parametric EQ Visualizer */}
      <div className="relative h-28 bg-black rounded-lg border border-gray-700 mb-5 overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-6 opacity-[0.05] pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-r border-gray-600 h-full" />
          ))}
        </div>

        {filter.enabled ? (
          <svg viewBox="0 0 300 100" className="w-full h-full">
            <defs>
              <linearGradient id="filterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
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
              stroke="#22d3ee"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-300 ease-in-out"
            />
            <circle
              cx={(Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * 300}
              cy={50 - (filter.type === 'notch' ? -45 : (filter.Q / 30) * 40)}
              r="3.5"
              className="fill-cyan-300 shadow-lg animate-pulse"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
              Bypass
            </span>
          </div>
        )}
      </div>

      <div
        className={`space-y-4 transition-opacity ${filter.enabled ? 'opacity-100' : 'opacity-30'}`}
      >
        {/* Filter Type Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {filterTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleChange('type', type.value)}
              disabled={!filter.enabled}
              className={`py-1.5 rounded text-xs font-semibold transition-all ${
                filter.type === type.value && filter.enabled
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              } ${!filter.enabled ? 'cursor-not-allowed' : ''}`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Frequency Slider (Logarithmic 20Hz - 20kHz) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-400">Frequency</span>
            <span className="text-cyan-400 font-mono">{Math.round(filter.frequency)} Hz</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={inverseLogScale(filter.frequency, 20, 20000)}
            onChange={(e) => {
              const hz = logScale(parseFloat(e.target.value), 20, 20000);
              handleChange('frequency', hz);
            }}
            disabled={!filter.enabled}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${inverseLogScale(
                filter.frequency,
                20,
                20000
              )}%, #1f2937 ${inverseLogScale(filter.frequency, 20, 20000)}%, #1f2937 100%)`,
            }}
          />
        </div>

        {/* Resonance Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-gray-400">Resonance</span>
            <span className="text-cyan-400 font-mono">{filter.Q.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="30"
            step="0.1"
            value={filter.Q}
            onChange={(e) => handleChange('Q', parseFloat(e.target.value))}
            disabled={!filter.enabled}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${
                ((filter.Q - 0.1) / 29.9) * 100
              }%, #1f2937 ${((filter.Q - 0.1) / 29.9) * 100}%, #1f2937 100%)`,
            }}
          />
        </div>

        {/* Drive Slider (Logarithmic 1% to 100% curve) */}
        <div className="space-y-2 pt-2 border-t border-gray-700/50">
          <div className="flex justify-between text-xs font-medium">
            <div className="flex items-center gap-1 text-gray-400">
              <Zap
                size={12}
                className={filter.drive > 0 && filter.enabled ? 'text-cyan-400' : ''}
              />
              <span>Drive</span>
            </div>
            <span className="text-cyan-400 font-mono">{Math.round(filter.drive || 0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={!filter.drive || filter.drive <= 0 ? 0 : inverseLogScale(filter.drive, 1, 100)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const scaledDrive = val === 0 ? 0 : logScale(val, 1, 100);
              handleChange('drive', scaledDrive);
            }}
            disabled={!filter.enabled}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${
                !filter.drive || filter.drive <= 0 ? 0 : inverseLogScale(filter.drive, 1, 100)
              }%, #1f2937 ${
                !filter.drive || filter.drive <= 0 ? 0 : inverseLogScale(filter.drive, 1, 100)
              }%, #1f2937 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBank;
