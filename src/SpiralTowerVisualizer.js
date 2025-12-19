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

  const getNoteColor = (absoluteStep, alpha = 1) => {
    const hue = (absoluteStep / (divisions * octaves)) * 360;
    // Lightness is now locked at 60% for both front and back
    return `hsla(${hue}, 80%, 60%, ${alpha})`;
  };

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
      ctx.fillStyle = '#020205';
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

      // 1. VERTICAL RIBS (White)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let d = 0; d < divisions; d++) {
        ctx.beginPath();
        for (let o = 0; o <= octaves; o++) {
          const p = project3D(getCoordinates(d + o * divisions));
          if (o === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
      }

      // 2. HELIX RENDERING
      const segmentsPerNote = 8; // Increased resolution for smoother transitions
      const totalSteps = divisions * octaves * segmentsPerNote;

      const drawHelixPass = (drawFront) => {
        for (let i = 0; i < totalSteps; i++) {
          const step1 = i / segmentsPerNote;
          const step2 = (i + 1) / segmentsPerNote;

          const p1 = project3D(getCoordinates(step1));
          const p2 = project3D(getCoordinates(step2));

          // Draw only if the segment matches the current pass (Front or Back)
          if (!p1 || !p2 || p1.isFront !== drawFront) continue;

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);

          // No more opacity difference between passes
          ctx.strokeStyle = getNoteColor(step1, 0.8);
          ctx.lineWidth = (drawFront ? 3 : 2) * p1.scale;
          ctx.stroke();
        }
      };

      // Back Pass
      drawHelixPass(false);

      // 3. ACTIVE NOTES
      const now = Date.now();
      const allActive = [...heldNotes, ...releasedNotes.filter((n) => now - n.time < releaseTime)];

      allActive.forEach((note) => {
        const absoluteStep = note.pitch + note.octave * divisions;
        const p = project3D(getCoordinates(absoluteStep));
        let fade = note.time ? Math.max(0, 1 - (now - note.time) / releaseTime) : 1.0;
        const size = (note.time ? 7 : 12) * p.scale;

        const noteColor = getNoteColor(absoluteStep, fade);
        ctx.shadowBlur = 20 * fade;
        ctx.shadowColor = noteColor;
        ctx.fillStyle = noteColor;

        ctx.beginPath();
        ctx.arc(p.px, p.py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (fade > 0.3) {
          ctx.font = `bold ${11 * p.scale}px monospace`;
          ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
          const labels = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          ctx.fillText(labels[note.pitch % 12], p.px + size + 6, p.py + 4);
        }
      });

      // Front Pass
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
    </div>
  );
};

export default SpiralTowerVisualizer;
