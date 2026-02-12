import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import WaveView from './WaveView';

const AudioVisualizer = ({ analyserNode, audioContext }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [mode, setMode] = useState('fft');
  const [fftStyle, setFftStyle] = useState('beams');
  const [spectroscopeMode, setSpectroscopeMode] = useState('3d');
  const lastFrameTimeRef = useRef(0);
  const TARGET_FPS = 60;
  const frameInterval = 1000 / TARGET_FPS;

  const peaksRef = useRef(new Float32Array(0));

  useEffect(() => {
    if (!analyserNode || !canvasRef.current || !audioContext) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Create separate analysers for optimal performance
    const scopeAnalyser = audioContext.createAnalyser();
    const fftAnalyser = audioContext.createAnalyser();

    scopeAnalyser.fftSize = 2048; // Fast for time-domain
    scopeAnalyser.smoothingTimeConstant = 0.8;

    fftAnalyser.fftSize = 16384; // High resolution for frequency
    fftAnalyser.smoothingTimeConstant = 0.8;

    // Connect both to the same source
    analyserNode.connect(scopeAnalyser);
    analyserNode.connect(fftAnalyser);

    const scopeBufferLength = scopeAnalyser.frequencyBinCount;
    const fftBufferLength = fftAnalyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(scopeBufferLength);
    const freqDataArray = new Uint8Array(fftBufferLength);
    const sampleRate = audioContext.sampleRate;

    if (peaksRef.current.length !== width) {
      peaksRef.current = new Float32Array(width).fill(0);
    }

    const findStableTrigger = (data) => {
      const threshold = 128;
      const hysteresis = 10;
      // Only search first 1000 samples for trigger point
      const searchEnd = Math.min(1000, data.length - 1);
      for (let i = 1; i < searchEnd; i++) {
        if (data[i] < threshold - hysteresis && data[i + 1] > threshold + hysteresis) {
          if (data[i + 1] - data[i] > 15) return i;
        }
      }
      return 0;
    };

    const draw = (currentTime) => {
      animationRef.current = requestAnimationFrame(draw);

      const elapsed = currentTime - lastFrameTimeRef.current;
      if (elapsed < frameInterval) return;
      lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);

      ctx.fillStyle = 'rgb(10, 10, 18)';
      ctx.fillRect(0, 0, width, height);

      const nyquist = sampleRate / 2;
      const samplesShown = 1024;

      // --- OSCILLOSCOPE SECTION ---
      if (mode === 'oscilloscope' || mode === 'split') {
        const isSplit = mode === 'split';
        const activeWidth = isSplit ? width / 2 : width;

        scopeAnalyser.getByteTimeDomainData(timeDataArray);
        const trigger = findStableTrigger(timeDataArray);

        // Time Domain Grid & Labels
        ctx.strokeStyle = 'rgba(60, 60, 80, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          const y = (height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(activeWidth, y);
          ctx.stroke();
        }

        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        const msShown = (samplesShown / sampleRate) * 1000;
        [0, 0.5, 1.0].forEach((t) => {
          const x = t * activeWidth;
          const label = `${(t * msShown).toFixed(1)}ms`;
          ctx.fillText(label, x + 2, height - 10);
        });

        // Waveform Drawing (Always Cyan)
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00fbff';
        ctx.beginPath();
        for (let i = 0; i < activeWidth; i++) {
          const sampleIdx = trigger + Math.floor((i / activeWidth) * samplesShown);
          const y = (timeDataArray[sampleIdx] / 255) * height;
          i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
        }
        ctx.stroke();
      }

      // --- FFT SECTION ---
      if (mode === 'fft' || mode === 'split') {
        fftAnalyser.getByteFrequencyData(freqDataArray);
        const isSplit = mode === 'split';
        const activeWidth = isSplit ? width / 2 : width;
        const xOffset = isSplit ? width / 2 : 0;

        const minFreq = 50;
        const maxFreq = 10000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);

        // Frequency Grid & Labels
        ctx.font = '10px monospace';
        [100, 1000, 5000, 10000].forEach((f) => {
          const logPos = (Math.log10(f) - logMin) / (logMax - logMin);
          const x = xOffset + logPos * activeWidth;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
          ctx.fillText(f >= 1000 ? `${f / 1000}k` : f, x + 2, height - 10);
        });

        const currentStyle = isSplit ? 'beams' : fftStyle;

        // Note: spectroscope rendering is handled by Spectroscope3D component
        if (currentStyle === 'beams') {
          // BEAMS STYLE - Logarithmic bars
          const totalBars = 200;
          const logRange = logMax - logMin;
          const logStep = logRange / totalBars;

          for (let barIdx = 0; barIdx < totalBars; barIdx++) {
            const logFreq = logMin + barIdx * logStep;
            const freq = Math.pow(10, logFreq);
            const nextLogFreq = logMin + (barIdx + 1) * logStep;

            const x1 = ((logFreq - logMin) / logRange) * activeWidth;
            const x2 = ((nextLogFreq - logMin) / logRange) * activeWidth;
            const barWidth = Math.max(1, x2 - x1 - 0.5);

            const binIndex = (freq / nyquist) * fftBufferLength;
            const i = Math.floor(binIndex);
            const fraction = binIndex - i;

            let val;
            if (i < fftBufferLength - 1) {
              val = freqDataArray[i] * (1 - fraction) + freqDataArray[i + 1] * fraction;
            } else if (i < fftBufferLength) {
              val = freqDataArray[i];
            } else {
              val = 0;
            }

            if (freq < 200 && barIdx > 0) {
              val = val * 0.8 + val * 0.2;
            }

            const intensity = val / 255;

            const barGrad = ctx.createLinearGradient(0, height, 0, 0);
            barGrad.addColorStop(0, `rgba(0, 251, 255, ${intensity * 0.6})`);
            barGrad.addColorStop(0.5, `rgba(0, 251, 255, ${intensity * 0.8})`);
            barGrad.addColorStop(1, `rgba(0, 251, 255, ${intensity})`);

            ctx.fillStyle = barGrad;
            ctx.fillRect(xOffset + x1, 0, barWidth, height);
          }
        } else {
          // CLASSIC STYLE - Line graph
          const points = [];
          for (let x = 0; x < activeWidth; x++) {
            const logFreq = logMin + (x / activeWidth) * (logMax - logMin);
            const freq = Math.pow(10, logFreq);
            const binIndex = (freq / nyquist) * fftBufferLength;
            const i = Math.floor(binIndex);
            const fraction = binIndex - i;

            let val;
            if (i < fftBufferLength - 1) {
              val = freqDataArray[i] * (1 - fraction) + freqDataArray[i + 1] * fraction;
            } else if (i < fftBufferLength) {
              val = freqDataArray[i];
            } else {
              val = 0;
            }

            if (freq < 200 && x > 0) {
              const prevPoint = points[x - 1];
              val = val * 0.7 + (prevPoint ? ((height - prevPoint.y) / height) * 255 : val) * 0.3;
            }

            const y = height - (val / 255) * height;
            points.push({ x: xOffset + x, y });

            const peakIdx = isSplit ? x + Math.floor(width / 2) : x;
            if (y < peaksRef.current[peakIdx] || peaksRef.current[peakIdx] === 0) {
              peaksRef.current[peakIdx] = y;
            } else {
              peaksRef.current[peakIdx] += 0.75;
            }
          }

          // Draw filled area
          const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
          fillGrad.addColorStop(0, 'rgba(0, 251, 255, 0.15)');
          fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.moveTo(points[0].x, height);
          points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.lineTo(points[points.length - 1].x, height);
          ctx.fillStyle = fillGrad;
          ctx.fill();

          // Draw line
          ctx.strokeStyle = '#00fbff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.stroke();

          // Draw peaks
          ctx.strokeStyle = 'rgba(0, 251, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x < activeWidth; x++) {
            const peakIdx = isSplit ? x + Math.floor(width / 2) : x;
            ctx.lineTo(xOffset + x, peaksRef.current[peakIdx]);
          }
          ctx.stroke();
        }

        if (isSplit) {
          // Vertical Divider
          ctx.setLineDash([5, 5]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.moveTo(width / 2, 0);
          ctx.lineTo(width / 2, height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    draw(0);
    return () => {
      cancelAnimationFrame(animationRef.current);
      scopeAnalyser.disconnect();
      fftAnalyser.disconnect();
    };
  }, [analyserNode, audioContext, mode, fftStyle]);

  return (
    <div className="bg-gray-950 rounded-xl p-4 border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Activity size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold tracking-tight">Signal Analyzer</h3>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
              {mode === 'split' ? 'Scope / Spectrum' : mode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          {mode === 'fft' && (
            <>
              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                {[
                  { value: 'classic', label: 'classic' },
                  { value: 'beams', label: 'beams' },
                  { value: 'spectroscope', label: 'wave' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFftStyle(value)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                      fftStyle === value ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {fftStyle === 'spectroscope' && (
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
                  {['2d', '3d'].map((dim) => (
                    <button
                      key={dim}
                      onClick={() => setSpectroscopeMode(dim)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                        spectroscopeMode === dim ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {dim}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {mode === 'fft' && fftStyle === 'spectroscope' ? (
        <WaveView
          analyserNode={analyserNode}
          audioContext={audioContext}
          mode={spectroscopeMode}
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={2048}
          height={300}
          className="w-full h-48 bg-black/20 rounded-lg border border-white/5"
        />
      )}
    </div>
  );
};

export default AudioVisualizer;
