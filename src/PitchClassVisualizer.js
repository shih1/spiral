import React, { useEffect, useRef } from 'react';

// ============================================================================
// CANVAS RENDERING COMPONENTS
// ============================================================================

/**
 * Background - Renders dark gradient background
 */
const renderBackground = (ctx, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const bgGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    Math.max(width, height) / 2
  );
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
};

/**
 * CenterDot - Renders the center point of the spiral
 */
const renderCenterDot = (ctx, width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;

  const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
  centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  centerGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.4)');
  centerGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
  ctx.fill();
};

// ============================================================================
// SPIRAL KEYBOARD COMPONENT
// ============================================================================

// ============================================================================
// PITCH CLASS VISUALIZER COMPONENT
// ============================================================================

const PitchClassVisualizer = ({ config, activePitchClasses, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    renderBackground(ctx, width, height);

    const { divisions } = config;
    const now = Date.now();
    const activeReleasedNotes = releasedNotes.filter((n) => now - n.time < config.releaseTime);
    const allActiveNotes = [...heldNotes, ...activeReleasedNotes];
    const uniquePitches = [...new Set(allActiveNotes.map((n) => n.pitch))];

    // Draw pitch class grid
    for (let i = 0; i < divisions; i++) {
      const angle = (i / divisions) * 2 * Math.PI;
      const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 3;
      ctx.shadowColor = 'rgba(100, 100, 100, 0.2)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const labelDist = Math.min(width, height) / 2 - 10;
      const labelX = centerX + Math.cos(angle) * labelDist;
      const labelY = centerY + Math.sin(angle) * labelDist;

      ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), labelX, labelY);
    }

    // Draw chord shape
    if (uniquePitches.length >= 2) {
      ctx.beginPath();
      uniquePitches.forEach((pitch, index) => {
        const angle = (pitch / divisions) * 2 * Math.PI;
        const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
        const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);
        if (index === 0) {
          ctx.moveTo(endX, endY);
        } else {
          ctx.lineTo(endX, endY);
        }
      });
      ctx.closePath();

      const chordGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.min(width, height) / 2
      );
      chordGradient.addColorStop(0, 'rgba(0, 255, 255, 0.25)');
      chordGradient.addColorStop(1, 'rgba(0, 255, 255, 0.05)');
      ctx.fillStyle = chordGradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(0, 255, 255, 1)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw active pitch classes
    activePitchClasses.forEach(({ pitch, opacity }) => {
      if (pitch === null) return;

      const angle = (pitch / divisions) * 2 * Math.PI;
      const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      const color = [0, 255, 136];

      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
      ctx.lineWidth = 5;
      ctx.shadowBlur = 25 * opacity;
      ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.shadowBlur = 35 * opacity;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    renderCenterDot(ctx, width, height);

    // Title
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(centerX - 60, 5, 120, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Pitch Class', centerX, 23);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64c8ff';
    ctx.fillText('Visualizer', centerX, 40);
  }, [config, activePitchClasses, heldNotes, releasedNotes]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={700}
      className="border border-gray-700 rounded flex-shrink-0"
    />
  );
};

export default PitchClassVisualizer;
