/**
 * Game State Storage Utility
 * Manages localStorage operations for game progress and state
 */

/**
 * Difficulty levels available in the game
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Configuration for each difficulty level
 * Maps how a grid size affects the game based on difficulty
 */
export interface DifficultyConfig {
  difficulty: Difficulty;
  fillPercentage: number; // Percentage of cells to fill (0-1)
  hints: number; // Number of hint cells to reveal
  timeLimit?: number; // Optional time limit in seconds
}

export interface GameState {
  seedText: string; // Original text or input that was used to generate the seed
  gridWidth: number;
  gridHeight: number;
  difficulty: Difficulty; // Replaced 'level' with 'difficulty'
  playerGrid: boolean[][];
  knownEmptyGrid: boolean[][];
  progress: number;
  timestamp: number;
  completedRows?: Set<number>; // Set of row indices that are completed
  completedCols?: Set<number>; // Set of column indices that are completed
}

const STORAGE_KEY = 'ticross_game_state';

/**
 * Difficulty configuration mapping
 * Maps difficulty level to game parameters
 * The grid size influences how the difficulty manifests:
 * - Small grids (5x5): Easier to visualize, fewer cells to consider
 * - Medium grids (10x15, 15x15): Balanced challenge
 * - Large grids (20x20, 30x30): More complex patterns, more cells to solve
 * 
 * For each difficulty, we define the fill percentage (density of filled cells)
 * This directly affects puzzle difficulty regardless of grid size
 */
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    difficulty: 'easy',
    fillPercentage: 0.7,
    hints: 5,
  },
  medium: {
    difficulty: 'medium',
    fillPercentage: 0.6,
    hints: 3,
  },
  hard: {
    difficulty: 'hard',
    fillPercentage: 0.45,
    hints: 0,
  },
};

/**
 * Get the difficulty configuration for a given difficulty level
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

/**
 * Save the current game state to localStorage
 */
export function saveGameState(state: GameState): void {
  try {
    // Convert Sets to arrays for JSON serialization
    const stateToSave = {
      ...state,
      completedRows: state.completedRows ? Array.from(state.completedRows) : undefined,
      completedCols: state.completedCols ? Array.from(state.completedCols) : undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Load the game state from localStorage
 */
export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    
    // Convert arrays back to Sets
    return {
      ...parsed,
      completedRows: parsed.completedRows ? new Set(parsed.completedRows) : undefined,
      completedCols: parsed.completedCols ? new Set(parsed.completedCols) : undefined,
    } as GameState;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Clear the stored game state
 */
export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

/**
 * Check if there is a saved game state available
 */
export function hasGameState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a deterministic seed from the difficulty
 * This is kept for backward compatibility and simple generation
 * The actual seed should come from seedText through getSeedFromText()
 */
export function generateSeedForDifficulty(difficulty: Difficulty): number {
  const difficultyMap: Record<Difficulty, number> = {
    easy: 12345,
    medium: 54321,
    hard: 99999,
  };
  return difficultyMap[difficulty];
}

/**
 * Available grid sizes for the game
 */
export const GRID_SIZES = [
  { width: 5, height: 5 },
  { width: 10, height: 10 },
  { width: 10, height: 15 },
  { width: 15, height: 15 },
  { width: 20, height: 20 },
  { width: 30, height: 30 },
] as const;

export const DEFAULT_GRID_SIZE = GRID_SIZES[3]; // 15x15

/**
 * Generate a random seed based on current timestamp rounded to 5 minutes
 * This ensures many players get the same seed for that 5-minute window
 */
export function generateRandomSeed(): number {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;
  return Math.floor(now / fiveMinutesMs);
}

/**
 * Convert a seed number to a displayable format (hex or readable format)
 */
export function formatSeed(seed: number): string {
  return seed.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Format seed for display - shows the seed text
 */
export function formatSeedForDisplay(seedText: string): string {
  return seedText;
}

/**
 * Derive a numeric seed from seed text
 * Handles hex, decimal, or arbitrary text strings
 * Case-sensitive for better differentiation
 */
export function getSeedFromText(seedText: string): number {
  if (!seedText) return 0;
  
  const trimmed = seedText.trim();
  
  // Try parsing as hex with 0x prefix (exact case check)
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    const parsed = parseInt(trimmed, 16);
    if (!isNaN(parsed)) return parsed;
  }
  
  // Try as hex without prefix (only if it looks like pure hex)
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length >= 2) {
    const parsed = parseInt(trimmed, 16);
    if (!isNaN(parsed)) return parsed;
  }
  
  // Try as decimal (only if it's all digits and reasonably sized)
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num <= 0xFFFFFFFF) {
      return num;
    }
  }
  
  // Otherwise hash the string - case-sensitive for better differentiation
  return hashStringSeed(trimmed);
}

