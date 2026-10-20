// Position helpers for the board editor and the FEN box: build FENs from a hand-made 64-square grid
// (index 0 = a8) and reject setups that cannot occur in a real game (Stockfish refuses those).
import { Chess } from '../vendor/chess.js';

export const gridOf = (chess) => chess.board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));

/** Castling rights that the piece placement still allows (king and rook on their home squares). */
export function placementRights(grid) {
  const at = (i, t, c) => grid[i] && grid[i].t === t && grid[i].c === c;
  let rights = '';
  if (at(60, 'k', 'w')) { if (at(63, 'r', 'w')) rights += 'K'; if (at(56, 'r', 'w')) rights += 'Q'; }
  if (at(4, 'k', 'b')) { if (at(7, 'r', 'b')) rights += 'k'; if (at(0, 'r', 'b')) rights += 'q'; }
  return rights;
}

/** FEN for a grid. Castling rights are `allowed` filtered down to what the placement permits. */
export function fenFromBoard(grid, turn, { allowed = 'KQkq', ep = '-', half = 0, full = 1 } = {}) {
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
  const rights = placementRights(grid).split('').filter((c) => allowed.includes(c)).join('');
  return `${rows.join('/')} ${turn} ${rights || '-'} ${ep} ${half} ${full}`;
}

/** Piece-count checks for one grid. Returns an error message or null. */
export function gridProblem(grid) {
  const n = { w: {}, b: {} };
  let badPawn = false;
  grid.forEach((p, i) => {
    if (!p) return;
    n[p.c][p.t] = (n[p.c][p.t] || 0) + 1;
    if (p.t === 'p' && (i < 8 || i >= 56)) badPawn = true;
  });
  if (n.w.k !== 1 || n.b.k !== 1) return 'Each side needs exactly one king.';
  if (badPawn) return 'Pawns cannot stand on the first or last rank.';
  for (const c of ['w', 'b']) {
    const side = c === 'w' ? 'White' : 'Black';
    const pawns = n[c].p || 0;
    if (pawns > 8) return `${side} has more than 8 pawns.`;
    // every piece beyond the starting set must have come from a promoted pawn
    const extra = Math.max(0, (n[c].q || 0) - 1) + Math.max(0, (n[c].r || 0) - 2) + Math.max(0, (n[c].b || 0) - 2) + Math.max(0, (n[c].n || 0) - 2);
    if (extra > 8 - pawns) return `${side} has too many pieces: each extra queen, rook, bishop or knight needs a missing pawn (it would have to be a promotion).`;
  }
  return null;
}

/**
 * Load a FEN as a real-game position. Castling rights the placement does not support are dropped.
 * Returns {chess} or {error}.
 */
export function loadPosition(fen) {
  let chess;
  try { chess = new Chess(fen.trim()); } catch (e) { return { error: `That FEN is not valid (${e.message}).` }; }
  const grid = gridOf(chess);
  const problem = gridProblem(grid);
  if (problem) return { error: problem };
  const [, turn, rights, ep, half, full] = chess.fen().split(' ');
  const fixed = fenFromBoard(grid, turn, { allowed: rights, ep, half, full });
  try { chess = new Chess(fixed); } catch (e) { return { error: `That position is not valid (${e.message}).` }; }
  // the side that is NOT to move must not be in check (this also rules out touching kings)
  const flipped = fixed.split(' ');
  flipped[1] = turn === 'w' ? 'b' : 'w';
  flipped[3] = '-';
  let waitingInCheck = false;
  try { waitingInCheck = new Chess(flipped.join(' ')).inCheck(); } catch { waitingInCheck = true; }
  if (waitingInCheck) {
    const waiting = turn === 'w' ? 'Black' : 'White';
    return { error: `${waiting}'s king is under attack but it is not ${waiting}'s move, which can't happen in a real game. Move a piece or change the side to move.` };
  }
  return { chess };
}

/**
 * Validate an edited grid. `base` is the FEN the edit started from: its castling rights are kept
 * where the placement still allows them, and its move number is kept.
 */
export function loadFromEditor(grid, turn, base) {
  const problem = gridProblem(grid);
  if (problem) return { error: problem };
  const [, , rights = 'KQkq', , , full = '1'] = (base || '').split(' ');
  return loadPosition(fenFromBoard(grid, turn, { allowed: base ? rights : 'KQkq', full }));
}
