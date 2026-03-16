import { useState } from 'react';
import type { Coordinates, TargetCell, Preset, CannonOriginVariant } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './PresetManager.css';

interface PresetManagerProps {
  origin: Coordinates;
  passcode: number;
  cannonOrigin: CannonOriginVariant;
  targets: TargetCell[];
  onLoadPreset: (origin: Coordinates, passcode: number, cannonOrigin: CannonOriginVariant, targets: Omit<TargetCell, 'id' | 'isExpanded'>[]) => void;
}

export function PresetManager({ origin, passcode, cannonOrigin, targets, onLoadPreset }: PresetManagerProps) {
  const [presets, setPresets] = useLocalStorage<Preset[]>('osc-presets', []);
  const [isOpen, setIsOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    if (!newPresetName.trim()) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      origin,
      passcode,
      cannonOrigin,
      targets: targets.map(({ id, isExpanded, ...rest }) => rest),
      createdAt: Date.now(),
    };

    setPresets([...presets, newPreset]);
    setNewPresetName('');
    setShowSaveInput(false);
  };

  const handleLoad = (preset: Preset) => {
    onLoadPreset(preset.origin, preset.passcode ?? 940, preset.cannonOrigin ?? 'osc-mk6', preset.targets);
    setIsOpen(false);
  };

  const handleDelete = (presetId: string) => {
    setPresets(presets.filter(p => p.id !== presetId));
  };

  if (!isOpen) {
    return (
      <button className="preset-manager__toggle" onClick={() => setIsOpen(true)}>
        💾 Presets ({presets.length})
      </button>
    );
  }

  return (
    <div className="preset-manager">
      <div className="preset-manager__header">
        <h3 className="preset-manager__title">💾 Saved Presets</h3>
        <button className="preset-manager__close" onClick={() => setIsOpen(false)}>✕</button>
      </div>

      {/* Save New */}
      {showSaveInput ? (
        <div className="preset-manager__save-form">
          <input
            type="text"
            placeholder="Preset name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button className="preset-manager__btn" onClick={handleSave}>Save</button>
          <button className="preset-manager__btn preset-manager__btn--secondary" onClick={() => setShowSaveInput(false)}>Cancel</button>
        </div>
      ) : (
        <button 
          className="preset-manager__save-btn"
          onClick={() => setShowSaveInput(true)}
        >
          + Save Current Configuration
        </button>
      )}

      {/* Preset List */}
      <div className="preset-manager__list">
        {presets.length === 0 ? (
          <div className="preset-manager__empty">
            No saved presets yet
          </div>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className="preset-manager__item">
              <div className="preset-manager__item-info">
                <span className="preset-manager__item-name">{preset.name}</span>
                <span className="preset-manager__item-meta">
                  {preset.targets.length} target{preset.targets.length !== 1 ? 's' : ''} • 
                  Origin: {preset.origin.x}, {preset.origin.y}, {preset.origin.z}
                </span>
              </div>
              <div className="preset-manager__item-actions">
                <button 
                  className="preset-manager__btn preset-manager__btn--load"
                  onClick={() => handleLoad(preset)}
                >
                  Load
                </button>
                <button 
                  className="preset-manager__btn preset-manager__btn--delete"
                  onClick={() => handleDelete(preset.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

