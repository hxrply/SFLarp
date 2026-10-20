// Board-editor helpers: turn a hand-built 64-square grid (index 0 = a8) into a validated game.
import { Chess } from '../vendor/chess.js';

export function fenFromBoard(grid, turn) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = grid[r * 8 + f];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p.c === 'w' ? p.t.toUpperCase() : p.t;
    }
    rows.push(row + (empty || ''));
  }
  const at = (i, t, c) => grid[i] && grid[i].t === t && grid[i].c === c;
  let rights = '';
  if (at(60, 'k', 'w')) { if (at(63, 'r', 'w')) rights += 'K'; if (at(56, 'r', 'w')) rights += 'Q'; }
  if (at(4, 'k', 'b')) { if (at(7, 'r', 'b')) rights += 'k'; if (at(0, 'r', 'b')) rights += 'q'; }
  return `${rows.join('/')} ${turn} ${rights || '-'} - 0 1`;
}

/** Returns {chess} for a legal setup, or {error} explaining what is wrong. */
export function loadFromEditor(grid, turn) {
  const kings = { w: 0, b: 0 };
  let badPawn = false;
  grid.forEach((p, i) => {
    if (!p) return;
    if (p.t === 'k') kings[p.c]++;
    if (p.t === 'p' && (i < 8 || i >= 56)) badPawn = true;
  });
  if (kings.w !== 1 || kings.b !== 1) return { error: 'Each side needs exactly one king.' };
  if (badPawn) return { error: 'Pawns cannot stand on the first or last rank.' };
  const fen = fenFromBoard(grid, turn);
  let chess;
  try { chess = new Chess(fen); } catch (e) { return { error: `That position is not valid (${e.message}).` }; }
  // the side that is NOT to move must not be in check
  const parts = fen.split(' ');
  parts[1] = turn === 'w' ? 'b' : 'w';
  try {
    if (new Chess(parts.join(' ')).inCheck()) {
      const waiting = turn === 'w' ? 'Black' : 'White';
      return { error: `${waiting}'s king is in check, but it is the other side's turn. Change the side to move or move a piece.` };
    }
  } catch { /* an unloadable flipped position is caught by the checks above */ }
  return { chess };
}
