import type { Coordinates, CalculationResult, TargetCell, CannonOriginVariant, SfcTerminal } from '../types';

// Constants from Excel formulas
const DV_PLUS_X = 8.755553287151535;
const DV_PLUS_Y = 8.816216069168268;
const DV_PLUS_Z = 8.755553287151535;
const DV_MINUS_X = -8.664591055789826;
const DV_MINUS_Z = -8.664591055789826;
const DV_YX = -0.596968396919667;
const DY_MS = 3.51;
const DY_STAB = 106.92 + 44.4;
const DY_NUKE = 140;
const DX = 22.5000000095367;
const DZ = 0.9999999904633 - 1;
const DXZ_MS = 8.43750000953673;

const slowdownXZ = 0.900000035762786;
const slowdownY = 1.500000000000000;

/** Scale factor for OSC SFC orange/blue channels */
export const SFC_SCALE = 100 / 1233;
/** Max magnitude that fits in 15 bits */
export const SFC_MAX_MAGNITUDE = 32767;

/** Accel Start (payload building) ticks by payload size */
const SFC_PAYLOAD_BUILD_TICKS: Record<number, number> = {
  16: 667,
  64: 1074,
  256: 3026,
  1024: 10770,
};
/** Fixed ticks from Accel Stop → Cannon Fire */
const SFC_POST_ACCEL_TICKS = 74;

const EMPTY_BINARY_GRID: number[][] = Array(5)
  .fill(null)
  .map(() => Array(13).fill(0));

/**
 * Convert magnitude to 15 bits, MSB left (bit 14 … bit 0).
 */
export function to15BitsMsbLeft(value: number): number[] {
  const mag = Math.min(Math.abs(Math.trunc(value)), SFC_MAX_MAGNITUDE);
  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) {
    bits.push((mag >> i) & 1);
  }
  return bits;
}

/**
 * SFC time breakdown from measured stages:
 * Accel Start (payload build, hardcoded) → Accel Stop (+max|orange|,|blue|) → Cannon Fire (+74).
 */
function calculateSfcTimeBreakdown(
  payloadSize: number,
  orange: number,
  blue: number
): { total: string; payloadBuilding: string; acceleration: string } {
  const payloadTicks = SFC_PAYLOAD_BUILD_TICKS[payloadSize] ?? SFC_PAYLOAD_BUILD_TICKS[16];
  const accelerationTicks = Math.max(Math.abs(orange), Math.abs(blue));
  const totalTicks = payloadTicks + accelerationTicks + SFC_POST_ACCEL_TICKS;

  return {
    total: formatTimeSeconds(Math.ceil(totalTicks / 20)),
    payloadBuilding: formatTimeSeconds(Math.ceil(payloadTicks / 20)),
    acceleration: formatTimeSeconds(Math.ceil(accelerationTicks / 20)),
  };
}

/**
 * Recover dx/dz from rounded orange/blue (inverse of scale*(dx±dz)).
 * orange ≈ scale*(dx+dz), blue ≈ scale*(dx-dz) ⇒ dx = (o+b)/(2*scale), dz = (o-b)/(2*scale)
 */
function sfcInverseDelta(orange: number, blue: number): { dx: number; dz: number } {
  const inv = 1233 / 100;
  return {
    dx: ((orange + blue) * inv) / 2,
    dz: ((orange - blue) * inv) / 2,
  };
}

/**
 * OSC SFC: orange/blue from relative X/Z only.
 */
function calculateSfc(
  origin: Coordinates,
  target: TargetCell
): CalculationResult {
  const dx = target.target.x - origin.x;
  const dz = target.target.z - origin.z;
  const orange = Math.round(SFC_SCALE * (dx + dz));
  const blue = Math.round(SFC_SCALE * (dx - dz));

  const sfcTerminal: SfcTerminal = {
    orange,
    blue,
    orangeBits: to15BitsMsbLeft(orange),
    blueBits: to15BitsMsbLeft(blue),
  };

  const timeBreakdown = calculateSfcTimeBreakdown(target.nukeSize, orange, blue);

  const initialPosition = {
    x: origin.x,
    y: origin.y + 20.5,
    z: origin.z,
  };
  const recovered = sfcInverseDelta(orange, blue);
  const exactPos = {
    x: origin.x + recovered.dx,
    y: origin.y + 20.5,
    z: origin.z + recovered.dz,
  };

  const zero = { x: 0, y: 0, z: 0 };

  return {
    diff: { x: dx, y: target.target.y - origin.y, z: dz },
    dvPlus: zero,
    dvMinus: zero,
    count: { x: orange, y: 0, z: blue },
    coarse: zero,
    fine: zero,
    binaryGrid: EMPTY_BINARY_GRID,
    sfcTerminal,
    exactPos,
    initialPosition,
    exactMotion: { x: recovered.dx, y: 0, z: recovered.dz },
    netherPos: overworldToNether(origin),
    timeEstimate: timeBreakdown.total,
    timeBreakdown,
  };
}

