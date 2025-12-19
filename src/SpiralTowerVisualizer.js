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

        const zFinal = zNew + 400;
        if (zFinal <= 0) return null; // Avoid division by zero

        const factor = perspective / (perspective + zFinal);
        const px = centerX + x * factor;
        const py = centerY + yNew * factor;

        // Final safety check for Canvas API
        if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

        return { px, py, scale: factor, zDepth: zNew, isFront: zNew < 0 };
      };

      // 1. DATA PREP
      const now = Date.now();
      const allActive = [...heldNotes, ...releasedNotes.filter((n) => now - n.time < releaseTime)];
      const currentPoints = allActive
        .map((note) => {
          const abs = note.pitch + note.octave * divisions;
          const proj = project3D(getCoordinates(abs));
          return proj ? { ...proj, color: getNoteColor(abs) } : null;
        })
        .filter((p) => p !== null);

      // 2. WHITE RIBS
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let d = 0; d < divisions; d++) {
        ctx.beginPath();
        for (let o = 0; o <= octaves; o++) {
          const p = project3D(getCoordinates(d + o * divisions));
          if (!p) continue;
          if (o === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        }
        ctx.stroke();
      }

      const drawHelixPass = (drawFront) => {
        const segmentsPerNote = 8;
        for (let i = 0; i < divisions * octaves * segmentsPerNote; i++) {
          const p1 = project3D(getCoordinates(i / segmentsPerNote));
          const p2 = project3D(getCoordinates((i + 1) / segmentsPerNote));
          if (!p1 || !p2 || p1.isFront !== drawFront) continue;
          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.strokeStyle = getNoteColor(i / segmentsPerNote, 0.8);
          ctx.lineWidth = (drawFront ? 3 : 2) * p1.scale;
          ctx.stroke();
        }
      };

      // 3. BACK HELIX
      drawHelixPass(false);

      // 4. TEXTURED CRYSTAL (With Non-Finite Safety)
      if (currentPoints.length >= 3) {
        for (let i = 0; i < currentPoints.length; i++) {
          for (let j = i + 1; j < currentPoints.length; j++) {
            for (let k = j + 1; k < currentPoints.length; k++) {
              const p1 = currentPoints[i];
              const p2 = currentPoints[j];
              const p3 = currentPoints[k];

              // Ensure points aren't identical to avoid zero-width gradients
              if (Math.abs(p1.px - p3.px) < 0.1 && Math.abs(p1.py - p3.py) < 0.1) continue;

              ctx.beginPath();
              ctx.moveTo(p1.px, p1.py);
              ctx.lineTo(p2.px, p2.py);
              ctx.lineTo(p3.px, p3.py);
              ctx.closePath();

              try {
                const grad = ctx.createLinearGradient(p1.px, p1.py, p3.px, p3.py);
                const avgZ = (p1.zDepth + p2.zDepth + p3.zDepth) / 3;

                // Texture colors
                const opacity = avgZ < 0 ? 0.18 : 0.06;
                const highlight = Math.sin(rotationRef.current + i) * 0.5 + 0.5; // Shimmer effect

                grad.addColorStop(0, `rgba(200, 230, 255, ${opacity})`);
                grad.addColorStop(0.5 + highlight * 0.2, `rgba(255, 255, 255, ${opacity * 2})`);
                grad.addColorStop(1, `rgba(100, 150, 255, ${opacity * 0.5})`);

                ctx.fillStyle = grad;
                ctx.fill();
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              } catch (e) {
                // Fallback if gradient still fails
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fill();
              }
            }
          }
        }
      }

      // 5. ACTIVE NOTES
      currentPoints.forEach((p) => {
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.px, p.py, 6 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(p.px, p.py, 2 * p.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. FRONT HELIX
      drawHelixPass(true);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [heldNotes, releasedNotes, getCoordinates, divisions, octaves, releaseTime]);

  return (
    <div className="relative flex justify-center items-center bg-[#020205] p-6">
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
