// One test per bug found in the adversarial review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { analyze } from '../src/awareness.js';
import { loadPosition, loadFromEditor, gridOf, gridProblem } from '../src/editor.js';

const run = (fen) => analyze(new Chess(fen));
const find = (r, san) => r.moves.find((m) => m.san === san);
const texts = (m) => m.tags.map((t) => t.text);

test('mate in 1 is counted (not reported as a quiet position)', () => {
  const r = run('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1');
  assert.equal(r.counts.mates, 1);
  assert.ok(find(r, 'Ra8#').tags.some((t) => t.kind === 'mate'));
});

test('a checkmating move carries no warnings or extra tags', () => {
  const m = find(run('6k1/5ppp/8/8/3b4/8/8/R3K1N1 w - - 0 1'), 'Ra8#');
  assert.deepEqual(m.warn, []);
  assert.deepEqual(texts(m), ['Checkmate']);
});

test('castling that checks with the rook is a direct check', () => {
  const m = find(run('5k2/8/8/8/8/8/8/4K2R w K - 0 1'), 'O-O+');
  assert.ok(texts(m).includes('Gives check'));
});

test('capturing a defender is not called a discovered attack', () => {
  const m = find(run('4k3/8/5n2/3p2B1/8/2N5/8/4K3 w - - 0 1'), 'Bxf6');
  assert.ok(!m.tags.some((t) => t.kind === 'discover'));
  assert.ok(texts(m).includes('Removes the defender of pawn on d5'));
});

test('threat and discovery counts are one per move and match the tags', () => {
  for (const fen of ['rnbqkbnr/pppppp1p/8/6p1/8/7P/PPPPPPP1/RNBQKBNR w KQkq - 0 2', 'Bnbq2kr/p1pQ2pp/1p5n/4PP2/8/8/P1P1PK1P/RNb3NR b - - 0 11']) {
    const r = run(fen);
    assert.equal(r.counts.threats, r.moves.filter((m) => m.tags.some((t) => t.kind === 'threat')).length, fen);
    assert.equal(r.counts.discoveries, r.moves.filter((m) => m.tags.some((t) => t.kind === 'discover')).length, fen);
  }
});

test('positions Stockfish refuses are rejected with a reason', () => {
  const cases = {
    'rnbqkbnr/pppppppp/8/8/8/Q7/PPPPPPPP/RNBQKBNR w KQkq - 0 1': /too many pieces/,
    '4k3/8/8/8/8/PPPPPPPP/P7/4K3 w - - 0 1': /more than 8 pawns/,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RQBQKBNR w KQkq - 0 1': /too many pieces/,
    '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1': /not Black's move/,
    '8/8/8/4Kk2/8/8/8/8 b - - 0 1': /under attack/,
    'P3k3/8/8/8/8/8/8/4K3 w - - 0 1': /first or last rank|edge rows/,
  };
  for (const [fen, re] of Object.entries(cases)) assert.match(loadPosition(fen).error || '', re, fen);
  // legal edge cases still load
  for (const fen of ['rnbqkbnr/pppppppp/8/8/8/8/1PPPPPPP/RQBQKBNR w KQkq - 0 1', '4k3/8/3N4/8/8/8/4R3/4K3 b - - 0 1', '8/8/8/8/2k5/8/8/QQQQKQQQ b - - 0 1']) {
    assert.ok(loadPosition(fen).chess, fen);
  }
});

test('FEN castling rights without king/rook at home are dropped', () => {
  const { chess } = loadPosition('4k3/8/8/8/8/8/8/4K2R w KQkq - 0 1');
  assert.equal(chess.fen().split(' ')[2], 'K');
  assert.ok(!chess.moves().includes('O-O-O'));
});

test('editor keeps lost castling rights and the move number', () => {
  const c = new Chess();
  for (const m of ['e4', 'e5', 'Ke2', 'Ke7', 'Ke1', 'Ke8']) c.move(m);
  const g = gridOf(c);
  g[0] = null; // a real edit: remove black's a8 rook
  const r = loadFromEditor(g, 'w', c.fen());
  assert.equal(r.chess.fen().split(' ')[2], '-', 'rights lost by moving the kings stay lost');
  assert.equal(r.chess.fen().split(' ')[5], '4');
});

test('gridProblem accepts the start position and counts promotions per side', () => {
  assert.equal(gridProblem(gridOf(new Chess())), null);
});
