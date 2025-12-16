import React, { useState, useEffect, useRef } from 'react';
import { Settings, Volume2 } from 'lucide-react';
import SpiralKeyboard from './SpiralKeyboard';
import PitchClassVisualizer from './PitchClassVisualizer';
import SettingsPanel from './SettingsPanel';
import Instructions from './Instructions';

// Audio Engine Hook
const useAudioEngine = () => {
  const audioContextRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playNote = (freq, duration = 0.5, sustained = false) => {
    const ctx = audioContextRef.current;
    if (!ctx) return null;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

    if (!sustained) {
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    }

    oscillator.start(ctx.currentTime);
    if (!sustained) {
      oscillator.stop(ctx.currentTime + duration);
    }

    return { oscillator, gainNode, id: Date.now() + Math.random() };
  };

  const stopNote = (oscillator, gainNode) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    gainNode.gain.cancelScheduledValues(ctx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  return { playNote, stopNote };
};

// Main App Component
function App() {
  const [activeNote, setActiveNote] = useState(null);
  const [activePitchClasses, setActivePitchClasses] = useState([]);
  const [heldNotes, setHeldNotes] = useState([]);
  const [releasedNotes, setReleasedNotes] = useState([]);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [activeOscillators, setActiveOscillators] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [notes, setNotes] = useState([]);
  const [config, setConfig] = useState({
    divisions: 12,
    octaves: 4,
    baseFreq: 440,
    spiralTightness: 0.2,
    showLabels: false,
    colorMode: 'piano',
    keyWidth: 28,
    keyHeight: 76,
    releaseTime: 1000,
  });

  const presets = { '12-TET': 12, '19-TET': 19, '24-TET': 24, '31-TET': 31, '53-TET': 53 };
  const { playNote, stopNote } = useAudioEngine();

  const keyboardMapping = {
    z: 0,
    x: 1,
    c: 2,
    v: 3,
    b: 4,
    n: 5,
    m: 6,
    ',': 7,
    '.': 8,
    '/': 9,
    a: 12,
    s: 13,
    d: 14,
    f: 15,
    g: 16,
    h: 17,
    j: 18,
    k: 19,
    l: 20,
    ';': 21,
  };

  const handleNotePlay = (note, sustained = false) => {
    const nodes = playNote(note.freq, 0.5, sustained);
    if (!nodes) return null;

    const now = Date.now();
    const noteId = nodes.id;

    setActiveNote(note.freq);

    if (sustained) {
      setHeldNotes((prev) => [
        ...prev,
        { pitch: note.step, octave: note.octave, time: now, id: noteId },
      ]);
    } else {
      setReleasedNotes((prev) => [...prev, { pitch: note.step, time: now, id: noteId }]);
    }

    const newPitchClass = { pitch: note.step, opacity: 1, id: noteId, sustained };
    setActivePitchClasses((prev) => [...prev, newPitchClass]);

    if (!sustained) {
      setTimeout(() => setActiveNote(null), 500);
      setTimeout(() => releaseNote(noteId, note.step), 500);
    }

    return nodes;
  };

  const releaseNote = (noteId, pitchClass) => {
    const now = Date.now();
    setHeldNotes((prev) => prev.filter((n) => n.id !== noteId));
    setReleasedNotes((prev) => [...prev, { pitch: pitchClass, time: now, id: noteId }]);

    const fadeStartDelay = Math.min(500, config.releaseTime * 0.25);
    const fadeDuration = config.releaseTime - fadeStartDelay;
    const fadeSteps = fadeDuration / 50;

    setTimeout(() => {
      const fadeInterval = setInterval(() => {
        setActivePitchClasses((prev) => {
          const updated = prev.map((pc) =>
            pc.id === noteId ? { ...pc, opacity: Math.max(0, pc.opacity - 1 / fadeSteps) } : pc
          );
          const filtered = updated.filter((pc) => pc.opacity > 0);
          if (!filtered.find((pc) => pc.id === noteId)) {
            clearInterval(fadeInterval);
          }
          return filtered;
        });
      }, 50);
    }, fadeStartDelay);
  };

  // Keyboard event handlers
  useEffect(() => {
    if (!keyboardEnabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (keyboardMapping[key] !== undefined) {
        e.preventDefault();
        const noteIndex = keyboardMapping[key];
        if (noteIndex >= notes.length) return;
        const note = notes[noteIndex];
        const nodes = handleNotePlay(note, true);
        if (nodes) {
          setActiveOscillators((prev) => ({ ...prev, [key]: nodes }));
        }
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (activeOscillators[key]) {
        const { oscillator, gainNode, id } = activeOscillators[key];
        const noteIndex = keyboardMapping[key];
        const note = notes[noteIndex];
        stopNote(oscillator, gainNode);
        releaseNote(id, note.step);
        setActiveOscillators((prev) => {
          const newOsc = { ...prev };
          delete newOsc[key];
          return newOsc;
        });
        setActiveNote(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardEnabled, notes, activeOscillators]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Volume2 className="text-blue-400" size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Interactive Microtonal Spiral Piano
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center text-white text-sm cursor-pointer hover:text-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            Enable Keyboard (Polyphonic)
          </label>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white shadow-lg transition-all transform hover:scale-105"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel config={config} setConfig={setConfig} presets={presets} />}

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 gap-4 overflow-auto">
        <div className="flex items-center gap-4">
          <SpiralKeyboard
            config={config}
            activeNote={activeNote}
            notes={notes}
            setNotes={setNotes}
            heldNotes={heldNotes}
            onNoteClick={(note) => handleNotePlay(note, false)}
          />
          <PitchClassVisualizer
            config={config}
            activePitchClasses={activePitchClasses}
            heldNotes={heldNotes}
            releasedNotes={releasedNotes}
          />
        </div>
      </div>

      {/* Instructions Footer */}
      <Instructions />
    </div>
  );
}

export default App;
