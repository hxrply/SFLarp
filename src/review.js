// Game review maths: winning chances, per-move accuracy and move labels.
// Winning chances and accuracy follow lichess's published formulas; the label thresholds follow
// chess.com's "expected points" bands (a drop of 0.05 = 5 percentage points of winning chances, etc.).

/** Engine score for the side to move -> centipawns from White's side (mates become +/-10000). */
export function whiteCp(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  if (score.mate !== undefined) return sign * (score.mate > 0 ? 10000 : -10000);
  return sign * score.cp;
}

/** White's winning chances in percent (0-100) for a centipawn score from White's side. */
export function winPercent(cpWhite) {
  const cp = Math.max(-1000, Math.min(1000, cpWhite));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Accuracy (0-100) of one move that dropped the mover's winning chances by `drop` points. */
export function moveAccuracy(drop) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));
}

/** One side's game accuracy: average of the plain and the harmonic mean, so single blunders still count. */
export function sideAccuracy(accs) {
  if (!accs.length) return null;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(1, b), 0);
  return (mean + harmonic) / 2;
}

export const LABELS = {
  book: { name: 'Book', mark: '📖', color: '#c9a36a' },
  great: { name: 'Great', mark: '!', color: '#5aa9e6' },
  best: { name: 'Best', mark: '★', color: '#5ac98f' },
  excellent: { name: 'Excellent', mark: '👍', color: '#8fd19e' },
  good: { name: 'Good', mark: '✓', color: '#a7c4a0' },
  inaccuracy: { name: 'Inaccuracy', mark: '?!', color: '#f2c94c' },
  mistake: { name: 'Mistake', mark: '?', color: '#f0a23b' },
  blunder: { name: 'Blunder', mark: '??', color: '#ff5c5c' },
};
export const LABEL_ORDER = ['great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];

/**
 * Label one move.
 * drop: how many points of winning chances the move cost the mover.
 * isBest: the move is the engine's first choice. onlyMove: the best move was much better than the next one.
 * inBook: the move is in one of the opening books.
 */
export function classify({ drop, isBest, onlyMove = false, inBook = false }) {
  if (inBook && drop < 5) return 'book';
  if (isBest) return onlyMove ? 'great' : 'best';
  if (drop < 2) return 'excellent';
  if (drop < 5) return 'good';
  if (drop < 10) return 'inaccuracy';
  if (drop < 20) return 'mistake';
  return 'blunder';
}
