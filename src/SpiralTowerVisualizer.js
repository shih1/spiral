import React, { useEffect, useRef } from 'react';
import { useMusicalSpace } from './hooks/useMusicalSpace';

const SpiralTowerVisualizer = ({ config, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const { divisions, octaves, releaseTime } = config;
  const { getCoordinates } = useMusicalSpace(config);

  const rotationRef = useRef(-Math.PI / 4);
  const pitchRef = useRef(0.5);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0.003, y: 0 });

  const width = 700;
  const height = 700;

  useEffect(() => {
    const handleMouseDown = (e) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      velocity.current.x = (e.clientX - lastMousePos.current.x) * 0.01;
      velocity.current.y = (e.clientY - lastMousePos.current.y) * 0.01;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.fillStyle = '#020205'; // Darker background for more contrast
      ctx.fillRect(0, 0, width, height);

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
      const towerRadius = 180;
      const towerHeight = 140;
      const perspective = 1000;

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
          isFront: zNew < 0,
        };
      };

      // 1. INTENSE VERTICAL RIBS
      // We only draw the primary 12 semitone paths to keep it clean but bright
      ctx.lineCap = 'round';
      for (let d = 0; d < divisions; d++) {
        ctx.beginPath();
        // High intensity cyan with a glow effect
        ctx.strokeStyle = `rgba(0, 200, 255, 0.15)`;
        ctx.lineWidth = 1.5;
        for (let o = 0; o <= octaves; o++) {
          const p = project3D(getCoordinates(d + o * divisions));
          if (o === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
      }

      // 2. SMOOTH HELIX (Sub-sampling for spring-like look)
      const segmentsPerNote = 6; // Higher number = smoother curve
      const totalSteps = divisions * octaves * segmentsPerNote;

      const drawHelixPass = (drawFront) => {
        ctx.beginPath();
        let firstPoint = true;

        for (let i = 0; i <= totalSteps; i++) {
          const step = i / segmentsPerNote;
          const coords = getCoordinates(step);
          const p = project3D(coords);

          if (!p) continue;

          // Only draw if it matches the current pass (Front or Back)
          if (p.isFront === drawFront) {
            if (firstPoint) {
              ctx.moveTo(p.px, p.py);
              firstPoint = false;
            } else {
              ctx.lineTo(p.px, p.py);
            }
          } else {
            // If we cross the front/back threshold, break the path to maintain layering
            ctx.stroke();
            ctx.beginPath();
            firstPoint = true;
          }

          // Apply styling per segment block
          if (i % 20 === 0 || i === totalSteps) {
            const scaleFactor = p.scale;
            ctx.lineWidth = drawFront ? 3.5 * scaleFactor : 1.2 * scaleFactor;
            ctx.strokeStyle = drawFront ? `rgba(0, 255, 255, 0.5)` : `rgba(0, 150, 200, 0.15)`;
          }
        }
        ctx.stroke();
      };

      // Render Pass 1: Back of Helix
      drawHelixPass(false);

      // 3. ACTIVE NOTES
      const now = Date.now();
      const allActive = [...heldNotes, ...releasedNotes.filter((n) => now - n.time < releaseTime)];

      allActive.forEach((note) => {
        const absoluteStep = note.pitch + note.octave * divisions;
        const p = project3D(getCoordinates(absoluteStep));
        let fade = note.time ? Math.max(0, 1 - (now - note.time) / releaseTime) : 1.0;
        const size = (note.time ? 7 : 12) * p.scale;

        ctx.shadowBlur = 20 * fade;
        ctx.shadowColor = '#00ffcc';
        ctx.fillStyle = `rgba(0, 255, 220, ${fade})`;
        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label Glow
        if (fade > 0.3) {
          ctx.font = `bold ${11 * p.scale}px monospace`;
          ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
          const labels = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          ctx.fillText(labels[note.pitch % 12], p.px + size + 6, p.py + 4);
        }
      });

      // Render Pass 2: Front of Helix (Draws over notes for true 3D depth)
      drawHelixPass(true);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, divisions, octaves, releaseTime]);

  return (
    <div className="relative group cursor-move flex justify-center items-center bg-[#020205] p-6">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border border-white/5 shadow-2xl"
      />
      <div className="absolute top-6 left-6 pointer-events-none">
        <div className="text-cyan-500 font-mono text-xs tracking-[0.2em] font-bold">HELIX CORE</div>
        <div className="h-[1px] w-12 bg-cyan-500/50 mt-1"></div>
      </div>
    </div>
  );
};

export default SpiralTowerVisualizer;
