import { useState, useCallback, useEffect } from 'react';
import type { Coordinates, TargetCell } from './types';
import { VALID_PASSCODES } from './data/validPasscodes';
import { useLocalStorage } from './hooks/useLocalStorage';
import { TargetCard } from './components/TargetCard';
import { PresetManager } from './components/PresetManager';
import { VideoBackground } from './components/VideoBackground';
import { overworldToNether } from './utils/calculations';
import { parseInteger } from './utils/validation';
import './App.css';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function createDefaultTarget(index: number): TargetCell {
  return {
    id: generateId(),
    name: `Target ${index + 1}`,
    target: { x: 0, y: 64, z: 0 },
    nukeSize: 10,
    stabDepth: 10,
    fireMode: 'nuke',
    magazineSlot: 0,
    isExpanded: index === 0,
  };
}


export default function App() {
  const [origin, setOrigin] = useLocalStorage<Coordinates>('osc-origin', { x: 0, y: 64, z: 0 });
  const [passcode, setPasscode] = useLocalStorage<number>('osc-passcode', 940);
  const [showPanorama, setShowPanorama] = useLocalStorage<boolean>('osc-show-panorama', true);
  const [isTallLayout, setIsTallLayout] = useState(() => window.innerHeight > window.innerWidth);

  // Monitor window resize to detect tall layout changes
  useEffect(() => {
    const checkLayout = () => {
      const isTall = window.innerHeight > window.innerWidth;
      setIsTallLayout(isTall);
      
      // Automatically disable panorama when switching to tall layout
      if (isTall && showPanorama) {
        setShowPanorama(false);
      }
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);

    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
    };
  }, [showPanorama, setShowPanorama]);
  
  // Store targets in localStorage
  // Normalize on initial load: ensure IDs exist and reset isExpanded (first target expanded)
  const [storedTargets, setStoredTargets] = useLocalStorage<TargetCell[]>('osc-targets', []);
  
  // Initialize targets from localStorage, normalizing IDs and isExpanded
  const initializeTargets = (): TargetCell[] => {
    if (storedTargets.length === 0) {
      return [createDefaultTarget(0)];
    }
    return storedTargets.map((target, index) => ({
      ...target,
      id: target.id || generateId(),
      isExpanded: index === 0, // Always reset isExpanded on load
    }));
  };

  const [targets, setTargets] = useState<TargetCell[]>(initializeTargets);

  // Sync targets to localStorage whenever they change
  useEffect(() => {
    setStoredTargets(targets);
  }, [targets, setStoredTargets]);

  const [isOriginExpanded, setIsOriginExpanded] = useState(true);
  const [isPanoramaBtnHovered, setIsPanoramaBtnHovered] = useState(false);
  
  // Local state for origin coordinate inputs to allow intermediate states like "-"
  const [originInputs, setOriginInputs] = useState({
    x: String(origin.x),
    y: String(origin.y),
    z: String(origin.z),
  });

  // Sync local state when origin changes (e.g., from preset load)
  useEffect(() => {
    setOriginInputs({
      x: String(origin.x),
      y: String(origin.y),
      z: String(origin.z),
    });
  }, [origin.x, origin.y, origin.z]);

  const handleOriginChange = (axis: 'x' | 'y' | 'z', value: number) => {
    setOrigin({ ...origin, [axis]: value });
  };

  const handleOriginInputChange = (axis: 'x' | 'y' | 'z', value: string) => {
    // Update local state immediately to allow intermediate states like "-"
    setOriginInputs(prev => ({ ...prev, [axis]: value }));
    
    // Handle empty string - update to default
    if (value === '') {
      handleOriginChange(axis, 0);
      return;
    }
    
    // Handle just "-" - don't update parent state, allowing user to continue typing
    if (value === '-') {
      return;
    }
    
    // Parse and update parent state for valid numbers
    const parsed = parseInteger(value, origin[axis]);
    // Only update if we got a valid number (not NaN)
    if (!isNaN(parsed)) {
      handleOriginChange(axis, parsed);
    }
  };

  const handleUpdateTarget = useCallback((id: string, updates: Partial<TargetCell>) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const handleDeleteTarget = useCallback((id: string) => {
    setTargets(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const handleAddTarget = () => {
    setTargets(prev => [...prev, createDefaultTarget(prev.length)]);
  };

  const handleMoveUp = useCallback((id: string) => {
    setTargets(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx <= 0) return prev;
      const newTargets = [...prev];
      [newTargets[idx - 1], newTargets[idx]] = [newTargets[idx], newTargets[idx - 1]];
      return newTargets;
    });
  }, []);

  const handleMoveDown = useCallback((id: string) => {
    setTargets(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newTargets = [...prev];
      [newTargets[idx], newTargets[idx + 1]] = [newTargets[idx + 1], newTargets[idx]];
      return newTargets;
    });
  }, []);

  const handleLoadPreset = (presetOrigin: Coordinates, presetPasscode: number, presetTargets: Omit<TargetCell, 'id' | 'isExpanded'>[]) => {
    setOrigin(presetOrigin);
    setPasscode(presetPasscode);
    setTargets(presetTargets.map((t, i) => ({
      ...t,
      id: generateId(),
      isExpanded: i === 0,
    })));
  };

  const netherPos = overworldToNether(origin);

  return (
    <>
      <VideoBackground showVideo={showPanorama} />
      <div className={`app ${showPanorama ? 'app--with-video' : ''}`}>
        <header className={`app__header ${showPanorama ? 'app__header--with-video' : ''}`}>
          <h1 className="app__title">
            <span className="app__title-icon">☢</span>
            OSC Fire Control
          </h1>
          {!isTallLayout && (
            <button 
              className={`app__toggle-panorama-btn ${isPanoramaBtnHovered ? 'app__toggle-panorama-btn--expanded' : ''}`}
              onClick={() => setShowPanorama(!showPanorama)}
              onMouseEnter={() => setIsPanoramaBtnHovered(true)}
              onMouseLeave={() => setIsPanoramaBtnHovered(false)}
              aria-label={showPanorama ? "Hide Panorama" : "Show Panorama"}
            >
              <span className="app__toggle-panorama-icon">{showPanorama ? '👁️' : '🚫'}</span>
              <span className="app__toggle-panorama-text">Toggle Panorama</span>
            </button>
          )}
        </header>

        <main className="app__main">
          {/* Origin Section */}
          <section className={`app__section app__section--origin ${!isOriginExpanded ? 'app__section--collapsed' : ''}`}>
            <div className="app__origin-header" onClick={() => setIsOriginExpanded(!isOriginExpanded)}>
              <h2 className="app__section-title">
                <span className="app__section-icon">📍</span>
                Cannon Origin
                <span className={`app__collapse-icon ${isOriginExpanded ? 'app__collapse-icon--expanded' : ''}`}>▼</span>
              </h2>
              {!isOriginExpanded && (
                <span className="app__origin-summary">
                  {origin.x}, {origin.y}, {origin.z}
                </span>
              )}
              {isOriginExpanded && (
                <p className="app__origin-hint">Coordinates must be divisible by 16</p>
              )}
            </div>
            {isOriginExpanded && (
              <>
                <div className="app__origin-inputs">
                  <div className="app__coord-input">
                    <label>X</label>
                    <input
                      type="text"
                      value={originInputs.x}
                      onChange={(e) => handleOriginInputChange('x', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        // Sync local state to actual value on blur
                        setOriginInputs(prev => ({ ...prev, x: String(origin.x) }));
                      }}
                    />
                  </div>
                  <div className="app__coord-input">
                    <label>Y</label>
                    <input
                      type="text"
                      value={originInputs.y}
                      onChange={(e) => handleOriginInputChange('y', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        // Sync local state to actual value on blur
                        setOriginInputs(prev => ({ ...prev, y: String(origin.y) }));
                      }}
                    />
                  </div>
                  <div className="app__coord-input">
                    <label>Z</label>
                    <input
                      type="text"
                      value={originInputs.z}
                      onChange={(e) => handleOriginInputChange('z', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => {
                        // Sync local state to actual value on blur
                        setOriginInputs(prev => ({ ...prev, z: String(origin.z) }));
                      }}
                    />
                  </div>
                </div>
                <div className="app__origin-footer">
                  <div className="app__input-group app__input-group--passcode">
                    <label className="app__input-label">Passcode</label>
                    <select
                      className="app__passcode-select"
                      value={passcode}
                      onChange={(e) => setPasscode(parseInt(e.target.value))}
                    >
                      {VALID_PASSCODES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                  <div className="app__nether-pos">
                    <span className="app__nether-label">Nether Pos</span>
                    <span className="app__nether-coords">
                      {netherPos.x}, {netherPos.y}, {netherPos.z}
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Tools Section */}
          <section className="app__section app__section--tools">
            <PresetManager
              origin={origin}
              passcode={passcode}
              targets={targets}
              onLoadPreset={handleLoadPreset}
            />
          </section>

          {/* Targets Section */}
          <section className="app__section app__section--targets">
            <div className="app__section-header">
              <h2 className="app__section-title">
                <span className="app__section-icon">🎯</span>
                Targets
              </h2>
              <button className="app__add-btn" onClick={handleAddTarget}>
                + Add Target
              </button>
            </div>

            <div className="app__targets-list">
              {targets.map((target, index) => (
                <TargetCard
                  key={target.id}
                  target={target}
                  origin={origin}
                  passcode={passcode}
                  index={index}
                  onUpdate={handleUpdateTarget}
                  onDelete={handleDeleteTarget}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={index === 0}
                  isLast={index === targets.length - 1}
                />
              ))}
            </div>
          </section>
        </main>

        <footer className="app__footer">
          <p>OSC Fire Control System • Orbital Strike Cannon</p>
        </footer>
      </div>
    </>
  );
}
