import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Helper function: Calculate note positions for spiral layout
const calculateNotePositions = (config, width, height) => {
  const { divisions, octaves, baseFreq, spiralTightness } = config;
  const centerX = width / 2;
  const centerY = height / 2;
  const totalNotes = divisions * octaves;
  const notes = [];

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

    notes.push({ x, y, freq, octave, step, theta, r: spiralR, index: i, angle: theta });
  }

  return notes;
};

const getKeyColor = (note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity) => {
  const { divisions, octaves, colorMode } = config;

  if (isActive) {
    const brightness = 50 + pulseIntensity * 30;
    const saturation = 100;
    return `hsl(${hueShift}, ${saturation}%, ${brightness}%)`;
  }

  if (isPitchClassHeld) return '#4fd1c5';

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

const renderKey = (ctx, note, config, isActive, isPitchClassHeld, pulsePhase) => {
  const { keyWidth, keyHeight } = config;

  const rawPulse = Math.sin(pulsePhase);
  const pulseIntensity = isActive ? rawPulse * 0.5 + 0.5 : 1;
  const hueShift = isActive ? (pulsePhase / (Math.PI * 2)) * 360 : 0;

  ctx.save();
  ctx.translate(note.x, note.y);
  ctx.rotate(note.angle + Math.PI / 2);

  const w = keyWidth;
  const h = keyHeight;

  // GLOW / SHADOW LOGIC
  if (!isActive) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  } else {
    // Intense rainbow glow for active keys
    ctx.shadowBlur = 40 + pulseIntensity * 40;
    ctx.shadowColor = `hsla(${hueShift}, 100%, 60%, ${0.8 + pulseIntensity * 0.2})`;

    // Outer border "aurora" effect
    ctx.strokeStyle = `hsla(${hueShift}, 100%, 70%, ${pulseIntensity * 0.7})`;
    ctx.lineWidth = 6 + pulseIntensity * 4;
    ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
  }

  ctx.fillStyle = getKeyColor(note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity);

  ctx.strokeStyle = isActive
    ? `hsla(${hueShift}, 100%, 90%, 1)`
    : isPitchClassHeld
    ? '#1a1a2e'
    : '#333333';

  ctx.lineWidth = isActive ? 4 + pulseIntensity * 2 : isPitchClassHeld ? 2.5 : 2;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Remove shadow for internal details
  ctx.shadowBlur = 0;

  if (isActive) {
    // Rainbow Shimmer Overlay
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

  // Final lighting gradient
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

  ctx.restore();
};

const SpiralKeyboard = ({
  config,
  activeNote,
  notes,
  setNotes,
  onNoteClick,
  onNoteOff,
  heldNotes,
}) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [lastMouseNote, setLastMouseNote] = useState(null);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;

  const calculatedNotes = useMemo(() => {
    const newNotes = calculateNotePositions(config, width, height);
    setNotes(newNotes);
    return newNotes;
  }, [config, setNotes]);

  const getNoteAtPos = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      for (const note of calculatedNotes) {
        const dx = x - note.x;
        const dy = y - note.y;
        const cos = Math.cos(-(note.angle + Math.PI / 2));
        const sin = Math.sin(-(note.angle + Math.PI / 2));
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        if (Math.abs(localX) < config.keyWidth / 2 && Math.abs(localY) < config.keyHeight / 2) {
          return note;
        }
      }
      return null;
    },
    [calculatedNotes, config.keyWidth, config.keyHeight]
  );

  const handleMouseDown = (e) => {
    const note = getNoteAtPos(e.clientX, e.clientY);
    if (note) {
      setLastMouseNote(note);
      onNoteClick(note);
    }
  };

  const handleMouseUp = useCallback(() => {
    if (lastMouseNote) {
      onNoteOff?.(lastMouseNote);
      setLastMouseNote(null);
    }
  }, [lastMouseNote, onNoteOff]);

  useEffect(() => {
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = width;
      staticLayerRef.current.height = height;
    }
    const ctx = staticLayerRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 350);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const { divisions, octaves, baseFreq, spiralTightness, keyHeight } = config;
    if (calculatedNotes.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2.5;
      const totalSteps = divisions * octaves;
      for (let i = 0; i <= totalSteps * 12; i++) {
        const t = i / 12;
        const theta = (t / divisions) * 2 * Math.PI;
        const freq = baseFreq * Math.pow(2, t / divisions);
        const baseR = 80 + Math.log2(freq / baseFreq) * 60;
        const innerEdgeR = baseR + theta * spiralTightness * 15 - keyHeight / 2;
        const px = centerX + innerEdgeR * Math.cos(theta);
        const py = centerY + innerEdgeR * Math.sin(theta);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }, [config, calculatedNotes, centerX, centerY]);

  useEffect(() => {
    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      const newPhase = (pulsePhase + delta * 0.015) % (Math.PI * 2);
      setPulsePhase(newPhase);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(staticLayerRef.current, 0, 0);

      // --- PASS 1: DRAW INACTIVE KEYS ---
      calculatedNotes.forEach((note) => {
        const isExactNoteHeld = heldNotes.some(
          (h) => h.pitch === note.step && h.octave === note.octave
        );
        const isActive = isExactNoteHeld || activeNote === note.freq;
        if (!isActive) {
          const isPitchClassHeld = heldNotes.some((h) => h.pitch === note.step);
          renderKey(ctx, note, config, false, isPitchClassHeld, newPhase);
        }
      });

      // --- PASS 2: DRAW ACTIVE KEYS (ON TOP) ---
      calculatedNotes.forEach((note) => {
        const isExactNoteHeld = heldNotes.some(
          (h) => h.pitch === note.step && h.octave === note.octave
        );
        const isActive = isExactNoteHeld || activeNote === note.freq;
        if (isActive) {
          renderKey(ctx, note, config, true, false, newPhase);
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, activeNote, config, calculatedNotes, pulsePhase]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        e.preventDefault();
        const note = getNoteAtPos(e.touches[0].clientX, e.touches[0].clientY);
        if (note) onNoteClick(note);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        handleMouseUp();
      }}
      className="border border-gray-700 rounded cursor-pointer flex-shrink-0"
      style={{ touchAction: 'none' }}
    />
  );
};

export default SpiralKeyboard;
