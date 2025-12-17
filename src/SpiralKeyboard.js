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

// Helper function: Get color for a key based on configuration
const getKeyColor = (note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity) => {
  const { divisions, octaves, colorMode } = config;

  if (isActive) {
    const brightness = 50 + pulseIntensity * 30;
    const saturation = 100;
    return `hsl(${hueShift}, ${saturation}%, ${brightness}%)`;
  }

  if (isPitchClassHeld) return '#cc9900';

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

// Render a single key to canvas
const renderKey = (ctx, note, config, isActive, isPitchClassHeld, pulsePhase) => {
  const { keyWidth, keyHeight, showLabels } = config;

  const rawPulse = Math.sin(pulsePhase);
  const pulseIntensity = isActive ? rawPulse * 0.5 + 0.5 : 1;
  const hueShift = isActive ? (pulsePhase / (Math.PI * 2)) * 360 : 0;

  ctx.save();
  ctx.translate(note.x, note.y);
  ctx.rotate(note.angle + Math.PI / 2);

  const w = keyWidth;
  const h = keyHeight;

  // Shadow
  if (!isActive) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  } else {
    ctx.shadowBlur = 40 + pulseIntensity * 40;
    ctx.shadowColor = `hsla(${hueShift}, 100%, 60%, ${0.8 + pulseIntensity * 0.2})`;
  }

  // Outer glow ring
  if (isActive) {
    ctx.strokeStyle = `hsla(${hueShift}, 100%, 70%, ${pulseIntensity * 0.7})`;
    ctx.lineWidth = 6 + pulseIntensity * 4;
    ctx.strokeRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8);
  }

  // Main key color
  ctx.fillStyle = getKeyColor(note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity);
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

  // Holographic shimmer overlay
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

  // 3D gradient effect
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

  // Sparkle effect
  if (isActive && pulseIntensity > 0.8) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(pulseIntensity - 0.8) * 5})`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  // Labels
  if (
    showLabels &&
    (note.step === 0 || note.index % Math.max(1, Math.floor(config.divisions / 6)) === 0)
  ) {
    const keyColor = getKeyColor(note, config, false, false, 0, 1);
    const isLightKey =
      keyColor === '#f5f5f5' || keyColor.includes('90%') || keyColor.includes('85%');

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
};

// Main SpiralKeyboard component
const SpiralKeyboard = ({ config, activeNote, notes, setNotes, onNoteClick, heldNotes }) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;

  // Memoize note positions (only recalculate when config changes)
  const calculatedNotes = useMemo(() => {
    const newNotes = calculateNotePositions(config, width, height);
    setNotes(newNotes);
    return newNotes;
  }, [config, setNotes]);

  // Create static layer (background, lines, legend) - only when config changes
  useEffect(() => {
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = width;
      staticLayerRef.current.height = height;
    }

    const ctx = staticLayerRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

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

    const { divisions, octaves } = config;

    // Draw octave connection lines
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

    // Draw center dot
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

    // Legend
    const totalNotes = divisions * octaves;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 280, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${divisions}-TET Spiral Keyboard`, 20, 32);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText(`${totalNotes} notes • ${octaves} octaves • ${config.baseFreq}Hz base`, 20, 52);
    ctx.fillStyle = '#64c8ff';
    ctx.fillText(`Click keys to play!`, 20, 72);
  }, [config, calculatedNotes]);

  // Animation loop for pulsing effect
  useEffect(() => {
    if (heldNotes.length === 0 && !activeNote) {
      // Render once more without active notes, then stop
      const canvas = canvasRef.current;
      if (canvas && staticLayerRef.current) {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(staticLayerRef.current, 0, 0);

        // Draw all keys in inactive state
        calculatedNotes.forEach((note) => {
          renderKey(ctx, note, config, false, false, 0);
        });
      }
      return;
    }

    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      const newPhase = (pulsePhase + delta * 0.015) % (Math.PI * 2);
      setPulsePhase(newPhase);

      // Render frame
      const canvas = canvasRef.current;
      if (!canvas || !staticLayerRef.current) return;

      const ctx = canvas.getContext('2d');

      // Copy static layer
      ctx.drawImage(staticLayerRef.current, 0, 0);

      // Only redraw keys
      calculatedNotes.forEach((note) => {
        const isExactNoteHeld = heldNotes.some(
          (held) => held.pitch === note.step && held.octave === note.octave
        );
        const isPitchClassHeld = heldNotes.some(
          (held) => held.pitch === note.step && held.octave !== note.octave
        );
        const isActive = isExactNoteHeld || activeNote === note.freq;

        renderKey(ctx, note, config, isActive, isPitchClassHeld, newPhase);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [heldNotes, activeNote, config, calculatedNotes, pulsePhase]);

  // Interaction handlers
  const handleInteraction = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
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
          onNoteClick(note);
          break;
        }
      }
    },
    [calculatedNotes, config.keyWidth, config.keyHeight, onNoteClick]
  );

  const handleClick = useCallback(
    (e) => {
      handleInteraction(e.clientX, e.clientY);
    },
    [handleInteraction]
  );

  const handleTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      Array.from(e.touches).forEach((touch) => {
        handleInteraction(touch.clientX, touch.clientY);
      });
    },
    [handleInteraction]
  );

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      className="border border-gray-700 rounded cursor-pointer flex-shrink-0"
      style={{ touchAction: 'none' }}
    />
  );
};

export default SpiralKeyboard;
