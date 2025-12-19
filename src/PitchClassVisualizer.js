import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

// EXPANDED CHORD LIBRARY
const CHORD_LIBRARY = {
  // Triads
  Major: [0, 4, 7],
  Minor: [0, 3, 7],
  Diminished: [0, 3, 6],
  Augmented: [0, 4, 8],
  Sus2: [0, 2, 7],
  Sus4: [0, 5, 7],

  // Sevenths
  'Dominant 7': [0, 4, 7, 10],
  'Major 7': [0, 4, 7, 11],
  'Minor 7': [0, 3, 7, 10],
  'Minor Major 7': [0, 3, 7, 11],
  'Half-Diminished 7': [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
  'Augmented Major 7': [0, 4, 8, 11],
  '7sus4': [0, 5, 7, 10],

  // Added & 6ths
  Add9: [0, 4, 7, 14],
  mAdd9: [0, 3, 7, 14],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '6/9': [0, 4, 7, 9, 14],

  // Extended
  9: [0, 4, 7, 10, 14],
  Maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  11: [0, 4, 7, 10, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  13: [0, 4, 7, 10, 14, 21],
  Maj13: [0, 4, 7, 11, 14, 21],

  // Altered
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

  const { divisions } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 50;

  // ROTATED PROJECTION (90deg Clockwise)
  const project = (coords) => ({
    x: centerX - coords.y * radius,
    y: centerY + coords.x * radius,
    size: 6 + coords.z * 2.5,
  });

  // CHORD DETECTION
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

  // Pre-render Wireframe
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
      radius + 50
    );
    bgGradient.addColorStop(0, '#121225');
    bgGradient.addColorStop(1, '#050505');
    sCtx.fillStyle = bgGradient;
    sCtx.fillRect(0, 0, width, height);

    for (let i = 0; i < divisions; i++) {
      const coords = getCoordinates(i);
      const pos = project(coords);
      sCtx.strokeStyle = 'rgba(100, 100, 150, 0.15)';
      sCtx.lineWidth = 1;
      sCtx.beginPath();
      sCtx.moveTo(centerX, centerY);
      sCtx.lineTo(pos.x, pos.y);
      sCtx.stroke();

      const labelX = centerX - Math.sin(coords.theta) * (radius + 25);
      const labelY = centerY + Math.cos(coords.theta) * (radius + 25);
      sCtx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      sCtx.font = '10px "JetBrains Mono", monospace';
      sCtx.textAlign = 'center';
      sCtx.fillText(i.toString(), labelX, labelY);
    }
  }, [divisions, getCoordinates]);

  // Synchronous Render Loop
  useLayoutEffect(() => {
    const ctx = canvasRef.current.getContext('2d', { alpha: false });

    const render = () => {
      ctx.drawImage(staticLayerRef.current, 0, 0);

      if (heldNotes.length >= 3) {
        const points = heldNotes.map((n) =>
          project(getCoordinates(n.pitch + n.octave * divisions))
        );
        const hull = getConvexHull(points);
        ctx.beginPath();
        hull.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();

        const color = immediateChord ? '255, 200, 50' : '0, 255, 255';
        ctx.fillStyle = `rgba(${color}, 0.15)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, ${immediateChord ? 0.8 : 0.5})`;
        ctx.lineWidth = immediateChord ? 3 : 1.5;
        if (!immediateChord) ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (immediateChord) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(immediateChord.toUpperCase(), centerX, height - 50);
        }
      }

      heldNotes.forEach((n) => {
        const pos = project(getCoordinates(n.pitch + n.octave * divisions));

        ctx.strokeStyle = `rgba(0, 255, 136, 0.15)`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        ctx.fillStyle = `rgba(0, 255, 136, 0.2)`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, 1.0)`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size / 2, 0, Math.PI * 2);
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
      className="rounded-xl border border-gray-800"
    />
  );
};

export default PitchClassVisualizer;
