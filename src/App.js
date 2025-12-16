import React, { useState, useEffect, useRef } from 'react';
import { Settings, Volume2 } from 'lucide-react';

// ============================================================================
// AUDIO ENGINE
// ============================================================================
const useAudioEngine = () => {
  const audioContextRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playNote = (freq, duration = 0.5, sustained = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    if (!sustained) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    if (!sustained) {
      oscillator.stop(ctx.currentTime + duration);
    }

    return { oscillator, gainNode, id: Date.now() + Math.random() };
  };

  const stopNote = (oscillator, gainNode) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  return { playNote, stopNote };
};

// ============================================================================
// SPIRAL KEYBOARD CANVAS
// ============================================================================
const SpiralKeyboard = ({ config, activeNote, notes, setNotes, onNoteClick, heldNotes }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animation loop for pulsing effect - only animate when notes are held
  useEffect(() => {
    if (heldNotes.length === 0 && !activeNote) return;

    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      // Much faster pulse for flashy effect
      setPulsePhase((prev) => (prev + delta * 0.015) % (Math.PI * 2));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [heldNotes.length, activeNote]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Dark gradient background
    const bgGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      Math.max(width, height) / 2
    );
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const {
      divisions,
      octaves,
      baseFreq,
      spiralTightness,
      showLabels,
      colorMode,
      keyWidth,
      keyHeight,
    } = config;
    const totalNotes = divisions * octaves;
    const calculatedNotes = [];

    // Calculate note positions
    for (let i = 0; i < totalNotes; i++) {
      const octave = Math.floor(i / divisions);
      const step = i % divisions;
      const semitoneRatio = i / divisions;
      const freq = baseFreq * Math.pow(2, semitoneRatio);
      const baseR = 80 + Math.log2(freq / baseFreq) * 60;
      const theta = (i / divisions) * 2 * Math.PI;
      const spiralR = baseR + theta * spiralTightness * 15;
      const x = centerX + spiralR * Math.cos(theta);
      const y = centerY + spiralR * Math.sin(theta);

      calculatedNotes.push({ x, y, freq, octave, step, theta, r: spiralR, index: i, angle: theta });
    }

    setNotes(calculatedNotes);

    // Draw octave connection lines with glow
    ctx.strokeStyle = 'rgba(100, 255, 150, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(100, 255, 150, 0.4)';
    for (let step = 0; step < divisions; step++) {
      for (let oct = 0; oct < octaves - 1; oct++) {
        const idx1 = oct * divisions + step;
        const idx2 = (oct + 1) * divisions + step;
        if (idx2 < calculatedNotes.length) {
          ctx.beginPath();
          ctx.moveTo(calculatedNotes[idx1].x, calculatedNotes[idx1].y);
          ctx.lineTo(calculatedNotes[idx2].x, calculatedNotes[idx2].y);
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;

    // Color function
    const getColor = (note, isActive, isPitchClassHeld, hueShift, pulseIntensity) => {
      if (isActive) {
        // SUPER KITSCH - Bright neon rainbow that shifts!
        const brightness = 50 + pulseIntensity * 30;
        const saturation = 100;
        return `hsl(${hueShift}, ${saturation}%, ${brightness}%)`;
      }
      if (isPitchClassHeld) return '#cc9900'; // Darker yellow for same pitch class different octave

      if (colorMode === 'piano') {
        const pianoPattern12 = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
        if (divisions === 12) {
          return pianoPattern12[note.step] ? '#f5f5f5' : '#1a1a1a';
        } else {
          const scaledStep = Math.floor((note.step / divisions) * 12);
          return pianoPattern12[scaledStep] ? '#f5f5f5' : '#1a1a1a';
        }
      } else if (colorMode === 'alternating') {
        return note.step % 2 === 0 ? '#f5f5f5' : '#2a2a2a';
      } else if (colorMode === 'grayscale') {
        const brightness = 30 + (note.step / divisions) * 60;
        return `hsl(0, 0%, ${brightness}%)`;
      } else if (colorMode === 'interval') {
        const hue = (note.step / divisions) * 360;
        return `hsl(${hue}, 70%, 55%)`;
      } else if (colorMode === 'octave') {
        const hue = (note.octave / octaves) * 280;
        return `hsl(${hue}, 70%, 55%)`;
      }
      return '#6699ff';
    };

    // Draw keys with enhanced shadows
    calculatedNotes.forEach((note, i) => {
      // Check if this exact note (pitch class + octave) is currently held
      const isExactNoteHeld = heldNotes.some(
        (held) => held.pitch === note.step && held.octave === note.octave
      );
      // Check if this pitch class is held in a different octave
      const isPitchClassHeld = heldNotes.some(
        (held) => held.pitch === note.step && held.octave !== note.octave
      );

      const isActive = isExactNoteHeld || activeNote === note.freq;

      // Calculate pulse intensity - VERY flashy with high contrast
      const rawPulse = Math.sin(pulsePhase);
      const pulseIntensity = isActive ? rawPulse * 0.5 + 0.5 : 1; // 0 to 1 range

      // Rainbow color cycle for extra flash
      const hueShift = isActive ? (pulsePhase / (Math.PI * 2)) * 360 : 0;

      ctx.save();
      ctx.translate(note.x, note.y);
      ctx.rotate(note.angle + Math.PI / 2);

      const w = keyWidth;
      const h = keyHeight;

      // Enhanced shadow for depth
      if (!isActive) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      } else {
        // MASSIVE flashy glow - kakkoii style!
        ctx.shadowBlur = 40 + pulseIntensity * 40;
        ctx.shadowColor = `hsla(${hueShift}, 100%, 60%, ${0.8 + pulseIntensity * 0.2})`;
      }

      // Draw outer glow ring for extra flash
      if (isActive) {
        ctx.strokeStyle = `hsla(${hueShift}, 100%, 70%, ${pulseIntensity * 0.7})`;
        ctx.lineWidth = 6 + pulseIntensity * 4;
        ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
      }

      // MAIN KEY COLOR - now with hueShift and pulseIntensity for KITSCH
      ctx.fillStyle = getColor(note, isActive, isPitchClassHeld, hueShift, pulseIntensity);

      ctx.strokeStyle = isActive
        ? `hsla(${hueShift}, 100%, 90%, 1)`
        : isPitchClassHeld
        ? '#ffcc66'
        : '#333333';
      ctx.lineWidth = isActive ? 4 + pulseIntensity * 2 : isPitchClassHeld ? 2.5 : 2;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // EXTRA KITSCH LAYER: Holographic rainbow shimmer overlay
      if (isActive) {
        const shimmerGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        shimmerGradient.addColorStop(0, `hsla(${hueShift}, 100%, 80%, ${pulseIntensity * 0.5})`);
        shimmerGradient.addColorStop(
          0.25,
          `hsla(${(hueShift + 90) % 360}, 100%, 80%, ${pulseIntensity * 0.6})`
        );
        shimmerGradient.addColorStop(
          0.5,
          `hsla(${(hueShift + 180) % 360}, 100%, 80%, ${pulseIntensity * 0.7})`
        );
        shimmerGradient.addColorStop(
          0.75,
          `hsla(${(hueShift + 270) % 360}, 100%, 80%, ${pulseIntensity * 0.6})`
        );
        shimmerGradient.addColorStop(1, `hsla(${hueShift}, 100%, 80%, ${pulseIntensity * 0.5})`);
        ctx.fillStyle = shimmerGradient;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      // Enhanced gradient for 3D effect - SUPER bright when active
      const gradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      if (isActive) {
        gradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * pulseIntensity})`);
        gradient.addColorStop(0.3, `hsla(${hueShift}, 100%, 80%, ${0.5 * pulseIntensity})`);
        gradient.addColorStop(
          0.7,
          `hsla(${(hueShift + 180) % 360}, 100%, 80%, ${0.5 * pulseIntensity})`
        );
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
      } else {
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // Add sparkle effect at peak intensity
      if (isActive && pulseIntensity > 0.8) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(pulseIntensity - 0.8) * 5})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }

      if (showLabels && (note.step === 0 || i % Math.max(1, Math.floor(divisions / 6)) === 0)) {
        const keyColor = getColor(note, false, false, 0, 1);
        const isLightKey =
          keyColor === '#f5f5f5' || keyColor.includes('90%') || keyColor.includes('85%');

        // Make text stand out on rainbow background
        if (isActive) {
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeText(`${note.freq.toFixed(0)}`, 0, 0);
        } else {
          ctx.fillStyle = isLightKey ? '#000000' : '#ffffff';
        }

        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${note.freq.toFixed(0)}`, 0, 0);

        if (note.step === 0) {
          ctx.font = 'bold 8px sans-serif';
          if (isActive) {
            ctx.strokeText(`O${note.octave}`, 0, 12);
          }
          ctx.fillText(`O${note.octave}`, 0, 12);
        }
      }

      ctx.restore();
    });

    // Draw center with glow
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    centerGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.4)');
    centerGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Legend with background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 280, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${divisions}-TET Spiral Keyboard`, 20, 32);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`${totalNotes} notes • ${octaves} octaves • ${baseFreq}Hz base`, 20, 52);
    ctx.fillStyle = '#64c8ff';
    ctx.fillText(`Click keys to play!`, 20, 72);
  }, [config, activeNote, heldNotes, pulsePhase, setNotes]);

  const handleInteraction = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const note of notes) {
      const dx = x - note.x;
      const dy = y - note.y;
      const cos = Math.cos(-(note.angle + Math.PI / 2));
      const sin = Math.sin(-(note.angle + Math.PI / 2));
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      if (Math.abs(localX) < config.keyWidth / 2 && Math.abs(localY) < config.keyHeight / 2) {
        onNoteClick(note);
        break;
      }
    }
  };

  const handleClick = (e) => {
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    // Handle multiple touches for chords
    Array.from(e.touches).forEach((touch) => {
      handleInteraction(touch.clientX, touch.clientY);
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={700}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      className="border border-gray-700 rounded cursor-pointer flex-shrink-0"
      style={{ touchAction: 'none' }}
    />
  );
};

// ============================================================================
// PITCH CLASS VISUALIZER
// ============================================================================
const PitchClassVisualizer = ({ config, activePitchClasses, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Dark gradient background
    const bgGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      Math.max(width, height) / 2
    );
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const { divisions } = config;
    const now = Date.now();
    const activeReleasedNotes = releasedNotes.filter((n) => now - n.time < config.releaseTime);
    const allActiveNotes = [...heldNotes, ...activeReleasedNotes];
    const uniquePitches = [...new Set(allActiveNotes.map((n) => n.pitch))];

    // Draw pitch class grid with subtle glow
    for (let i = 0; i < divisions; i++) {
      const angle = (i / divisions) * 2 * Math.PI;
      const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 3;
      ctx.shadowColor = 'rgba(100, 100, 100, 0.2)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const labelDist = Math.min(width, height) / 2 - 10;
      const labelX = centerX + Math.cos(angle) * labelDist;
      const labelY = centerY + Math.sin(angle) * labelDist;

      ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), labelX, labelY);
    }

    // Draw chord shape with enhanced glow
    if (uniquePitches.length >= 2) {
      ctx.beginPath();
      uniquePitches.forEach((pitch, index) => {
        const angle = (pitch / divisions) * 2 * Math.PI;
        const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
        const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);
        if (index === 0) {
          ctx.moveTo(endX, endY);
        } else {
          ctx.lineTo(endX, endY);
        }
      });
      ctx.closePath();

      // Fill with gradient
      const chordGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.min(width, height) / 2
      );
      chordGradient.addColorStop(0, 'rgba(0, 255, 255, 0.25)');
      chordGradient.addColorStop(1, 'rgba(0, 255, 255, 0.05)');
      ctx.fillStyle = chordGradient;
      ctx.fill();

      // Outline with enhanced glow
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 255, 255, 1)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw active pitch classes with enhanced glow
    activePitchClasses.forEach(({ pitch, opacity }) => {
      if (pitch === null) return;

      const angle = (pitch / divisions) * 2 * Math.PI;
      const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      const color = [0, 255, 136];

      // Draw glowing line
      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
      ctx.lineWidth = 5;
      ctx.shadowBlur = 25 * opacity;
      ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw end point with glow
      ctx.shadowBlur = 35 * opacity;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Inner bright core
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    // Draw center point with glow
    const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 12);
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    centerGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.5)');
    centerGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Title with background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 60, 5, 120, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pitch Class', centerX, 23);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64c8ff';
    ctx.fillText('Visualizer', centerX, 40);
  }, [config, activePitchClasses, heldNotes, releasedNotes]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={700}
      className="border border-gray-700 rounded flex-shrink-0"
    />
  );
};

// ============================================================================
// SETTINGS PANEL
// ============================================================================
const SettingsPanel = ({ config, setConfig, presets }) => {
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
};

// ============================================================================
// MAIN APP
// ============================================================================
const MicrotonalSpiral = () => {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [activeOscillators, setActiveOscillators] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [notes, setNotes] = useState([]);
  const [config, setConfig] = useState({
    divisions: 12,
    octaves: 4,
    baseFreq: 440,
    spiralTightness: 0.2,
    showLabels: false,
    colorMode: 'piano',
    keyWidth: 28,
    keyHeight: 76,
    releaseTime: 1000,
  });

  const presets = { '12-TET': 12, '19-TET': 19, '24-TET': 24, '31-TET': 31, '53-TET': 53 };
  const { playNote, stopNote } = useAudioEngine();

  const keyboardMapping = {
    z: 0,
    x: 1,
    c: 2,
    v: 3,
    b: 4,
    n: 5,
    m: 6,
    ',': 7,
    '.': 8,
    '/': 9,
    a: 12,
    s: 13,
    d: 14,
    f: 15,
    g: 16,
    h: 17,
    j: 18,
    k: 19,
    l: 20,
    ';': 21,
  };

  const handleNotePlay = (note, sustained = false) => {
    const nodes = playNote(note.freq, 0.5, sustained);
    if (!nodes) return null;

    const now = Date.now();
    const noteId = nodes.id;

    setActiveNote(note.freq);

    if (sustained) {
      setHeldNotes((prev) => [
        ...prev,
        { pitch: note.step, octave: note.octave, time: now, id: noteId },
      ]);
    } else {
      setReleasedNotes((prev) => [...prev, { pitch: note.step, time: now, id: noteId }]);
    }

    const newPitchClass = { pitch: note.step, opacity: 1, id: noteId, sustained };
    setActivePitchClasses((prev) => [...prev, newPitchClass]);

    if (!sustained) {
      setTimeout(() => setActiveNote(null), 500);
      setTimeout(() => releaseNote(noteId, note.step), 500);
    }

    return nodes;
  };

  const releaseNote = (noteId, pitchClass) => {
    const now = Date.now();
    setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
    setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

    const fadeStartDelay = Math.min(500, config.releaseTime * 0.25);
    const fadeDuration = config.releaseTime - fadeStartDelay;
    const fadeSteps = fadeDuration / 50;

    setTimeout(() => {
      const fadeInterval = setInterval(() => {
        setActivePitchClasses((prev) => {
          const updated = prev.map((pc) =>
            pc.id === noteId ? { ...pc, opacity: Math.max(0, pc.opacity - 1 / fadeSteps) } : pc
          );
          const filtered = updated.filter((pc) => pc.opacity > 0);
          if (!filtered.find((pc) => pc.id === noteId)) {
            clearInterval(fadeInterval);
          }
          return filtered;
        });
      }, 50);
    }, fadeStartDelay);
  };

  // Keyboard event handlers
  useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (keyboardMapping[key] !== undefined) {
        e.preventDefault();
        const noteIndex = keyboardMapping[key];
        if (noteIndex >= notes.length) return;
        const note = notes[noteIndex];
        const nodes = handleNotePlay(note, true);
        if (nodes) {
          setActiveOscillators((prev) => ({ ...prev, [key]: nodes }));
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (activeOscillators[key]) {
        const { oscillator, gainNode, id } = activeOscillators[key];
        const noteIndex = keyboardMapping[key];
        const note = notes[noteIndex];
        stopNote(oscillator, gainNode);
        releaseNote(id, note.step);
        setActiveOscillators((prev) => {
          const newOsc = { ...prev };
          delete newOsc[key];
          return newOsc;
        });
        setActiveNote(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardEnabled, notes, activeOscillators]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Volume2 className="text-blue-400" size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Interactive Microtonal Spiral Piano
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-white text-sm cursor-pointer hover:text-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            Enable Keyboard (Polyphonic)
          </label>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white shadow-lg transition-all transform hover:scale-105"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {showSettings && <SettingsPanel config={config} setConfig={setConfig} presets={presets} />}

      <div className="flex-1 flex items-center justify-center p-4 gap-4 overflow-auto">
        <div className="flex items-center gap-4">
          <SpiralKeyboard
            config={config}
            activeNote={activeNote}
            notes={notes}
            setNotes={setNotes}
            heldNotes={heldNotes}
            onNoteClick={(note) => handleNotePlay(note, false)}
          />
          <PitchClassVisualizer
            config={config}
            activePitchClasses={activePitchClasses}
            heldNotes={heldNotes}
            releasedNotes={releasedNotes}
          />
        </div>
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-800 text-white text-sm">
        <p>
          <strong>How to use:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>Click any key</strong> to play its note (Web Audio API synthesizer)
          </li>
          <li>
            <strong>Touch Support:</strong> Tap keys on mobile/tablet - use multiple fingers for
            chords!
          </li>
          <li>
            <strong>Keyboard Control:</strong> Enable the toggle to play with your computer keyboard
          </li>
          <li>
            <strong>Bottom row (Z-/):</strong> Lower octave notes | <strong>Top row (A-;):</strong>{' '}
            Higher octave notes
          </li>
          <li>
            <strong>Polyphonic:</strong> Hold multiple keys simultaneously to play chords!
          </li>
          <li>Keys are arranged in a spiral - one full rotation = one octave</li>
          <li>Green lines connect octave-equivalent notes (same pitch class)</li>
          <li>
            <strong>Pitch Class Visualizer:</strong> Green lines show active notes (bright when
            held, fading after release)
          </li>
          <li>
            <strong>Release Time:</strong> Controls how long notes remain visible after release
          </li>
          <li>
            <strong>Hold notes</strong> to build chords, then release to see them fade over the
            release time!
          </li>
          <li>Try different tuning systems to hear microtonal intervals!</li>
        </ul>
      </div>
    </div>
  );
};

export default MicrotonalSpiral;
