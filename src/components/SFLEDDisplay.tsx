import { useMemo } from 'react';
import type { CalculationResult } from '../types';
import './SFLEDDisplay.css';

interface SFLEDDisplayProps {
  result: CalculationResult | null;
  isValid: boolean;
  children?: React.ReactNode;
}

function LedBulb({ on }: { on: boolean }) {
  return (
    <div className={`sf-led-display__led ${on ? 'sf-led-display__led--on' : 'sf-led-display__led--off'}`}>
      <div className="sf-led-display__led-outer">
        <div className="sf-led-display__led-inner" />
      </div>
    </div>
  );
}

export function SFLEDDisplay({ result, isValid, children }: SFLEDDisplayProps) {
  const terminal = useMemo(() => {
    if (!result?.sfcTerminal) {
      return {
        orangeBits: Array(15).fill(0) as number[],
        blueBits: Array(15).fill(0) as number[],
        orangeNegative: false,
        blueNegative: false,
      };
    }
    const { orange, blue, orangeBits, blueBits } = result.sfcTerminal;
    return {
      orangeBits,
      blueBits,
      orangeNegative: orange < 0,
      blueNegative: blue < 0,
    };
  }, [result]);

  return (
    <div className={`sf-led-display ${!isValid ? 'sf-led-display--invalid' : ''}`}>
      <div className="sf-led-display__header">
        <h3 className="sf-led-display__title">Binary Output</h3>
        {!isValid && <span className="sf-led-display__warning">⚠ Invalid</span>}
      </div>

      <div className="sf-led-display__grid-wrapper">
        <div className="sf-led-display__frame" aria-label="SFC binary terminal">
          <div className="sf-led-display__side sf-led-display__side--orange sf-led-display__side--left-top" />
          <div className="sf-led-display__row sf-led-display__row--orange">
            {terminal.orangeBits.map((bit, i) => (
              <LedBulb key={`orange-${i}`} on={bit === 1} />
            ))}
          </div>
          <div className="sf-led-display__gap sf-led-display__gap--top" />
          <div className="sf-led-display__signs" aria-label="Sign indicators">
            <LedBulb on={terminal.orangeNegative} />
            <LedBulb on={terminal.blueNegative} />
          </div>
          <div className="sf-led-display__side sf-led-display__side--orange sf-led-display__side--right-top" />

          <div className="sf-led-display__side sf-led-display__side--blue sf-led-display__side--left-bottom" />
          <div className="sf-led-display__row sf-led-display__row--blue">
            {terminal.blueBits.map((bit, i) => (
              <LedBulb key={`blue-${i}`} on={bit === 1} />
            ))}
          </div>
          <div className="sf-led-display__gap sf-led-display__gap--bottom" />
          <div className="sf-led-display__side sf-led-display__side--blue sf-led-display__side--right-bottom" />
        </div>
      </div>

      {children != null && (
        <div className="sf-led-display__summary">
          {children}
        </div>
      )}
    </div>
  );
}
