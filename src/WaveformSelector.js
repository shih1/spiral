import React, { useState, useRef, useEffect } from 'react';

const WaveformSelector = ({ waveform, setWaveform, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0); // 0-1 range
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Waveform types and their positions (0-1)
  const waveforms = [
    { type: 'sine', position: 0, label: 'Sine' },
    { type: 'triangle', position: 0.33, label: 'Triangle' },
    { type: 'sawtooth', position: 0.67, label: 'Saw' },
    { type: 'square', position: 1, label: 'Square' },
  ];

  // Find snap points
  const snapThreshold = 0.08;

  const findClosestSnap = (pos) => {
    for (const wave of waveforms) {
      if (Math.abs(pos - wave.position) < snapThreshold) {
        return wave.position;
      }
    }
    return pos;
  };

  // Initialize position based on current waveform
  useEffect(() => {
    const wave = waveforms.find((w) => w.type === waveform);
    if (wave) {
      setPosition(wave.position);
    }
  }, [waveform]);

  // Draw waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const amplitude = height * 0.35;

    // Clear canvas with black background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2.5;

    const points = 200;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const t = (i / points) * Math.PI * 2;
      let y;

      // Interpolate between waveforms based on position
      if (position <= 0.33) {
        // Between sine and triangle
        const blend = position / 0.33;
        const sine = Math.sin(t);
        const triangle = (2 / Math.PI) * Math.asin(Math.sin(t));
        y = centerY - (sine * (1 - blend) + triangle * blend) * amplitude;
      } else if (position <= 0.67) {
        // Between triangle and sawtooth
        const blend = (position - 0.33) / 0.34;
        const triangle = (2 / Math.PI) * Math.asin(Math.sin(t));
        const saw = 1 - 2 * (t / (Math.PI * 2));
        y = centerY - (triangle * (1 - blend) + saw * blend) * amplitude;
      } else {
        // Between sawtooth and square
        const blend = (position - 0.67) / 0.33;
        const saw = 1 - 2 * (t / (Math.PI * 2));
        const square = Math.sin(t) >= 0 ? 1 : -1;
        y = centerY - (saw * (1 - blend) + square * blend) * amplitude;
      }

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Add glow effect
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, [position]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updatePosition(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Snap to nearest waveform on release
    const snappedPos = findClosestSnap(position);
    setPosition(snappedPos);

    // Update waveform with snapped position
    if (setWaveform) {
      setWaveform(snappedPos);
    }
  };

  const updatePosition = (e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newPos = Math.max(0, Math.min(1, x / rect.width));

    setPosition(newPos);

    // Update waveform in real-time while dragging
    if (setWaveform && isDragging) {
      setWaveform(newPos);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  return (
    <div
      className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-5 border border-gray-700 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-gray-300 font-semibold text-sm">WAVETABLE</h3>
      </div>

      {/* Waveform Display */}
      <div className="bg-black rounded-lg overflow-hidden border border-gray-700 mb-4">
        <canvas ref={canvasRef} className="w-full" style={{ height: '80px', display: 'block' }} />
      </div>

      {/* Slider Control */}
      <div
        ref={containerRef}
        className="relative h-12 bg-black rounded-lg cursor-pointer border border-gray-700 mb-3"
        onMouseDown={handleMouseDown}
      >
        {/* Snap point indicators */}
        {waveforms.map((wave, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-0.5 bg-gray-600"
            style={{ left: `${wave.position * 100}%` }}
          />
        ))}

        {/* Draggable handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-10 bg-gradient-to-b from-cyan-400 to-cyan-500 rounded shadow-lg cursor-grab active:cursor-grabbing border-2 border-cyan-300 transition-transform hover:scale-105"
          style={{
            left: `calc(${position * 100}% - 12px)`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-6 bg-cyan-200 rounded-full opacity-50" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between px-1">
        {waveforms.map((wave, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPosition(wave.position);
              if (setWaveform) setWaveform(wave.position);
            }}
            className={`text-xs font-medium transition-colors ${
              Math.abs(position - wave.position) < 0.05
                ? 'text-cyan-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {wave.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WaveformSelector;
