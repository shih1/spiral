import React, { useState, useRef, useEffect } from 'react';
import { Waves } from 'lucide-react';

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
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = height * 0.35;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#60a5fa';
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

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
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

    // Update waveform type
    const wave = waveforms.find((w) => Math.abs(w.position - snappedPos) < 0.01);
    if (wave && setWaveform) {
      setWaveform(wave.type);
    }
  };

  const updatePosition = (e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newPos = Math.max(0, Math.min(1, x / rect.width));

    setPosition(newPos);
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
    <div className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Waves size={18} className="text-blue-400" />
        <h3 className="text-white font-medium text-sm">Waveform</h3>
      </div>

      {/* Waveform Display */}
      <div className="bg-gray-900 rounded-lg p-3 mb-3 border border-gray-700">
        <canvas
          ref={canvasRef}
          width={280}
          height={80}
          className="w-full"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>

      {/* Slider Control */}
      <div
        ref={containerRef}
        className="relative h-12 bg-gray-900 rounded-lg cursor-pointer border border-gray-700"
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
          className="absolute top-1/2 -translate-y-1/2 w-6 h-10 bg-gradient-to-b from-blue-500 to-blue-600 rounded shadow-lg cursor-grab active:cursor-grabbing border-2 border-blue-400 transition-transform hover:scale-105"
          style={{
            left: `calc(${position * 100}% - 12px)`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-6 bg-blue-300 rounded-full opacity-50" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 px-1">
        {waveforms.map((wave, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPosition(wave.position);
              if (setWaveform) setWaveform(wave.type);
            }}
            className={`text-xs transition-colors ${
              Math.abs(position - wave.position) < 0.05
                ? 'text-blue-400 font-semibold'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {wave.label}
          </button>
        ))}
      </div>

      {/* Current waveform indicator */}
      <div className="mt-3 text-center">
        <span className="text-gray-400 text-xs">Current: </span>
        <span className="text-blue-400 text-xs font-semibold">
          {waveforms.find((w) => Math.abs(w.position - position) < 0.05)?.label || 'Custom'}
        </span>
      </div>
    </div>
  );
};

export default WaveformSelector;
