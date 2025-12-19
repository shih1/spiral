import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';

const AudioVisualizer = ({ analyserNode, audioContext }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [mode, setMode] = useState('split'); // 'oscilloscope', 'fft', or 'split'

  useEffect(() => {
    if (!analyserNode || !canvasRef.current || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    analyserNode.fftSize = 4096;
    const bufferLength = analyserNode.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);

    const sampleRate = audioContext.sampleRate;

    // Stable trigger - RISING EDGE ONLY
    let lastTriggerPoint = 0;
    const findStableTrigger = (data) => {
      const threshold = 128;
      const hysteresis = 10;

      // Only look for rising edge (positive slope through threshold)
      for (let i = 100; i < data.length - 100; i++) {
        const current = data[i];
        const next = data[i + 1];

        // Rising edge: below threshold, then above threshold
        if (current < threshold - hysteresis && next > threshold + hysteresis) {
          // Strong positive slope only
          const slope = next - current;
          if (slope > 15) {
            lastTriggerPoint = i;
            return i;
          }
        }
      }
      // If no good trigger found, use last known good trigger
      return lastTriggerPoint;
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (mode === 'oscilloscope') {
        analyserNode.getByteTimeDomainData(timeDataArray);

        ctx.fillStyle = 'rgb(15, 15, 25)';
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;

        // Horizontal grid (time/amplitude)
        for (let i = 0; i <= 4; i++) {
          const y = (height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Vertical grid
        for (let i = 0; i <= 10; i++) {
          const x = (width / 10) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Find trigger point for stable display
        const triggerPoint = findStableTrigger(timeDataArray);

        // Calculate how many samples to display (about 2-3 cycles)
        const samplesToShow = Math.min(1024, bufferLength - triggerPoint);
        const sliceWidth = width / samplesToShow;

        // Draw waveform
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 220, 255)';
        ctx.beginPath();

        let x = 0;
        for (let i = 0; i < samplesToShow; i++) {
          const v = timeDataArray[triggerPoint + i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // Draw time axis labels
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.font = '10px monospace';

        const timePerSample = 1000 / sampleRate; // ms per sample
        const totalTimeMs = samplesToShow * timePerSample;

        // Labels every 20% of width
        for (let i = 0; i <= 5; i++) {
          const timeMs = (totalTimeMs / 5) * i;
          const xPos = (width / 5) * i;
          ctx.fillText(`${timeMs.toFixed(1)}ms`, xPos + 2, height - 5);
        }

        // Amplitude labels
        ctx.fillText('+1', 5, 12);
        ctx.fillText('0', 5, height / 2 + 4);
        ctx.fillText('-1', 5, height - 5);
      } else if (mode === 'fft') {
        // FFT mode
        analyserNode.getByteFrequencyData(freqDataArray);

        ctx.fillStyle = 'rgb(15, 15, 25)';
        ctx.fillRect(0, 0, width, height);

        // Draw frequency grid - logarithmic scale
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;

        const freqMarkers = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 20000];
        const nyquist = sampleRate / 2;

        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            // Logarithmic position
            const logPos = Math.log10(freq) / Math.log10(nyquist);
            const x = logPos * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        });

        // Draw bars with logarithmic frequency spacing
        const numBars = 200;
        for (let i = 0; i < numBars; i++) {
          // Map bar index to frequency bin logarithmically
          const logFreq = (i / numBars) * Math.log10(nyquist);
          const freq = Math.pow(10, logFreq);
          const binIndex = Math.floor((freq / nyquist) * bufferLength);

          if (binIndex < bufferLength) {
            const barHeight = (freqDataArray[binIndex] / 255) * height;
            const barWidth = width / numBars;

            const hue = 200 - (i / numBars) * 60;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
          }
        }

        // Draw frequency labels
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.font = '10px monospace';

        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            const logPos = Math.log10(freq) / Math.log10(nyquist);
            const x = logPos * width;
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillText(label, x + 2, height - 5);
          }
        });
      } else {
        // Split screen mode
        analyserNode.getByteTimeDomainData(timeDataArray);
        analyserNode.getByteFrequencyData(freqDataArray);

        const halfWidth = width / 2;

        // LEFT SIDE: Oscilloscope
        ctx.fillStyle = 'rgb(15, 15, 25)';
        ctx.fillRect(0, 0, halfWidth, height);

        // Grid for oscilloscope
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = (height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(halfWidth, y);
          ctx.stroke();
        }

        const triggerPoint = findStableTrigger(timeDataArray);
        const samplesToShow = Math.min(1024, bufferLength - triggerPoint);
        const sliceWidth = halfWidth / samplesToShow;

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 220, 255)';
        ctx.beginPath();

        let x = 0;
        for (let i = 0; i < samplesToShow; i++) {
          const v = timeDataArray[triggerPoint + i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.font = '9px monospace';
        const timePerSample = 1000 / sampleRate;
        const totalTimeMs = samplesToShow * timePerSample;
        ctx.fillText(`${(totalTimeMs / 2).toFixed(1)}ms`, halfWidth / 2 - 15, height - 5);

        // Divider line
        ctx.strokeStyle = 'rgba(100, 100, 120, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth, height);
        ctx.stroke();

        // RIGHT SIDE: FFT
        ctx.fillStyle = 'rgb(15, 15, 25)';
        ctx.fillRect(halfWidth, 0, halfWidth, height);

        const freqMarkers = [100, 1000, 5000, 10000, 20000];
        const nyquist = sampleRate / 2;

        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            const logPos = Math.log10(freq) / Math.log10(nyquist);
            const xPos = halfWidth + logPos * halfWidth;
            ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, height);
            ctx.stroke();
          }
        });

        const numBars = 100;
        for (let i = 0; i < numBars; i++) {
          const logFreq = (i / numBars) * Math.log10(nyquist);
          const freq = Math.pow(10, logFreq);
          const binIndex = Math.floor((freq / nyquist) * bufferLength);

          if (binIndex < bufferLength) {
            const barHeight = (freqDataArray[binIndex] / 255) * height;
            const barWidth = halfWidth / numBars;

            const hue = 200 - (i / numBars) * 60;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(halfWidth + i * barWidth, height - barHeight, barWidth - 1, barHeight);
          }
        }

        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.font = '9px monospace';
        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            const logPos = Math.log10(freq) / Math.log10(nyquist);
            const xPos = halfWidth + logPos * halfWidth;
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillText(label, xPos + 2, height - 5);
          }
        });
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, audioContext, mode]);

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-white font-medium text-xs flex items-center gap-1.5">
          {mode === 'oscilloscope' ? (
            <>
              <Activity size={14} className="text-cyan-400" />
              <span>Scope</span>
            </>
          ) : mode === 'fft' ? (
            <>
              <BarChart3 size={14} className="text-purple-400" />
              <span>Spectrum</span>
            </>
          ) : (
            <>
              <Activity size={14} className="text-cyan-400" />
              <BarChart3 size={14} className="text-purple-400" />
              <span>Split</span>
            </>
          )}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('oscilloscope')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              mode === 'oscilloscope'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Scope
          </button>
          <button
            onClick={() => setMode('fft')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              mode === 'fft'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600'
            }`}
          >
            FFT
          </button>
          <button
            onClick={() => setMode('split')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              mode === 'split'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/70 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Both
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={80}
        className="w-full rounded border border-gray-600/50"
      />
    </div>
  );
};

export default AudioVisualizer;
