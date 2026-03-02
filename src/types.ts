export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export interface TargetCell {
  id: string;
  name: string;
  target: Coordinates;
  nukeSize: number;
  stabDepth: number;
  fireMode: 'nuke' | 'stab';
  magazineSlot: number;
  isExpanded: boolean;
}

export interface CalculationResult {
  diff: {
    x: number;
    y: number;
    z: number;
  };
  dvPlus: {
    x: number;
    y: number;
    z: number;
  };
  dvMinus: {
    x: number;
    y: number;
    z: number;
  };
  count: {
    x: number;
    y: number;
    z: number;
  };
  coarse: {
    x: number;
    y: number;
    z: number;
  };
  fine: {
    x: number;
    y: number;
    z: number;
  };
  binaryGrid: number[][];
  /** Final position of payload on target */
  exactPos: Coordinates;
  /** Initial position of payload at launch */
  initialPosition: Coordinates;
  /** Exact motion (velocity × count) per axis */
  exactMotion: Coordinates;
  netherPos: Coordinates;
  timeEstimate: string; // formatted as hh:mm:ss (total)
  /** Time breakdown: total, payload building, acceleration */
  timeBreakdown: {
    total: string;
    payloadBuilding: string;
    acceleration: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface Preset {
  id: string;
  name: string;
  origin: Coordinates;
  passcode: number;
  targets: Omit<TargetCell, 'id' | 'isExpanded'>[];
  createdAt: number;
}

