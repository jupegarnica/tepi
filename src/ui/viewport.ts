// Terminal viewport info for displays that need physical dimensions
// (interactive scroll viewport). The term layer publishes the real values;
// tests and library consumers get the ink-compatible defaults.
let viewRows = 24;
let viewColumns = 80;

export function setViewport(rows: number, columns: number): void {
  viewRows = Math.max(1, Math.floor(rows));
  viewColumns = Math.max(1, Math.floor(columns));
}

export function getViewportRows(): number {
  return viewRows;
}

export function getViewportColumns(): number {
  return viewColumns;
}
