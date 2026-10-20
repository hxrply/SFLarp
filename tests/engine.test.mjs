import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInfo, fmtScore, scoreValue, pvToSan } from '../src/engine.js';
import { fenFromBoard, loadFromEditor } from '../src/editor.js';
import { Chess } from '../vendor/chess.js';

const grid = (fen) => new Chess(fen).board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

test('parseInfo reads depth, multipv, score and pv', () => {
  const i = parseInfo('info depth 8 seldepth 12 multipv 2 score cp 25 nodes 14269 nps 1 time 122 pv d2d4 g8f6 c2c4');
  assert.deepEqual([i.depth, i.multipv, i.score, i.pv], [8, 2, { cp: 25 }, ['d2d4', 'g8f6', 'c2c4']]);
});
test('parseInfo ignores bounds, strings and lines without pv', () => {
  assert.equal(parseInfo('info depth 5 multipv 1 score cp 10 lowerbound pv e2e4'), null);
  assert.equal(parseInfo('info string NNUE evaluation using nn.nnue'), null);
  assert.equal(parseInfo('info depth 3 currmove e2e4 currmovenumber 1'), null);
  assert.equal(parseInfo('bestmove e2e4'), null);
});
test('scores are shown from White\'s side', () => {
  assert.equal(fmtScore({ cp: 34 }, 'w'), '+0.34');
  assert.equal(fmtScore({ cp: 34 }, 'b'), '-0.34');
  assert.equal(fmtScore({ cp: 0 }, 'w'), '0.00');
  assert.equal(fmtScore({ mate: 3 }, 'w'), '#3');
  assert.equal(fmtScore({ mate: 3 }, 'b'), '#-3');
  assert.ok(scoreValue({ mate: 2 }, 'w') > scoreValue({ cp: 900 }, 'w'));
});
test('pvToSan converts and stops at an illegal move', () => {
  assert.deepEqual(pvToSan(START, ['e2e4', 'e7e5', 'g1f3']), ['e4', 'e5', 'Nf3']);
  assert.deepEqual(pvToSan(START, ['e2e4', 'e2e4', 'g1f3']), ['e4']);
  assert.deepEqual(pvToSan('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', ['a7a8q']), ['a8=Q+']);
});
test('fenFromBoard round-trips the start position and infers castling', () => {
  assert.equal(fenFromBoard(grid(START), 'w'), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const g = grid(START); g[63] = null; // white loses the h1 rook
  assert.match(fenFromBoard(g, 'b'), / b Qkq - 0 1$/);
});
test('loadFromEditor accepts legal setups and rejects illegal ones', () => {
  assert.ok(loadFromEditor(grid(START), 'w').chess);
  const noKing = grid(START); noKing[60] = null;
  assert.match(loadFromEditor(noKing, 'w').error, /exactly one king/);
  const pawn = grid('4k3/8/8/8/8/8/8/4K3 w - - 0 1'); pawn[1] = { t: 'p', c: 'w' };
  assert.match(loadFromEditor(pawn, 'w').error, /first or last rank/);
  // white rook gives check to black king, but it is "white to move"
  const bad = grid('4k3/8/8/8/8/8/8/4K3 w - - 0 1'); bad[4 * 8 + 4] = { t: 'r', c: 'w' }; // rook e4 attacks king e8
  assert.match(loadFromEditor(bad, 'w').error, /in check/);
  assert.ok(loadFromEditor(bad, 'b').chess, 'it is fine when it is Black to move (black is in check)');
});
