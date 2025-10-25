export function PicrossField(params: {
  grid: boolean[][];
  onCellClick: (row: number, col: number) => void;
}) {
  return (
    <div className="picross-field">
      {params.grid.map((row, rowIndex) => (
        <div key={rowIndex} className="picross-row">
          {row.map((cell, colIndex) => (
            <div
              key={colIndex}
              className={`picross-cell ${cell ? "filled" : ""}`}
              onClick={() => params.onCellClick(rowIndex, colIndex)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
