import React from 'react';
import { Volume2, VolumeX, Waves } from 'lucide-react';

export default function MixerPanel({ mixer, setMixer, reverb, setReverb }) {
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setMixer({ ...mixer, masterVolume: newVolume });
  };

  const toggleMute = () => {
    setMixer({ ...mixer, muted: !mixer.muted });
  };

  const handleWetChange = (e) => {
    const newWet = parseFloat(e.target.value);
    setReverb({ ...reverb, wet: newWet });
  };

  const handleDecayChange = (e) => {
    const newDecay = parseFloat(e.target.value);
    setReverb({ ...reverb, decay: newDecay });
  };

  const toggleReverb = () => {
    setReverb({ ...reverb, enabled: !reverb.enabled });
  };

  const displayVolume = mixer.muted ? 0 : mixer.masterVolume;

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center gap-6">
        <h3 className="text-white font-semibold text-sm">MIXER</h3>

        {/* Volume Section */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={toggleMute}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            title={mixer.muted ? 'Unmute' : 'Mute'}
          >
            {mixer.muted ? (
              <VolumeX className="text-red-400" size={18} />
            ) : (
              <Volume2 className="text-blue-400" size={18} />
            )}
          </button>

          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">
              Master Volume: {Math.round(displayVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={mixer.masterVolume}
              onChange={handleVolumeChange}
              className="w-full"
              disabled={mixer.muted}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-gray-600"></div>

        {/* Reverb Section */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={toggleReverb}
            className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              reverb.enabled
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title={reverb.enabled ? 'Disable Reverb' : 'Enable Reverb'}
          >
            <Waves size={16} className="inline mr-1" />
            {reverb.enabled ? 'ON' : 'OFF'}
          </button>

          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">
              Reverb Mix: {Math.round(reverb.wet * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={reverb.wet}
              onChange={handleWetChange}
              className="w-full"
              disabled={!reverb.enabled}
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">
              Decay: {reverb.decay.toFixed(1)}s
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={reverb.decay}
              onChange={handleDecayChange}
              className="w-full"
              disabled={!reverb.enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
