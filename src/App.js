import React, { useState } from 'react';
import { Settings, Volume2, Box, Circle, Sliders } from 'lucide-react';
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
import ADSREnvelope from './ADSREnvelope';
import WaveformSelector from './WaveformSelector';
import FilterBank from './FilterBank';
import FilterEnvelope from './FilterEnvelope';
import UnisonControl from './UnisonControl';
import StereoMasterMonitor from './StereoMasterMonitor';

function App() {
  // UI State
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState('2D'); // '2D' or '3D'
  const [showSettings, setShowSettings] = useState(false);
  const [showADSR, setShowADSR] = useState(false);

  // Musical State
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [notes, setNotes] = useState([]);
  const [config, setConfig] = useState({
    divisions: 12,
    octaves: 4,
    baseFreq: 220,
    spiralTightness: 0.2,
    showLabels: false,
    colorMode: 'piano',
    keyWidth: 28,
    keyHeight: 76,
    releaseTime: 1000,
  });

  const [mixer, setMixer] = useState({ masterVolume: 0.7, muted: false });
  const [reverb, setReverb] = useState({ enabled: true, wet: 0.3, decay: 2.0 });
  const [waveform, setWaveform] = useState(0); // 0-1 position value for morphing
  const [filter, setFilter] = useState({
    enabled: true,
    type: 'lowpass',
    frequency: 2000,
    Q: 1,
    gain: 0,
  });

  // ADSR State
  const [adsr, setAdsr] = useState({
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.5,
  });

  // Filter Envelope State
  const [filterEnv, setFilterEnv] = useState({
    amount: 2000,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.3,
    release: 0.5,
  });

  // Unison State
  const [unison, setUnison] = useState({
    voices: 1,
    detune: 10,
    spread: 0.5,
    blend: 1.0,
  });

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
    leftAnalyser,
    rightAnalyser,
    audioContext,
  } = useAudioManager(config, mixer, reverb, adsr, waveform, filter, filterEnv, unison);

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
        audioContext={audioContext}
        analyser={analyser}
        unison={unison}
        filter={filter}
        filterEnv={filterEnv}
        reverb={reverb}
      />

      {/* 2. Header / Navigation */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg"></div>
          <h1 className="text-xl font-bold text-white tracking-wide">Microtonal Spiral Piano</h1>
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

          {/* Synth Controls Toggle Button */}
          <button
            onClick={() => setShowADSR(!showADSR)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white border transition-all shadow-inner ${
              showADSR
                ? 'bg-blue-600 border-blue-500'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-600'
            }`}
          >
            <Sliders size={18} />
            <span className="text-sm font-medium">Synth Controls</span>
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

      {/* 3.5 Synth Controls Panel (ADSR, Waveform, Filter) */}
      <div
        className={`flex gap-6 items-start flex-nowrap justify-center origin-top transition-all duration-500 ease-in-out mt-8 ${
          showADSR
            ? 'opacity-100 max-h-[500px] pointer-events-auto'
            : 'opacity-0 max-h-0 pointer-events-none'
        }`}
        style={{
          transform: showADSR ? 'scale(0.8) translateY(0)' : 'scale(0.7) translateY(-20px)',
          width: '125%',
          margin: '0 -12.5%',
        }}
      >
        <div className="flex gap-6 items-start flex-nowrap justify-center">
          <ADSREnvelope adsr={adsr} setAdsr={setAdsr} />
          <WaveformSelector waveform={waveform} setWaveform={setWaveform} />
          <FilterBank filter={filter} setFilter={setFilter} />
          <FilterEnvelope filterEnv={filterEnv} setFilterEnv={setFilterEnv} />
          <UnisonControl unison={unison} setUnison={setUnison} />
        </div>
      </div>
      {/* 4. Main Visualization Area */}
      <div className="flex-1 flex items-center justify-center p-4 gap-8 overflow-auto">
        {/* Scaled to 85% and forced to horizontal center */}
        <div
          className="flex justify-center gap-6 items-start origin-center transition-transform"
          style={{
            transform: 'scale(0.85)',
            width: '117.6%',
            margin: '0 -8.8%', // Balanced margin to maintain center alignment
          }}
        >
          {/* Left: The Interactive Keyboard */}
          <SpiralKeyboard
            config={config}
            activeNote={activeNote}
            notes={notes}
            setNotes={setNotes}
            heldNotes={heldNotes}
            onNoteClick={(note) => handleNotePlay(note, false)}
          />

          {/* Center: The Swappable Visualizer */}
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

          {/* Right: The Stereo Master Monitor (always visible) */}
          <div className="flex mt-24">
            <StereoMasterMonitor
              audioContext={audioContext}
              analyser={analyser}
              leftAnalyser={leftAnalyser}
              rightAnalyser={rightAnalyser}
            />
          </div>
        </div>
      </div>

      {/* 5. Audio Visualizer */}
      <div className="p-4 flex justify-center">
        <div className="w-full max-w-4xl">
          {analyser && audioContext && (
            <AudioVisualizer analyserNode={analyser} audioContext={audioContext} />
          )}
        </div>
      </div>

      {/* 6. Physical Keyboard Reference */}
      <div className="p-4 flex justify-center">
        <KeyboardVisualizer
          activePitchClasses={activePitchClasses}
          config={config}
          pressedKeys={pressedKeys}
        />
      </div>

      {/* 7. Footer Instructions */}
      <Instructions />
    </div>
  );
}

export default App;
