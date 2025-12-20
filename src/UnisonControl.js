import React from 'react';
import { Users } from 'lucide-react';

const UnisonControl = ({ unison, setUnison, className = '' }) => {
  const handleChange = (key, value) => {
    setUnison((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-cyan-400" />
        <h3 className="text-white font-medium text-sm">Unison</h3>
      </div>

      {/* Voices Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Voices</label>
          <span className="text-cyan-400 text-xs font-mono">{unison.voices}</span>
        </div>
        <input
          type="range"
          min="1"
          max="7"
          step="1"
          value={unison.voices}
          onChange={(e) => handleChange('voices', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
              ((unison.voices - 1) / 6) * 100
            }%, #1f2937 ${((unison.voices - 1) / 6) * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1</span>
          <span>7</span>
        </div>
      </div>

      {/* Detune Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Detune</label>
          <span className="text-cyan-400 text-xs font-mono">{unison.detune.toFixed(1)} cents</span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          step="0.5"
          value={unison.detune}
          onChange={(e) => handleChange('detune', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
              (unison.detune / 50) * 100
            }%, #1f2937 ${(unison.detune / 50) * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0</span>
          <span>50</span>
        </div>
      </div>

      {/* Spread/Stereo Width Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Spread</label>
          <span className="text-cyan-400 text-xs font-mono">
            {Math.round(unison.spread * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={unison.spread}
          onChange={(e) => handleChange('spread', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
              unison.spread * 100
            }%, #1f2937 ${unison.spread * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Mono</span>
          <span>Wide</span>
        </div>
      </div>

      {/* Blend (Dry/Wet) Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Blend</label>
          <span className="text-cyan-400 text-xs font-mono">{Math.round(unison.blend * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={unison.blend}
          onChange={(e) => handleChange('blend', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
              unison.blend * 100
            }%, #1f2937 ${unison.blend * 100}%, #1f2937 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Dry</span>
          <span>Wet</span>
        </div>
      </div>

      {/* Visual Voice Indicator */}
      <div className="h-12 bg-gray-900 rounded border border-gray-700 relative overflow-hidden flex items-center justify-center gap-1 p-2">
        {Array.from({ length: unison.voices }).map((_, i) => {
          const totalVoices = unison.voices;
          const centerIndex = (totalVoices - 1) / 2;
          const offset = (i - centerIndex) / centerIndex;
          const detuneAmount = offset * unison.detune;
          const pan = offset * unison.spread;

          return (
            <div
              key={i}
              className="flex-1 h-full bg-cyan-500 rounded transition-all"
              style={{
                opacity: i === Math.floor(centerIndex) ? 1 : 0.3 + unison.blend * 0.7,
                transform: `translateX(${pan * 20}px)`,
              }}
              title={`Voice ${i + 1}: ${detuneAmount > 0 ? '+' : ''}${detuneAmount.toFixed(
                1
              )} cents, Pan: ${(pan * 100).toFixed(0)}%`}
            />
          );
        })}
      </div>

      {/* Info text */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        {unison.voices === 1
          ? 'Single voice (no unison)'
          : `${unison.voices} voices • ±${unison.detune.toFixed(1)}¢ • ${Math.round(
              unison.spread * 100
            )}% spread`}
      </div>
    </div>
  );
};

export default UnisonControl;
