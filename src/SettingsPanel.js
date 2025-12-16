import React from 'react';

// ============================================================================
// SETTINGS PANEL COMPONENT
// ============================================================================

export default function SettingsPanel({ config, setConfig, presets }) {
  return (
    <div className="p-4 bg-gray-900 border-b border-gray-800 grid grid-cols-2 gap-4">
      <div>
        <label className="text-white text-sm block mb-1">Tuning System (TET)</label>
        <select
          value={config.divisions}
          onChange={(e) => setConfig({ ...config, divisions: parseInt(e.target.value) })}
          className="w-full p-2 bg-gray-800 text-white rounded"
        >
          {Object.entries(presets).map(([name, value]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-white text-sm block mb-1">Octaves: {config.octaves}</label>
        <input
          type="range"
          min="2"
          max="6"
          value={config.octaves}
          onChange={(e) => setConfig({ ...config, octaves: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">Base Frequency (Hz)</label>
        <input
          type="number"
          value={config.baseFreq}
          onChange={(e) => setConfig({ ...config, baseFreq: parseFloat(e.target.value) })}
          className="w-full p-2 bg-gray-800 text-white rounded"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">
          Spiral Tightness: {config.spiralTightness.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.spiralTightness}
          onChange={(e) => setConfig({ ...config, spiralTightness: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">Key Width: {config.keyWidth}</label>
        <input
          type="range"
          min="20"
          max="50"
          value={config.keyWidth}
          onChange={(e) => setConfig({ ...config, keyWidth: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">Key Height: {config.keyHeight}</label>
        <input
          type="range"
          min="50"
          max="120"
          value={config.keyHeight}
          onChange={(e) => setConfig({ ...config, keyHeight: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">
          Release Time: {(config.releaseTime / 1000).toFixed(1)}s
        </label>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={config.releaseTime}
          onChange={(e) => setConfig({ ...config, releaseTime: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      <div>
        <label className="text-white text-sm block mb-1">Color Mode</label>
        <select
          value={config.colorMode}
          onChange={(e) => setConfig({ ...config, colorMode: e.target.value })}
          className="w-full p-2 bg-gray-800 text-white rounded"
        >
          <option value="piano">Piano (Black & White)</option>
          <option value="alternating">Alternating (B&W)</option>
          <option value="grayscale">Grayscale Gradient</option>
          <option value="interval">Rainbow by Interval</option>
          <option value="octave">Rainbow by Octave</option>
        </select>
      </div>

      <div className="flex items-end">
        <label className="flex items-center text-white text-sm">
          <input
            type="checkbox"
            checked={config.showLabels}
            onChange={(e) => setConfig({ ...config, showLabels: e.target.checked })}
            className="mr-2"
          />
          Show Labels
        </label>
      </div>
    </div>
  );
}
