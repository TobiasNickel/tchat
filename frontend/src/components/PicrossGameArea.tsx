import { memo, useRef, useEffect, useCallback } from 'react';
import type { GameState } from '../utils/gameStateStorage';
import './Picross.css';

export interface PicrossGameAreaProps extends Omit<GameState, 'seedText' | 'difficulty' | 'progress' | 'timestamp'> {
  /** The solution grid (what the puzzle should look like) */
  solutionGrid: boolean[][];
  /** Called when a cell is clicked */
  onCellClick?: (row: number, col: number) => void;
  /** Called when a cell is right-clicked */
  onCellRightClick?: (row: number, col: number) => void;
  /** Called when mouse enters a cell */
  onCellHover?: (row: number, col: number) => void;
  /** Called when mouse leaves all cells */
  onCellLeave?: () => void;
  /** Currently hovered cell, if any */
  hoveredCell?: { row: number; col: number } | null;
  /** Whether to show indicator highlighting (useful for replays) */
  showIndicatorHighlight?: boolean;
}

/**
 * High-performance grid using vanilla JS with selective DOM updates
 * Only cells that changed are re-rendered, NOT the entire grid
 */
export const PicrossGameArea = memo(PicrossGameAreaComponent, (prevProps, nextProps) => {
  // Skip re-render if only hoveredCell changed (CSS :hover handles this)
  return (
    prevProps.solutionGrid === nextProps.solutionGrid &&
    prevProps.playerGrid === nextProps.playerGrid &&
    prevProps.knownEmptyGrid === nextProps.knownEmptyGrid &&
    prevProps.gridWidth === nextProps.gridWidth &&
    prevProps.gridHeight === nextProps.gridHeight &&
    prevProps.showIndicatorHighlight === nextProps.showIndicatorHighlight &&
    prevProps.completedRows === nextProps.completedRows &&
    prevProps.completedCols === nextProps.completedCols &&
    prevProps.onCellClick === nextProps.onCellClick &&
    prevProps.onCellRightClick === nextProps.onCellRightClick &&
    prevProps.onCellHover === nextProps.onCellHover &&
    prevProps.onCellLeave === nextProps.onCellLeave
    // NOTE: hoveredCell is skipped - only CSS :hover is used, no React updates
  );
});

