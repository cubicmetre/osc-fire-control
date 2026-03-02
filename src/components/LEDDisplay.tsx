import React, { useMemo } from 'react';
import type { CalculationResult } from '../types';
import './LEDDisplay.css';

interface LEDDisplayProps {
  result: CalculationResult | null;
  isValid: boolean;
  /** Renders in the summary bar (replaces coarse/fine/time). Use for e.g. target stats toggle. */
  children?: React.ReactNode;
}

// Column colors: [3,1,2,1,3,1,2] = 13 columns
// Colors: blue-dark(3), blue-light(1), green(2), yellow(1), orange(3), red(1), brown(2)
const COLUMN_COLORS = [
  'blue-dark', 'blue-dark', 'blue-dark',  // cols 0-2
  'blue-light',                            // col 3
  'green', 'green',                        // cols 4-5
  'yellow',                                // col 6
  'orange', 'orange', 'orange',            // cols 7-9
  'red',                                   // col 10
  'brown', 'brown'                         // cols 11-12
];

// Row colors: 5 rows, darkest at top, lightest at bottom (like spreadsheet)
const ROW_COLORS = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'];

export function LEDDisplay({ result, isValid, children }: LEDDisplayProps) {
  const grid = useMemo(() => {
    if (!result) {
      return Array(5).fill(null).map(() => Array(13).fill(0));
    }
    return result.binaryGrid;
  }, [result]);

  return (
    <div className={`led-display ${!isValid ? 'led-display--invalid' : ''}`}>
      <div className="led-display__header">
        <h3 className="led-display__title">Binary Output</h3>
        {!isValid && <span className="led-display__warning">⚠ Invalid</span>}
      </div>

      {/* LED Grid with color frame using CSS Grid */}
      <div className="led-display__grid-wrapper">
        <div className="led-display__frame">
          {/* Top row: corner + column colors + corner */}
          <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[0]}`} />
          {COLUMN_COLORS.map((color, i) => (
            <div key={`top-${i}`} className={`led-display__border-cell led-display__border-cell--${color}`} />
          ))}
          <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[0]}`} />

          {/* LED rows with side borders */}
          {grid.map((row, rowIdx) => (
            <React.Fragment key={rowIdx}>
              <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[rowIdx]}`} />
              {row.map((value, colIdx) => (
                <div
                  key={colIdx}
                  className={`led-display__led ${value === 1 ? 'led-display__led--on' : 'led-display__led--off'}`}
                >
                  <div className="led-display__led-outer">
                    <div className="led-display__led-inner"></div>
                  </div>
                </div>
              ))}
              <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[rowIdx]}`} />
            </React.Fragment>
          ))}

          {/* Bottom row: corner + column colors + corner */}
          <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[4]}`} />
          {COLUMN_COLORS.map((color, i) => (
            <div key={`bottom-${i}`} className={`led-display__border-cell led-display__border-cell--${color}`} />
          ))}
          <div className={`led-display__border-cell led-display__border-cell--${ROW_COLORS[4]}`} />
        </div>

        {/* Glow overlay layer - renders unified glow on top */}
        <div className="led-display__glow-layer">
          {grid.map((row, rowIdx) => (
            <div key={rowIdx} className="led-display__glow-row">
              {row.map((value, colIdx) => (
                <div
                  key={colIdx}
                  className={`led-display__glow-cell ${value === 1 ? 'led-display__glow-cell--on' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Summary bar: coarse/fine/time replaced by optional content (e.g. target stats toggle) */}
      {children != null && (
        <div className="led-display__summary">
          {children}
        </div>
      )}
    </div>
  );
}

