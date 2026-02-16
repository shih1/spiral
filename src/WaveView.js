import React, { useEffect, useRef } from 'react';

const WaveView = ({ analyserNode, audioContext, mode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // 3D controls (matching SpiralTowerVisualizer)
  const rotationRef = useRef(Math.PI); // 180 degrees
  const pitchRef = useRef(20 * Math.PI / 180); // 20 degrees
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0.002, y: 0 });
  const zoomRef = useRef(1.0);

  // Wave data buffer - store history of frequency data
  const historyRef = useRef([]);
  const maxHistory = 150; // Number of time slices to keep

  const handleMouseDown = (e) => {
    if (mode !== '3d') return;

    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent) => {
      if (!isDragging.current) return;
      velocity.current.x = (moveEvent.clientX - lastMousePos.current.x) * 0.01;
      velocity.current.y = (moveEvent.clientY - lastMousePos.current.y) * 0.01;
      lastMousePos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      velocity.current = { x: 0, y: 0 };
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleWheel = (e) => {
    if (mode !== '3d') return;
    e.preventDefault();

    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    zoomRef.current = Math.max(0.5, Math.min(3.0, zoomRef.current + delta));
  };

  const handleClick = (e) => {
    if (mode !== '3d') return;
    if (e.ctrlKey || e.metaKey) {
      // Reset view to defaults
      rotationRef.current = Math.PI; // 180 degrees
      pitchRef.current = 20 * Math.PI / 180; // 20 degrees
      zoomRef.current = 1.0;
    }
  };

  useEffect(() => {
    if (!analyserNode || !canvasRef.current || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    const width = canvas.width;
    const height = canvas.height;

    // Create analyser
    const fftAnalyser = audioContext.createAnalyser();
    fftAnalyser.fftSize = 8192;
    fftAnalyser.smoothingTimeConstant = 0.8;
    analyserNode.connect(fftAnalyser);

    const fftBufferLength = fftAnalyser.frequencyBinCount;
    const freqDataArray = new Uint8Array(fftBufferLength);
    const sampleRate = audioContext.sampleRate;
    const nyquist = sampleRate / 2;

    const minFreq = 50;
    const maxFreq = 10000;
    const logMin = Math.log10(minFreq);
    const logMax = Math.log10(maxFreq);
    const logRange = logMax - logMin;

    // Frequency bins (lower resolution for performance)
    const numFreqBins = 200;

    const getColorFromIntensity = (intensity) => {
      let r, g, b;
      if (intensity < 0.25) {
        const t = intensity / 0.25;
        r = 0;
        g = 0;
        b = Math.floor(t * 100);
      } else if (intensity < 0.5) {
        const t = (intensity - 0.25) / 0.25;
        r = 0;
        g = Math.floor(t * 251);
        b = Math.floor(100 + t * 155);
      } else if (intensity < 0.75) {
        const t = (intensity - 0.5) / 0.25;
        r = Math.floor(t * 255);
        g = 251;
        b = 255;
      } else {
        const t = (intensity - 0.75) / 0.25;
        r = 255;
        g = 251 + Math.floor(t * 4);
        b = 255;
      }
      return { r, g, b };
    };

    let lastFrameTime = 0;
    const frameInterval = 1000 / 30; // 30 FPS for better performance

    const draw = (currentTime) => {
      animationRef.current = requestAnimationFrame(draw);

      const elapsed = currentTime - lastFrameTime;
      if (elapsed < frameInterval) return;
      lastFrameTime = currentTime - (elapsed % frameInterval);

      // Update 3D controls
      if (mode === '3d') {
        if (isDragging.current) {
          rotationRef.current += velocity.current.x;
          pitchRef.current = Math.max(
            0.1,
            Math.min(Math.PI - 0.1, pitchRef.current + velocity.current.y)
          );
        }
      }

      // Get new frequency data
      fftAnalyser.getByteFrequencyData(freqDataArray);

      // Sample frequency data into bins
      const newSlice = new Array(numFreqBins);
      for (let i = 0; i < numFreqBins; i++) {
        const logFreq = logMin + (i / numFreqBins) * logRange;
        const freq = Math.pow(10, logFreq);
        const binIndex = (freq / nyquist) * fftBufferLength;
        const idx = Math.floor(binIndex);
        const fraction = binIndex - idx;

        let val;
        if (idx < fftBufferLength - 1) {
          val = freqDataArray[idx] * (1 - fraction) + freqDataArray[idx + 1] * fraction;
        } else if (idx < fftBufferLength) {
          val = freqDataArray[idx];
        } else {
          val = 0;
        }

        newSlice[i] = val / 255;
      }

      // Add to history
      historyRef.current.unshift(newSlice);
      if (historyRef.current.length > maxHistory) {
        historyRef.current.pop();
      }

      // Clear canvas
      ctx.fillStyle = 'rgb(10, 10, 18)';
      ctx.fillRect(0, 0, width, height);

      if (mode === '2d') {
        // 2D waterfall - simple and efficient
        const sliceHeight = height / historyRef.current.length;

        historyRef.current.forEach((slice, timeIdx) => {
          const y = timeIdx * sliceHeight;
          const sliceWidth = width / numFreqBins;

          slice.forEach((intensity, freqIdx) => {
            const x = freqIdx * sliceWidth;
            const color = getColorFromIntensity(intensity);
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.fillRect(x, y, Math.ceil(sliceWidth), Math.ceil(sliceHeight));
          });
        });
      } else {
        // 3D mode - draw strips with perspective
        const centerX = width / 2;
        const centerY = height / 2 + 50;
        const perspective = 600;
        const depthSpacing = 8; // Space between time slices
        const widthScale = 3.0; // Doubled for more horizontal spread
        const heightScale = 120;

        // Helper function to project 3D point to 2D
        const project3D = (x3d, y3d, z3d) => {
          const cosRot = Math.cos(rotationRef.current);
          const sinRot = Math.sin(rotationRef.current);
          const xRot = x3d * cosRot - z3d * sinRot;
          const zRot = x3d * sinRot + z3d * cosRot;

          const cosPitch = Math.cos(pitchRef.current);
          const sinPitch = Math.sin(pitchRef.current);
          const yPitch = y3d * cosPitch - zRot * sinPitch;
          const zPitch = y3d * sinPitch + zRot * cosPitch;

          const zFinal = zPitch + perspective;
          if (zFinal <= 10) return null;

          const scale = (perspective / zFinal) * zoomRef.current;
          return {
            x: centerX + xRot * scale,
            y: centerY + yPitch * scale,
            scale,
            zFinal,
          };
        };

        // Draw 3D grid/axes
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
        ctx.lineWidth = 1;

        // Ground grid lines (frequency axis)
        const gridSpacing = 50;
        const gridExtent = 300;
        const groundY = 0;
        const gridDepth = (maxHistory * depthSpacing) / 2;

        for (let x = -gridExtent; x <= gridExtent; x += gridSpacing) {
          const p1 = project3D(x, groundY, -gridDepth);
          const p2 = project3D(x, groundY, gridDepth);
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Depth grid lines (time axis)
        for (let z = -gridDepth; z <= gridDepth; z += depthSpacing * 5) {
          const p1 = project3D(-gridExtent, groundY, z);
          const p2 = project3D(gridExtent, groundY, z);
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Build all points for mesh
        const allPoints = [];
        for (let timeIdx = 0; timeIdx < historyRef.current.length; timeIdx++) {
          const slice = historyRef.current[timeIdx];
          const z3d = timeIdx * depthSpacing - (maxHistory * depthSpacing) / 2;
          const timePoints = [];

          for (let freqIdx = 0; freqIdx < numFreqBins; freqIdx++) {
            const intensity = slice[freqIdx];
            const x3d = (numFreqBins / 2 - freqIdx) * widthScale; // Reversed for 180° default view
            const y3d = -intensity * heightScale;

            const projected = project3D(x3d, y3d, z3d);
            if (projected) {
              timePoints.push({
                x: projected.x,
                y: projected.y,
                intensity,
                zFinal: projected.zFinal,
                scale: projected.scale,
              });
            } else {
              timePoints.push(null);
            }
          }
          allPoints.push(timePoints);
        }

        ctx.globalCompositeOperation = 'lighter'; // Additive blending for see-through effect

        // Draw filled quads between time slices for continuous surface
        for (let timeIdx = 0; timeIdx < allPoints.length - 1; timeIdx++) {
          const currentSlice = allPoints[timeIdx];
          const nextSlice = allPoints[timeIdx + 1];

          for (let freqIdx = 0; freqIdx < numFreqBins - 1; freqIdx++) {
            const p1 = currentSlice[freqIdx];
            const p2 = currentSlice[freqIdx + 1];
            const p3 = nextSlice[freqIdx + 1];
            const p4 = nextSlice[freqIdx];

            // Only draw if all 4 corner points are valid
            if (p1 && p2 && p3 && p4) {
              // Average intensity and depth for the quad
              const avgIntensity = (p1.intensity + p2.intensity + p3.intensity + p4.intensity) / 4;
              const avgZ = (p1.zFinal + p2.zFinal + p3.zFinal + p4.zFinal) / 4;
              const fog = Math.max(0.3, Math.min(1, avgZ / perspective));

              // Cyan color with intensity-based brightness
              const brightness = 0.4 + avgIntensity * 0.6;
              const cyanR = Math.floor(0 * brightness * fog);
              const cyanG = Math.floor(251 * brightness * fog);
              const cyanB = Math.floor(255 * brightness * fog);
              const fillAlpha = (0.3 + avgIntensity * 0.5) * fog;

              // Draw filled quad
              ctx.fillStyle = `rgba(${cyanR}, ${cyanG}, ${cyanB}, ${fillAlpha})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.lineTo(p3.x, p3.y);
              ctx.lineTo(p4.x, p4.y);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        ctx.globalCompositeOperation = 'source-over'; // Reset blend mode

        // Display coordinates in corner
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'left';
        const rotDeg = ((rotationRef.current * 180) / Math.PI).toFixed(1);
        const pitchDeg = ((pitchRef.current * 180) / Math.PI).toFixed(1);
        const zoomLevel = zoomRef.current.toFixed(2);
        ctx.fillText(`Rotation: ${rotDeg}°`, 10, 20);
        ctx.fillText(`Pitch: ${pitchDeg}°`, 10, 35);
        ctx.fillText(`Zoom: ${zoomLevel}x`, 10, 50);
      }
    };

    draw(0);

    return () => {
      cancelAnimationFrame(animationRef.current);
      fftAnalyser.disconnect();
    };
  }, [analyserNode, audioContext, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={2048}
      height={300}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onClick={handleClick}
      className="w-full h-48 bg-black/20 rounded-lg border border-white/5"
      style={{ cursor: mode === '3d' ? 'grab' : 'default' }}
    />
  );
};

export default WaveView;
