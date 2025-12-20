import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Zap } from 'lucide-react';

/**
 * PURE UTILITY: Draws the envelope to a canvas context.
 * This is external to the React lifecycle for maximum speed.
 */
const drawEnvelope = (ctx, adsr, width, height, hoveredParam, dpr) => {
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  // High-speed clear
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  const padding = 25;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;

  // Standard synth hold time for visual sustain segment
  const sustainHoldTime = 0.5;
  const totalTime = adsr.attack + adsr.decay + sustainHoldTime + adsr.release;
  const tScale = drawW / totalTime;

  const points = [
    { x: padding, y: height - padding }, // Start
    { x: padding + adsr.attack * tScale, y: padding, id: 'attack', color: '#ef4444' },
    {
      x: padding + (adsr.attack + adsr.decay) * tScale,
      y: padding + (1 - adsr.sustain) * drawH,
      id: 'decay',
      color: '#f59e0b',
    },
    {
      x: padding + (adsr.attack + adsr.decay + sustainHoldTime) * tScale,
      y: padding + (1 - adsr.sustain) * drawH,
      id: 'sustain',
      color: '#10b981',
    },
    { x: padding + totalTime * tScale, y: height - padding, id: 'release', color: '#a855f7' },
  ];

  // Draw Glow/Fill
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
  grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - padding);
  ctx.fill();

  // Draw Main Line
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();

  // Draw Active Node
  const active = points.find((p) => p.id === hoveredParam);
  if (active) {
    ctx.fillStyle = active.color;
    ctx.beginPath();
    ctx.arc(active.x, active.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

const CircularKnob = memo(
  ({ id, value, min, max, onChange, color, label, isPercentage, onHover }) => {
    const arcRef = useRef(null);
    const textRef = useRef(null);
    const internalValRef = useRef(value);

    const radius = 40;
    const circum = 2 * Math.PI * radius;
    const arcLen = (270 / 360) * circum;

    // Manual DOM update to bypass React render cycle
    const updateVisuals = useCallback(
      (v) => {
        const pct = (v - min) / (max - min);
        if (arcRef.current) arcRef.current.style.strokeDashoffset = arcLen - pct * arcLen;
        if (textRef.current)
          textRef.current.textContent = isPercentage ? `${Math.round(v * 100)}%` : v.toFixed(2);
      },
      [min, max, arcLen, isPercentage]
    );

    // Sync when presets change
    useEffect(() => {
      internalValRef.current = value;
      updateVisuals(value);
    }, [value, updateVisuals]);

    const onMouseDown = (e) => {
      const startY = e.clientY;
      const startVal = internalValRef.current;
      document.body.style.cursor = 'ns-resize';

      const onMove = (moveEvent) => {
        const delta = (startY - moveEvent.clientY) * 0.005 * (max - min);
        const next = Math.max(min, Math.min(max, startVal + delta));

        internalValRef.current = next;
        updateVisuals(next);
        onChange(id, next); // Notify parent (updates ref + canvas immediately)
      };

      const onUp = () => {
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    return (
      <div
        className="flex flex-col items-center gap-3 group"
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
      >
        <div onMouseDown={onMouseDown} className="relative w-24 h-24 cursor-ns-resize select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[225deg]">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="8"
              strokeDasharray={`${arcLen} ${circum}`}
              strokeLinecap="round"
            />
            <circle
              ref={arcRef}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${arcLen} ${circum}`}
              style={{ transition: 'none' }} // Ensure zero lag
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span ref={textRef} className="text-white font-mono text-[13px] font-bold" />
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-cyan-400 transition-colors">
          {label}
        </span>
      </div>
    );
  }
);

export default function ADSREnvelope({ adsr, setAdsr }) {
  const canvasRef = useRef(null);
  const adsrRef = useRef(adsr); // The "Source of Truth" for high-speed updates
  const [hovered, setHovered] = useState(null);

  // High-speed render call
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;
    drawEnvelope(ctx, adsrRef.current, canvas.clientWidth, canvas.clientHeight, hovered, dpr);
  }, [hovered]);

  // Sync external state (presets) to the ref
  useEffect(() => {
    adsrRef.current = adsr;
    renderCanvas();
  }, [adsr, renderCanvas]);

  const handleKnobChange = (key, val) => {
    adsrRef.current[key] = val; // Instant update to ref
    renderCanvas(); // Instant redraw of canvas

    // Defer the heavy React state update so it doesn't block the UI
    setAdsr({ ...adsrRef.current });
  };

  const presets = {
    Pluck: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1 },
    Pad: { attack: 1.2, decay: 0.8, sustain: 0.7, release: 1.5 },
    Organ: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.01 },
    Bass: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
  };

  return (
    <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 w-[640px] shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Zap className="text-blue-500" size={20} />
        </div>
        <h2 className="text-white font-bold tracking-tight text-xl uppercase italic">
          ADSR Engine
        </h2>
      </div>

      <canvas
        ref={canvasRef}
        className="w-full h-48 rounded-xl mb-10 border border-slate-800 shadow-inner"
      />

      <div className="flex justify-between mb-10">
        {[
          { id: 'attack', label: 'Attack', color: '#ef4444', max: 2 },
          { id: 'decay', label: 'Decay', color: '#f59e0b', max: 2 },
          { id: 'sustain', label: 'Sustain', color: '#10b981', max: 1, isPct: true },
          { id: 'release', label: 'Release', color: '#a855f7', max: 3 },
        ].map((config) => (
          <CircularKnob
            key={config.id}
            {...config}
            value={adsr[config.id]}
            min={0}
            onChange={handleKnobChange}
            onHover={setHovered}
            isPercentage={config.isPct}
          />
        ))}
      </div>

      <div className="pt-6 border-t border-slate-800/50 flex gap-2">
        {Object.keys(presets).map((name) => (
          <button
            key={name}
            onClick={() => setAdsr(presets[name])}
            className="px-4 py-2 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