/**
 * Hash a string to a deterministic numeric seed
 * Uses a robust hashing algorithm with better distribution
 * Case-sensitive: "Hello" and "hello" produce different seeds
 * Same string always produces same seed
 */
export function hashStringSeed(str: string): number {
  let hash = 2166136261; // FNV offset basis (32-bit)
  
  // Include case-sensitive character codes for better differentiation
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash ^= charCode;
    hash = (hash * 16777619) >>> 0; // FNV prime (32-bit)
    
    // Additional mixing for better distribution
    hash = (hash ^ (hash >>> 16)) >>> 0;
  }
  
  // Final mixing to improve distribution
  hash = (hash ^ (hash >>> 16)) >>> 0;
  hash = (hash * 0x7feb352d) >>> 0;
  hash = (hash ^ (hash >>> 15)) >>> 0;
  
  // Ensure it's a positive 32-bit integer
  return hash >>> 0;
}

/**
 * Parse a user-input seed string and return the numeric seed
 * Accepts hex format with 0x prefix or without, decimal, or any string to be hashed
 */
export function parseSeed(input: string): number | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Try parsing as hex (with or without 0x prefix)
    if (trimmed.toLowerCase().startsWith('0x')) {
      const parsed = parseInt(trimmed, 16);
      if (!isNaN(parsed)) return parsed;
    }
    // Try as hex without prefix
    if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 16);
      if (!isNaN(parsed)) return parsed;
    }
    // Try as decimal
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0) {
      return num;
    }
    
    // If not a number, hash the string
    return hashStringSeed(trimmed);
  } catch {
    // Fallback: hash the string if anything fails
    return hashStringSeed(input);
  }
}

/**
 * Check if a row in the player grid matches the solution grid
 * A row is considered completed when the player's filled cells match the solution exactly
 */
export function isRowComplete(
  rowIndex: number,
  playerGrid: boolean[][],
  solutionGrid: boolean[][]
): boolean {
  const playerRow = playerGrid[rowIndex];
  const solutionRow = solutionGrid[rowIndex];
  
  if (!playerRow || !solutionRow || playerRow.length !== solutionRow.length) {
    return false;
  }
  
  // Row is complete when the indicators match (not just individual cells)
  return calculateLineIndicator(playerRow) === calculateLineIndicator(solutionRow);
}
function calculateLineIndicator(line: boolean[]): string {
  const indicators: number[] = [];
  let currentGroup = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i]) {
      currentGroup++;
    } else if (currentGroup > 0) {
      indicators.push(currentGroup);
      currentGroup = 0;
    }
  }

  if (currentGroup > 0) {
    indicators.push(currentGroup);
  }

  return indicators.length > 0 ? indicators.join(' ') : '-';
}

/**
 * Check if a column in the player grid matches the solution grid
 * A column is considered completed when the player's filled cells match the solution exactly
 */
export function isColumnComplete(
  colIndex: number,
  playerGrid: boolean[][],
  solutionGrid: boolean[][]
): boolean {
  if (playerGrid.length === 0) {
    return false;
  }
  const col = []
  const solCol = []
  // Check all rows for this column
  for (let row = 0; row < playerGrid.length; row++) {
    col.push(playerGrid[row]![colIndex]!)
    solCol.push(solutionGrid[row]![colIndex]!)
  }
  
  return calculateLineIndicator(col)===calculateLineIndicator(solCol)
}

/**
 * Compute all completed rows and columns for the current player grid
 * Returns sets of row and column indices that are complete
 */
export function computeCompletedRowsAndCols(
  playerGrid: boolean[][],
  solutionGrid: boolean[][]
): { completedRows: Set<number>; completedCols: Set<number> } {
  const completedRows = new Set<number>();
  const completedCols = new Set<number>();
  
  // Check all rows
  for (let row = 0; row < playerGrid.length; row++) {
    if (isRowComplete(row, playerGrid, solutionGrid)) {
      completedRows.add(row);
    }
  }
  
  // Check all columns
  if (playerGrid.length > 0 && playerGrid[0]) {
    for (let col = 0; col < playerGrid[0].length; col++) {
      if (isColumnComplete(col, playerGrid, solutionGrid)) {
        completedCols.add(col);
      }
    }
  }
  
  return { completedRows, completedCols };
}

/**
 * Check if the game is won based on the completed rows and columns
 */
export function isGameWon(gameState: GameState): boolean {
  const { gridWidth, gridHeight, completedRows, completedCols } = gameState;

  if (!completedRows || !completedCols) {
    return false;
  }

  const allRowsCompleted = completedRows.size === gridHeight;
  const allColsCompleted = completedCols.size === gridWidth;

  return allRowsCompleted && allColsCompleted;
}
