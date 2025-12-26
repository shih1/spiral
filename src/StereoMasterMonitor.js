import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio } from 'lucide-react';

const StereoMasterMonitor = ({ audioContext, analyser, leftAnalyser, rightAnalyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Smoothed meter values with ballistics
  const leftPeakRef = useRef(0);
  const rightPeakRef = useRef(0);
  const leftRmsRef = useRef(0);
  const rightRmsRef = useRef(0);
  const leftPeakHoldRef = useRef(0);
  const rightPeakHoldRef = useRef(0);
  const peakHoldTimerRef = useRef({ left: 0, right: 0 });

  // Pre-allocated buffers for zero-allocation loop
  const bufferRef = useRef(null);
  const leftBufferRef = useRef(null);
  const rightBufferRef = useRef(null);

  useEffect(() => {
    if (!analyser || !audioContext || !leftAnalyser || !rightAnalyser) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas resolution
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Initialize buffers
    const bufferLength = analyser.fftSize;
    bufferRef.current = new Float32Array(bufferLength);
    leftBufferRef.current = new Float32Array(bufferLength);
    rightBufferRef.current = new Float32Array(bufferLength);

    // Constants for ballistics
    const ATTACK_COEFF = 1.0; // Instant attack
    const RELEASE_COEFF = 0.95; // ~20dB per second decay
    const PEAK_HOLD_TIME = 500; // milliseconds
    const RMS_ATTACK = 0.3;
    const RMS_RELEASE = 0.92;

    // Get stereo analyser data
    const getStereoData = () => {
      // Get true stereo data from separate L/R analysers
      leftAnalyser.getFloatTimeDomainData(leftBufferRef.current);
      rightAnalyser.getFloatTimeDomainData(rightBufferRef.current);

      return {
        left: leftBufferRef.current,
        right: rightBufferRef.current,
        length: bufferLength,
      };
    };

    // Calculate RMS (Root Mean Square) for average power
    const calculateRms = (buffer, length) => {
      let sum = 0;
      for (let i = 0; i < length; i++) {
        sum += buffer[i] * buffer[i];
      }
      return Math.sqrt(sum / length);
    };

    // Calculate peak (maximum absolute value)
    const calculatePeak = (buffer, length) => {
      let peak = 0;
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peak) peak = abs;
      }
      return peak;
    };

    // Convert linear amplitude to dB
    const linearToDb = (linear) => {
      if (linear <= 0) return -Infinity;
      return 20 * Math.log10(linear);
    };

    // Map dB to pixel position (-60dB to 0dB range)
    const dbToPixel = (db, height) => {
      const minDb = -60;
      const maxDb = 0;
      const normalized = (db - minDb) / (maxDb - minDb);
      return height * (1 - Math.max(0, Math.min(1, normalized)));
    };

    // Draw meter scale markings
    const drawMeterScale = (ctx, x, y, width, height) => {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1;
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.textAlign = 'right';

      const dbMarks = [0, -3, -6, -12, -20, -30, -40];

      dbMarks.forEach((db) => {
        const yPos = y + dbToPixel(db, height);

        // Draw tick mark
        ctx.beginPath();
        ctx.moveTo(x - 5, yPos);
        ctx.lineTo(x, yPos);
        ctx.stroke();

        // Draw label
        if (db === 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        } else if (db >= -6) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        }
        ctx.fillText(db.toString(), x - 8, yPos + 3);
      });
    };

    // Draw a single VU meter bar
    const drawMeter = (ctx, x, y, width, height, rms, peak, peakHold, label) => {
      // Background (black with rounded corners)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Calculate positions
      const rmsDb = linearToDb(rms);
      const peakDb = linearToDb(peak);
      const peakHoldDb = linearToDb(peakHold);

      const rmsPos = dbToPixel(rmsDb, height);
      const peakPos = dbToPixel(peakDb, height);
      const peakHoldPos = dbToPixel(peakHoldDb, height);

      // Create clipping region for rounded corners
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 6);
      ctx.clip();

      // Draw RMS bar (solid fill)
      const barHeight = height - rmsPos;
      if (barHeight > 0) {
        // Create gradient for the bar
        const gradient = ctx.createLinearGradient(x, y + height, x, y + rmsPos);

        if (rmsDb > -3) {
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)'); // Red at top
          gradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.8)'); // Yellow
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.7)'); // Green at bottom
        } else if (rmsDb > -12) {
          gradient.addColorStop(0, 'rgba(251, 191, 36, 0.9)'); // Yellow at top
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.8)'); // Green at bottom
        } else {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
          gradient.addColorStop(1, 'rgba(20, 184, 166, 0.8)'); // Teal at bottom
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y + rmsPos, width - 4, barHeight);
      }

      ctx.restore();

      // Draw peak line (thin, bright)
      if (peakDb > -60) {
        ctx.strokeStyle = peakDb > -3 ? 'rgba(239, 68, 68, 1)' : 'rgba(251, 191, 36, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + peakPos);
        ctx.lineTo(x + width - 2, y + peakPos);
        ctx.stroke();
      }

      // Draw peak hold line
      if (peakHoldDb > -60) {
        ctx.strokeStyle = peakHoldDb > -3 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(251, 191, 36, 0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + peakHoldPos);
        ctx.lineTo(x + width - 2, y + peakHoldPos);
        ctx.stroke();
      }

      // Draw label
      ctx.fillStyle = 'rgba(203, 213, 225, 0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + width / 2, y + height + 15);

      // Draw dB value (only if above -60dB)
      if (rmsDb > -60) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '9px monospace';
        ctx.fillText(`${rmsDb.toFixed(1)} dB`, x + width / 2, y + height + 27);
      }
    };

    // Draw Stereo Vectorscope (Goniometer)
    const drawVectorscope = (ctx, x, y, size, leftData, rightData, length) => {
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const radius = size / 2 - 10;

      // Background (black with rounded corners)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw circular boundary
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Draw reference circles (at -6dB and -12dB points)
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.25, 0, Math.PI * 2);
      ctx.stroke();

      // Draw axis lines (L/R and M/S)
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1;

      // L-R axis (horizontal)
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.stroke();

      // M-S axis (vertical)
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();

      // Draw diagonal reference lines (+45° and -45°)
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
      const diag = radius * 0.707; // cos(45°) = sin(45°) = 0.707
      ctx.beginPath();
      ctx.moveTo(centerX - diag, centerY - diag);
      ctx.lineTo(centerX + diag, centerY + diag);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - diag, centerY + diag);
      ctx.lineTo(centerX + diag, centerY - diag);
      ctx.stroke();

      // Draw labels inside the vectorscope
      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';

      // L and R labels (on sides, inside the circle)
      ctx.fillText('L', x + 15, centerY + 4);
      ctx.fillText('R', x + size - 15, centerY + 4);

      // M and S labels (top and bottom, inside the circle)
      ctx.fillText('M', centerX, y + 20);
      ctx.fillText('S', centerX, y + size - 12);

      // Fade previous frame slightly for persistence
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2);
      ctx.fill();

      // Calculate normalization factor to make it volume-agnostic
      // Find the maximum magnitude across both channels
      let maxMagnitude = 0;
      for (let i = 0; i < length; i++) {
        const l = Math.abs(leftData[i] || 0);
        const r = Math.abs(rightData[i] || 0);
        const magnitude = Math.sqrt(l * l + r * r);
        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
        }
      }

      // Use a threshold to avoid normalizing silence
      const threshold = 0.01;
      const normalizationFactor = maxMagnitude > threshold ? 1.0 / maxMagnitude : 1.0;

      // Draw vectorscope plot with normalized values
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(length / 800));
      let firstPoint = true;

      for (let i = 0; i < length; i += step) {
        const l = (leftData[i] || 0) * normalizationFactor;
        const r = (rightData[i] || 0) * normalizationFactor;

        // Standard vectorscope: X = L-R (side), Y = L+R (mid)
        const side = (l - r) * 0.5; // X-axis: stereo width
        const mid = (l + r) * 0.5; // Y-axis: mono sum

        const plotX = centerX + side * radius * 0.95;
        const plotY = centerY - mid * radius * 0.95; // Invert Y for upward positive

        if (firstPoint) {
          ctx.moveTo(plotX, plotY);
          firstPoint = false;
        } else {
          ctx.lineTo(plotX, plotY);
        }
      }

      ctx.stroke();

      // Draw glow effect
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw center dot
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
    };

    // Main animation loop
    const animate = (timestamp) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.fillStyle = 'rgba(17, 24, 39, 1)';
      ctx.fillRect(0, 0, width, height);

      // Get stereo data
      const { left, right, length } = getStereoData();

      // Calculate current values
      const leftPeakCurrent = calculatePeak(left, length);
      const rightPeakCurrent = calculatePeak(right, length);
      const leftRmsCurrent = calculateRms(left, length);
      const rightRmsCurrent = calculateRms(right, length);

      // Apply ballistics to peaks (instant attack, slow release)
      leftPeakRef.current =
        leftPeakCurrent > leftPeakRef.current
          ? leftPeakCurrent * ATTACK_COEFF
          : leftPeakRef.current * RELEASE_COEFF;

      rightPeakRef.current =
        rightPeakCurrent > rightPeakRef.current
          ? rightPeakCurrent * ATTACK_COEFF
          : rightPeakRef.current * RELEASE_COEFF;

      // Apply ballistics to RMS (smoother)
      leftRmsRef.current =
        leftRmsCurrent > leftRmsRef.current
          ? leftRmsRef.current + (leftRmsCurrent - leftRmsRef.current) * RMS_ATTACK
          : leftRmsRef.current * RMS_RELEASE;

      rightRmsRef.current =
        rightRmsCurrent > rightRmsRef.current
          ? rightRmsRef.current + (rightRmsCurrent - rightRmsRef.current) * RMS_ATTACK
          : rightRmsRef.current * RMS_RELEASE;

      // Update peak hold
      if (leftPeakCurrent > leftPeakHoldRef.current) {
        leftPeakHoldRef.current = leftPeakCurrent;
        peakHoldTimerRef.current.left = timestamp;
      } else if (timestamp - peakHoldTimerRef.current.left > PEAK_HOLD_TIME) {
        leftPeakHoldRef.current *= RELEASE_COEFF;
      }

      if (rightPeakCurrent > rightPeakHoldRef.current) {
        rightPeakHoldRef.current = rightPeakCurrent;
        peakHoldTimerRef.current.right = timestamp;
      } else if (timestamp - peakHoldTimerRef.current.right > PEAK_HOLD_TIME) {
        rightPeakHoldRef.current *= RELEASE_COEFF;
      }

      // Layout calculations - center everything properly
      const meterHeight = height * 0.38;
      const meterWidth = 40;
      const meterSpacing = 20;

      // Calculate total width of just the two meters (no scale)
      const metersOnlyWidth = meterWidth * 2 + meterSpacing;
      const meterStartX = (width - metersOnlyWidth) / 2;
      const meterBottomY = 20 + meterHeight + 35;

      const vectorscopeSize = Math.min(width - 40, height * 0.48);
      const vectorscopeX = (width - vectorscopeSize) / 2;
      const vectorscopeY = meterBottomY + 20;

      // Draw left meter
      drawMeter(
        ctx,
        meterStartX,
        20,
        meterWidth,
        meterHeight,
        leftRmsRef.current,
        leftPeakRef.current,
        leftPeakHoldRef.current,
        'L'
      );

      // Draw right meter
      drawMeter(
        ctx,
        meterStartX + meterWidth + meterSpacing,
        20,
        meterWidth,
        meterHeight,
        rightRmsRef.current,
        rightPeakRef.current,
        rightPeakHoldRef.current,
        'R'
      );

      // Draw Vectorscope
      drawVectorscope(ctx, vectorscopeX, vectorscopeY, vectorscopeSize, left, right, length);

      // Draw section labels
      ctx.fillStyle = 'rgba(203, 213, 225, 0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VOLTAGE METERS', width / 2, 8);

      ctx.fillText('STEREO VECTORSCOPE', width / 2, vectorscopeY - 8);

      // Draw correlation info
      const correlation = calculateCorrelation(left, right, length);
      const correlationPercent = (((correlation + 1) / 2) * 100).toFixed(0);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.fillText(
        `Phase: ${correlationPercent}% ${
          correlation > 0.9 ? '(Mono)' : correlation < 0 ? '(Out of Phase)' : '(Stereo)'
        }`,
        width / 2,
        vectorscopeY + vectorscopeSize + 25
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    // Calculate phase correlation
    const calculateCorrelation = (left, right, length) => {
      let sumProduct = 0;
      let sumLeftSq = 0;
      let sumRightSq = 0;

      for (let i = 0; i < length; i++) {
        sumProduct += left[i] * right[i];
        sumLeftSq += left[i] * left[i];
        sumRightSq += right[i] * right[i];
      }

      const denominator = Math.sqrt(sumLeftSq * sumRightSq);
      return denominator > 0 ? sumProduct / denominator : 0;
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [audioContext, analyser, leftAnalyser, rightAnalyser]);

  if (!audioContext || !analyser || !leftAnalyser || !rightAnalyser) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Activity size={32} className="opacity-50" />
          <p className="text-sm">Audio system initializing...</p>
          <p className="text-xs text-gray-500">Play a note to activate monitoring</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden"
        style={{ width: '280px' }}
      >
        <canvas ref={canvasRef} className="w-full" style={{ height: '500px', display: 'block' }} />
      </div>
    </div>
  );
};

export default StereoMasterMonitor;
