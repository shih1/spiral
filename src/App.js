import React, { useState, useEffect, useRef } from "react";
import { Settings, Volume2 } from "lucide-react";

const MicrotonalSpiral = () => {
  const canvasRef = useRef(null);
  const visualCanvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [keyboardEnabled, setKeyboardEnabled] = useState(false);
  const [activeOscillators, setActiveOscillators] = useState({});
  const fadeIntervalRef = useRef(null);
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

  const playNote = (
    freq,
    duration = 0.5,
    pitchClass = null,
    sustained = false
  ) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    if (!sustained) {
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        ctx.currentTime + duration
      );
    }

    oscillator.start(ctx.currentTime);

    if (!sustained) {
      oscillator.stop(ctx.currentTime + duration);
    }

    setActiveNote(freq);

    // Track recent notes for chord detection (within 1 second window)
    const now = Date.now();
    setRecentNotes((prev) => {
      const filtered = prev.filter((n) => now - n.time < 1000);
      return [...filtered, { pitch: pitchClass, time: now }];
    });

    // Add new pitch class with full opacity
    const newPitchClass = {
      pitch: pitchClass,
      opacity: 1,
      id: Date.now() + Math.random(), // Unique ID
    };

    setActivePitchClasses((prev) => [...prev, newPitchClass]);

    if (!sustained) {
      setTimeout(() => {
        setActiveNote(null);
      }, duration * 1000);
    }

    // Start fading this specific pitch class after 0.5 seconds
    setTimeout(() => {
      const fadeInterval = setInterval(() => {
        setActivePitchClasses((prev) => {
          const updated = prev.map((pc) => {
            if (pc.id === newPitchClass.id) {
              const newOpacity = pc.opacity - 0.05;
              return { ...pc, opacity: Math.max(0, newOpacity) };
            }
            return pc;
          });

          // Remove fully faded pitch classes
          const filtered = updated.filter((pc) => pc.opacity > 0);

          // Clear interval if this pitch class is gone
          if (!filtered.find((pc) => pc.id === newPitchClass.id)) {
            clearInterval(fadeInterval);
          }

          return filtered;
        });
      }, 50);
    }, 500);

    return { oscillator, gainNode };
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
          return pianoPattern12[note.step] ? "#f5f5f5" : "#1a1a1a";
        } else {
          // For other divisions, approximate the pattern
          const scaledStep = Math.floor((note.step / divisions) * 12);
          return pianoPattern12[scaledStep] ? "#f5f5f5" : "#1a1a1a";
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

  // Keyboard mapping - two rows of keys
  const keyboardMapping = {
    // Bottom row (lower octave)
    z: 0,
    x: 1,
    c: 2,
    v: 3,
    b: 4,
    n: 5,
    m: 6,
    ",": 7,
    ".": 8,
    "/": 9,
    // Top row (higher octave)
    a: 12,
    s: 13,
    d: 14,
    f: 15,
    g: 16,
    h: 17,
    j: 18,
    k: 19,
    l: 20,
    ";": 21,
  };

  // Keyboard event handlers
  useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return; // Ignore key repeats

      const key = e.key.toLowerCase();
      if (keyboardMapping[key] !== undefined) {
        e.preventDefault();

        const noteIndex = keyboardMapping[key];
        if (noteIndex >= notes.length) return;

        const note = notes[noteIndex];
        const nodes = playNote(note.freq, 0.5, note.step, true);

        if (nodes) {
          setActiveOscillators((prev) => ({
            ...prev,
            [key]: nodes,
          }));
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (activeOscillators[key]) {
        const { oscillator, gainNode } = activeOscillators[key];
        const ctx = audioContextRef.current;

        // Fade out
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.stop(ctx.currentTime + 0.1);

        setActiveOscillators((prev) => {
          const newOsc = { ...prev };
          delete newOsc[key];
          return newOsc;
        });

        setActiveNote(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keyboardEnabled, notes, activeOscillators]);

  // Draw pitch class visualizer
  useEffect(() => {
    const canvas = visualCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const { divisions } = config;

    // Get unique pitch classes from recent notes
    const now = Date.now();
    const activeRecentNotes = recentNotes.filter((n) => now - n.time < 1000);
    const uniquePitches = [...new Set(activeRecentNotes.map((n) => n.pitch))];

    // Draw all pitch class lines (faint)
    for (let i = 0; i < divisions; i++) {
      const angle = (i / divisions) * 2 * Math.PI; // Rotated 90 degrees clockwise (removed - Math.PI / 2)
      const endX =
        centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY =
        centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw pitch class labels
      const labelDist = Math.min(width, height) / 2 - 10;
      const labelX = centerX + Math.cos(angle) * labelDist;
      const labelY = centerY + Math.sin(angle) * labelDist;

      ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), labelX, labelY);
    }

    // Draw chord shape (triangle/polygon) if 3-5 notes are active
    if (uniquePitches.length >= 3 && uniquePitches.length <= 5) {
      ctx.beginPath();

      uniquePitches.forEach((pitch, index) => {
        const angle = (pitch / divisions) * 2 * Math.PI;
        const endX =
          centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
        const endY =
          centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

        if (index === 0) {
          ctx.moveTo(endX, endY);
        } else {
          ctx.lineTo(endX, endY);
        }
      });

      ctx.closePath();

      // Fill with semi-transparent cyan
      ctx.fillStyle = "rgba(0, 255, 255, 0.15)";
      ctx.fill();

      // Outline with brighter cyan
      ctx.strokeStyle = "rgba(0, 255, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw active pitch class lines
    activePitchClasses.forEach(({ pitch, opacity }) => {
      if (pitch === null) return;

      const angle = (pitch / divisions) * 2 * Math.PI;
      const endX =
        centerX + Math.cos(angle) * (Math.min(width, height) / 2 - 20);
      const endY =
        centerY + Math.sin(angle) * (Math.min(width, height) / 2 - 20);

      // Draw glowing line with opacity
      ctx.strokeStyle = `rgba(0, 255, 136, ${opacity})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20 * opacity;
      ctx.shadowColor = `rgba(0, 255, 136, ${opacity})`;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw end point
      ctx.shadowBlur = 30 * opacity;
      ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0;
    });

    // Draw center point
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Pitch Class", centerX, 20);
    ctx.font = "10px sans-serif";
    ctx.fillText("Visualizer", centerX, 35);
  }, [config, activePitchClasses, recentNotes]);

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
        playNote(note.freq, 0.5, note.step);
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
        <div className="flex items-center gap-4">
          <label className="flex items-center text-white text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="mr-2"
            />
            Enable Keyboard (Polyphonic)
          </label>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            <Settings size={20} />
          </button>
        </div>
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

      <div className="flex-1 flex items-center justify-center p-4 gap-4 overflow-auto">
        <div className="flex items-center gap-4">
          <canvas
            ref={canvasRef}
            width={700}
            height={700}
            onClick={handleCanvasClick}
            className="border border-gray-700 rounded cursor-pointer flex-shrink-0"
          />
          <canvas
            ref={visualCanvasRef}
            width={700}
            height={700}
            className="border border-gray-700 rounded flex-shrink-0"
          />
        </div>
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
            <strong>Keyboard Control:</strong> Enable the toggle to play with
            your computer keyboard
          </li>
          <li>
            <strong>Bottom row (Z-/):</strong> Lower octave notes |{" "}
            <strong>Top row (A-;):</strong> Higher octave notes
          </li>
          <li>
            <strong>Polyphonic:</strong> Hold multiple keys simultaneously to
            play chords!
          </li>
          <li>
            Keys are arranged in a spiral - one full rotation = one octave
          </li>
          <li>
            Green lines connect octave-equivalent notes (same pitch class)
          </li>
          <li>
            <strong>Pitch Class Visualizer</strong> (right) shows the active
            note's position in the octave
          </li>
          <li>
            <strong>Play 3-5 notes together</strong> to see a glowing geometric
            shape!
          </li>
          <li>Try different tuning systems to hear microtonal intervals!</li>
        </ul>
      </div>
    </div>
  );
};

export default MicrotonalSpiral;
