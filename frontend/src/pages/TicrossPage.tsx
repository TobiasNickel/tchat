import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuthState, logout } from '../state/authState';
import { Picross } from '../components/Picross';
import './TicrossPage.css';
import { Link } from '../utils/PageReactRouter';
import { loadGameState, saveGameState, type GameState, DEFAULT_GRID_SIZE, getSeedFromText, type Difficulty, getDifficultyConfig } from '../utils/gameStateStorage';
import { ticrossResultSdk } from '../sdk/ticrossResult.sdk';

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

interface CelebrationStats {
  gridWidth: number;
  gridHeight: number;
  difficulty: Difficulty;
  moves: number;
  startTime: number;
  endTime: number;
  totalTime: number;
}

function CelebrationScreen({ difficulty, stats, onContinue }: { difficulty: Difficulty; stats?: CelebrationStats; onContinue: () => void }) {
  const getGameDuration = () => {
    if (!stats?.startTime || !stats?.endTime) return null;
    const durationMs = stats.totalTime
    const seconds = Math.floor((durationMs / 1000) % 60);
    const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const duration = getGameDuration();

  return (
    <div className="celebration-overlay">
      <div className="celebration-content">
        <div className="celebration-header">
          🎉
        </div>
        <h2 className="celebration-title">{difficulty.toUpperCase()} Difficulty Complete!</h2>
        <p className="celebration-message">Fantastic work! You found a valid solution.</p>
        
        {stats && (
          <div className="celebration-stats">
            <div className="stats-row">
              <span className="stat-label">Grid Size:</span>
              <span className="stat-value">{stats.gridWidth}×{stats.gridHeight}</span>
            </div>
            <div className="stats-row">
              <span className="stat-label">Moves:</span>
              <span className="stat-value">{stats.moves}</span>
            </div>
            {duration && (
              <div className="stats-row">
                <span className="stat-label">Time:</span>
                <span className="stat-value">{duration}</span>
              </div>
            )}
          </div>
        )}
        
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
      completedRows: [],
      completedCols: [],
      moves: [],
    };
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStats, setCelebrationStats] = useState<CelebrationStats | undefined>();
  
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

  /**
   * Creates a fresh game state for new game parameters
   * This resets all progress and prepares for a new session
   */
  const createFreshGameState = useCallback((
    newSeedText: string,
    newGridWidth: number,
    newGridHeight: number,
    newDifficulty: Difficulty
  ): Partial<GameState> => {
    return {
      seedText: newSeedText,
      gridWidth: newGridWidth,
      gridHeight: newGridHeight,
      difficulty: newDifficulty,
      playerGrid: Array(newGridHeight).fill(null).map(() => Array(newGridWidth).fill(false)),
      knownEmptyGrid: Array(newGridHeight).fill(null).map(() => Array(newGridWidth).fill(false)),
      progress: 0,
      completedRows: [],
      completedCols: [],
      moves: [],
      // Important: Clear old session hash/timestamp - will be set by startGameSession
      sessionHash: undefined,
      sessionTimestamp: undefined,
    };
  }, []);

  const updateGameState = useCallback((newGameState: Partial<GameState>) => {
    setGameState(prev => {
      const updatedState = { ...prev, ...newGameState, timestamp: Date.now() };
      saveGameState(updatedState);
      return updatedState;
    });
  }, []);

  /**
   * Starts a new game session by requesting hash/timestamp from server
   * This should only be called AFTER the game state has been reset with fresh parameters
   * It atomically updates the hash and timestamp together
   */
  const startGameSession = useCallback(async (
    seedText: string,
    gridWidth: number,
    gridHeight: number,
    difficulty: Difficulty
  ) => {
    try {
      const result = await ticrossResultSdk.startGame({
        seed: seedText,
        grid_width: gridWidth,
        grid_height: gridHeight,
        difficulty: difficulty,
      });
      
      // Atomic update: verify params still match before updating hash/timestamp
      // This prevents stale updates from overwriting a new game state
      setGameState(prev => {
        if (prev.seedText === seedText && 
            prev.gridWidth === gridWidth && 
            prev.gridHeight === gridHeight && 
            prev.difficulty === difficulty) {
          const updatedState = {
            ...prev,
            sessionHash: result.hash,
            sessionTimestamp: result.timestamp,
            timestamp: Date.now(),
          };
          saveGameState(updatedState);
          return updatedState;
        }
        // If state has changed, ignore this stale result
        return prev;
      });
    } catch (error) {
      console.error('Failed to start game session:', error);
    }
  }, []);

  const handleLevelComplete = (gameState: GameState) => {
    // Calculate statistics from the current game state
    const moves = gameState.moves || [];
    const startTime = moves.length > 0 ? moves[0]!.t : Date.now();
    const endTime = moves.length > 0 ? moves[moves.length - 1]!.t : Date.now();

    // we go though the moves, and calc per move a maximum of 30 seconds. If the time between moves is larger, we cap it at 30s
    let totalTime = 0;
    for (let i = 1; i < moves.length; i++) {
      const timeDiff = moves[i]!.t - moves[i - 1]!.t;
      totalTime += Math.min(timeDiff, 30 * 1000);
    }

    setCelebrationStats({
      gridWidth: gameState.gridWidth,
      gridHeight: gameState.gridHeight,
      difficulty: gameState.difficulty,
      moves: moves.length,
      startTime,
      endTime,
      totalTime,
    });
    
    // Submit the game result to the server
    const submitGameResult = async () => {
      if (!gameState.sessionHash || gameState.sessionTimestamp === null || gameState.sessionTimestamp === undefined) {
        console.error('Game session not initialized');
        return;
      }

      try {
        await ticrossResultSdk.submitResult({
          seed: gameState.seedText,
          grid_width: gameState.gridWidth,
          grid_height: gameState.gridHeight,
          difficulty: gameState.difficulty,
          hash: gameState.sessionHash,
          timestamp: gameState.sessionTimestamp,
          total_time_seconds: Math.round(totalTime / 1000),
          moves: moves,
        });
        console.log('Game result submitted successfully');
      } catch (error) {
        console.error('Failed to submit game result:', error);
      }
    };

    submitGameResult();
    
    setShowCelebration(true);
  };

  const handleSeedChange = (newSeed: number, newSeedText?: string) => {
    const seedText = newSeedText || newSeed.toString(16).toUpperCase().padStart(8, '0');
    const freshState = createFreshGameState(seedText, gridWidth, gridHeight, difficulty);
    updateGameState(freshState);
    
    // Start a new game session for this seed with fresh parameters
    startGameSession(seedText, gridWidth, gridHeight, difficulty);
  };

  const handleContinue = () => {
    setShowCelebration(false);
    // Generate a new seed text for the next puzzle
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const newSeedText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    const freshState = createFreshGameState(newSeedText, gridWidth, gridHeight, difficulty);
    updateGameState(freshState);
    
    // Start a new game session for the next puzzle with fresh parameters
    startGameSession(newSeedText, gridWidth, gridHeight, difficulty);
  };

  const handleGridSizeChange = (width: number, height: number) => {
    const freshState = createFreshGameState(seedText, width, height, difficulty);
    updateGameState(freshState);
    
    // Start a new game session with new grid size and fresh parameters
    startGameSession(seedText, width, height, difficulty);
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    const freshState = createFreshGameState(seedText, gridWidth, gridHeight, newDifficulty);
    updateGameState(freshState);
    
    // Start a new game session with new difficulty and fresh parameters
    startGameSession(seedText, gridWidth, gridHeight, newDifficulty);
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
          stats={celebrationStats}
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