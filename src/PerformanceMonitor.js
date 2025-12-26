import React, { useState, useEffect, useRef } from 'react';
import { Activity, X, Copy, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const PerformanceMonitor = ({
  activePitchClasses = [],
  heldNotes = [],
  releasedNotes = [],
  activeOscillators = {},
  audioContext = null,
  analyser = null,
  // New props for deeper analysis
  unison = { voices: 1 },
  filter = { enabled: false },
  filterEnv = {},
  reverb = { enabled: false },
}) => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    audioLatency: 0,
    audioCallbackTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    gcEvents: 0,
    gcEventsRecent: 0,
    audioNodes: 0,
    renderTime: 0,
    oscillatorCount: 0,
    totalVoices: 0,
    audioContextState: 'unknown',
    sampleRate: 0,
    bufferSize: 0,
    isCrashed: false,
    crashReason: '',
    analyserFrozen: false,
    oscillatorsStuck: false,
    lastOscillatorChange: Date.now(),
    ghostOscillators: false, // Oscillators playing but not in state
  });

  const [warnings, setWarnings] = useState([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    performance: true,
    audio: true,
    warnings: true,
    recommendations: false,
  });
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStart = useRef(0);
  const audioCallbackTimes = useRef([]);
  const gcCount = useRef(0);
  const gcCountRecent = useRef(0);
  const gcResetTime = useRef(Date.now());
  const lastMemory = useRef(0);
  const lastFpsCheckTime = useRef(Date.now());
  const lowFpsCounter = useRef(0);
  const prevOscillatorCount = useRef(0);
  const analyserData = useRef(new Uint8Array(128));
  const analyserFrozenCounter = useRef(0);

  // Track total voice count (oscillators * unison voices)
  // AudioContext monitoring with crash detection
  useEffect(() => {
    const oscCount = Object.keys(activeOscillators).length;
    const totalVoices = oscCount * (unison?.voices || 1);

    // Detect stuck oscillators (oscillator count doesn't change)
    const oscillatorsStuck = oscCount > 0 && oscCount === prevOscillatorCount.current;
    const lastChange = oscillatorsStuck ? metrics.lastOscillatorChange : Date.now();
    prevOscillatorCount.current = oscCount;

    console.group('🎵 Audio Engine Status');
    console.log('Active Oscillators:', oscCount);
    console.log('Unison Voices per Osc:', unison?.voices || 1);
    console.log('TOTAL VOICES:', totalVoices);
    console.log('Active Pitch Classes:', activePitchClasses.length);
    console.log('Held Notes:', heldNotes.length);
    console.log('Released Notes:', releasedNotes.length);
    console.log('Oscillators Object Keys:', Object.keys(activeOscillators));

    // Check for crash conditions
    if (audioContext) {
      console.log('AudioContext State:', audioContext.state);
      console.log('AudioContext Current Time:', audioContext.currentTime);

      // Check if oscillators exist but aren't in the object
      if (heldNotes.length > 0 && oscCount === 0) {
        console.error('🔴 MISMATCH: Held notes exist but no oscillators in state!');
      }

      // Detect if audio context is suspended/closed
      if (audioContext.state === 'suspended' || audioContext.state === 'closed') {
        console.error('🔴 AUDIO CONTEXT CRASHED! State:', audioContext.state);
      }
    }
    console.groupEnd();

    setMetrics((prev) => ({
      ...prev,
      oscillatorCount: oscCount,
      totalVoices,
      activePitchClassCount: activePitchClasses.length,
      oscillatorsStuck,
      lastOscillatorChange: lastChange,
    }));

    // Warning system
    const newWarnings = [];

    // CRITICAL: Ghost oscillators detection
    if (metrics.ghostOscillators) {
      newWarnings.push({
        level: 'critical',
        message: '🔴 GHOST OSCILLATORS! Audio playing but oscillatorCount = 0',
        solution:
          'UNISON BUG: Your unison voices are created but never added to activeOscillators state. Check useAudioManager - unison oscillators must be stored in state to be stopped later!',
      });
    }

    // Check for stuck oscillators
    if (oscillatorsStuck && Date.now() - lastChange > 5000) {
      newWarnings.push({
        level: 'critical',
        message: `Oscillators stuck at ${oscCount}! Notes may not be releasing properly.`,
        solution: 'Your audio cleanup code may be broken. Check stopNote() and releaseNote().',
      });
    }

    // Check for state mismatch
    if (heldNotes.length > 0 && oscCount === 0) {
      newWarnings.push({
        level: 'critical',
        message: 'State mismatch: Notes held but no oscillators exist!',
        solution: 'Your note playing logic is disconnected from oscillator creation.',
      });
    }

    if (totalVoices > 20) {
      newWarnings.push({
        level: 'critical',
        message: `CRITICAL: ${totalVoices} total voices active! This will cause severe lag.`,
        solution: 'Reduce unison voices or stop holding so many notes simultaneously.',
      });
    } else if (totalVoices > 10) {
      newWarnings.push({
        level: 'warning',
        message: `HIGH: ${totalVoices} voices may cause performance issues.`,
        solution: 'Consider reducing unison voice count.',
      });
    }

    if (filter?.enabled && filterEnv && totalVoices > 8) {
      newWarnings.push({
        level: 'warning',
        message: 'Filter envelope + multiple voices = high CPU usage',
        solution: 'Disable filter envelope or reduce voice count.',
      });
    }

    if (reverb?.enabled && totalVoices > 12) {
      newWarnings.push({
        level: 'warning',
        message: 'Reverb with many voices is CPU intensive',
        solution: 'Disable reverb temporarily or reduce voices.',
      });
    }

    setWarnings(newWarnings);
  }, [
    activeOscillators,
    activePitchClasses,
    heldNotes,
    releasedNotes,
    unison,
    filter,
    filterEnv,
    reverb,
    audioContext,
    metrics.lastOscillatorChange,
  ]);

  // Analyser monitoring - detect if waveform is frozen OR ghost oscillators
  useEffect(() => {
    if (!analyser) return;

    const checkAnalyser = () => {
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      // Check if data is all the same (frozen)
      const firstValue = dataArray[0];
      const allSame = dataArray.every((val) => val === firstValue);

      // Calculate if there's audio signal
      let hasSignal = false;
      for (let i = 0; i < dataArray.length; i++) {
        if (Math.abs(dataArray[i] - 128) > 2) {
          hasSignal = true;
          break;
        }
      }

      if (allSame && firstValue === 128) {
        analyserFrozenCounter.current++;
        if (analyserFrozenCounter.current > 3) {
          console.error('🔴 ANALYSER FROZEN! No audio signal detected.');
          setMetrics((prev) => ({ ...prev, analyserFrozen: true }));
        }
      } else {
        analyserFrozenCounter.current = 0;
        setMetrics((prev) => ({ ...prev, analyserFrozen: false }));
      }

      // GHOST OSCILLATOR DETECTION
      // If analyser shows audio signal BUT oscillator count is 0 = GHOST OSCILLATORS
      const oscCount = Object.keys(activeOscillators).length;
      if (hasSignal && oscCount === 0) {
        console.error('🔴🔴🔴 GHOST OSCILLATORS DETECTED!');
        console.error('Audio signal present but oscillatorCount = 0');
        console.error('This means oscillators are running but not tracked in state!');
        console.error(
          'CHECK YOUR UNISON CODE - voices are created but not stored/stopped properly'
        );
        setMetrics((prev) => ({ ...prev, ghostOscillators: true }));
      } else {
        setMetrics((prev) => ({ ...prev, ghostOscillators: false }));
      }

      // Log some sample values for debugging
      const avgSignal =
        dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) / dataArray.length;
      console.log('Analyser avg signal strength:', avgSignal.toFixed(2));
      console.log('Has audio signal:', hasSignal);
      console.log('Oscillator count in state:', oscCount);
    };

    const interval = setInterval(checkAnalyser, 2000);
    return () => clearInterval(interval);
  }, [analyser, activeOscillators]);
  useEffect(() => {
    if (!audioContext) return;

    const updateAudioMetrics = () => {
      const baseLatency = audioContext.baseLatency || 0;
      const outputLatency = audioContext.outputLatency || 0;
      const totalLatency = (baseLatency + outputLatency) * 1000; // Convert to ms

      // Detect crash: AudioContext suspended or closed
      let crashed = false;
      let crashReason = '';

      if (audioContext.state === 'suspended') {
        crashed = true;
        crashReason = 'AudioContext suspended - too many nodes or CPU overload!';
        console.error('🔴🔴🔴 AUDIO ENGINE SUSPENDED!');
      } else if (audioContext.state === 'closed') {
        crashed = true;
        crashReason = 'AudioContext closed - audio engine crashed!';
        console.error('🔴🔴🔴 AUDIO ENGINE CLOSED!');
      }

      setMetrics((prev) => ({
        ...prev,
        audioLatency: totalLatency.toFixed(2),
        audioContextState: audioContext.state,
        sampleRate: audioContext.sampleRate,
        isCrashed: crashed,
        crashReason,
      }));
    };

    updateAudioMetrics();
    const interval = setInterval(updateAudioMetrics, 500);
    return () => clearInterval(interval);
  }, [audioContext]);

  // Memory and GC tracking
  useEffect(() => {
    if (!performance.memory) return;

    const trackMemory = () => {
      const memory = performance.memory;
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(1);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(1);
      const limitMB = (memory.jsHeapSizeLimit / 1048576).toFixed(1);

      // Detect GC (sudden drop in memory > 10%)
      if (lastMemory.current > 0 && memory.usedJSHeapSize < lastMemory.current * 0.9) {
        gcCount.current++;
        gcCountRecent.current++;
        console.warn('⚠️ Garbage Collection detected! This causes lag spikes.');
      }
      lastMemory.current = memory.usedJSHeapSize;

      // Reset recent GC counter every 10 seconds
      const now = Date.now();
      if (now - gcResetTime.current > 10000) {
        gcCountRecent.current = 0;
        gcResetTime.current = now;
      }

      setMetrics((prev) => ({
        ...prev,
        memoryUsage: `${usedMB}/${limitMB}MB`,
        gcEvents: gcCount.current,
        gcEventsRecent: gcCountRecent.current,
      }));
    };

    const interval = setInterval(trackMemory, 1000);
    return () => clearInterval(interval);
  }, []);

  // FPS Counter with lag spike detection and crash detection
  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / delta);

        // Detect lag spikes
        if (fps < 30) {
          console.error('🔴 LAG SPIKE DETECTED! FPS dropped to', fps);
          lowFpsCounter.current++;
        } else {
          lowFpsCounter.current = 0;
        }

        // Detect complete freeze (FPS stuck at 0 or very low for extended period)
        if (fps < 10 && lowFpsCounter.current > 3) {
          console.error('🔴🔴🔴 SYSTEM FREEZE DETECTED! FPS:', fps);
        }

        setMetrics((prev) => ({ ...prev, fps }));
        setHistory((prev) => [...prev.slice(-59), { time: Date.now(), fps }]);
        frameCount.current = 0;
        lastTime.current = now;
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Render time tracker
  useEffect(() => {
    renderStart.current = performance.now();
    return () => {
      const renderTime = performance.now() - renderStart.current;
      if (renderTime > 16) {
        console.warn('⚠️ Slow render detected:', renderTime.toFixed(2), 'ms (should be < 16ms)');
      }
      setMetrics((prev) => ({ ...prev, renderTime: renderTime.toFixed(2) }));
    };
  });

  const getColor = (fps) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getWarningColor = (level) => {
    if (level === 'critical') return 'text-red-400 bg-red-900/20 border-red-800';
    return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
  };

  const handleEmergencyReset = () => {
    console.warn('🚨 EMERGENCY RESET TRIGGERED');
    console.warn('Attempting to resume AudioContext...');

    if (audioContext) {
      if (audioContext.state === 'suspended') {
        audioContext
          .resume()
          .then(() => {
            console.log('✅ AudioContext resumed!');
            alert('Audio engine resumed. Try playing a note.');
          })
          .catch((err) => {
            console.error('❌ Failed to resume:', err);
            alert('Failed to resume audio. Please refresh the page.');
          });
      } else if (audioContext.state === 'closed') {
        alert('Audio engine is closed and cannot be recovered. Please refresh the page.');
      } else {
        alert('Audio context state: ' + audioContext.state + '. Try refreshing the page.');
      }
    } else {
      alert('No audio context found. Please refresh the page.');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const copyMetrics = () => {
    const text = `🎵 Audio Performance Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ PERFORMANCE
  FPS: ${metrics.fps}
  Render Time: ${metrics.renderTime}ms
  Memory: ${metrics.memoryUsage}
  GC Events: ${metrics.gcEvents}

🎹 AUDIO ENGINE
  Total Voices: ${metrics.totalVoices}
  Active Oscillators: ${metrics.oscillatorCount}
  Unison Voices: ${unison?.voices || 1}
  Audio Latency: ${metrics.audioLatency}ms
  Context State: ${metrics.audioContextState}
  Sample Rate: ${metrics.sampleRate}Hz

⚙️ EFFECTS
  Filter: ${filter?.enabled ? 'ON' : 'OFF'}
  Filter Envelope: ${filterEnv ? 'ON' : 'OFF'}
  Reverb: ${reverb?.enabled ? 'ON' : 'OFF'}

⚠️ WARNINGS (${warnings.length})
${warnings.map((w) => `  • ${w.message}`).join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`p-2 backdrop-blur rounded-lg text-white transition-colors border shadow-lg ${
            warnings.length > 0
              ? 'bg-red-800/90 border-red-600 animate-pulse'
              : 'bg-gray-800/90 hover:bg-gray-700 border-gray-600'
          }`}
        >
          <Activity size={20} />
          {warnings.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {warnings.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-20 right-4 w-96 bg-gray-900/98 backdrop-blur border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden select-text max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Audio Performance Monitor</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyMetrics}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Copy full report"
          >
            {copied ? (
              <Check size={16} className="text-green-400" />
            ) : (
              <Copy size={16} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Critical Warnings Banner */}
      {metrics.isCrashed && (
        <div className="bg-red-900/50 border-b border-red-700 p-4 animate-pulse">
          <div className="flex items-center gap-2 text-red-200 font-bold text-sm mb-2">
            <AlertTriangle size={18} />
            🔴 AUDIO ENGINE CRASHED!
          </div>
          <div className="text-red-300 text-xs mb-3">{metrics.crashReason}</div>
          <button
            onClick={handleEmergencyReset}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            🚨 EMERGENCY RESET - Click to Resume Audio
          </button>
          <div className="text-red-300 text-xs mt-2">
            If this doesn't work, refresh the page (F5)
          </div>
        </div>
      )}

      {!metrics.isCrashed && warnings.some((w) => w.level === 'critical') && (
        <div className="bg-red-900/30 border-b border-red-800 p-3 animate-pulse">
          <div className="flex items-center gap-2 text-red-300 font-semibold text-sm">
            <AlertTriangle size={16} />
            PERFORMANCE CRITICAL - Action Required!
          </div>
        </div>
      )}

      <div className="p-3 space-y-3">
        {/* Performance Section */}
        <Section
          title="⚡ Performance"
          expanded={expandedSections.performance}
          onToggle={() => toggleSection('performance')}
        >
          {/* FPS with Graph */}
          <div className="bg-gray-800/50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">FPS (Target: 60)</span>
              <span className={`text-lg font-bold ${getColor(metrics.fps)}`}>{metrics.fps}</span>
            </div>
            <div className="h-12 flex items-end gap-0.5">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 ${getColor(h.fps)} bg-current opacity-50`}
                  style={{ height: `${Math.min((h.fps / 60) * 100, 100)}%` }}
                />
              ))}
            </div>
          </div>

          <MetricRow
            label="Render Time (Target: <16ms)"
            value={`${metrics.renderTime}ms`}
            warning={parseFloat(metrics.renderTime) > 16}
          />

          {performance.memory && (
            <>
              <MetricRow label="Memory Usage" value={metrics.memoryUsage} warning={false} />
              <MetricRow
                label="GC Events (Last 10s)"
                value={metrics.gcEventsRecent}
                warning={metrics.gcEventsRecent > 3}
                info={`${metrics.gcEvents} total since load`}
              />
            </>
          )}
        </Section>

        {/* Audio Engine Section */}
        <Section
          title="🎹 Audio Engine"
          expanded={expandedSections.audio}
          onToggle={() => toggleSection('audio')}
        >
          <MetricRow
            label="🔴 TOTAL VOICES (The Key Metric!)"
            value={metrics.totalVoices}
            warning={metrics.totalVoices > 10}
            critical={metrics.totalVoices > 20}
            info={`${metrics.oscillatorCount} osc × ${unison?.voices || 1} unison`}
          />

          <MetricRow
            label="Active Oscillators"
            value={metrics.oscillatorCount}
            warning={metrics.oscillatorCount > 8}
          />

          <MetricRow
            label="Unison Voices Per Note"
            value={unison?.voices || 1}
            warning={(unison?.voices || 1) > 3}
            info="Multiplies CPU load!"
          />

          <MetricRow label="Active Pitch Classes" value={metrics.activePitchClassCount} />

          {/* <MetricRow
            label="🔍 Analyser Status"
            value={metrics.analyserFrozen ? 'FROZEN' : 'Active'}
            critical={metrics.analyserFrozen}
            info={metrics.analyserFrozen ? 'No audio signal!' : ''}
          /> */}

          <MetricRow
            label="👻 Ghost Oscillators"
            value={metrics.ghostOscillators ? 'DETECTED!' : 'None'}
            critical={metrics.ghostOscillators}
            info={
              metrics.ghostOscillators
                ? 'Audio playing but not tracked!'
                : 'All oscillators tracked'
            }
          />

          <MetricRow
            label="Oscillator State"
            value={metrics.oscillatorsStuck ? 'STUCK' : 'Normal'}
            warning={metrics.oscillatorsStuck}
            info={metrics.oscillatorsStuck ? 'Not releasing properly' : ''}
          />

          <MetricRow
            label="Audio Latency"
            value={`${metrics.audioLatency}ms`}
            warning={parseFloat(metrics.audioLatency) > 50}
          />

          <MetricRow
            label="Context State"
            value={metrics.audioContextState}
            warning={metrics.audioContextState !== 'running'}
            critical={
              metrics.audioContextState === 'suspended' || metrics.audioContextState === 'closed'
            }
            info={metrics.isCrashed ? 'CRASHED!' : ''}
          />

          <MetricRow label="Sample Rate" value={`${metrics.sampleRate}Hz`} />
        </Section>

        {/* Effects & Processing */}
        <Section
          title="⚙️ Effects & Processing"
          expanded={expandedSections.audio}
          onToggle={() => toggleSection('audio')}
        >
          <div className="space-y-1 text-xs">
            <EffectStatus label="Filter" enabled={filter?.enabled} type={filter?.type} />
            <EffectStatus label="Filter Envelope" enabled={!!filterEnv} />
            <EffectStatus label="Reverb" enabled={reverb?.enabled} wet={reverb?.wet} />
          </div>
        </Section>

        {/* Warnings Section */}
        {warnings.length > 0 && (
          <Section
            title={`⚠️ Warnings (${warnings.length})`}
            expanded={expandedSections.warnings}
            onToggle={() => toggleSection('warnings')}
            highlight={warnings.some((w) => w.level === 'critical')}
          >
            <div className="space-y-2">
              {warnings.map((warning, i) => (
                <div
                  key={i}
                  className={`p-2 rounded border text-xs ${getWarningColor(warning.level)}`}
                >
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {warning.message}
                  </div>
                  <div className="mt-1 text-gray-300">💡 {warning.solution}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Recommendations */}
        {/* <Section
          title="💡 Optimization Tips"
          expanded={expandedSections.recommendations}
          onToggle={() => toggleSection('recommendations')}
        >
          <div className="space-y-2 text-xs text-gray-300">
            <Tip>Keep total voices under 10 for smooth performance</Tip>
            <Tip>Unison voices multiply CPU load - use sparingly</Tip>
            <Tip>Filter envelopes are expensive with many voices</Tip>
            <Tip>Disable reverb when using 10+ voices</Tip>
            <Tip>Release notes promptly (don't hold too many keys)</Tip>
            <Tip>
              🔴 CRITICAL: ALL unison oscillators must be stored in activeOscillators state!
            </Tip>
            <Tip>🔴 When creating unison voices, add each one to the oscillators object</Tip>
            <Tip>🔴 Example: oscillators[noteId + '_voice_' + i] = oscillatorNode</Tip>
          </div>
        </Section> */}
      </div>

      {/* Performance Tips */}
      {metrics.fps < 30 && (
        <div className="p-3 bg-red-900/20 border-t border-red-800/30">
          <p className="text-xs text-red-300 font-semibold">
            🚨 CRITICAL LAG! Check total voices ({metrics.totalVoices}) and disable effects!
          </p>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, expanded, onToggle, children, highlight = false }) => (
  <div
    className={`border rounded ${
      highlight ? 'border-red-700 bg-red-900/10' : 'border-gray-700 bg-gray-800/20'
    }`}
  >
    <button
      onClick={onToggle}
      className="w-full p-2 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
    >
      <span className="text-sm font-semibold text-white">{title}</span>
      {expanded ? (
        <ChevronUp size={16} className="text-gray-400" />
      ) : (
        <ChevronDown size={16} className="text-gray-400" />
      )}
    </button>
    {expanded && <div className="p-2 space-y-2">{children}</div>}
  </div>
);

const MetricRow = ({ label, value, info, warning, critical }) => (
  <div
    className={`flex items-center justify-between text-xs rounded p-2 ${
      critical
        ? 'bg-red-900/30 border border-red-800'
        : warning
        ? 'bg-yellow-900/20'
        : 'bg-gray-800/30'
    }`}
  >
    <div className="flex-1">
      <div
        className={`${
          critical ? 'text-red-400 font-bold' : warning ? 'text-yellow-400' : 'text-gray-300'
        }`}
      >
        {label}
      </div>
      {info && <div className="text-gray-500 text-[10px] mt-0.5">{info}</div>}
    </div>
    <span
      className={`font-mono font-semibold ${
        critical ? 'text-red-400 text-base' : warning ? 'text-yellow-400' : 'text-blue-400'
      }`}
    >
      {value}
    </span>
  </div>
);

const EffectStatus = ({ label, enabled, type, wet }) => (
  <div className="flex items-center justify-between bg-gray-800/30 rounded p-1.5">
    <span className="text-gray-300">{label}</span>
    <div className="flex items-center gap-2">
      {type && <span className="text-gray-500 text-[10px]">{type}</span>}
      {wet !== undefined && (
        <span className="text-gray-500 text-[10px]">{(wet * 100).toFixed(0)}%</span>
      )}
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          enabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-500'
        }`}
      >
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  </div>
);

const Tip = ({ children }) => (
  <div className="flex gap-2">
    <span className="text-blue-400">•</span>
    <span>{children}</span>
  </div>
);

export default PerformanceMonitor;
