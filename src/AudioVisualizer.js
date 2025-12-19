import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';

const AudioVisualizer = ({ analyserNode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [mode, setMode] = useState('oscilloscope'); // 'oscilloscope' or 'fft'

  useEffect(() => {
    if (!analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Configure analyser
    analyserNode.fftSize = 2048;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDataArray = new Uint8Array(bufferLength);

    // Triggered oscilloscope function
    const findTriggerPoint = (data, threshold = 128) => {
      for (let i = 0; i < data.length - 1; i++) {
        if (data[i] < threshold && data[i + 1] >= threshold) {
          return i;
        }
      }
      return 0;
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      if (mode === 'oscilloscope') {
        // Oscilloscope mode - triggered waveform
        analyserNode.getByteTimeDomainData(timeDataArray);

        ctx.fillStyle = 'rgb(10, 10, 20)';
        ctx.fillRect(0, 0, width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 200, 255)';
        ctx.beginPath();

        const triggerPoint = findTriggerPoint(timeDataArray);
        const sliceWidth = width / (bufferLength - triggerPoint);
        let x = 0;

        for (let i = triggerPoint; i < bufferLength; i++) {
          const v = timeDataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === triggerPoint) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else {
        // FFT mode - frequency bars
        analyserNode.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(10, 10, 20)';
        ctx.fillRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;

          const hue = (i / bufferLength) * 180 + 180;
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, mode]);

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          {mode === 'oscilloscope' ? (
            <>
              <Activity size={16} className="text-cyan-400" />
              Oscilloscope
            </>
          ) : (
            <>
              <BarChart3 size={16} className="text-purple-400" />
              Frequency Spectrum
            </>
          )}
        </h3>
        <button
          onClick={() => setMode(mode === 'oscilloscope' ? 'fft' : 'oscilloscope')}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors"
        >
          Switch Mode
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full rounded border border-gray-600"
      />
    </div>
  );
};

export default AudioVisualizer;
