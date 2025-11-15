import { useState, useEffect, useCallback } from 'react';
import './Picross.css';
import { PicrossGameArea } from './PicrossGameArea';
import { saveGameState, loadGameState, type GameState, generateRandomSeed, formatSeedForDisplay, parseSeed, GRID_SIZES, type Difficulty, computeCompletedRowsAndCols, isGameWon } from '../utils/gameStateStorage';

export interface PicrossProps {
  difficulty: Difficulty;
  grid: boolean[][];
  gridWidth: number;
  gridHeight: number;
  seedText: string;
  onLevelComplete?: () => void;
  onSeedChange?: (newSeed: number, newSeedText?: string) => void;
  onGridSizeChange?: (width: number, height: number) => void;
  onDifficultyChange?: (difficulty: Difficulty) => void;
}

export function Picross({ difficulty, grid: solutionGrid, gridWidth, gridHeight, seedText, onLevelComplete, onSeedChange, onGridSizeChange, onDifficultyChange }: PicrossProps) {
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedState = loadGameState();
    if (savedState && savedState.difficulty === difficulty && savedState.seedText === seedText) {
      return {
        ...savedState,
        completedRows: savedState.completedRows ? new Set(savedState.completedRows) : new Set(),
        completedCols: savedState.completedCols ? new Set(savedState.completedCols) : new Set(),
      };
    }
    return {
      seedText,
      gridWidth,
      gridHeight,
      difficulty,
      playerGrid: Array(solutionGrid.length).fill(null).map(() => Array(solutionGrid[0]!.length).fill(false)),
      knownEmptyGrid: Array(solutionGrid.length).fill(null).map(() => Array(solutionGrid[0]!.length).fill(false)),
      progress: 0,
      timestamp: Date.now(),
      completedRows: new Set(),
      completedCols: new Set(),
    };
  });

  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const [seedInput, setSeedInput] = useState('');
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [showGridSizeOptions, setShowGridSizeOptions] = useState(false);

  const handleGridSizeChange = (width: number, height: number) => {
    onGridSizeChange?.(width, height);
    setShowGridSizeOptions(false);
  };

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    saveGameState(gameState);
  }, [gameState]);

  const handleRandomSeed = () => {
    const newSeed = generateRandomSeed();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const seedText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    onSeedChange?.(newSeed, seedText);
    setShowSeedInput(false);
    return;
    // onSeedChange?.(newSeed);
    // setShowSeedInput(false);
  };

  const handleSeedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseSeed(seedInput);
    if (parsed !== null) {
      // Pass the original text along with the numeric seed
      onSeedChange?.(parsed, seedInput.trim());
      setSeedInput('');
      setShowSeedInput(false);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    setGameState(prevGameState => {
      const newGrid = [...prevGameState.playerGrid];
      let newKnownEmptyGrid = prevGameState.knownEmptyGrid;
      if (newGrid[row]) {
        newGrid[row] = [...newGrid[row]];
        newGrid[row][col] = !newGrid[row][col];
        // If setting to filled, remove from known empty
        if (newGrid[row][col]) {
          newKnownEmptyGrid = [...prevGameState.knownEmptyGrid];
          if (newKnownEmptyGrid[row]) {
            newKnownEmptyGrid[row] = [...newKnownEmptyGrid[row]];
            newKnownEmptyGrid[row][col] = false;
          }
        }
      }
      
      // Compute completed rows and columns at click time
      const { completedRows: newCompletedRows, completedCols: newCompletedCols } = computeCompletedRowsAndCols(newGrid, solutionGrid);
      
      const filledCells = newGrid.flat().filter(cell => cell).length;
      const progress = Math.min(filledCells * 2, 100);

      return {
        ...prevGameState,
        playerGrid: newGrid,
        knownEmptyGrid: newKnownEmptyGrid,
        completedRows: newCompletedRows,
        completedCols: newCompletedCols,
        progress,
        timestamp: Date.now(),
      };
    });
  };

  const handleCellRightClick = (row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    setGameState(prevGameState => {
      const newKnownEmptyGrid = [...prevGameState.knownEmptyGrid];
      let newPlayerGrid = prevGameState.playerGrid;
      if (newKnownEmptyGrid[row]) {
        newKnownEmptyGrid[row] = [...newKnownEmptyGrid[row]];
        newKnownEmptyGrid[row][col] = !newKnownEmptyGrid[row][col];
        // If setting to known empty, remove from filled
        if (newKnownEmptyGrid[row][col]) {
          newPlayerGrid = [...prevGameState.playerGrid];
          if (newPlayerGrid[row]) {
            newPlayerGrid[row] = [...newPlayerGrid[row]];
            newPlayerGrid[row][col] = false;
          }
        }
      }
      
      // Re-compute completed rows and columns
      const { completedRows: newCompletedRows, completedCols: newCompletedCols } = computeCompletedRowsAndCols(newPlayerGrid, solutionGrid);

      return {
        ...prevGameState,
        playerGrid: newPlayerGrid,
        knownEmptyGrid: newKnownEmptyGrid,
        completedRows: newCompletedRows,
        completedCols: newCompletedCols,
        timestamp: Date.now(),
      };
    });
  };

  const handleReset = () => {
    setGameState(prev => ({
      ...prev,
      playerGrid: Array(solutionGrid.length).fill(null).map(() => Array(solutionGrid[0]!.length||0).fill(false)),
      knownEmptyGrid: Array(solutionGrid.length).fill(null).map(() => Array(solutionGrid[0]!.length||0).fill(false)),
      progress: 0,
      completedRows: new Set(),
      completedCols: new Set(),
      timestamp: Date.now(),
    }));
  };

  // Hover state management - these callbacks are stable to prevent unnecessary renders
  const handleCellHover = useCallback((row: number, col: number) => {
    setHoveredCell(prev => {
      // Only update if actually changed to prevent render thrashing
      if (prev?.row === row && prev?.col === col) return prev;
      return { row, col };
    });
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredCell(prev => prev === null ? null : null);
  }, []);

  const handleCellRightClickWrapper = useCallback((row: number, col: number) => {
    // Create a synthetic event for the handler
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    handleCellRightClick(row, col, event as any);
  }, []);

  const handleCheck = () => {
    if (isGameWon(gameState)) {
      onLevelComplete?.();
    } else {
      // Optionally, provide feedback to the user that the puzzle is not yet solved
      alert('Not quite there yet! Keep trying.');
    }
  };

  return (
    <div className="picross-game">
      {/* Game Info Bar */}
      <div className="game-info">
        <div className="game-stats">
          <span className="progress">{gameState.progress}/100</span>
          <div className="seed-display">
            <span className="seed-label">Seed:</span>
            <span className="seed-value" onClick={() => setShowSeedInput(!showSeedInput)}>
              {formatSeedForDisplay(seedText)}
            </span>
          </div>
          <div className="difficulty-display">
            <span className="difficulty-label">Difficulty:</span>
            <span className="difficulty-value" onClick={() => setShowDifficultySelector(!showDifficultySelector)}>
              {difficulty.toUpperCase()}
            </span>
          </div>
          <div className="grid-size-display">
            <span className="grid-size-label">Grid:</span>
            <span className="grid-size-value" onClick={() => setShowGridSizeOptions(!showGridSizeOptions)}>
              {gridWidth}×{gridHeight}
            </span>
          </div>
        </div>
        
        {/* Controls Row */}
        <div className="game-controls-wrapper">
          {showSeedInput && (
            <div className="seed-controls">
              <form onSubmit={handleSeedSubmit} className="seed-input-form">
                <input
                  type="text"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder="Seed text or number"
                  className="seed-input"
                  autoFocus
                />
                <button type="submit" className="seed-submit-btn">Go</button>
              </form>
              <button className="seed-random-btn" onClick={handleRandomSeed}>
                🎲 Random 5min
              </button>
              <button className="seed-close-btn" onClick={() => setShowSeedInput(false)}>
                ✕
              </button>
            </div>
          )}

          {showDifficultySelector && (
            <div className="difficulty-selector">
              <div className="difficulty-options-title">Select Difficulty:</div>
              <div className="difficulty-buttons-container">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    className={`difficulty-btn ${difficulty === diff ? 'active' : ''}`}
                    onClick={() => {
                      onDifficultyChange?.(diff);
                      setShowDifficultySelector(false);
                    }}
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </button>
                ))}
              </div>
              <button className="difficulty-close-btn" onClick={() => setShowDifficultySelector(false)}>
                ✕ Close
              </button>
            </div>
          )}

          {showGridSizeOptions && (
            <div className="grid-size-options">
              <div className="grid-options-title">Select Grid Size:</div>
              <div className="grid-buttons-container">
                {GRID_SIZES.map((size) => (
                  <button
                    key={`${size.width}x${size.height}`}
                    className={`grid-size-btn ${gridWidth === size.width && gridHeight === size.height ? 'active' : ''}`}
                    onClick={() => handleGridSizeChange(size.width, size.height)}
                  >
                    {size.width}×{size.height}
                  </button>
                ))}
              </div>
              <button className="grid-close-btn" onClick={() => setShowGridSizeOptions(false)}>
                ✕ Close
              </button>
            </div>
          )}
        </div>
        
        <div className="game-controls">
          <button className="control-btn" onClick={handleReset}>
            Reset
          </button>
          <button className="control-btn primary" onClick={handleCheck}>
            Check
          </button>
        </div>
      </div>

      {/* Game Area with Integrated Indicators */}
      <PicrossGameArea
        solutionGrid={solutionGrid}
        playerGrid={gameState.playerGrid}
        knownEmptyGrid={gameState.knownEmptyGrid}
        gridWidth={gridWidth}
        gridHeight={gridHeight}
        onCellClick={handleCellClick}
        onCellRightClick={handleCellRightClickWrapper}
        onCellHover={handleCellHover}
        onCellLeave={handleCellLeave}
        hoveredCell={hoveredCell}
        showIndicatorHighlight={true}
        completedRows={gameState.completedRows}
        completedCols={gameState.completedCols}
      />
    </div>
  );
}
