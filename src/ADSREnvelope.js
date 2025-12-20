import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Zap, Clock } from 'lucide-react';

/**
 * FIXED SCALE DRAWING: 4-second absolute window.
 * Ensures the buffer matches the display size exactly.
 */
const drawEnvelope = (ctx, adsr, width, height, hoveredParam, dpr) => {
  // 1. Reset and Clear
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  // 2. Padding logic to ensure nodes don't clip at edges
  const paddingX = 30;
  const paddingY = 20;
  const drawW = width - paddingX * 2;
  const drawH = height - paddingY * 2;

  const VISIBLE_DURATION = 4.0; // Fixed 4-second window
  const tScale = drawW / VISIBLE_DURATION;

  // 3. Draw Time Grid (1s intervals)
  ctx.strokeStyle = '#1e293b';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  for (let i = 1; i < VISIBLE_DURATION; i++) {
    const x = paddingX + i * tScale;
    ctx.beginPath();
    ctx.moveTo(x, paddingY);
    ctx.lineTo(x, height - paddingY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 4. Calculate coordinates
  const sustainHoldTime = 0.5;
  const points = [
    { x: paddingX, y: height - paddingY },
    { x: paddingX + adsr.attack * tScale, y: paddingY, id: 'attack', color: '#ef4444' },
    {
      x: paddingX + (adsr.attack + adsr.decay) * tScale,
      y: paddingY + (1 - adsr.sustain) * drawH,
      id: 'decay',
      color: '#f59e0b',
    },
    {
      x: paddingX + (adsr.attack + adsr.decay + sustainHoldTime) * tScale,
      y: paddingY + (1 - adsr.sustain) * drawH,
      id: 'sustain',
      color: '#10b981',
    },
    {
      x: paddingX + (adsr.attack + adsr.decay + sustainHoldTime + adsr.release) * tScale,
      y: height - paddingY,
      id: 'release',
      color: '#a855f7',
    },
  ];

  // 5. Draw the envelope path with clipping to keep it inside the grid
  ctx.save();
  const region = new Path2D();
  region.rect(paddingX, 0, drawW, height);
  ctx.clip(region);

  // Fill
  const grad = ctx.createLinearGradient(0, paddingY, 0, height - paddingY);
  grad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
  grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, height - paddingY);
  ctx.fill();

  // Stroke
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();

  ctx.restore();

  // 6. Draw the active/hovered node handle
  const active = points.find((p) => p.id === hoveredParam);
  if (active && active.x <= width - paddingX && active.x >= paddingX) {
    ctx.fillStyle = active.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = active.color;
    ctx.beginPath();
    ctx.arc(active.x, active.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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

    const updateVisuals = useCallback(
      (v) => {
        const pct = (v - min) / (max - min);
        if (arcRef.current) arcRef.current.style.strokeDashoffset = arcLen - pct * arcLen;
        if (textRef.current)
          textRef.current.textContent = isPercentage
            ? `${Math.round(v * 100)}%`
            : `${v.toFixed(2)}s`;
      },
      [min, max, arcLen, isPercentage]
    );

    useEffect(() => {
      internalValRef.current = value;
      updateVisuals(value);
    }, [value, updateVisuals]);

    const onMouseDown = (e) => {
      const startY = e.clientY;
      const startVal = internalValRef.current;
      document.body.style.cursor = 'ns-resize';

      const onMove = (me) => {
        const delta = (startY - me.clientY) * 0.005 * (max - min);
        const next = Math.max(min, Math.min(max, startVal + delta));
        internalValRef.current = next;
        updateVisuals(next);
        onChange(id, next);
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
        className="flex flex-col items-center gap-3"
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
      >
        <div onMouseDown={onMouseDown} className="relative w-20 h-20 cursor-ns-resize select-none">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[225deg]">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
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
              strokeWidth="10"
              strokeDasharray={`${arcLen} ${circum}`}
              strokeLinecap="round"
              style={{ transition: 'none' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span ref={textRef} className="text-white font-mono text-[10px] font-bold" />
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">
          {label}
        </span>
      </div>
    );
  }
);

export default function ADSREnvelope({ adsr, setAdsr }) {
  const canvasRef = useRef(null);
  const adsrRef = useRef(adsr);
  const [hovered, setHovered] = useState(null);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio || 1;

    // Ensure logical resolution matches display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    drawEnvelope(ctx, adsrRef.current, rect.width, rect.height, hovered, dpr);
  }, [hovered]);

  useEffect(() => {
    adsrRef.current = adsr;
    renderCanvas();
  }, [adsr, renderCanvas]);

  const handleKnobChange = (key, val) => {
    adsrRef.current[key] = val;
    renderCanvas();
    setAdsr({ ...adsrRef.current });
  };

  const presets = {
    Pluck: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1 },
    Pad: { attack: 1.5, decay: 1.0, sustain: 0.6, release: 2.0 },
    Long: { attack: 2.0, decay: 1.5, sustain: 0.4, release: 3.5 },
  };

  return (
    <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-[600px] shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap className="text-blue-500" size={18} />
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">ADSR Display</h2>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-[9px] font-bold uppercase">
          <Clock size={10} />
          <span>4.0s Horizon</span>
        </div>
      </div>

      <div className="relative w-full h-40 bg-black rounded-lg overflow-hidden border border-slate-800 mb-8">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="flex justify-around mb-8">
        {[
          { id: 'attack', label: 'Attack', color: '#ef4444', max: 2 },
          { id: 'decay', label: 'Decay', color: '#f59e0b', max: 2 },
          { id: 'sustain', label: 'Sustain', color: '#10b981', max: 1, isPct: true },
          { id: 'release', label: 'Release', color: '#a855f7', max: 4 },
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

      <div className="flex gap-2">
        {Object.keys(presets).map((name) => (
          <button
            key={name}
            onClick={() => setAdsr(presets[name])}
            className="px-3 py-1.5 bg-slate-800 text-slate-400 text-[9px] font-bold uppercase rounded hover:bg-slate-700 transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