/**
 * Main calculation function
 * @param cannonOrigin - When 'osc-ms', uses DXZ_MS for X/Z offset and subtracts DY_MS from DY.
 *   When 'osc-sfc', uses relative X/Z orange/blue binary terminal.
 */
export function calculate(
  origin: Coordinates,
  target: TargetCell,
  passcode: number,
  cannonOrigin: CannonOriginVariant = 'osc-mk6'
): CalculationResult {
  if (cannonOrigin === 'osc-sfc') {
    return calculateSfc(origin, target);
  }

  const useOscMs = cannonOrigin === 'osc-ms';

  // Step 1: Determine firing direction for X and Z
  const dvX = target.target.x > origin.x ? DV_PLUS_X : DV_MINUS_X;
  const dvZ = target.target.z > origin.z ? DV_PLUS_Z : DV_MINUS_Z;

  // Step 2: Define DY from fire mode; subtract DY_MS when OSC MS
  const baseDY = target.fireMode === 'nuke' ? DY_NUKE : DY_STAB;
  const DY = useOscMs ? baseDY - DY_MS : baseDY;

  // Calculate the inital position of Payload (use DXZ_MS for both X and Z when OSC MS)
  const dX = useOscMs ? DXZ_MS : DX;
  const dZ = useOscMs ? DXZ_MS : DZ;
  const iX = origin.x + dX + target.magazineSlot;
  const iY = origin.y + 2.1975;
  const iZ = origin.z + dZ;

  // Step 3: Calculate diffY, enforce >= 50
  let diffY = (DY + target.target.y) - iY;
  if (diffY < 50) diffY = 50;

  // Step 4: Calculate CountY
  const countY = diffY / (slowdownY * DV_PLUS_Y);

  // Step 5: Calculate coarseY and fineY
  const coarseY = Math.floor(countY);
  const fineY = Math.round((countY - coarseY) * 10);

  // Step 6: Calculate diffX
  const diffX = target.target.x - (iX + (coarseY + fineY / 10) * DV_YX);

  // Step 7: Calculate diffZ
  const diffZ = target.target.z - iZ;

  // Step 8: Calculate counts for X and Z
  const countX = diffX / (slowdownXZ*dvX);
  const countZ = diffZ / (slowdownXZ*dvZ);

  // Calculate coarse and fine for X and Z
  const coarseX = Math.floor(Math.abs(countX));
  const fineX = Math.round((Math.abs(countX) - coarseX) * 10);
  const coarseZ = Math.floor(Math.abs(countZ));
  const fineZ = Math.round((Math.abs(countZ) - coarseZ) * 10);

  // Calculate the exact motions in each axis
  const vX = dvX * (coarseX + fineX/10) + DV_YX * (coarseY + fineY/10);
  const vY = DV_PLUS_Y * (coarseY + fineY/10);
  const vZ = dvZ * (coarseZ + fineZ/10);

  // Calculate final position of payload
  const pX = iX + slowdownXZ * vX;
  const pY = iY + slowdownY * vY;
  const pZ = iZ + slowdownXZ * vZ;

  // Assemble coarse and fine objects
  const coarse = { x: coarseX, y: coarseY, z: coarseZ };
  const fine = { x: fineX, y: fineY, z: fineZ };
  const diff = { x: diffX, y: diffY, z: diffZ };

  // Payload size depends on fire mode
  // Nuke: payloadSize = nukeSize (bits extracted with divisors 8, 4, 2, 1)
  // Stab: payloadSize = CEILING(stabDepth/(9*0.99)) (bits extracted with divisors 16, 8, 4, 2, 1)
  const payloadSize = target.fireMode === 'nuke' 
    ? target.nukeSize
    : Math.ceil(target.stabDepth/(9*0.99));
    
  // Generate binary grid
  const binaryGrid = generateBinaryGrid(coarse, fine, passcode, diff, target.fireMode === 'nuke', payloadSize);

  const timeBreakdown = calculateTimeBreakdown(
    target.fireMode,
    target.nukeSize,
    target.stabDepth,
    coarseX,
    coarseY,
    coarseZ
  );

  return {
    diff,
    dvPlus: { x: DV_PLUS_X, y: DV_PLUS_Y, z: DV_PLUS_Z },
    dvMinus: { x: DV_MINUS_X, y: DV_PLUS_Y, z: DV_MINUS_Z },
    count: { x: countX, y: countY, z: countZ },
    coarse,
    fine,
    binaryGrid,
    exactPos: { x: pX, y: pY, z: pZ },
    initialPosition: { x: iX, y: iY, z: iZ },
    exactMotion: { x: vX, y: vY, z: vZ },
    netherPos: overworldToNether(origin),
    timeEstimate: timeBreakdown.total,
    timeBreakdown,
  };
}

/**
 * Extract a bit from a number
 * Equivalent to Excel: MOD(FLOOR(value/divisor,1),2)
 */
function extractBit(value: number, divisor: number): number {
  return Math.floor(Math.abs(value) / divisor) % 2;
}

/**
 * Extract inverted bit (1 - bit)
 */
function extractInvertedBit(value: number, divisor: number): number {
  return 1 - extractBit(value, divisor);
}

