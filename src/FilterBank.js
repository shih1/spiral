import React from 'react';
import { Filter } from 'lucide-react';

const FilterBank = ({ filter, setFilter, className = '' }) => {
  const filterTypes = [
    { value: 'lowpass', label: 'Low Pass' },
    { value: 'highpass', label: 'High Pass' },
    { value: 'bandpass', label: 'Band Pass' },
    { value: 'notch', label: 'Notch' },
  ];

  const handleChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Filter size={18} className="text-purple-400" />
        <h3 className="text-white font-medium text-sm">Filter</h3>
      </div>

      {/* Filter Type Selector */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-2 block">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {filterTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleChange('type', type.value)}
              className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                filter.type === type.value
                  ? 'bg-purple-600 text-white border-2 border-purple-400'
                  : 'bg-gray-900 text-gray-400 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Frequency Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Frequency</label>
          <span className="text-purple-400 text-xs font-mono">
            {Math.round(filter.frequency)} Hz
          </span>
        </div>
        <input
          type="range"
          min="20"
          max="20000"
          step="1"
          value={filter.frequency}
          onChange={(e) => handleChange('frequency', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
          style={{
            background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${
              ((filter.frequency - 20) / (20000 - 20)) * 100
            }%, #1f2937 ${((filter.frequency - 20) / (20000 - 20)) * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>20Hz</span>
          <span>20kHz</span>
        </div>
      </div>

      {/* Resonance (Q) Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Resonance</label>
          <span className="text-purple-400 text-xs font-mono">{filter.Q.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="30"
          step="0.1"
          value={filter.Q}
          onChange={(e) => handleChange('Q', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
          style={{
            background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${
              ((filter.Q - 0.1) / (30 - 0.1)) * 100
            }%, #1f2937 ${((filter.Q - 0.1) / (30 - 0.1)) * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0.1</span>
          <span>30</span>
        </div>
      </div>

      {/* Gain Slider (for certain filter types) */}
      {(filter.type === 'lowshelf' || filter.type === 'highshelf' || filter.type === 'peaking') && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-xs">Gain</label>
            <span className="text-purple-400 text-xs font-mono">{filter.gain.toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min="-40"
            max="40"
            step="0.5"
            value={filter.gain}
            onChange={(e) => handleChange('gain', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      )}

      {/* Enable/Bypass Toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700">
        <span className="text-gray-400 text-xs">Filter Active</span>
        <button
          onClick={() => handleChange('enabled', !filter.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            filter.enabled ? 'bg-purple-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              filter.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Visual Frequency Response Indicator */}
      <div className="mt-4 h-12 bg-gray-900 rounded border border-gray-700 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {filter.enabled ? (
            <>
              {/* Frequency marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-purple-500 opacity-50"
                style={{
                  left: `${(Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * 100}%`,
                }}
              />
              {/* Q width indicator */}
              <div
                className="absolute h-full bg-purple-500 opacity-20"
                style={{
                  left: `${Math.max(
                    0,
                    (Math.log10(filter.frequency / 20) / Math.log10(20000 / 20)) * 100 -
                      10 / filter.Q
                  )}%`,
                  width: `${20 / filter.Q}%`,
                }}
              />
            </>
          ) : (
            <span className="text-xs text-gray-600">Filter Bypassed</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBank;
