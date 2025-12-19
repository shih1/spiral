import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

// EXPANDED CHORD LIBRARY
const CHORD_LIBRARY = {
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
  Sus2: [0, 2, 7],
  Sus4: [0, 5, 7],
  'Dominant 7': [0, 4, 7, 10],
  'Major 7': [0, 4, 7, 11],
  'Minor 7': [0, 3, 7, 10],
  'Minor Major 7': [0, 3, 7, 11],
  'Half-Diminished 7': [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
  'Augmented Major 7': [0, 4, 8, 11],
  '7sus4': [0, 5, 7, 10],
  Add9: [0, 4, 7, 14],
  mAdd9: [0, 3, 7, 14],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '6/9': [0, 4, 7, 9, 14],
  9: [0, 4, 7, 10, 14],
  Maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  11: [0, 4, 7, 10, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  13: [0, 4, 7, 10, 14, 21],
  Maj13: [0, 4, 7, 11, 14, 21],
  '7b5': [0, 4, 6, 10],
  '7#5': [0, 4, 8, 10],
  '7b9': [0, 4, 7, 10, 13],
  '7#9': [0, 4, 7, 10, 15],
  '7#11': [0, 4, 7, 10, 18],
};

const PitchClassVisualizer = ({ config, heldNotes }) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Track intensity (0.0 - 1.0) for every possible MIDI note
  const glowStatesRef = useRef({});

  const { divisions } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 65;

  const THEME = {
    bgInner: '#0a0c14',
    bgOuter: '#020205',
    wireframe: 'rgba(255, 255, 255, 0.05)',
    labels: 'rgba(200, 210, 230, 0.6)',
    activeNode: '45, 212, 191',
    detectedChordBorder: 'rgba(45, 212, 191, 0.8)',
    genericHullBorder: 'rgba(255, 255, 255, 0.6)',
    attack: 0.2, // How fast it fades in (0.2 = fast)
    release: 0.04, // How slow it fades out (0.04 = gentle decay)
  };

  const project = (coords) => ({
    x: centerX - coords.y * radius,
    y: centerY + coords.x * radius,
    size: 5 + coords.z * 2,
  });

  const immediateChord = useMemo(() => {
    if (heldNotes.length < 2) return null;
    const uniquePC = Array.from(new Set(heldNotes.map((n) => n.pitch % 12))).sort((a, b) => a - b);
    for (let i = 0; i < uniquePC.length; i++) {
      const root = uniquePC[i];
      const intervals = uniquePC.map((p) => (p - root + 12) % 12).sort((a, b) => a - b);
      const signature = intervals.join(',');
      for (const [name, pattern] of Object.entries(CHORD_LIBRARY)) {
        const patternSig = pattern
          .map((p) => p % 12)
          .sort((a, b) => a - b)
          .join(',');
        if (patternSig === signature) return name;
      }
    }
    return null;
  }, [heldNotes]);

  const getConvexHull = (points) => {
    if (points.length <= 2) return points;
    const sorted = [...points].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
    const crossProduct = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const lower = [];
    for (const p of sorted) {
      while (
        lower.length >= 2 &&
        crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      )
        lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (
        upper.length >= 2 &&
        crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      )
        upper.pop();
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  };

  useLayoutEffect(() => {
    if (!staticLayerRef.current) staticLayerRef.current = document.createElement('canvas');
    const sCanvas = staticLayerRef.current;
    sCanvas.width = width;
    sCanvas.height = height;
    const sCtx = sCanvas.getContext('2d');

    const bgGradient = sCtx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius + 120
    );
    bgGradient.addColorStop(0, THEME.bgInner);
    bgGradient.addColorStop(1, THEME.bgOuter);
    sCtx.fillStyle = bgGradient;
    sCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < divisions; i++) {
      const coords = getCoordinates(i);
      const pos = project(coords);
      sCtx.strokeStyle = THEME.wireframe;
      sCtx.beginPath();
      sCtx.moveTo(centerX, centerY);
      sCtx.lineTo(pos.x, pos.y);
      sCtx.stroke();

      const labelX = centerX - Math.sin(coords.theta) * (radius + 45);
      const labelY = centerY + Math.cos(coords.theta) * (radius + 45);
      sCtx.fillStyle = THEME.labels;
      sCtx.font = '500 13px "JetBrains Mono", monospace';
      sCtx.textAlign = 'center';
      sCtx.fillText(i.toString(), labelX, labelY);
    }
  }, [divisions, getCoordinates]);

  useLayoutEffect(() => {
    const ctx = canvasRef.current.getContext('2d', { alpha: false });

    const render = () => {
      ctx.drawImage(staticLayerRef.current, 0, 0);

      // 1. Identify currently held note IDs
      const activeIds = new Set(heldNotes.map((n) => `${n.pitch}_${n.octave}`));

      // 2. Update Glow Intensities (Envelope)
      // We check all IDs currently in our tracker plus new ones coming from heldNotes
      const allIds = new Set([...Object.keys(glowStatesRef.current), ...activeIds]);

      allIds.forEach((id) => {
        if (!glowStatesRef.current[id]) glowStatesRef.current[id] = 0;

        if (activeIds.has(id)) {
          // ATTACK: Move toward 1.0
          glowStatesRef.current[id] = Math.min(1, glowStatesRef.current[id] + THEME.attack);
        } else {
          // RELEASE: Decay toward 0.0
          glowStatesRef.current[id] = Math.max(0, glowStatesRef.current[id] - THEME.release);
        }

        // Cleanup fully decayed notes
        if (glowStatesRef.current[id] <= 0 && !activeIds.has(id)) {
          delete glowStatesRef.current[id];
        }
      });

      // 3. Draw Geometry (Only for physically held notes)
      const currentPoints = heldNotes.map((n) =>
        project(getCoordinates(n.pitch + n.octave * divisions))
      );
      if (currentPoints.length >= 3) {
        const hull = getConvexHull(currentPoints);
        ctx.beginPath();
        ctx.lineJoin = 'round';
        hull.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();

        const isChord = !!immediateChord;
        ctx.fillStyle = isChord ? `rgba(${THEME.activeNode}, 0.1)` : `rgba(255, 255, 255, 0.05)`;
        ctx.fill();
        ctx.strokeStyle = isChord ? THEME.detectedChordBorder : THEME.genericHullBorder;
        ctx.lineWidth = isChord ? 2 : 1.5;
        ctx.stroke();

        if (isChord) {
          ctx.fillStyle = `rgb(${THEME.activeNode})`;
          ctx.font = '300 24px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.letterSpacing = '6px';
          ctx.fillText(immediateChord.toUpperCase(), centerX, height - 60);
        }
      }

      // 4. Draw Glows (Using the Envelope Intensity)
      Object.entries(glowStatesRef.current).forEach(([id, intensity]) => {
        const [pitch, octave] = id.split('_').map(Number);
        const pos = project(getCoordinates(pitch + octave * divisions));

        // Note Glow
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pos.size * 5);
        glow.addColorStop(0, `rgba(${THEME.activeNode}, ${0.5 * intensity})`);
        glow.addColorStop(1, `rgba(${THEME.activeNode}, 0)`);

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size * 5, 0, Math.PI * 2);
        ctx.fill();

        // White Core (Also fades)
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, immediateChord, divisions]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-3xl border border-white/10 shadow-2xl"
    />
  );
};

export default PitchClassVisualizer;
