import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

const ADSREnvelope = ({ adsr, setAdsr }) => {
  const canvasRef = useRef(null);
  const [hoveredParam, setHoveredParam] = useState(null);
  const [dragging, setDragging] = useState(null);

  // Draw the ADSR envelope visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate ADSR curve points
    const maxTime = adsr.attack + adsr.decay + 0.5; // Add some hold time
    const timeScale = (width - padding * 2) / maxTime;
    const heightScale = height - padding * 2;

    // Starting point
    const startX = padding;
    const startY = height - padding;

    // Attack peak
    const attackX = startX + adsr.attack * timeScale;
    const attackY = padding;

    // Decay end (sustain level)
    const decayX = attackX + adsr.decay * timeScale;
    const decayY = padding + (1 - adsr.sustain) * heightScale;

    // Sustain hold
    const sustainX = decayX + 0.3 * timeScale;
    const sustainY = decayY;

    // Release end
    const releaseX = sustainX + adsr.release * timeScale;
    const releaseY = height - padding;

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (heightScale / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw ADSR curve
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Create gradient for fill
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(attackX, attackY);
    ctx.lineTo(decayX, decayY);
    ctx.lineTo(sustainX, sustainY);
    ctx.lineTo(releaseX, releaseY);
    ctx.lineTo(releaseX, startY);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(attackX, attackY);
    ctx.lineTo(decayX, decayY);
    ctx.lineTo(sustainX, sustainY);
    ctx.lineTo(releaseX, releaseY);
    ctx.stroke();

    // Draw control points
    const points = [
      { x: attackX, y: attackY, label: 'A', color: '#ef4444' },
      { x: decayX, y: decayY, label: 'D', color: '#f59e0b' },
      { x: sustainX, y: sustainY, label: 'S', color: '#10b981' },
      { x: releaseX, y: releaseY, label: 'R', color: '#8b5cf6' },
    ];

    points.forEach((point, index) => {
      const param = ['attack', 'decay', 'sustain', 'release'][index];
      const isHovered = hoveredParam === param;

      // Outer glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = point.color + '40';
        ctx.fill();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = point.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(point.label, point.x, point.y);
    });

    // Draw phase labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText('Attack', (startX + attackX) / 2, height - 5);
    ctx.fillText('Decay', (attackX + decayX) / 2, height - 5);
    ctx.fillText('Sustain', (decayX + sustainX) / 2, height - 5);
    ctx.fillText('Release', (sustainX + releaseX) / 2, height - 5);
  }, [adsr, hoveredParam]);

  const handleSliderChange = (param, value) => {
    setAdsr((prev) => ({ ...prev, [param]: parseFloat(value) }));
  };

  const sliderConfigs = [
    { param: 'attack', label: 'Attack', color: 'red', min: 0, max: 2, step: 0.01, unit: 's' },
    { param: 'decay', label: 'Decay', color: 'orange', min: 0, max: 2, step: 0.01, unit: 's' },
    { param: 'sustain', label: 'Sustain', color: 'green', min: 0, max: 1, step: 0.01, unit: '' },
    { param: 'release', label: 'Release', color: 'purple', min: 0, max: 3, step: 0.01, unit: 's' },
  ];

  const colorMap = {
    red: { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-red-400' },
    orange: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-400' },
    green: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-green-400' },
    purple: { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', text: 'text-purple-400' },
  };

  return (
    <div className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
          ADSR Envelope
        </h2>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Info size={16} />
          <span>Drag sliders to shape sound</span>
        </div>
      </div>

      {/* Canvas Visualization */}
      <div className="bg-gray-950 rounded-lg p-4 mb-6 border border-gray-700">
        <canvas ref={canvasRef} width={600} height={200} className="w-full" />
      </div>

      {/* ADSR Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sliderConfigs.map(({ param, label, color, min, max, step, unit }) => {
          const colors = colorMap[color];
          const value = adsr[param];
          const percentage = ((value - min) / (max - min)) * 100;

          return (
            <div
              key={param}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
              onMouseEnter={() => setHoveredParam(param)}
              onMouseLeave={() => setHoveredParam(null)}
            >
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-semibold ${colors.text} uppercase tracking-wide`}>
                  {label}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono text-lg font-bold">{value.toFixed(2)}</span>
                  <span className="text-gray-500 text-xs">{unit}</span>
                </div>
              </div>

              {/* Custom Slider */}
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                {/* Progress bar */}
                <div
                  className={`absolute h-full ${colors.bg} transition-all duration-150`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Actual input */}
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={(e) => handleSliderChange(param, e.target.value)}
                  className="absolute w-full h-full opacity-0 cursor-pointer"
                />

                {/* Thumb indicator */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${colors.bg} rounded-full border-2 border-white shadow-lg transition-all pointer-events-none`}
                  style={{ left: `calc(${percentage}% - 8px)` }}
                />
              </div>

              {/* Min/Max labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>
                  {min}
                  {unit}
                </span>
                <span>
                  {max}
                  {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Presets */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400 font-medium">Quick Presets:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'Pluck', values: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 } },
            { name: 'Pad', values: { attack: 0.5, decay: 0.3, sustain: 0.7, release: 1.5 } },
            { name: 'Organ', values: { attack: 0.01, decay: 0.05, sustain: 1.0, release: 0.1 } },
            { name: 'Bell', values: { attack: 0.01, decay: 0.8, sustain: 0.2, release: 1.0 } },
            { name: 'Bass', values: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 } },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => setAdsr(preset.values)}
              className="px-4 py-2 bg-gray-700 hover:bg-blue-600 text-white text-sm rounded-lg transition-all transform hover:scale-105 border border-gray-600 hover:border-blue-500"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ADSREnvelope;
