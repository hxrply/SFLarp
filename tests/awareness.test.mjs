import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { analyze } from '../src/awareness.js';

const run = (fen) => analyze(new Chess(fen));
const find = (r, san) => r.moves.find((m) => m.san === san);

test('start position: 20 moves, nothing hanging, no tactics', () => {
  const r = run('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.equal(r.moves.length, 20);
  assert.equal(r.position.yourPiecesAttacked.length, 0);
  assert.equal(r.counts.checks + r.counts.captures + r.counts.forks, 0);
});

test('detects a mate threat and flags moves that allow it', () => {
  const r = run('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
  assert.equal(r.position.theyThreatenMate, true);
  assert.ok(find(r, 'a6').warn.includes('Allows checkmate in 1'));
  assert.ok(!find(r, 'Nf6').warn.includes('Allows checkmate in 1'));
  assert.ok(find(r, 'Nd4').tags.some((t) => t.kind === 'fork'));
});


test('capture verdicts', () => {
  const r = run('4k3/8/3p4/4p3/8/5N2/8/4K3 w - - 0 1');
  assert.ok(find(r, 'Nxe5').net < 0, 'knight takes defended pawn loses material');
});

test('moves are never sorted by quality (piece order, then square)', () => {
  const r = run('rnb1kbnr/pppp1ppp/8/4p3/3Pq3/5N2/PPP1PPPP/RNBQKB1R w KQkq - 0 1');
  const order = 'kqrbnp';
  for (let i = 1; i < r.moves.length; i++) {
    assert.ok(order.indexOf(r.moves[i - 1].piece) <= order.indexOf(r.moves[i].piece));
  }
});

test('checkmate/game-over', () => {
  const r = run('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  assert.equal(r.gameOver, 'checkmate');
});
