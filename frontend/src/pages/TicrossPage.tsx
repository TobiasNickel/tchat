import { useState, useMemo, useCallback } from 'react';
import { useAuthState, logout } from '../state/authState';
import { Picross } from '../components/Picross';
import './TicrossPage.css';
import { Link } from '../utils/PageReactRouter';
import { loadGameState, saveGameState, type GameState, DEFAULT_GRID_SIZE, getSeedFromText, type Difficulty, getDifficultyConfig } from '../utils/gameStateStorage';

// Seeded pseudo-random number generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate a pseudo-random grid based on seed and difficulty
function generateGridForSeed(seed: number, width: number = 20, height: number = 20, fillPercentage: number = 0.35): boolean[][] {
  const grid: boolean[][] = [];
  
  for (let row = 0; row < height; row++) {
    const gridRow: boolean[] = [];
    for (let col = 0; col < width; col++) {
      // Create a deterministic seed from the provided seed, row, and column
      const cellSeed = seed + row * 31 + col * 17;
      const random = seededRandom(cellSeed);
      // Use the difficulty-based threshold to determine fill
      gridRow.push(random < fillPercentage);
    }
    grid.push(gridRow);
  }
  
  return grid;
}

function CelebrationScreen({ difficulty, onContinue }: { difficulty: Difficulty; onContinue: () => void }) {
  return (
    <div className="celebration-overlay">
      <div className="celebration-content">
        <div className="celebration-header">
          🎉
        </div>
        <h2 className="celebration-title">{difficulty.toUpperCase()} Difficulty Complete!</h2>
        <p className="celebration-message">Fantastic work! You found a valid solution.</p>
        <button className="celebration-btn" onClick={onContinue}>
          Next Puzzle →
        </button>
      </div>
    </div>
  );
}

export function TicrossPage() {
  const authState = useAuthState();
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedState = loadGameState();
    return savedState || {
      difficulty: 'medium',
      seedText: 'default-seed',
      gridWidth: DEFAULT_GRID_SIZE.width,
      gridHeight: DEFAULT_GRID_SIZE.height,
      playerGrid: [],
      knownEmptyGrid: [],
      progress: 0,
      timestamp: Date.now(),
      completedRows: new Set(),
      completedCols: new Set(),
    };
  });
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { difficulty, seedText, gridWidth, gridHeight } = gameState;

  // Derive numeric seed from seed text
  const currentSeed = useMemo(() => getSeedFromText(seedText), [seedText]);
  
  // Get the fill percentage based on difficulty
  const fillPercentage = useMemo(() => getDifficultyConfig(difficulty).fillPercentage, [difficulty]);
  
  // Generate grid based on the current seed, dimensions, and difficulty
  const grid = useMemo(() => generateGridForSeed(currentSeed, gridWidth, gridHeight, fillPercentage), [currentSeed, gridWidth, gridHeight, fillPercentage]);

  const handleLogout = () => {
    logout();
  };

  const handleLevelComplete = () => {
    setShowCelebration(true);
  };

  const updateGameState = useCallback((newGameState: Partial<GameState>) => {
    setGameState(prev => {
      const updatedState = { ...prev, ...newGameState, timestamp: Date.now() };
      saveGameState(updatedState);
      return updatedState;
    });
  }, []);

  const handleSeedChange = (newSeed: number, newSeedText?: string) => {
    const seedText = newSeedText || newSeed.toString(16).toUpperCase().padStart(8, '0');
    updateGameState({
      seedText,
      playerGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      knownEmptyGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      progress: 0,
      completedRows: new Set(),
      completedCols: new Set(),
    });
  };

  const handleContinue = () => {
    setShowCelebration(false);
    // Generate a new seed text for the next puzzle
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const newSeedText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    updateGameState({
      seedText: newSeedText,
      playerGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      knownEmptyGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      progress: 0,
      completedRows: new Set(),
      completedCols: new Set(),
    });
  };

  const handleGridSizeChange = (width: number, height: number) => {
    updateGameState({
      gridWidth: width,
      gridHeight: height,
      playerGrid: Array(height).fill(null).map(() => Array(width).fill(false)),
      knownEmptyGrid: Array(height).fill(null).map(() => Array(width).fill(false)),
      progress: 0,
      completedRows: new Set(),
      completedCols: new Set(),
    });
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    updateGameState({
      difficulty: newDifficulty,
      playerGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      knownEmptyGrid: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false)),
      progress: 0,
      completedRows: new Set(),
      completedCols: new Set(),
    });
  };

  return (
    <div className="ticross-page">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Ticross</h1>
          <div className="header-actions">
            {authState.user ? <>
              <span className="user-info">
                {authState.user?.name || authState.user?.email}
              </span>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </> : <Link to="/auth/login"><button className="login-btn">Login</button></Link>}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <Picross 
          key={`${difficulty}-${seedText}-${gridWidth}x${gridHeight}`}
          difficulty={difficulty}
          seedText={seedText}
          gridWidth={gridWidth}
          gridHeight={gridHeight}
          grid={grid}
          onLevelComplete={handleLevelComplete}
          onSeedChange={handleSeedChange}
          onGridSizeChange={handleGridSizeChange}
          onDifficultyChange={handleDifficultyChange}
        />
      </main>

      {/* Celebration Screen */}
      {showCelebration && (
        <CelebrationScreen 
          difficulty={difficulty} 
          onContinue={handleContinue} 
        />
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <button className="footer-btn">
            🏠 Home
          </button>
          <button className="footer-btn">
            🎯 Levels
          </button>
          <button className="footer-btn">
            📊 Stats
          </button>
          <button className="footer-btn">
            ⚙️ Settings
          </button>
        </div>
      </footer>
    </div>
  );
}