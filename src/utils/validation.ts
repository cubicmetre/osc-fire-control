import type { Coordinates, TargetCell, ValidationResult, CannonOriginVariant } from '../types';
import { isValidPasscode } from '../data/validPasscodes';
import { calculate } from './calculations';

/**
 * Parse an integer from a string input, handling negative numbers properly.
 * Returns defaultValue for empty strings or invalid inputs.
 * Note: When typing "-", this will return defaultValue, which may clear the input.
 * This is expected behavior for controlled number inputs.
 */
/**
 * Parse an integer from a string input, handling negative numbers properly.
 * Returns defaultValue for empty strings or invalid inputs.
 * When the value is just "-", we preserve it by returning a sentinel value
 * that the caller can handle specially, or we can return 0 and let the input
 * handle the intermediate state.
 */
export function parseInteger(value: string, defaultValue: number = 0): number {
  // Handle empty string
  if (value === '') {
    return defaultValue;
  }
  
  // Handle just "-" - this is a valid intermediate state when typing negative numbers
  // We'll return 0 here, but the input should use onInput to capture this before validation
  if (value === '-') {
    return -defaultValue;
  }
  
  // Parse the integer
  const parsed = parseInt(value, 10);
  
  // If parsing failed, return defaultValue
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  return parsed;
}

/**
 * Validate a target cell using the same calculations as the main calculate function
 */
export function validateTarget(
  origin: Coordinates,
  target: TargetCell,
  passcode: number,
  cannonOrigin: CannonOriginVariant = 'osc-mk6'
): ValidationResult {
  const errors: string[] = [];

  // Check origin alignment to 16
  if (origin.x % 16 !== 0) {
    errors.push(`Origin X (${origin.x}) must be divisible by 16`);
  }
  if (origin.y % 16 !== 0) {
    errors.push(`Origin Y (${origin.y}) must be divisible by 16`);
  }
  if (origin.z % 16 !== 0) {
    errors.push(`Origin Z (${origin.z}) must be divisible by 16`);
  }

  // Fire mode-specific validation
  if (target.fireMode === 'nuke') {
    if (target.nukeSize < 1) {
      errors.push(`Nuke Size (${target.nukeSize}) must be at least 1`);
    }
    if (target.nukeSize > 31) {
      errors.push(`Nuke Size (${target.nukeSize}) must be 31 or less`);
    }
  } else {
    if (target.stabDepth < 1) {
      errors.push(`Stab Depth (${target.stabDepth}) must be at least 1`);
    }
    const stabCheck = Math.ceil(target.stabDepth / (9 * 0.99));
    if (stabCheck > 31) {
      errors.push(`Stab Depth (${target.stabDepth}) is too large (max ~275)`);
    }
  }

  // Check distance (must be at least 64 in XZ plane)
  const dx = target.target.x - origin.x;
  const dz = target.target.z - origin.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 64) {
    errors.push(`Distance (${distance.toFixed(1)}) must be at least 64 blocks`);
  }

  // Check passcode validity
  if (!isValidPasscode(passcode)) {
    errors.push(`Passcode (${passcode}) is not in the valid passcode list`);
  }

  // Use the same calculations as the main calculate function
  const result = calculate(origin, target, passcode, cannonOrigin);

  // Check count overflows using calculated values
  if (Math.abs(result.count.x) >= 32767.999) {
    errors.push(`X distance is too large (count overflow)`);
  }
  if (Math.abs(result.count.z) >= 32767.999) {
    errors.push(`Z distance is too large (count overflow)`);
  }
  if (Math.abs(result.count.y) >= 31.999) {
    errors.push(`Y distance is too large (count overflow)`);
  }

  // Check if both X and Z counts are too small
  if (Math.abs(result.count.x) < 1 && Math.abs(result.count.z) < 1) {
    errors.push(`Target is too close (both X and Z counts < 1)`);
  }

  // Check diffY >= 50 (already enforced in calculate, but warn if it was clamped)
  if (result.diff.y < 50) {
    errors.push(`Y difference is less than minimum (50)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Quick validation check - returns true if valid
 */
export function isValidTarget(origin: Coordinates, target: TargetCell, passcode: number): boolean {
  return validateTarget(origin, target, passcode).isValid;
}

