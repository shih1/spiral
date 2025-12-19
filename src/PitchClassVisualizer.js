import React, { useEffect, useRef } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

const PitchClassVisualizer = ({ config, activePitchClasses, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const { divisions, releaseTime } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 50;

  // PROJECTOR: Map 3D Space points to 2D Screen Pixels
  const project = (coords) => {
    if (!coords) return null;
    return {
      x: centerX + coords.x * radius,
      y: centerY + coords.y * radius,
      // Use Z (octave) to influence visual depth/size
      size: 6 + coords.z * 2.5,
      opacity: 1.0 - coords.z * 0.05,
    };
  };

  // STATIC LAYER: Render Background and Pitch Class Axes
  useEffect(() => {
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = width;
      staticLayerRef.current.height = height;
    }
    const ctx = staticLayerRef.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Background Radial Gradient
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + 50);
    bgGradient.addColorStop(0, '#121225');
    bgGradient.addColorStop(1, '#050505');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Render Axes based on divisions
    for (let i = 0; i < divisions; i++) {
      const coords = getCoordinates(i);
      const pos = project(coords);

      ctx.strokeStyle = 'rgba(100, 100, 150, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Labels
      const labelX = centerX + Math.cos(coords.theta) * (radius + 25);
      const labelY = centerY + Math.sin(coords.theta) * (radius + 25);
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), labelX, labelY);
    }

    // Center Core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [divisions, getCoordinates]);

  // DYNAMIC LAYER: Render Chord Shapes and Active Notes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.drawImage(staticLayerRef.current, 0, 0);

      const now = Date.now();
      const activeReleased = releasedNotes.filter((n) => now - n.time < releaseTime);
      const allActive = [...heldNotes, ...activeReleased];

      // 1. Draw "Best Geometric Shape" (Chord Hull)
      if (allActive.length >= 2) {
        const uniquePitches = Array.from(new Set(allActive.map((n) => n.pitch))).sort(
          (a, b) => a - b
        );

        ctx.beginPath();
        uniquePitches.forEach((p, i) => {
          const pos = project(getCoordinates(p));
          if (i === 0) ctx.moveTo(pos.x, pos.y);
          else ctx.lineTo(pos.x, pos.y);
        });
        ctx.closePath();

        // Stylized Fill
        const polyGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        polyGrad.addColorStop(0, 'rgba(0, 255, 255, 0.15)');
        polyGrad.addColorStop(1, 'rgba(0, 255, 255, 0.02)');
        ctx.fillStyle = polyGrad;
        ctx.fill();

        // Stylized Stroke
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Individual Active Notes
      allActive.forEach((note) => {
        const coords = getCoordinates(note.pitch + note.octave * divisions);
        const pos = project(coords);

        let fade = 1.0;
        if (note.time) {
          // Note is in release phase
          fade = Math.max(0, 1 - (now - note.time) / releaseTime);
        }

        // Outer Glow
        ctx.shadowBlur = 20 * fade;
        ctx.shadowColor = `rgba(0, 255, 136, ${fade})`;
        ctx.fillStyle = `rgba(0, 255, 136, ${fade})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core (Highlight)
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.9})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.size / 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Tracer line to center
        ctx.strokeStyle = `rgba(0, 255, 136, ${fade * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, releaseTime]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-700 rounded-xl bg-black shadow-2xl"
    />
  );
};

export default PitchClassVisualizer;
