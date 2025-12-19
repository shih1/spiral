import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';

const AudioVisualizer = ({ analyserNode, audioContext }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [mode, setMode] = useState('oscilloscope');

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

    // More stable trigger with hysteresis
    const findStableTrigger = (data) => {
      const threshold = 128;
      const hysteresis = 5;

      // Look for strong upward zero crossing
      for (let i = 100; i < data.length - 100; i++) {
        if (data[i] <= threshold - hysteresis && data[i + 1] >= threshold + hysteresis) {
          // Verify it's a real crossing by checking slope
          const slope = data[i + 1] - data[i];
          if (slope > 10) {
            return i;
          }
        }
      }
      return 0;
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
      } else {
        // FFT mode
        analyserNode.getByteFrequencyData(freqDataArray);

        ctx.fillStyle = 'rgb(15, 15, 25)';
        ctx.fillRect(0, 0, width, height);

        // Draw frequency grid
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;

        // Logarithmic frequency markers
        const freqMarkers = [100, 200, 500, 1000, 2000, 5000, 10000];
        const nyquist = sampleRate / 2;

        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            const x = (freq / nyquist) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        });

        // Draw bars
        const barsToShow = Math.min(512, bufferLength);
        const barWidth = width / barsToShow;

        for (let i = 0; i < barsToShow; i++) {
          const barHeight = (freqDataArray[i] / 255) * height;

          const hue = 200 - (i / barsToShow) * 60;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        }

        // Draw frequency labels
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.font = '10px monospace';

        freqMarkers.forEach((freq) => {
          if (freq < nyquist) {
            const x = (freq / nyquist) * width;
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillText(label, x + 2, height - 5);
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
          ) : (
            <>
              <BarChart3 size={14} className="text-purple-400" />
              <span>Spectrum</span>
            </>
          )}
        </h3>
        <button
          onClick={() => setMode(mode === 'oscilloscope' ? 'fft' : 'oscilloscope')}
          className="px-2 py-0.5 bg-gray-700/70 hover:bg-gray-600 rounded text-xs text-white transition-colors"
        >
          Switch
        </button>
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
