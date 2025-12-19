import React, { useEffect, useRef } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

const SpiralTowerVisualizer = ({ config, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null); // Fixed: Properly defined
  const { divisions, octaves, releaseTime } = config;
  const { getCoordinates } = useMusicalSpace(config);

  // Interaction State Refs
  const rotationRef = useRef(-Math.PI / 4);
  const pitchRef = useRef(0.5);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0.003, y: 0 });

  const width = 700;
  const height = 700;

  // EFFECT 1: Handle Mouse Events
  useEffect(() => {
    const handleMouseDown = (e) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      velocity.current.x = deltaX * 0.01;
      velocity.current.y = deltaY * 0.01;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // EFFECT 2: The Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Update Physics
      rotationRef.current += velocity.current.x;
      pitchRef.current = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, pitchRef.current + velocity.current.y)
      );

      if (!isDragging.current) {
        velocity.current.x *= 0.95;
        velocity.current.y *= 0.95;
        if (Math.abs(velocity.current.x) < 0.002) velocity.current.x = 0.002;
      }

      const centerX = width / 2;
      const centerY = height / 2 + Math.cos(pitchRef.current) * 100;
      const towerRadius = 160;
      const towerHeight = 120;
      const perspective = 900;

      // 3D Projection Engine
      const project3D = (space) => {
        if (!space) return null;
        const rotatedTheta = space.theta + rotationRef.current;
        let x = Math.cos(rotatedTheta) * towerRadius;
        let z = Math.sin(rotatedTheta) * towerRadius;
        let y = -space.z * towerHeight;

        const cosP = Math.cos(pitchRef.current);
        const sinP = Math.sin(pitchRef.current);
        const yNew = y * sinP - z * cosP;
        const zNew = y * cosP + z * sinP;

        const factor = perspective / (perspective + zNew + 400);
        return {
          px: centerX + x * factor,
          py: centerY + yNew * factor,
          scale: factor,
          zDepth: zNew,
        };
      };

      // 1. HELICAL SKELETON
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
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

      // 3. CHORD RIBBON
      if (sortedActive.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.4)';
        ctx.lineWidth = 3;
        sortedActive.forEach((note, i) => {
          const p = project3D(getCoordinates(note.absoluteStep));
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        });
        ctx.stroke();
      }

      // 4. DEPTH SORTED NOTES
      const depthSorted = [...sortedActive].sort((a, b) => {
        const za = project3D(getCoordinates(a.absoluteStep))?.zDepth || 0;
        const zb = project3D(getCoordinates(b.absoluteStep))?.zDepth || 0;
        return zb - za;
      });

      depthSorted.forEach((note) => {
        const p = project3D(getCoordinates(note.absoluteStep));
        let fade = note.time ? Math.max(0, 1 - (now - note.time) / releaseTime) : 1.0;
        const size = 12 * p.scale;

        ctx.shadowBlur = 20 * fade;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = `rgba(0, 255, 200, ${fade})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, divisions, octaves, releaseTime]);

  return (
    <div className="relative group cursor-move">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-gray-800 bg-[#050508]"
      />
      <div className="absolute bottom-4 right-4 pointer-events-none opacity-40 text-[10px] text-cyan-400 font-mono select-none">
        CLICK & DRAG TO ORBIT
      </div>
    </div>
  );
};

export default SpiralTowerVisualizer;
