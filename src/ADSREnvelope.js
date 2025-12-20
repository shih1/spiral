import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Zap } from 'lucide-react';

const CircularKnob = memo(({ value, min, max, onChange, color, label, isPercentage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);
  const rafRef = useRef(null);

  // Constants for a 270-degree "standard" knob feel
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference;
  const offset = circumference - arcLength;

  const percentage = (value - min) / (max - min);
  const dashOffset = arcLength - percentage * arcLength;

  const handleMouseMove = useCallback(
    (e) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const deltaY = startYRef.current - e.clientY;
        const sensitivity = 0.005;
        const range = max - min;
        const newValue = startValueRef.current + deltaY * sensitivity * range;
        const clampedValue = Math.max(min, Math.min(max, newValue));

        onChange(parseFloat(clampedValue.toFixed(3)));
        rafRef.current = null;
      });
    },
    [min, max, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  }, [handleMouseMove]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  };

  const colorMap = {
    red: '#ef4444',
    orange: '#f59e0b',
    green: '#10b981',
    purple: '#a855f7',
  };

  return (
    <div className="flex flex-col items-center gap-3 group">
      <div
        onMouseDown={handleMouseDown}
        className="relative w-24 h-24 cursor-ns-resize select-none touch-none"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[225deg]">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${offset}`}
            strokeLinecap="round"
          />
          {/* Active Fill */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={colorMap[color] || '#3b82f6'}
            strokeWidth="8"
            strokeDasharray={`${arcLength} ${offset}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-75 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-white font-mono text-[13px] font-bold">
            {isPercentage ? `${Math.round(value * 100)}%` : value.toFixed(2)}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-cyan-400 transition-colors">
        {label}
      </span>
    </div>
  );
});

const ADSRVisualizer = memo(({ adsr, hoveredParam }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const { width, height } = canvas;
    const padding = 25;
    const drawW = width - padding * 2;
    const drawH = height - padding * 2;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    const maxTime = adsr.attack + adsr.decay + 0.5 + adsr.release;
    const tScale = drawW / maxTime;

    const p = [
      { x: padding, y: height - padding },
      { x: padding + adsr.attack * tScale, y: padding, color: '#ef4444', id: 'attack' },
      {
        x: padding + (adsr.attack + adsr.decay) * tScale,
        y: padding + (1 - adsr.sustain) * drawH,
        color: '#f59e0b',
        id: 'decay',
      },
      {
        x: padding + (adsr.attack + adsr.decay + 0.4) * tScale,
        y: padding + (1 - adsr.sustain) * drawH,
        color: '#10b981',
        id: 'sustain',
      },
      {
        x: padding + (adsr.attack + adsr.decay + 0.4 + adsr.release) * tScale,
        y: height - padding,
        color: '#a855f7',
        id: 'release',
      },
    ];

    // Grid
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(padding, padding + (drawH / 4) * i);
      ctx.lineTo(width - padding, padding + (drawH / 4) * i);
    }
    ctx.stroke();

    // Fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    p.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(p[p.length - 1].x, height - padding);
    ctx.fill();

    // Main Line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    p.slice(1).forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.stroke();

    // Hovered Indicator
    p.slice(1).forEach((pt) => {
      if (hoveredParam === pt.id) {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [adsr, hoveredParam]);

  return (
    <div className="bg-slate-950 rounded-xl p-4 mb-8 border border-slate-800 shadow-inner">
      <canvas ref={canvasRef} width={600} height={200} className="w-full h-auto" />
    </div>
  );
});

export default function ADSREnvelope({ adsr, setAdsr }) {
  const [hoveredParam, setHoveredParam] = useState(null);

  const update = useCallback(
    (key, val) => {
      setAdsr((prev) => ({ ...prev, [key]: val }));
    },
    [setAdsr]
  );

  const presets = {
    Pluck: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1 },
    Pad: { attack: 1.2, decay: 0.8, sustain: 0.7, release: 1.5 },
    Organ: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.01 },
    Bass: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
  };

  return (
    <div className="w-full max-w-2xl bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Zap className="text-blue-500" size={20} />
        </div>
        <h2 className="text-white font-bold tracking-tight text-xl">ADSR SHAPER</h2>
      </div>

      <ADSRVisualizer adsr={adsr} hoveredParam={hoveredParam} />

      <div className="grid grid-cols-4 gap-6">
        {['attack', 'decay', 'sustain', 'release'].map((key, i) => (
          <div
            key={key}
            onMouseEnter={() => setHoveredParam(key)}
            onMouseLeave={() => setHoveredParam(null)}
          >
            <CircularKnob
              label={key}
              color={['red', 'orange', 'green', 'purple'][i]}
              min={key === 'sustain' ? 0 : 0.001}
              max={key === 'release' ? 3 : 2}
              value={adsr[key]}
              isPercentage={key === 'sustain'}
              onChange={(v) => update(key, v)}
            />
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-slate-800 flex gap-2">
        {Object.keys(presets).map((name) => (
          <button
            key={name}
            onClick={() => setAdsr(presets[name])}
            className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
