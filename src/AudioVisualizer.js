import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';

const AudioVisualizer = ({ analyserNode, audioContext }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [mode, setMode] = useState('fft');
  const lastFrameTimeRef = useRef(0);
  const TARGET_FPS = 60; // Cap visualizer at 60fps
  const frameInterval = 1000 / TARGET_FPS;

  // Ref to store peak values for the ghost line
  const peaksRef = useRef(new Float32Array(0));

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

    // Initialize peaks array if size changed
    if (peaksRef.current.length !== width) {
      peaksRef.current = new Float32Array(width).fill(0);
    }

    const findStableTrigger = (data) => {
      const threshold = 128;
      const hysteresis = 10;
      for (let i = 100; i < data.length - 100; i++) {
        if (data[i] < threshold - hysteresis && data[i + 1] > threshold + hysteresis) {
          if (data[i + 1] - data[i] > 15) return i;
        }
      }
      return 0;
    };

    const draw = (currentTime) => {
      animationRef.current = requestAnimationFrame(draw);

      // Frame limiting: only draw if enough time has passed
      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < frameInterval) return;
      lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);

      ctx.fillStyle = 'rgb(10, 10, 18)';
      ctx.fillRect(0, 0, width, height);

      const nyquist = sampleRate / 2;

      if (mode === 'oscilloscope') {
        analyserNode.getByteTimeDomainData(timeDataArray);

        // Grid
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const y = (height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Time labels
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        const samplesShown = 1024;
        const timeShown = (samplesShown / sampleRate) * 1000; // in ms
        const timeMarkers = [0, 0.25, 0.5, 0.75, 1.0];
        timeMarkers.forEach((t) => {
          const x = t * width;
          const timeMs = t * timeShown;
          const label = timeMs >= 1 ? `${timeMs.toFixed(1)}ms` : `${(timeMs * 1000).toFixed(0)}µs`;
          ctx.fillText(label, x + 2, height - 10);
        });

        const trigger = findStableTrigger(timeDataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00fbff';
        ctx.beginPath();
        for (let i = 0; i < samplesShown; i++) {
          const x = (i / samplesShown) * width;
          const y = (timeDataArray[trigger + i] / 255) * height;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (mode === 'fft' || mode === 'split') {
        analyserNode.getByteFrequencyData(freqDataArray);
        const isSplit = mode === 'split';
        const activeWidth = isSplit ? width / 2 : width;
        const xOffset = isSplit ? width / 2 : 0;

        // Define frequency range (50Hz to 10kHz)
        const minFreq = 50;
        const maxFreq = 10000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);

        // 1. Draw Logarithmic Grid & Labels
        ctx.font = '10px monospace';
        const freqMarkers = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
        freqMarkers.forEach((f) => {
          const logPos = (Math.log10(f) - logMin) / (logMax - logMin);
          const x = xOffset + logPos * activeWidth;

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();

          ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
          const label = f >= 1000 ? `${f / 1000}k` : f;
          ctx.fillText(label, x + 2, height - 10);
        });

        // 2. Calculate Path and Update Peaks
        const points = [];
        for (let x = 0; x < activeWidth; x++) {
          const logFreq = logMin + (x / activeWidth) * (logMax - logMin);
          const freq = Math.pow(10, logFreq);
          const binIndex = (freq / nyquist) * bufferLength;
          const i = Math.floor(binIndex);
          const fraction = binIndex - i;

          const val =
            i < bufferLength - 1
              ? freqDataArray[i] * (1 - fraction) + freqDataArray[i + 1] * fraction
              : freqDataArray[i];

          const y = height - (val / 255) * height;
          points.push({ x: xOffset + x, y });

          // Peak/Ghost logic: slow decay
          const peakIdx = isSplit ? x + Math.floor(width / 2) : x;
          if (y < peaksRef.current[peakIdx] || peaksRef.current[peakIdx] === 0) {
            peaksRef.current[peakIdx] = y; // New peak (lower Y is higher signal)
          } else {
            peaksRef.current[peakIdx] += 0.75; // Gravity decay
          }
        }

        // 3. Draw Fill Area
        const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
        fillGrad.addColorStop(0, 'rgba(0, 251, 255, 0.15)');
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, height);
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // 4. Draw Main Solid Line
        ctx.strokeStyle = '#00fbff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();

        // 5. Draw Ghost (Peak) Line
        ctx.strokeStyle = 'rgba(0, 251, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < activeWidth; x++) {
          const peakIdx = isSplit ? x + Math.floor(width / 2) : x;
          const px = xOffset + x;
          const py = peaksRef.current[peakIdx];
          x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        if (isSplit) {
          // Draw Oscilloscope on Left for Split Mode
          analyserNode.getByteTimeDomainData(timeDataArray);
          const trigger = findStableTrigger(timeDataArray);
          ctx.strokeStyle = '#bc00ff';
          ctx.beginPath();
          for (let i = 0; i < activeWidth; i++) {
            const y = (timeDataArray[trigger + i] / 255) * height;
            i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
          }
          ctx.stroke();
          // Divider
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath();
          ctx.moveTo(activeWidth, 0);
          ctx.lineTo(activeWidth, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    draw(0);
    return () => cancelAnimationFrame(animationRef.current);
  }, [analyserNode, audioContext, mode]);

  return (
    <div className="bg-gray-950 rounded-xl p-4 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <BarChart3 size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold tracking-tight">Spectrum Analyzer</h3>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
              Real-time FFT
            </p>
          </div>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
          {['oscilloscope', 'fft', 'split'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                mode === m ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={1000}
        height={200}
        className="w-full h-48 bg-black/20 rounded-lg border border-white/5"
      />
    </div>
  );
};

export default AudioVisualizer;
