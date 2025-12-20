import React from 'react';
import { Zap } from 'lucide-react';

const FilterEnvelope = ({ filterEnv, setFilterEnv, className = '' }) => {
  const handleChange = (key, value) => {
    setFilterEnv((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-yellow-400" />
        <h3 className="text-white font-medium text-sm">Filter Envelope</h3>
      </div>

      {/* Amount Slider - How much the envelope affects the filter */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Amount</label>
          <span className="text-yellow-400 text-xs font-mono">
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
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          style={{
            background: `linear-gradient(to right, #1f2937 0%, #1f2937 50%, #eab308 50%, #eab308 ${
              50 + (filterEnv.amount / 20000) * 50
            }%, #1f2937 ${50 + (filterEnv.amount / 20000) * 50}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>-10k</span>
          <span>0</span>
          <span>+10k</span>
        </div>
      </div>

      {/* Attack */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Attack</label>
          <span className="text-yellow-400 text-xs font-mono">
            {filterEnv.attack < 1
              ? `${(filterEnv.attack * 1000).toFixed(0)}ms`
              : `${filterEnv.attack.toFixed(2)}s`}
          </span>
        </div>
        <input
          type="range"
          min="0.001"
          max="5"
          step="0.001"
          value={filterEnv.attack}
          onChange={(e) => handleChange('attack', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${
              (Math.log(filterEnv.attack + 1) / Math.log(6)) * 100
            }%, #1f2937 ${(Math.log(filterEnv.attack + 1) / Math.log(6)) * 100}%, #1f2937 100%)`,
          }}
        />
      </div>

      {/* Decay */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Decay</label>
          <span className="text-yellow-400 text-xs font-mono">
            {filterEnv.decay < 1
              ? `${(filterEnv.decay * 1000).toFixed(0)}ms`
              : `${filterEnv.decay.toFixed(2)}s`}
          </span>
        </div>
        <input
          type="range"
          min="0.001"
          max="5"
          step="0.001"
          value={filterEnv.decay}
          onChange={(e) => handleChange('decay', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${
              (Math.log(filterEnv.decay + 1) / Math.log(6)) * 100
            }%, #1f2937 ${(Math.log(filterEnv.decay + 1) / Math.log(6)) * 100}%, #1f2937 100%)`,
          }}
        />
      </div>

      {/* Sustain */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Sustain</label>
          <span className="text-yellow-400 text-xs font-mono">
            {Math.round(filterEnv.sustain * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={filterEnv.sustain}
          onChange={(e) => handleChange('sustain', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${
              filterEnv.sustain * 100
            }%, #1f2937 ${filterEnv.sustain * 100}%, #1f2937 100%)`,
          }}
        />
      </div>

      {/* Release */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Release</label>
          <span className="text-yellow-400 text-xs font-mono">
            {filterEnv.release < 1
              ? `${(filterEnv.release * 1000).toFixed(0)}ms`
              : `${filterEnv.release.toFixed(2)}s`}
          </span>
        </div>
        <input
          type="range"
          min="0.01"
          max="5"
          step="0.01"
          value={filterEnv.release}
          onChange={(e) => handleChange('release', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          style={{
            background: `linear-gradient(to right, #eab308 0%, #eab308 ${
              (Math.log(filterEnv.release + 1) / Math.log(6)) * 100
            }%, #1f2937 ${(Math.log(filterEnv.release + 1) / Math.log(6)) * 100}%, #1f2937 100%)`,
          }}
        />
      </div>

      {/* Visual Envelope Display */}
      <div className="h-16 bg-gray-900 rounded border border-gray-700 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
          {/* Envelope shape */}
          <polyline
            points={`
              0,60
              ${filterEnv.attack * 20},${60 - 50}
              ${filterEnv.attack * 20 + filterEnv.decay * 20},${60 - 50 * filterEnv.sustain}
              ${Math.min(150, filterEnv.attack * 20 + filterEnv.decay * 20 + 30)},${
              60 - 50 * filterEnv.sustain
            }
              ${Math.min(
                200,
                filterEnv.attack * 20 + filterEnv.decay * 20 + 30 + filterEnv.release * 20
              )},60
            `}
            fill="none"
            stroke="#eab308"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* Fill under the curve */}
          <polyline
            points={`
              0,60
              ${filterEnv.attack * 20},${60 - 50}
              ${filterEnv.attack * 20 + filterEnv.decay * 20},${60 - 50 * filterEnv.sustain}
              ${Math.min(150, filterEnv.attack * 20 + filterEnv.decay * 20 + 30)},${
              60 - 50 * filterEnv.sustain
            }
              ${Math.min(
                200,
                filterEnv.attack * 20 + filterEnv.decay * 20 + 30 + filterEnv.release * 20
              )},60
              200,60
              0,60
            `}
            fill="#eab308"
            fillOpacity="0.2"
          />

          {/* Stage labels */}
          <text x="10" y="10" fill="#9ca3af" fontSize="8" fontFamily="monospace">
            A
          </text>
          <text
            x={`${filterEnv.attack * 20 + 10}`}
            y="10"
            fill="#9ca3af"
            fontSize="8"
            fontFamily="monospace"
          >
            D
          </text>
          <text
            x={`${Math.min(100, filterEnv.attack * 20 + filterEnv.decay * 20 + 15)}`}
            y="10"
            fill="#9ca3af"
            fontSize="8"
            fontFamily="monospace"
          >
            S
          </text>
          <text
            x={`${Math.min(160, filterEnv.attack * 20 + filterEnv.decay * 20 + 30)}`}
            y="10"
            fill="#9ca3af"
            fontSize="8"
            fontFamily="monospace"
          >
            R
          </text>
        </svg>
      </div>

      {/* Info text */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Modulates filter frequency over time
      </div>
    </div>
  );
};

export default FilterEnvelope;
