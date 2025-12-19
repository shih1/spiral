import React, { useEffect, useRef } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

const SpiralTowerVisualizer = ({ config, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const rotationRef = useRef(-Math.PI / 4); // PERSISTENT ROTATION
  const animationFrameRef = useRef(null);

  const { divisions, octaves, releaseTime } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const width = 700;
  const height = 700;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Update persistent rotation
      rotationRef.current += 0.003;
      const currentRotation = rotationRef.current;

      const centerX = width / 2;
      const centerY = height / 2 + 180;
      const towerRadius = 160;
      const towerHeight = 120;
      const perspective = 900;

      const project3D = (space) => {
        if (!space) return null;
        const rotatedTheta = space.theta + currentRotation;
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

      // 1. HELICAL SKELETON
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= divisions * octaves; i++) {
        const p = project3D(getCoordinates(i));
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();

      // 2. DATA PREP
      const now = Date.now();
      const allActive = [...heldNotes, ...releasedNotes.filter((n) => now - n.time < releaseTime)];

      const sortedActive = allActive
        .map((n) => ({ ...n, absoluteStep: n.pitch + n.octave * divisions }))
        .sort((a, b) => a.absoluteStep - b.absoluteStep);

      // 3. CHORD RIBBON (THE MANIFOLD)
      if (sortedActive.length > 1) {
        ctx.save();
        ctx.beginPath();
        sortedActive.forEach((note, i) => {
          const p = project3D(getCoordinates(note.absoluteStep));
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        });

        // Ribbon Style
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 255, 200, 0.5)';
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.4)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Subtle fill between notes
        ctx.fillStyle = 'rgba(0, 255, 200, 0.05)';
        ctx.fill();
        ctx.restore();
      }

      // 4. DRAW NOTES (Sorted for Z-Depth)
      const renderNotes = [...sortedActive].sort((a, b) => {
        const za = project3D(getCoordinates(a.absoluteStep))?.zDepth || 0;
        const zb = project3D(getCoordinates(b.absoluteStep))?.zDepth || 0;
        return zb - za;
      });

      renderNotes.forEach((note) => {
        const space = getCoordinates(note.absoluteStep);
        const p = project3D(space);
        let fade = note.time ? Math.max(0, 1 - (now - note.time) / releaseTime) : 1.0;

        const size = 12 * p.scale;

        // Outer Glow
        ctx.shadowBlur = 25 * fade;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = `rgba(0, 255, 200, ${fade})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, divisions, octaves, releaseTime]);

  return (
    <div className="relative group">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-gray-800 bg-[#050508] shadow-2xl transition-all duration-500"
      />
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="text-cyan-400 font-bold text-lg leading-none select-none tracking-tighter">
          {divisions} TET HELIX
        </div>
      </div>
    </div>
  );
};

export default SpiralTowerVisualizer;
