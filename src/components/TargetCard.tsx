import { useState, useMemo, useEffect } from 'react';
import type { Coordinates, TargetCell, CalculationResult, ValidationResult, CannonOriginVariant } from '../types';
import { calculate } from '../utils/calculations';
import { validateTarget, parseInteger } from '../utils/validation';
import { LEDDisplay } from './LEDDisplay';
import './TargetCard.css';

interface TargetCardProps {
  target: TargetCell;
  origin: Coordinates;
  cannonOrigin: CannonOriginVariant;
  passcode: number;
  index: number;
  onUpdate: (id: string, updates: Partial<TargetCell>) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

export function TargetCard({
  target,
  origin,
  cannonOrigin,
  passcode,
  index,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: TargetCardProps) {
  const [isExpanded, setIsExpanded] = useState(target.isExpanded);
  const [showTargetStats, setShowTargetStats] = useState(false);
  // Local state for coordinate inputs to allow intermediate states like "-"
  const [coordInputs, setCoordInputs] = useState({
    x: String(target.target.x),
    y: String(target.target.y),
    z: String(target.target.z),
  });

  // Sync local state when target changes (e.g., from preset load)
  useEffect(() => {
    setCoordInputs({
      x: String(target.target.x),
      y: String(target.target.y),
      z: String(target.target.z),
    });
  }, [target.target.x, target.target.y, target.target.z]);

  // Calculate results
  const result: CalculationResult | null = useMemo(() => {
    try {
      return calculate(origin, target, passcode, cannonOrigin);
    } catch {
      return null;
    }
  }, [origin, target, passcode, cannonOrigin]);

  // Validate
  const validation: ValidationResult = useMemo(() => {
    return validateTarget(origin, target, passcode, cannonOrigin);
  }, [origin, target, passcode, cannonOrigin]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onUpdate(target.id, { isExpanded: !isExpanded });
  };

  const handleInputChange = (field: keyof TargetCell, value: number | string) => {
    if (field === 'target') return;
    onUpdate(target.id, { [field]: value });
  };

  const handleCoordChange = (axis: 'x' | 'y' | 'z', value: number) => {
    onUpdate(target.id, {
      target: { ...target.target, [axis]: value },
    });
  };

  const handleCoordInputChange = (axis: 'x' | 'y' | 'z', value: string) => {
    // Update local state immediately to allow intermediate states like "-"
    setCoordInputs(prev => ({ ...prev, [axis]: value }));
    
    // Handle empty string - update to default
    if (value === '') {
      handleCoordChange(axis, 0);
      return;
    }
    
    // Handle just "-" - don't update parent state, allowing user to continue typing
    if (value === '-') {
      return;
    }
    
    // Parse and update parent state for valid numbers
    const parsed = parseInteger(value, target.target[axis]);
    // Only update if we got a valid number (not NaN)
    if (!isNaN(parsed)) {
      handleCoordChange(axis, parsed);
    }
  };

  const handleCopyResults = () => {
    if (!result) return;
    const sizeOrDepth = target.fireMode === 'nuke' 
      ? `Nuke Size: ${target.nukeSize}` 
      : `Stab Depth: ${target.stabDepth}`;
    const text = `Target: ${target.name}
Coordinates: X:${target.target.x} Y:${target.target.y} Z:${target.target.z}
Fire Mode: ${target.fireMode === 'nuke' ? 'Nuke' : 'Stab'}
${sizeOrDepth}
Magazine Slot: ${target.magazineSlot}
Coarse: X:${result.coarse.x} Y:${result.coarse.y} Z:${result.coarse.z}
Fine: X:${result.fine.x} Y:${result.fine.y} Z:${result.fine.z}
Passcode: ${passcode}`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={`target-card ${isExpanded ? 'target-card--expanded' : ''} ${!validation.isValid ? 'target-card--invalid' : ''}`}>
      {/* Collapsed Header */}
      <div className="target-card__header" onClick={handleToggle}>
        <div className="target-card__header-left">
          <span className={`target-card__status ${validation.isValid ? 'target-card__status--valid' : 'target-card__status--invalid'}`}>
            {validation.isValid ? '✓' : '✗'}
          </span>
          <span className="target-card__index">#{index + 1}</span>
          <input
            type="text"
            className="target-card__name"
            value={target.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Target name..."
          />
        </div>
        <div className="target-card__header-center">
          <span className="target-card__coords">
            X:{target.target.x} Y:{target.target.y} Z:{target.target.z}
          </span>
        </div>
        <div className="target-card__header-right">
          <div className="target-card__actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="target-card__action-btn"
              onClick={() => onMoveUp(target.id)}
              disabled={isFirst}
              title="Move up"
            >
              ▲
            </button>
            <button
              className="target-card__action-btn"
              onClick={() => onMoveDown(target.id)}
              disabled={isLast}
              title="Move down"
            >
              ▼
            </button>
            <button
              className="target-card__action-btn target-card__action-btn--delete"
              onClick={() => onDelete(target.id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
          <span className="target-card__expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="target-card__content">
          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="target-card__errors">
              {validation.errors.map((error, idx) => (
                <div key={idx} className="target-card__error">{error}</div>
              ))}
            </div>
          )}

          {/* Input Fields */}
          <div className="target-card__inputs">
            <div className="target-card__input-group target-card__input-group--coords">
              <label className="target-card__label">Target Coordinates</label>
              <div className="target-card__coord-inputs">
                <div className="target-card__coord-input">
                  <span className="target-card__coord-label">X</span>
                  <input
                    type="text"
                    value={coordInputs.x}
                    onChange={(e) => handleCoordInputChange('x', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      // Sync local state to actual value on blur
                      setCoordInputs(prev => ({ ...prev, x: String(target.target.x) }));
                    }}
                  />
                </div>
                <div className="target-card__coord-input">
                  <span className="target-card__coord-label">Y</span>
                  <input
                    type="text"
                    value={coordInputs.y}
                    onChange={(e) => handleCoordInputChange('y', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      // Sync local state to actual value on blur
                      setCoordInputs(prev => ({ ...prev, y: String(target.target.y) }));
                    }}
                  />
                </div>
                <div className="target-card__coord-input">
                  <span className="target-card__coord-label">Z</span>
                  <input
                    type="text"
                    value={coordInputs.z}
                    onChange={(e) => handleCoordInputChange('z', e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => {
                      // Sync local state to actual value on blur
                      setCoordInputs(prev => ({ ...prev, z: String(target.target.z) }));
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="target-card__input-row">
              <div className="target-card__input-group">
                <label className="target-card__label">Fire Mode</label>
                <select
                  value={target.fireMode}
                  onChange={(e) => handleInputChange('fireMode', e.target.value as 'nuke' | 'stab')}
                >
                  <option value="nuke">Nuke</option>
                  <option value="stab">Stab</option>
                </select>
              </div>

              <div className="target-card__input-group">
                <label className="target-card__label">
                  {target.fireMode === 'nuke' ? 'Nuke Size' : 'Stab Depth'}
                </label>
                <input
                  type="number"
                  min="1"
                  max={target.fireMode === 'nuke' ? 16 : undefined}
                  value={target.fireMode === 'nuke' ? target.nukeSize : target.stabDepth}
                  onChange={(e) => {
                    const value = parseInteger(e.target.value, 1);
                    if (target.fireMode === 'nuke') {
                      handleInputChange('nukeSize', value);
                    } else {
                      handleInputChange('stabDepth', value);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                />
              </div>

              <div className="target-card__input-group">
                <label className="target-card__label">Magazine Slot</label>
                  <input
                    type="number"
                    min="0"
                    value={target.magazineSlot}
                    onChange={(e) => handleInputChange('magazineSlot', parseInteger(e.target.value, 0))}
                    onFocus={(e) => e.target.select()}
                  />
              </div>
            </div>

          </div>

          {/* LED Display with target stats toggle in summary bar (replaces coarse/fine/time) */}
          <LEDDisplay result={result} isValid={validation.isValid}>
            {result && (
              <button
                type="button"
                className="led-display__stats-toggle"
                onClick={() => setShowTargetStats((s) => !s)}
                aria-expanded={showTargetStats}
              >
                <span className="led-display__stats-toggle-icon">
                  {showTargetStats ? '▼' : '▶'}
                </span>
                {showTargetStats ? 'Hide target stats' : 'Show target stats'}
              </button>
            )}
          </LEDDisplay>

          {/* Target stats panel (replaces coarse/fine/time when expanded) */}
          {showTargetStats && result && (
            <div className="target-card__stats-panel">
                <div className="target-card__stats-block">
                  <h4 className="target-card__stats-heading">Coarse / Fine</h4>
                  <div className="target-card__stats-grid">
                    <span className="target-card__stats-label">Coarse</span>
                    <span className="target-card__stats-value">
                      X:{result.coarse.x} Y:{result.coarse.y} Z:{result.coarse.z}
                    </span>
                    <span className="target-card__stats-label">Fine</span>
                    <span className="target-card__stats-value">
                      X:{result.fine.x} Y:{result.fine.y} Z:{result.fine.z}
                    </span>
                  </div>
                </div>
                <div className="target-card__stats-block">
                  <h4 className="target-card__stats-heading">Time estimates</h4>
                  <div className="target-card__stats-grid">
                    <span className="target-card__stats-label">Total</span>
                    <span className="target-card__stats-value target-card__stats-value--time">
                      {result.timeBreakdown.total}
                    </span>
                    <span className="target-card__stats-label">Payload Building</span>
                    <span className="target-card__stats-value">
                      {result.timeBreakdown.payloadBuilding}
                    </span>
                    <span className="target-card__stats-label">Acceleration</span>
                    <span className="target-card__stats-value">
                      {result.timeBreakdown.acceleration}
                    </span>
                  </div>
                </div>
                <div className="target-card__stats-block">
                  <h4 className="target-card__stats-heading">Payload Initial position</h4>
                  <div className="target-card__stats-value target-card__stats-value--coords">
                    X:{result.initialPosition.x.toFixed(4)} Y:{result.initialPosition.y.toFixed(4)} Z:{result.initialPosition.z.toFixed(4)}
                  </div>
                </div>
                <div className="target-card__stats-block">
                  <h4 className="target-card__stats-heading">Payload Exact motion</h4>
                  <div className="target-card__stats-value target-card__stats-value--coords">
                    X:{result.exactMotion.x.toFixed(4)} Y:{result.exactMotion.y.toFixed(4)} Z:{result.exactMotion.z.toFixed(4)}
                  </div>
                </div>
                <div className="target-card__stats-block">
                  <h4 className="target-card__stats-heading">Payload Final Position</h4>
                  <div className="target-card__stats-value target-card__stats-value--coords">
                    X:{result.exactPos.x.toFixed(4)} Y:{result.exactPos.y.toFixed(4)} Z:{result.exactPos.z.toFixed(4)}
                  </div>
                </div>
            </div>
          )}

          {/* Copy Button */}
          <button className="target-card__copy-btn" onClick={handleCopyResults}>
            📋 Copy Results
          </button>
        </div>
      )}
    </div>
  );
}

