import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio } from 'lucide-react';

const StereoMasterMonitor = ({ audioContext, analyser }) => {
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
    if (!analyser || !audioContext) return;

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
      // For stereo separation, we'll use the single analyser and split mathematically
      // In a real implementation, you'd have separate analysers for L/R
      analyser.getFloatTimeDomainData(bufferRef.current);

      // Simulate stereo by taking odd/even samples
      // This is a simplified approach; real stereo would need separate analysers
      for (let i = 0; i < bufferLength / 2; i++) {
        leftBufferRef.current[i] = bufferRef.current[i * 2];
        rightBufferRef.current[i] = bufferRef.current[i * 2 + 1] || bufferRef.current[i * 2];
      }

      return {
        left: leftBufferRef.current,
        right: rightBufferRef.current,
        length: bufferLength / 2,
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

      const dbMarks = [0, -3, -6, -12, -20, -30, -40, -60];

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
      // Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(x, y, width, height);

      // Border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);

      // Calculate positions
      const rmsDb = linearToDb(rms);
      const peakDb = linearToDb(peak);
      const peakHoldDb = linearToDb(peakHold);

      const rmsPos = dbToPixel(rmsDb, height);
      const peakPos = dbToPixel(peakDb, height);
      const peakHoldPos = dbToPixel(peakHoldDb, height);

      // Draw RMS bar (solid fill)
      const barHeight = height - rmsPos;
      if (barHeight > 0) {
        // Create gradient for the bar
        const gradient = ctx.createLinearGradient(x, y + height, x, y + rmsPos);

        if (rmsDb > -3) {
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)'); // Red at top
          gradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.7)'); // Yellow
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.6)'); // Green at bottom
        } else if (rmsDb > -12) {
          gradient.addColorStop(0, 'rgba(251, 191, 36, 0.8)'); // Yellow at top
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.7)'); // Green at bottom
        } else {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
          gradient.addColorStop(1, 'rgba(20, 184, 166, 0.7)'); // Teal at bottom
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y + rmsPos, width - 4, barHeight);
      }

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
        ctx.moveTo(x, y + peakHoldPos);
        ctx.lineTo(x + width, y + peakHoldPos);
        ctx.stroke();
      }

      // Draw label
      ctx.fillStyle = 'rgba(203, 213, 225, 0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + width / 2, y + height + 15);

      // Draw dB value
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '9px monospace';
      ctx.fillText(`${rmsDb > -60 ? rmsDb.toFixed(1) : '-∞'} dB`, x + width / 2, y + height + 27);
    };

    // Draw Lissajous stereo imager
    const drawLissajous = (ctx, x, y, size, leftData, rightData, length) => {
      // Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(x, y, size, size);

      // Border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, size, size);

      // Draw center crosshairs
      const centerX = x + size / 2;
      const centerY = y + size / 2;

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, y);
      ctx.lineTo(centerX, y + size);
      ctx.moveTo(x, centerY);
      ctx.lineTo(x + size, centerY);
      ctx.stroke();

      // Draw diagonal reference lines (mono = vertical, out-of-phase = horizontal)
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.stroke();

      // Draw persistence trail (fade previous frame)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(x, y, size, size);

      // Draw Lissajous curve (rotated 45 degrees)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(length / 500));
      let firstPoint = true;

      for (let i = 0; i < length; i += step) {
        const l = leftData[i] || 0;
        const r = rightData[i] || 0;

        // 45-degree rotation: M+S representation
        const mid = (l + r) / 2;
        const side = (l - r) / 2;

        const plotX = centerX + mid * size * 0.4;
        const plotY = centerY - side * size * 0.4;

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

      // Layout calculations
      const meterHeight = height * 0.45;
      const meterWidth = 40;
      const meterSpacing = 20;
      const scaleWidth = 35;
      const totalMeterWidth = scaleWidth + meterWidth * 2 + meterSpacing;

      const lissajousSize = Math.min(width - 40, height * 0.45);
      const lissajousY = meterHeight + 30;

      // Draw meter scale
      drawMeterScale(ctx, scaleWidth - 5, 10, scaleWidth, meterHeight);

      // Draw left meter
      drawMeter(
        ctx,
        scaleWidth,
        10,
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
        scaleWidth + meterWidth + meterSpacing,
        10,
        meterWidth,
        meterHeight,
        rightRmsRef.current,
        rightPeakRef.current,
        rightPeakHoldRef.current,
        'R'
      );

      // Draw Lissajous stereo imager
      const lissajousX = (width - lissajousSize) / 2;
      drawLissajous(ctx, lissajousX, lissajousY, lissajousSize, left, right, length);

      // Draw labels
      ctx.fillStyle = 'rgba(203, 213, 225, 0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LEVEL METERS', 10, 25);

      ctx.fillText('STEREO IMAGER', 10, lissajousY + 15);

      // Draw stereo width indicator
      const correlation = calculateCorrelation(left, right, length);
      const correlationPercent = (((correlation + 1) / 2) * 100).toFixed(0);
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.fillText(
        `Correlation: ${correlationPercent}% ${
          correlation > 0.9 ? '(Mono)' : correlation < -0.5 ? '(Out of Phase)' : '(Stereo)'
        }`,
        10,
        lissajousY + lissajousSize + 20
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
  }, [audioContext, analyser]);

  if (!audioContext || !analyser) {
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
      <div className="flex items-center gap-2 text-gray-300">
        <Radio size={18} className="text-cyan-400" />
        <h3 className="font-semibold text-sm">Master Output Monitor</h3>
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full" style={{ height: '600px', display: 'block' }} />
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Level Meters: VU-style metering with peak hold</p>
        <p>• Stereo Imager: Phase correlation visualization</p>
        <p>• Vertical line = Mono | Diagonal = Stereo | Horizontal = Out of Phase</p>
      </div>
    </div>
  );
};

export default StereoMasterMonitor;
