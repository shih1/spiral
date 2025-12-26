import { useRef, useEffect } from 'react';

/**
 * Manages the Web Audio API context, master gain, analyser, and reverb infrastructure
 * Now with proper stereo analysis via channel splitter
 */
export const useAudioContext = (mixer) => {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const reverbNodeRef = useRef(null);
  const reverbGainRef = useRef(null);
  const dryGainRef = useRef(null);
  const analyserRef = useRef(null);
  const leftAnalyserRef = useRef(null);
  const rightAnalyserRef = useRef(null);
  const splitterRef = useRef(null);

  // Initialize Audio Context with Master Gain and Reverb
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContextRef.current;

    // Create master gain node
    masterGainRef.current = ctx.createGain();
    masterGainRef.current.gain.value = mixer.masterVolume;

    // Create main analyser node (for existing visualizers)
    analyserRef.current = ctx.createAnalyser();
    analyserRef.current.fftSize = 2048;
    analyserRef.current.smoothingTimeConstant = 0.8;

    // Create stereo analysers for true L/R separation
    splitterRef.current = ctx.createChannelSplitter(2);
    leftAnalyserRef.current = ctx.createAnalyser();
    rightAnalyserRef.current = ctx.createAnalyser();

    leftAnalyserRef.current.fftSize = 2048;
    leftAnalyserRef.current.smoothingTimeConstant = 0.8;
    rightAnalyserRef.current.fftSize = 2048;
    rightAnalyserRef.current.smoothingTimeConstant = 0.8;

    // Connect masterGain -> analyser -> destination (for main visualizer)
    masterGainRef.current.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    // Connect masterGain -> splitter -> L/R analysers (for stereo vectorscope)
    masterGainRef.current.connect(splitterRef.current);
    splitterRef.current.connect(leftAnalyserRef.current, 0); // Left channel
    splitterRef.current.connect(rightAnalyserRef.current, 1); // Right channel

    // Create reverb convolver node
    reverbNodeRef.current = ctx.createConvolver();

    // Create wet/dry gain nodes
    dryGainRef.current = ctx.createGain();
    reverbGainRef.current = ctx.createGain();

    // Connect dry path: dryGain -> master -> analyser -> destination
    dryGainRef.current.connect(masterGainRef.current);

    // Connect wet path: reverbGain -> reverb -> master -> analyser -> destination
    reverbGainRef.current.connect(reverbNodeRef.current);
    reverbNodeRef.current.connect(masterGainRef.current);

    // Generate impulse response for reverb
    const generateImpulseResponse = (duration, decay) => {
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * duration;
      const impulse = ctx.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }

      return impulse;
    };

    reverbNodeRef.current.buffer = generateImpulseResponse(2.0, 2.0);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update master volume when mixer changes
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const targetVolume = mixer.muted ? 0 : mixer.masterVolume;
      masterGainRef.current.gain.setValueAtTime(targetVolume, audioContextRef.current.currentTime);
    }
  }, [mixer.masterVolume, mixer.muted]);

  return {
    audioContext: audioContextRef.current,
    masterGain: masterGainRef.current,
    reverbNode: reverbNodeRef.current,
    reverbGain: reverbGainRef.current,
    dryGain: dryGainRef.current,
    analyser: analyserRef.current,
    leftAnalyser: leftAnalyserRef.current,
    rightAnalyser: rightAnalyserRef.current,
  };
};
