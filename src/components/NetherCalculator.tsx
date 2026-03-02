import { useState } from 'react';
import type { Coordinates } from '../types';
import { overworldToNether, netherToOverworld } from '../utils/calculations';
import { parseInteger } from '../utils/validation';
import './NetherCalculator.css';

interface NetherCalculatorProps {
  onApplyToOrigin?: (coords: Coordinates) => void;
}

export function NetherCalculator({ onApplyToOrigin }: NetherCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'toNether' | 'toOverworld'>('toNether');
  const [input, setInput] = useState<Coordinates>({ x: 0, y: 64, z: 0 });

  const result = mode === 'toNether' 
    ? overworldToNether(input) 
    : netherToOverworld(input);

  const handleCopy = () => {
    const text = `X: ${result.x}, Y: ${result.y}, Z: ${result.z}`;
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) {
    return (
      <button className="nether-calc__toggle" onClick={() => setIsOpen(true)}>
        🌋 Nether Calculator
      </button>
    );
  }

  return (
    <div className="nether-calc">
      <div className="nether-calc__header">
        <h3 className="nether-calc__title">🌋 Nether Calculator</h3>
        <button className="nether-calc__close" onClick={() => setIsOpen(false)}>✕</button>
      </div>

      <div className="nether-calc__mode-toggle">
        <button
          className={`nether-calc__mode-btn ${mode === 'toNether' ? 'nether-calc__mode-btn--active' : ''}`}
          onClick={() => setMode('toNether')}
        >
          Overworld → Nether
        </button>
        <button
          className={`nether-calc__mode-btn ${mode === 'toOverworld' ? 'nether-calc__mode-btn--active' : ''}`}
          onClick={() => setMode('toOverworld')}
        >
          Nether → Overworld
        </button>
      </div>

      <div className="nether-calc__content">
        <div className="nether-calc__section">
          <label className="nether-calc__label">
            {mode === 'toNether' ? 'Overworld Coordinates' : 'Nether Coordinates'}
          </label>
          <div className="nether-calc__coords">
            <div className="nether-calc__coord">
              <span>X</span>
              <input
                type="text"
                value={input.x}
                onChange={(e) => setInput({ ...input, x: parseInteger(e.target.value, 0) })}
              />
            </div>
            <div className="nether-calc__coord">
              <span>Y</span>
              <input
                type="text"
                value={input.y}
                onChange={(e) => setInput({ ...input, y: parseInteger(e.target.value, 0) })}
              />
            </div>
            <div className="nether-calc__coord">
              <span>Z</span>
              <input
                type="text"
                value={input.z}
                onChange={(e) => setInput({ ...input, z: parseInteger(e.target.value, 0) })}
              />
            </div>
          </div>
        </div>

        <div className="nether-calc__arrow">
          {mode === 'toNether' ? '÷ 8' : '× 8'}
        </div>

        <div className="nether-calc__section nether-calc__section--result">
          <label className="nether-calc__label">
            {mode === 'toNether' ? 'Nether Coordinates' : 'Overworld Coordinates'}
          </label>
          <div className="nether-calc__result">
            <span>X: <strong>{result.x}</strong></span>
            <span>Y: <strong>{result.y}</strong></span>
            <span>Z: <strong>{result.z}</strong></span>
          </div>
        </div>
      </div>

      <div className="nether-calc__actions">
        <button className="nether-calc__btn" onClick={handleCopy}>
          📋 Copy
        </button>
        {onApplyToOrigin && (
          <button 
            className="nether-calc__btn nether-calc__btn--primary"
            onClick={() => onApplyToOrigin(mode === 'toNether' ? input : result)}
          >
            Apply to Origin
          </button>
        )}
      </div>
    </div>
  );
}





