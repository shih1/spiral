import React, { useEffect, useRef } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

const SpiralTowerVisualizer = ({ config, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const { divisions, octaves, releaseTime } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const width = 700;
  const height = 700;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rotation = -Math.PI / 4;

    const render = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);
      rotation += 0.003; // Slow spin

      const centerX = width / 2;
      const centerY = height / 2 + 180;
      const towerRadius = 160;
      const towerHeight = 120;
      const perspective = 900;

      // Projector with Null Safety
      const project3D = (space) => {
        if (!space) return null; // Safety check

        const rotatedTheta = space.theta + rotation;
        const rx = Math.cos(rotatedTheta);
        const rz = Math.sin(rotatedTheta);

        const worldX = rx * towerRadius;
        const worldY = -space.z * towerHeight;
        const worldZ = rz * towerRadius;

        const factor = perspective / (perspective + worldZ + 300);
        return {
          px: centerX + worldX * factor,
          py: centerY + worldY * factor,
          scale: factor,
          zDepth: worldZ,
        };
      };

      // 1. DRAW THE SKELETON (The "Screw" Thread)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.lineWidth = 1;

      const totalSteps = divisions * octaves;
      for (let i = 0; i <= totalSteps; i++) {
        const p = project3D(getCoordinates(i));
        if (!p) continue;
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();

      // 2. DRAW VERTICAL PILLARS (Harmonic Alignment)
      for (let i = 0; i < divisions; i++) {
        const isMainPillar = i % (divisions > 12 ? Math.floor(divisions / 4) : 1) === 0;
        if (!isMainPillar) continue;

        ctx.beginPath();
        ctx.strokeStyle = i === 0 ? 'rgba(255, 50, 100, 0.2)' : 'rgba(255, 255, 255, 0.04)';

        for (let oct = 0; oct <= octaves; oct++) {
          const p = project3D(getCoordinates(i + oct * divisions));
          if (!p) continue;
          if (oct === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
      }

      // 3. DRAW ACTIVE NOTES
      const now = Date.now();
      const allActive = [...heldNotes, ...releasedNotes.filter((n) => now - n.time < releaseTime)];

      // Sort by depth so notes in the back don't draw over notes in the front
      allActive.sort((a, b) => {
        const stepA = a.pitch + a.octave * divisions;
        const stepB = b.pitch + b.octave * divisions;
        const za = project3D(getCoordinates(stepA))?.zDepth || 0;
        const zb = project3D(getCoordinates(stepB))?.zDepth || 0;
        return zb - za;
      });

      allActive.forEach((note) => {
        // IMPORTANT: Calculate absolute step index for the screw logic
        const absoluteStep = note.pitch + note.octave * divisions;
        const space = getCoordinates(absoluteStep);
        const p = project3D(space);

        if (!p) return; // Skip if math fails

        let fade = note.time ? Math.max(0, 1 - (now - note.time) / releaseTime) : 1.0;

        // Glow
        const size = 12 * p.scale;
        ctx.shadowBlur = 25 * fade;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = `rgba(0, 255, 200, ${fade})`;

        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fill();

        // White Core
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Dropline to the "Pitch Class Floor" (Z=0)
        // This connects the screw position back to the 2D pitch class circle
        const groundSpace = getCoordinates(note.pitch); // Only pitch class, no octave height
        const groundP = project3D({ ...groundSpace, z: 0 });

        if (groundP) {
          ctx.strokeStyle = `rgba(0, 255, 200, ${fade * 0.2})`;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(groundP.px, groundP.py);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const animationFrameRef = { current: requestAnimationFrame(render) };
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, divisions, octaves, releaseTime]);

  return (
    <div className="relative group">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-gray-800 bg-[#050508] shadow-2xl"
      />
      <div className="absolute bottom-6 left-6 text-left pointer-events-none">
        <div className="text-cyan-400 font-bold text-lg leading-none">{divisions}-TET</div>
        <div className="text-gray-500 text-xs mt-1 uppercase tracking-widest">
          Helical Screw Projection
        </div>
      </div>
    </div>
  );
};

export default SpiralTowerVisualizer;
