import React from 'react';
import { Users } from 'lucide-react';

const UnisonControl = ({ unison, setUnison, className = '' }) => {
  const handleChange = (key, value) => {
    setUnison((prev) => ({ ...prev, [key]: value }));
  };

  const getTrackStyle = (val, min, max) => {
    const percentage = ((val - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${percentage}%, #111827 ${percentage}%, #111827 100%)`,
    };
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 w-64 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-cyan-400" />
        <h3 className="text-white font-semibold text-xs uppercase tracking-wider">Unison</h3>
      </div>

      <div className="space-y-4 mb-6">
        {/* Voices */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-gray-400 text-[10px] uppercase font-bold">Voices</label>
            <span className="text-cyan-400 text-xs font-mono bg-gray-900 px-1.5 rounded border border-gray-700">
              {unison.voices}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={unison.voices}
            onChange={(e) => handleChange('voices', parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            style={getTrackStyle(unison.voices, 1, 16)}
          />
        </div>

        {/* Detune (Horizontal Spacing) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-gray-400 text-[10px] uppercase font-bold">Detune</label>
            <span className="text-cyan-400 text-xs font-mono bg-gray-900 px-1.5 rounded border border-gray-700">
              {unison.detune.toFixed(1)}¢
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={unison.detune}
            onChange={(e) => handleChange('detune', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            style={getTrackStyle(unison.detune, 0, 50)}
          />
        </div>

        {/* Blend (Solid Brightness) */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-gray-400 text-[10px] uppercase font-bold">Blend</label>
            <span className="text-cyan-400 text-xs font-mono bg-gray-900 px-1.5 rounded border border-gray-700">
              {Math.round(unison.blend * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={unison.blend}
            onChange={(e) => handleChange('blend', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            style={getTrackStyle(unison.blend, 0, 1)}
          />
        </div>
      </div>

      {/* Visualizer: Solid Blocks with Volume-to-Luminance Mapping */}
      <div className="relative h-24 bg-gray-950 rounded border border-gray-700 overflow-hidden shadow-inner flex items-center justify-center">
        <div className="relative w-full h-full">
          {Array.from({ length: unison.voices }).map((_, i) => {
            const total = unison.voices;
            const centerPos = (total - 1) / 2;
            const normalized = total === 1 ? 0 : (i / (total - 1)) * 2 - 1;

            // Logic to keep center bar(s) bright
            const isMiddle = Math.abs(i - centerPos) < 0.6;

            // Detune drives horizontal offset
            const xMovement = normalized * (unison.detune * 0.9);

            // Fixed height to prevent shape-shifting
            const fixedHeight = '65%';

            // Blend drives color intensity (RGBA for solid uniform color)
            const brightness = isMiddle ? 1 : 0.15 + unison.blend * 0.85;
            const barColor = `rgba(34, 211, 238, ${brightness})`;
            const glow = isMiddle
              ? '0 0 12px rgba(34, 211, 238, 0.4)'
              : `0 0 ${unison.blend * 10}px rgba(34, 211, 238, ${unison.blend * 0.3})`;

            return (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 rounded-sm transition-all duration-200 ease-out"
                style={{
                  width: '3px',
                  height: fixedHeight,
                  transform: `translate(-50%, -50%) translateX(${xMovement}px)`,
                  backgroundColor: isMiddle ? '#22d3ee' : barColor,
                  boxShadow: glow,
                  // Using a subtle border top to give it a "LED" look without a full gradient
                  borderTop: brightness > 0.6 ? '1px solid #cffafe' : 'none',
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-2 text-[8px] text-gray-600 text-center font-bold tracking-widest uppercase select-none opacity-50">
        Voice Alignment
      </div>
    </div>
  );
};

export default UnisonControl;