/**
 * Generate the 5x13 binary grid for the LED display
 */
function generateBinaryGrid(
  coarse: { x: number; y: number; z: number },
  fine: { x: number; y: number; z: number },
  passcode: number,
  diff: { x: number; y: number; z: number },
  isNuke: boolean,
  payloadSize: number
): number[][] {
  const row0 = [
    extractBit(coarse.z, 1),
    extractBit(coarse.z, 32),
    extractBit(coarse.z, 1024),
    extractInvertedBit(fine.z, 8),
    extractInvertedBit(fine.y, 8),
    extractBit(coarse.y, 8),
    extractInvertedBit(fine.x, 8),
    extractBit(coarse.x, 8192),
    extractBit(coarse.x, 256),
    extractBit(coarse.x, 8),
    extractBit(payloadSize, 2),
    extractBit(passcode, 512),
    extractBit(passcode, 16),
  ];

  const row1 = [
    extractBit(coarse.z, 2),
    extractBit(coarse.z, 64),
    extractBit(coarse.z, 2048),
    extractInvertedBit(fine.z, 4),
    extractInvertedBit(fine.y, 4),
    extractBit(coarse.y, 4),
    extractInvertedBit(fine.x, 4),
    extractBit(coarse.x, 4096),
    extractBit(coarse.x, 128),
    extractBit(coarse.x, 4),
    extractBit(payloadSize, 4),
    extractBit(passcode, 256),
    extractBit(passcode, 8),
  ];

  const row2 = [
    extractBit(coarse.z, 4),
    extractBit(coarse.z, 128),
    extractBit(coarse.z, 4096),
    extractInvertedBit(fine.z, 2),
    extractInvertedBit(fine.y, 2),
    extractBit(coarse.y, 2),
    extractInvertedBit(fine.x, 2),
    extractBit(coarse.x, 2048),
    extractBit(coarse.x, 64),
    extractBit(coarse.x, 2),
    extractBit(payloadSize, 8),
    extractBit(passcode, 128),
    extractBit(passcode, 4),
  ];

  const row3 = [
    extractBit(coarse.z, 8),
    extractBit(coarse.z, 256),
    extractBit(coarse.z, 8192),
    extractInvertedBit(fine.z, 1),
    extractInvertedBit(fine.y, 1),
    extractBit(coarse.y, 1),
    extractInvertedBit(fine.x, 1),
    extractBit(coarse.x, 1024),
    extractBit(coarse.x, 32),
    extractBit(coarse.x, 1),
    extractBit(payloadSize, 16),
    extractBit(passcode, 64),
    extractBit(passcode, 2),
  ];

  const row4 = [
    extractBit(coarse.z, 16),
    extractBit(coarse.z, 512),
    extractBit(coarse.z, 16384),
    diff.z < 0 ? 1 : 0,     // sign bit for Z
    extractBit(coarse.y, 16),
    diff.x < 0 ? 1 : 0,     // sign bit for X
    extractBit(coarse.x, 16384),
    extractBit(coarse.x, 512),
    extractBit(coarse.x, 16),
    extractBit(payloadSize, 1),
    isNuke ? 1 : 0,         // nuke flag
    extractBit(passcode, 32),
    extractBit(passcode, 1),
  ];

  return [row0, row1, row2, row3, row4];
}

/**
 * Calculate Nether coordinates from Overworld
 */
export function overworldToNether(coords: Coordinates): Coordinates {
  return {
    x: Math.floor(coords.x / 8),
    y: coords.y,
    z: Math.floor(coords.z / 8),
  };
}

function formatTimeSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Calculate time estimate breakdown (total, payload building, acceleration).
 * Based on Excel: payload ticks + acceleration ticks, 20 ticks/sec.
 */
function calculateTimeBreakdown(
  fireMode: 'nuke' | 'stab',
  nukeSize: number,
  stabDepth: number,
  coarseX: number,
  coarseY: number,
  coarseZ: number
): { total: string; payloadBuilding: string; acceleration: string } {
  let payloadTicks: number;
  const accelerationTicks = 6 * (Math.max(coarseX, coarseZ) + coarseY + 2);
  if (fireMode === 'nuke') {
    payloadTicks = 6 * ((nukeSize * (nukeSize + 1)) / 2 + nukeSize * 2.4375) + 930;
  } else {
    payloadTicks = 6 * (2 * Math.round(stabDepth / (9 * 0.99))) + 1300;
  }

  const payloadSeconds = Math.ceil(payloadTicks / 20);
  const accelerationSeconds = Math.ceil(accelerationTicks / 20);
  const totalSeconds = Math.ceil((payloadTicks + accelerationTicks) / 20);

  return {
    total: formatTimeSeconds(totalSeconds),
    payloadBuilding: formatTimeSeconds(payloadSeconds),
    acceleration: formatTimeSeconds(accelerationSeconds),
  };
}

/**
 * Calculate Overworld coordinates from Nether
 */
export function netherToOverworld(coords: Coordinates): Coordinates {
  return {
    x: coords.x * 8,
    y: coords.y,
    z: coords.z * 8,
  };
}
