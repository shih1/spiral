import React, { useEffect, useRef, useMemo } from 'react';

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
// PITCH CLASS VISUALIZER COMPONENT
// ============================================================================

const PitchClassVisualizer = ({ config, activePitchClasses, heldNotes, releasedNotes }) => {
  const canvasRef = useRef(null);
  const staticLayerRef = useRef(null); // Cache static elements
  const animationFrameRef = useRef(null);

  const { divisions, releaseTime } = config;
  const width = 700;
  const height = 700;
  const centerX = width / 2;
  const centerY = height / 2;

  // Pre-calculate angle positions (ONLY recalculate when divisions change)
  const anglePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < divisions; i++) {
      const angle = (i / divisions) * 2 * Math.PI;
      const endX = centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY = centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);
      const labelDist = Math.min(width, height) / 2 - 10;
      const labelX = centerX + Math.cos(angle) * labelDist;
      const labelY = centerY + Math.sin(angle) * labelDist;
      positions.push({ angle, endX, endY, labelX, labelY, pitch: i });
    }
    return positions;
  }, [divisions]);

  // Draw static layer ONCE (only when divisions change)
  useEffect(() => {
    if (!staticLayerRef.current) {
      staticLayerRef.current = document.createElement('canvas');
      staticLayerRef.current.width = width;
      staticLayerRef.current.height = height;
    }

    const staticCtx = staticLayerRef.current.getContext('2d');
    staticCtx.clearRect(0, 0, width, height);

    // Draw background
    renderBackground(staticCtx, width, height);

    // Draw pitch class grid (static - only changes with divisions)
    anglePositions.forEach(({ endX, endY, labelX, labelY, pitch }) => {
      staticCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
      staticCtx.lineWidth = 1;
      staticCtx.shadowBlur = 3;
      staticCtx.shadowColor = 'rgba(100, 100, 100, 0.2)';
      staticCtx.beginPath();
      staticCtx.moveTo(centerX, centerY);
      staticCtx.lineTo(endX, endY);
      staticCtx.stroke();
      staticCtx.shadowBlur = 0;

      staticCtx.fillStyle = 'rgba(180, 180, 180, 0.7)';
      staticCtx.font = 'bold 11px sans-serif';
      staticCtx.textAlign = 'center';
      staticCtx.textBaseline = 'middle';
      staticCtx.fillText(pitch.toString(), labelX, labelY);
    });

    // Draw center dot
    renderCenterDot(staticCtx, width, height);

    // Draw title
    staticCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    staticCtx.fillRect(centerX - 60, 5, 120, 45);
    staticCtx.fillStyle = '#ffffff';
    staticCtx.font = 'bold 16px sans-serif';
    staticCtx.textAlign = 'center';
    staticCtx.fillText('Pitch Class', centerX, 23);
    staticCtx.font = '12px sans-serif';
    staticCtx.fillStyle = '#64c8ff';
    staticCtx.fillText('Visualizer', centerX, 40);
  }, [divisions, anglePositions]);

  // Render dynamic layer using requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext('2d');

      // Copy static layer
      if (staticLayerRef.current) {
        ctx.drawImage(staticLayerRef.current, 0, 0);
      }

      const now = Date.now();
      const activeReleasedNotes = releasedNotes.filter((n) => now - n.time < releaseTime);
      const allActiveNotes = [...heldNotes, ...activeReleasedNotes];
      const uniquePitches = [...new Set(allActiveNotes.map((n) => n.pitch))];

      // Draw chord shape
      if (uniquePitches.length >= 2) {
        ctx.beginPath();
        uniquePitches.forEach((pitch, index) => {
          const pos = anglePositions[pitch];
          if (!pos) return;
          if (index === 0) {
            ctx.moveTo(pos.endX, pos.endY);
          } else {
            ctx.lineTo(pos.endX, pos.endY);
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
        if (pitch === null || pitch >= anglePositions.length) return;

        const pos = anglePositions[pitch];
        const color = [0, 255, 136];

        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
        ctx.lineWidth = 5;
        ctx.shadowBlur = 25 * opacity;
        ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pos.endX, pos.endY);
        ctx.stroke();

        ctx.shadowBlur = 35 * opacity;
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(pos.endX, pos.endY, 8, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(pos.endX, pos.endY, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.shadowBlur = 0;
      });

      // Continue animation loop if there are active notes
      if (activePitchClasses.length > 0 || allActiveNotes.length > 0) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    // Start rendering
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [config, activePitchClasses, heldNotes, releasedNotes, anglePositions, releaseTime]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-700 rounded flex-shrink-0"
    />
  );
};

export default PitchClassVisualizer;
