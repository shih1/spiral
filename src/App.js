import React, { useState } from 'react';
import { Settings, Volume2 } from 'lucide-react';
import SpiralKeyboard from './SpiralKeyboard';
import PitchClassVisualizer from './PitchClassVisualizer';
import SettingsPanel from './SettingsPanel';
import MixerPanel from './MixerPanel';
import Instructions from './Instructions';
import { useAudioManager } from './hooks/useAudioManager';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import PerformanceMonitor from './PerformanceMonitor';
import KeyboardVisualizer from './KeyboardVisualizer';

function App() {
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
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

  const [mixer, setMixer] = useState({
    masterVolume: 0.7,
    muted: false,
  });

  const [reverb, setReverb] = useState({
    enabled: false,
    wet: 0.3,
    decay: 2.0,
  });

  const presets = { '12-TET': 12, '19-TET': 19, '24-TET': 24, '31-TET': 31, '53-TET': 53 };

  // Audio manager hook - handles all audio and note state
  const {
    activeNote,
    activePitchClasses,
    heldNotes,
    releasedNotes,
    activeOscillators,
    setActiveOscillators,
    setActiveNote,
    handleNotePlay,
    stopNote,
    releaseNote,
  } = useAudioManager(config, mixer, reverb);

  // Keyboard controls hook
  useKeyboardControls({
    enabled: keyboardEnabled,
    notes,
    activeOscillators,
    setActiveOscillators,
    handleNotePlay,
    stopNote,
    releaseNote,
    setActiveNote,
  });

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      <PerformanceMonitor
        activePitchClasses={activePitchClasses}
        heldNotes={heldNotes}
        releasedNotes={releasedNotes}
        activeOscillators={activeOscillators}
      />
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

      {/* Mixer Panel (includes Volume + Reverb) */}
      <MixerPanel mixer={mixer} setMixer={setMixer} reverb={reverb} setReverb={setReverb} />

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
      <KeyboardVisualizer
        activePitchClasses={activePitchClasses}
        heldNotes={heldNotes}
        releasedNotes={releasedNotes}
      />
      <Instructions />
    </div>
  );
}

export default App;
