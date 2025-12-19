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
    
    // x, y remain the center for hit detection, but rendering uses the theta/r logic
    const x = centerX + spiralR * Math.cos(theta);
    const y = centerY + spiralR * Math.sin(theta);

    notes.push({ x, y, freq, octave, step, theta, r: spiralR, index: i, angle: theta });
  }

  return notes;
};

const getKeyColor = (note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity) => {
  const { divisions, colorMode } = config;

  if (isActive) {
    const brightness = 50 + pulseIntensity * 30;
    return `hsl(${hueShift}, 100%, ${brightness}%)`;
  }
  if (isPitchClassHeld) return '#4fd1c5';

  if (colorMode === 'piano') {
    const pianoPattern12 = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];
    const scaledStep = divisions === 12 ? note.step : Math.floor((note.step / divisions) * 12);
    return pianoPattern12[scaledStep] ? '#f5f5f5' : '#1a1a2e';
  }
  
  const hue = (note.step / divisions) * 360;
  return `hsl(${hue}, 70%, 55%)`;
};

// NEW: Draws a key that follows the spiral arc
const drawSpiralKey = (ctx, note, config, centerX, centerY, isActive, isPitchClassHeld, pulsePhase) => {
  const { divisions, keyHeight, spiralTightness } = config;
  
  const rawPulse = Math.sin(pulsePhase);
  const pulseIntensity = isActive ? rawPulse * 0.5 + 0.5 : 1;
  const hueShift = isActive ? (pulsePhase / (Math.PI * 2)) * 360 : 0;

  // Key dimensions in polar space
  const angularWidth = (2 * Math.PI / divisions) * 0.9; // 90% width for small gaps
  const startTheta = note.theta - angularWidth / 2;
  const endTheta = note.theta + angularWidth / 2;
  const innerR = note.r - keyHeight / 2;
  const outerR = note.r + keyHeight / 2;

  ctx.save();
  
  // Setup Glow/Shadow
  if (isActive) {
    ctx.shadowBlur = 40 + pulseIntensity * 40;
    ctx.shadowColor = `hsla(${hueShift}, 100%, 60%, 0.8)`;
  } else {
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  }

  // Draw the curved path
  ctx.beginPath();
  // Inner Arc
  ctx.arc(centerX, centerY, innerR, startTheta, endTheta);
  // Outer Arc (drawn in reverse to close the trapezoid)
  ctx.arc(centerX, centerY, outerR, endTheta, startTheta, true);
  ctx.closePath();

  // Fill and Stroke
  ctx.fillStyle = getKeyColor(note, config, isActive, isPitchClassHeld, hueShift, pulseIntensity);
  ctx.fill();

  ctx.strokeStyle = isActive ? `hsla(${hueShift}, 100%, 90%, 1)` : '#333';
  ctx.lineWidth = isActive ? 3 : 1;
  ctx.stroke();

  // Active Shimmer Effect
  if (isActive) {
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(note.x, note.y, 0, note.x, note.y, outerR - innerR);
    grad.addColorStop(0, `hsla(${hueShift}, 100%, 80%, ${0.4 * pulseIntensity})`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
};

const SpiralKeyboard = ({ config, activeNote, notes, setNotes, onNoteClick, onNoteRelease, heldNotes }) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [pressedNote, setPressedNote] = useState(null);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;

  const calculatedNotes = useMemo(() => {
    const newNotes = calculateNotePositions(config, width, height);
    setNotes(newNotes);
    return newNotes;
  }, [config, setNotes]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (pressedNote) {
        if (onNoteRelease) onNoteRelease(pressedNote);
        setPressedNote(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [pressedNote, onNoteRelease]);

  useEffect(() => {
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = width;
      staticLayerRef.current.height = height;
    }
    const ctx = staticLayerRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Background
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Smooth Backbone Spiral
    const { divisions, octaves, baseFreq, spiralTightness, keyHeight } = config;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= divisions * octaves * 10; i++) {
      const t = i / 10;
      const theta = (t / divisions) * 2 * Math.PI;
      const freq = baseFreq * Math.pow(2, t / divisions);
      const r = (80 + Math.log2(freq / baseFreq) * 60 + theta * spiralTightness * 15) - (keyHeight / 2);
      const px = centerX + r * Math.cos(theta);
      const py = centerY + r * Math.sin(theta);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Center Core
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(centerX, centerY, 4, 0, Math.PI * 2); ctx.fill();
  }, [config, calculatedNotes]);

  useEffect(() => {
    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      setPulsePhase(prev => (prev + (now - lastTime) * 0.01) % (Math.PI * 2));
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(staticLayerRef.current, 0, 0);

      calculatedNotes.forEach(note => {
        const isHeld = heldNotes.some(h => h.pitch === note.step && h.octave === note.octave);
        const isActive = isHeld || activeNote === note.freq || (pressedNote?.index === note.index);
        const isPCHeld = !isActive && heldNotes.some(h => h.pitch === note.step);
        
        drawSpiralKey(ctx, note, config, centerX, centerY, isActive, isPCHeld, pulsePhase);
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, activeNote, config, calculatedNotes, pulsePhase, pressedNote]);

  const handlePointerDown = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    const clickR = Math.sqrt(x*x + y*y);
    const clickTheta = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);

    for (const note of calculatedNotes) {
      const angularWidth = (2 * Math.PI / config.divisions);
      const distTheta = Math.abs(((clickTheta - note.theta + Math.PI) % (Math.PI * 2)) - Math.PI);
      
      if (distTheta < angularWidth / 2 && Math.abs(clickR - note.r) < config.keyHeight / 2) {
        setPressedNote(note);
        onNoteClick(note);
        break;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
      className="rounded-full shadow-2xl cursor-crosshair"
      style={{ touchAction: 'none' }}
    />
  );
};

export default SpiralKeyboard;