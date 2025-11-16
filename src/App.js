import React, { useState, useEffect, useRef } from "react";
import { Settings, Volume2 } from "lucide-react";

const MicrotonalSpiral = () => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [activeNote, setActiveNote] = useState(null);
  const [config, setConfig] = useState({
    divisions: 24,
    octaves: 4,
    baseFreq: 440,
    spiralTightness: 0.3,
    showLabels: true,
    colorMode: "piano",
    keyWidth: 35,
    keyHeight: 80,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [notes, setNotes] = useState([]);

  const presets = {
    "12-TET": 12,
    "19-TET": 19,
    "24-TET": 24,
    "31-TET": 31,
    "53-TET": 53,
  };

  // Initialize Web Audio API
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playNote = (freq, duration = 0.5) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    setActiveNote(freq);
    setTimeout(() => setActiveNote(null), duration * 1000);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const {
      divisions,
      octaves,
      baseFreq,
      spiralTightness,
      showLabels,
      colorMode,
      keyWidth,
      keyHeight,
    } = config;
    const totalNotes = divisions * octaves;

    const calculatedNotes = [];

    for (let i = 0; i < totalNotes; i++) {
      const octave = Math.floor(i / divisions);
      const step = i % divisions;

      const semitoneRatio = i / divisions;
      const freq = baseFreq * Math.pow(2, semitoneRatio);

      // Logarithmic radius
      const baseR = 80 + Math.log2(freq / baseFreq) * 60;
      const theta = (i / divisions) * 2 * Math.PI;
      const spiralR = baseR + theta * spiralTightness * 15;

      // Calculate rectangular key position in polar coordinates
      const x = centerX + spiralR * Math.cos(theta);
      const y = centerY + spiralR * Math.sin(theta);

      calculatedNotes.push({
        x,
        y,
        freq,
        octave,
        step,
        theta,
        r: spiralR,
        index: i,
        angle: theta,
      });
    }

    setNotes(calculatedNotes);

    // Draw octave connection lines
    ctx.strokeStyle = "rgba(100, 255, 150, 0.15)";
    ctx.lineWidth = 1;
    for (let step = 0; step < divisions; step++) {
      for (let oct = 0; oct < octaves - 1; oct++) {
        const idx1 = oct * divisions + step;
        const idx2 = (oct + 1) * divisions + step;
        if (idx2 < calculatedNotes.length) {
          ctx.beginPath();
          ctx.moveTo(calculatedNotes[idx1].x, calculatedNotes[idx1].y);
          ctx.lineTo(calculatedNotes[idx2].x, calculatedNotes[idx2].y);
          ctx.stroke();
        }
      }
    }

    // Color function
    const getColor = (note, isActive) => {
      if (isActive) return "#ffff00";

      if (colorMode === "piano") {
        // Traditional piano pattern: alternating white and black keys
        // In 12-TET: C, D, E, F, G, A, B are white (0,2,4,5,7,9,11)
        // C#, D#, F#, G#, A# are black (1,3,6,8,10)
        const pianoPattern12 = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // 1=white, 0=black

        if (divisions === 12) {
          return pianoPattern12[note.step] ? "#1a1a1a" : "#f5f5f5";
        } else {
          // For other divisions, approximate the pattern
          const scaledStep = Math.floor((note.step / divisions) * 12);
          return pianoPattern12[scaledStep] ? "#1a1a1a" : "#f5f5f5";
        }
      } else if (colorMode === "alternating") {
        // Simple alternating black/white pattern
        return note.step % 2 === 0 ? "#f5f5f5" : "#2a2a2a";
      } else if (colorMode === "grayscale") {
        // Grayscale gradient across the octave
        const brightness = 30 + (note.step / divisions) * 60;
        return `hsl(0, 0%, ${brightness}%)`;
      } else if (colorMode === "interval") {
        const hue = (note.step / divisions) * 360;
        return `hsl(${hue}, 70%, 55%)`;
      } else if (colorMode === "octave") {
        const hue = (note.octave / octaves) * 280;
        return `hsl(${hue}, 70%, 55%)`;
      }
      return "#6699ff";
    };

    // Draw piano-like rectangular keys
    calculatedNotes.forEach((note, i) => {
      const isActive = activeNote === note.freq;

      ctx.save();
      ctx.translate(note.x, note.y);
      ctx.rotate(note.angle + Math.PI / 2); // Rotate to align radially

      // Draw rectangular key
      const w = keyWidth;
      const h = keyHeight;

      // Key body
      ctx.fillStyle = getColor(note, isActive);
      ctx.strokeStyle = isActive ? "#ffffff" : "#222222";
      ctx.lineWidth = 2;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // Add gradient for 3D effect
      const gradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
      ctx.fillStyle = gradient;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // Labels
      if (
        showLabels &&
        (note.step === 0 || i % Math.max(1, Math.floor(divisions / 6)) === 0)
      ) {
        // Adjust label color based on key color for better contrast
        const keyColor = getColor(note, false);
        const isLightKey =
          keyColor === "#f5f5f5" ||
          keyColor.includes("90%") ||
          keyColor.includes("85%");
        ctx.fillStyle = isLightKey ? "#000000" : "#ffffff";

        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${note.freq.toFixed(0)}`, 0, 0);

        if (note.step === 0) {
          ctx.font = "bold 8px sans-serif";
          ctx.fillText(`O${note.octave}`, 0, 12);
        }
      }

      ctx.restore();
    });

    // Draw center
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Legend
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${divisions}-TET Spiral Keyboard`, 20, 30);
    ctx.font = "12px sans-serif";
    ctx.fillText(
      `${totalNotes} notes • ${octaves} octaves • ${baseFreq}Hz base`,
      20,
      50
    );
    ctx.fillText(`Click keys to play!`, 20, 70);
  }, [config, activeNote]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on any note
    for (const note of notes) {
      const dx = x - note.x;
      const dy = y - note.y;

      // Transform to key's local coordinate system
      const cos = Math.cos(-(note.angle + Math.PI / 2));
      const sin = Math.sin(-(note.angle + Math.PI / 2));
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // Check if click is within rectangular key bounds
      if (
        Math.abs(localX) < config.keyWidth / 2 &&
        Math.abs(localY) < config.keyHeight / 2
      ) {
        playNote(note.freq);
        break;
      }
    }
  };

  return (
    <div className="w-full h-full bg-gray-950 flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Volume2 className="text-blue-400" size={24} />
          <h1 className="text-xl font-bold text-white">
            Interactive Microtonal Spiral Piano
          </h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          <Settings size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="p-4 bg-gray-900 border-b border-gray-800 grid grid-cols-2 gap-4">
          <div>
            <label className="text-white text-sm block mb-1">
              Tuning System (TET)
            </label>
            <select
              value={config.divisions}
              onChange={(e) =>
                setConfig({ ...config, divisions: parseInt(e.target.value) })
              }
              className="w-full p-2 bg-gray-800 text-white rounded"
            >
              {Object.entries(presets).map(([name, value]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-white text-sm block mb-1">
              Octaves: {config.octaves}
            </label>
            <input
              type="range"
              min="2"
              max="6"
              value={config.octaves}
              onChange={(e) =>
                setConfig({ ...config, octaves: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm block mb-1">
              Base Frequency (Hz)
            </label>
            <input
              type="number"
              value={config.baseFreq}
              onChange={(e) =>
                setConfig({ ...config, baseFreq: parseFloat(e.target.value) })
              }
              className="w-full p-2 bg-gray-800 text-white rounded"
            />
          </div>

          <div>
            <label className="text-white text-sm block mb-1">
              Spiral Tightness: {config.spiralTightness.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.spiralTightness}
              onChange={(e) =>
                setConfig({
                  ...config,
                  spiralTightness: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm block mb-1">
              Key Width: {config.keyWidth}
            </label>
            <input
              type="range"
              min="20"
              max="50"
              value={config.keyWidth}
              onChange={(e) =>
                setConfig({ ...config, keyWidth: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm block mb-1">
              Key Height: {config.keyHeight}
            </label>
            <input
              type="range"
              min="50"
              max="120"
              value={config.keyHeight}
              onChange={(e) =>
                setConfig({ ...config, keyHeight: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-white text-sm block mb-1">Color Mode</label>
            <select
              value={config.colorMode}
              onChange={(e) =>
                setConfig({ ...config, colorMode: e.target.value })
              }
              className="w-full p-2 bg-gray-800 text-white rounded"
            >
              <option value="piano">Piano (Black & White)</option>
              <option value="alternating">Alternating (B&W)</option>
              <option value="grayscale">Grayscale Gradient</option>
              <option value="interval">Rainbow by Interval</option>
              <option value="octave">Rainbow by Octave</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center text-white text-sm">
              <input
                type="checkbox"
                checked={config.showLabels}
                onChange={(e) =>
                  setConfig({ ...config, showLabels: e.target.checked })
                }
                className="mr-2"
              />
              Show Labels
            </label>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={900}
          height={900}
          onClick={handleCanvasClick}
          className="border border-gray-700 rounded cursor-pointer"
        />
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-800 text-white text-sm">
        <p>
          <strong>How to use:</strong>
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>Click any key</strong> to play its note (Web Audio API
            synthesizer)
          </li>
          <li>
            Keys are arranged in a spiral - one full rotation = one octave
          </li>
          <li>
            Green lines connect octave-equivalent notes (same pitch class)
          </li>
          <li>Try different tuning systems to hear microtonal intervals!</li>
          <li>
            Adjust key size and spiral tightness to explore different layouts
          </li>
        </ul>
      </div>
    </div>
  );
};

export default MicrotonalSpiral;
