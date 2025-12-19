import React, { useState } from 'react';
import { Settings, Volume2, Box, Circle } from 'lucide-react';
import SpiralKeyboard from './SpiralKeyboard';
import PitchClassVisualizer from './PitchClassVisualizer';
import SpiralTowerVisualizer from './SpiralTowerVisualizer';
import SettingsPanel from './SettingsPanel';
import MixerPanel from './MixerPanel';
import Instructions from './Instructions';
import { useAudioManager } from './hooks/useAudioManager';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import PerformanceMonitor from './PerformanceMonitor';
import KeyboardVisualizer from './KeyboardVisualizer';
import AudioVisualizer from './AudioVisualizer';

function App() {
  // UI State
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState('2D'); // '2D' or '3D'
  const [showSettings, setShowSettings] = useState(false);

  // Musical State
  const [pressedKeys, setPressedKeys] = useState(new Set());
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

  const [mixer, setMixer] = useState({ masterVolume: 0.7, muted: false });
  const [reverb, setReverb] = useState({ enabled: true, wet: 0.3, decay: 2.0 });

  const presets = { '12-TET': 12, '19-TET': 19, '24-TET': 24, '31-TET': 31, '53-TET': 53 };

  // Logic Hooks
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
    analyser,
    audioContext,
  } = useAudioManager(config, mixer, reverb);

  useKeyboardControls({
    enabled: keyboardEnabled,
    notes,
    activeOscillators,
    setActiveOscillators,
    handleNotePlay,
    stopNote,
    releaseNote,
    setActiveNote,
    config,
    setPressedKeys,
  });

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col min-h-screen">
      {/* 1. Performance Overlay */}
      <PerformanceMonitor
        activePitchClasses={activePitchClasses}
        heldNotes={heldNotes}
        releasedNotes={releasedNotes}
        activeOscillators={activeOscillators}
      />

      {/* 2. Header / Navigation */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Volume2 className="text-blue-400" size={24} />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Microtonal Spiral</h1>
        </div>

        {/* Audio Visualizer in Header */}
        <div className="flex-1 max-w-2xl mx-8">
          {analyser && audioContext && (
            <AudioVisualizer analyserNode={analyser} audioContext={audioContext} />
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Visualization Toggle */}
          <button
            onClick={() => setVisualizationMode((prev) => (prev === '2D' ? '3D' : '2D'))}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white border border-gray-600 transition-all shadow-inner"
          >
            {visualizationMode === '2D' ? (
              <Box size={18} className="text-cyan-400" />
            ) : (
              <Circle size={18} className="text-blue-400" />
            )}
            <span className="text-sm font-medium">
              Switch to {visualizationMode === '2D' ? '3D Tower' : '2D Circle'}
            </span>
          </button>

          <label className="flex items-center text-white text-sm cursor-pointer hover:text-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            Keyboard Input
          </label>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white shadow-lg transition-all transform hover:scale-105"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* 3. Sliding Panels */}
      {showSettings && <SettingsPanel config={config} setConfig={setConfig} presets={presets} />}
      <MixerPanel mixer={mixer} setMixer={setMixer} reverb={reverb} setReverb={setReverb} />

      {/* 4. Main Visualization Area */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 gap-8 overflow-auto">
        {/* Left Side: The Interactive Keyboard */}
        <SpiralKeyboard
          config={config}
          activeNote={activeNote}
          notes={notes}
          setNotes={setNotes}
          heldNotes={heldNotes}
          onNoteClick={(note) => handleNotePlay(note, false)}
        />

        {/* Right Side: The Swappable Visualizer */}
        <div className="flex flex-col gap-4">
          {visualizationMode === '2D' ? (
            <PitchClassVisualizer
              config={config}
              activePitchClasses={activePitchClasses}
              heldNotes={heldNotes}
              releasedNotes={releasedNotes}
            />
          ) : (
            <SpiralTowerVisualizer
              config={config}
              heldNotes={heldNotes}
              releasedNotes={releasedNotes}
            />
          )}
        </div>
      </div>

      {/* 5. Physical Keyboard Reference */}
      <div className="p-4 flex justify-center">
        <KeyboardVisualizer
          activePitchClasses={activePitchClasses}
          config={config}
          pressedKeys={pressedKeys}
        />
      </div>

      {/* 6. Footer Instructions */}
      <Instructions />
    </div>
  );
}

export default App;