function PicrossGameAreaComponent({
  solutionGrid,
  playerGrid,
  knownEmptyGrid,
  gridWidth,
  gridHeight,
  onCellClick,
  onCellRightClick,
  onCellHover,
  onCellLeave,
  completedRows,
  completedCols,
}: PicrossGameAreaProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const cellRefsRef = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const prevGridRef = useRef<{ player: (boolean | undefined)[][]; knownEmpty: (boolean | undefined)[][] }>({
    player: [],
    knownEmpty: [],
  });
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoverRef = useRef<{ row: number; col: number } | null>(null);

  // On mount and grid size change, create table structure
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    // Create or update style element for hover highlighting
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      document.head.appendChild(styleRef.current);
    }

    // Clear table
    while (table.firstChild) {
      table.removeChild(table.firstChild);
    }
    cellRefsRef.current.clear();

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('td');
    cornerCell.className = 'indicator-corner';
    headerRow.appendChild(cornerCell);

    for (let colIndex = 0; colIndex < gridWidth; colIndex++) {
      const indicatorCell = document.createElement('td');
      indicatorCell.className = `column-indicator-header col-${colIndex}`;
      indicatorCell.dataset.col = colIndex.toString();

      const colNumbers = document.createElement('div');
      colNumbers.className = 'col-numbers';

      const indicators = generateColIndicators(colIndex, solutionGrid);
      for (const num of indicators) {
        const numDiv = document.createElement('div');
        numDiv.className = 'indicator-number';
        numDiv.textContent = num.toString();
        colNumbers.appendChild(numDiv);
      }

      indicatorCell.appendChild(colNumbers);
      headerRow.appendChild(indicatorCell);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');

    for (let rowIndex = 0; rowIndex < gridHeight; rowIndex++) {
      const row = document.createElement('tr');

      // Row indicator
      const rowIndicatorCell = document.createElement('td');
      rowIndicatorCell.className = `row-indicator-header row-${rowIndex}`;
      rowIndicatorCell.dataset.row = rowIndex.toString();

      const rowNumbers = document.createElement('div');
      rowNumbers.className = 'row-numbers';

      const indicators = generateRowIndicators(rowIndex, solutionGrid);
      for (const num of indicators) {
        const numSpan = document.createElement('span');
        numSpan.className = 'indicator-number';
        numSpan.textContent = num.toString();
        rowNumbers.appendChild(numSpan);
      }

      rowIndicatorCell.appendChild(rowNumbers);
      row.appendChild(rowIndicatorCell);

      // Grid cells
      for (let colIndex = 0; colIndex < gridWidth; colIndex++) {
        const cell = document.createElement('td');
        cell.className = `picross-cell row-${rowIndex} col-${colIndex}`;
        cell.dataset.row = rowIndex.toString();
        cell.dataset.col = colIndex.toString();

        const key = `${rowIndex}-${colIndex}`;
        cellRefsRef.current.set(key, cell);

        // Event listeners
        cell.addEventListener('click', () => onCellClick?.(rowIndex, colIndex));
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          onCellRightClick?.(rowIndex, colIndex);
        });
        cell.addEventListener('mouseenter', () => {
          onCellHover?.(rowIndex, colIndex);
          updateHoverHighlight(rowIndex, colIndex);
        });

        row.appendChild(cell);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);

    // Initialize prev grid to empty so all cells are considered "changed" on first render
    prevGridRef.current = {
      player: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(undefined)),
      knownEmpty: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(undefined)),
    };

    // Update cell visuals - all cells will be considered changed since prev is undefined
    updateChangedCells(playerGrid, knownEmptyGrid);
  }, [gridWidth, gridHeight, solutionGrid]);

  // When grid data changes, only update changed cells
  useEffect(() => {
    updateChangedCells(playerGrid, knownEmptyGrid);
    prevGridRef.current = {
      player: playerGrid.map(r => [...r]),
      knownEmpty: knownEmptyGrid.map(r => [...r]),
    };
  }, [playerGrid, knownEmptyGrid]);

  // Update indicator styling when completion state changes
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    // Update row indicators
    const rowIndicators = table.querySelectorAll('.row-indicator-header');
    rowIndicators.forEach((indicator) => {
      const element = indicator as HTMLTableCellElement;
      const rowIndex = parseInt(element.dataset.row || '-1', 10);
      if (rowIndex >= 0) {
        if (completedRows?.has(rowIndex)) {
          element.classList.add('matching');
        } else {
          element.classList.remove('matching');
        }
      }
    });

    // Update column indicators
    const colIndicators = table.querySelectorAll('.column-indicator-header');
    colIndicators.forEach((indicator) => {
      const element = indicator as HTMLTableCellElement;
      const colIndex = parseInt(element.dataset.col || '-1', 10);
      if (colIndex >= 0) {
        if (completedCols?.has(colIndex)) {
          element.classList.add('matching');
        } else {
          element.classList.remove('matching');
        }
      }
    });
  }, [completedRows, completedCols]);

  const updateChangedCells = (newPlayer: boolean[][], newKnownEmpty: boolean[][]) => {
    const prev = prevGridRef.current;

    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const prevPlayer = prev.player[row]?.[col];
        const prevKnownEmpty = prev.knownEmpty[row]?.[col];
        const newPlayerVal = newPlayer[row]?.[col] ?? false;
        const newKnownEmptyVal = newKnownEmpty[row]?.[col] ?? false;

        // Consider changed if: prev was undefined (first init) OR value actually changed
        const playerChanged = prevPlayer === undefined || prevPlayer !== newPlayerVal;
        const knownEmptyChanged = prevKnownEmpty === undefined || prevKnownEmpty !== newKnownEmptyVal;

        if (playerChanged || knownEmptyChanged) {
          const key = `${row}-${col}`;
          const cell = cellRefsRef.current.get(key);
          if (cell) {
            updateCellClass(cell, newPlayerVal, newKnownEmptyVal);
          }
        }
      }
    }
  };

  const updateCellClass = (cell: HTMLTableCellElement, filled: boolean, knownEmpty: boolean) => {
    // Preserve row and column classes
    const row = cell.dataset.row;
    const col = cell.dataset.col;
    cell.className = `picross-cell row-${row} col-${col}`;
    if (filled) {
      cell.classList.add('filled');
    }
    if (knownEmpty) {
      cell.classList.add('known-empty');
    }
  };

  const handleMouseLeave = useCallback(() => {
    onCellLeave?.();
    clearHoverHighlight();
    lastHoverRef.current = null;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, [onCellLeave]);

  const updateHoverHighlight = useCallback((rowIndex: number, colIndex: number) => {
    // Check if we're already highlighting this cell
    if (lastHoverRef.current?.row === rowIndex && lastHoverRef.current?.col === colIndex) {
      return;
    }

      
    lastHoverRef.current = { row: rowIndex, col: colIndex };
    styleRef.current && (styleRef.current.textContent = `
      .row-${rowIndex} { box-shadow: inset 0 0 0 2px rgba(255, 235, 59, 0.9) !important; }
      .col-${colIndex} { box-shadow: inset 0 0 0 2px rgba(255, 235, 59, 0.9) !important; }
    `);
  }, []);

  const clearHoverHighlight = useCallback(() => {
    if (!styleRef.current) return;
    styleRef.current.textContent = '';
  }, []);

  return (
    <div className="game-container" style={{ userSelect: 'none' }} onMouseLeave={handleMouseLeave} onContextMenu={(e) => e.preventDefault()}>
      <div className="picross-board-wrapper">
        <table className="picross-board" ref={tableRef} />
      </div>
    </div>
  );
}

/**
 * Generate row indicators from solution grid
 */
function generateRowIndicators(rowIndex: number, solutionGrid: boolean[][]): number[] {
  const row = solutionGrid[rowIndex];
  if (!row) return [0];

  const indicators: number[] = [];
  let currentGroup = 0;

  for (let i = 0; i < row.length; i++) {
    if (row[i]) {
      currentGroup++;
    } else if (currentGroup > 0) {
      indicators.push(currentGroup);
      currentGroup = 0;
    }
  }

  if (currentGroup > 0) {
    indicators.push(currentGroup);
  }

  return indicators.length > 0 ? indicators : [0];
}

/**
 * Generate column indicators from solution grid
 */
function generateColIndicators(colIndex: number, solutionGrid: boolean[][]): number[] {
  const indicators: number[] = [];
  let currentGroup = 0;

  for (let i = 0; i < solutionGrid.length; i++) {
    if (solutionGrid[i]?.[colIndex]) {
      currentGroup++;
    } else if (currentGroup > 0) {
      indicators.push(currentGroup);
      currentGroup = 0;
    }
  }

  if (currentGroup > 0) {
    indicators.push(currentGroup);
  }

  return indicators.length > 0 ? indicators : [0];
}
