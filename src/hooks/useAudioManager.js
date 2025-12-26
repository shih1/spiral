import { useAudioContext } from './useAudioContext';
import { useReverbEffect } from './useReverbEffect';
import { useSynthFX } from './useSynthFX';
import { useNoteLifecycle } from './useNoteLifecycle';
import { usePitchClassAnimation } from './usePitchClassAnimation';

/**
 * Main audio manager hook - orchestrates all audio subsystems
 * This is a thin wrapper that connects all the specialized hooks together
 */
export const useAudioManager = (
  config,
  mixer,
  reverb,
  adsr,
  waveform,
  filter,
  filterEnv,
  unison
) => {
  // 1. Initialize audio context and core nodes
  const {
    audioContext,
    masterGain,
    reverbNode,
    reverbGain,
    dryGain,
    analyser,
    leftAnalyser,
    rightAnalyser,
  } = useAudioContext(mixer);

  // 2. Setup reverb effect
  useReverbEffect(reverb, audioContext, reverbNode, reverbGain, dryGain);

  // 3. Setup synth effects (waveform, filter, drive, unison)
  // We need a temporary empty state for initial render
  const { createMorphedWave, makeDistortionCurve, activeFiltersMapRef, activeDriveMapRef } =
    useSynthFX(audioContext, waveform, filter, unison, {}, () => {});

  // 4. Setup note lifecycle with all dependencies
  const noteLifecycle = useNoteLifecycle(
    audioContext,
    dryGain,
    reverbGain,
    adsr,
    filter,
    filterEnv,
    unison,
    waveform,
    createMorphedWave,
    makeDistortionCurve,
    activeFiltersMapRef,
    activeDriveMapRef
  );

  // 5. Now connect synth FX to the actual note lifecycle state
  // Re-run useSynthFX with real state (this is safe because React batches updates)
  useSynthFX(
    audioContext,
    waveform,
    filter,
    unison,
    noteLifecycle.activeOscillators,
    noteLifecycle.setActiveOscillators
  );

  // 6. Setup pitch class animation
  usePitchClassAnimation(
    config,
    noteLifecycle.activePitchClasses,
    noteLifecycle.setActivePitchClasses
  );

  // 7. Return public API
  return {
    activeNote: noteLifecycle.activeNote,
    activePitchClasses: noteLifecycle.activePitchClasses,
    heldNotes: noteLifecycle.heldNotes,
    releasedNotes: noteLifecycle.releasedNotes,
    activeOscillators: noteLifecycle.activeOscillators,
    setActiveOscillators: noteLifecycle.setActiveOscillators,
    setActiveNote: noteLifecycle.setActiveNote,
    handleNotePlay: noteLifecycle.handleNotePlay,
    stopNote: noteLifecycle.stopNote,
    releaseNote: noteLifecycle.releaseNote,
    analyser,
    leftAnalyser, // ADD THIS
    rightAnalyser, // ADD THIS
    audioContext,
  };
};
