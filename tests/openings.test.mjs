import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.js';
import { OPENINGS, buildBook, planStatus, fittingOpenings, noteFor, openingById } from '../src/openings.js';

const play = (moves, c = new Chess()) => { for (const m of moves.split(' ')) c.move(m); return c; };

test('every book line is legal and every one of "your" moves has a note', () => {
  for (const op of OPENINGS) {
    assert.doesNotThrow(() => buildBook(op), op.id);
    for (const line of op.lines) {
      const c = new Chess();
      for (const san of line.split(' ')) {
        const m = c.move(san);
        if (m.color === op.side) assert.ok(noteFor(op, m.san), `${op.id}: no note for ${m.san}`);
      }
    }
  }
});

test('ids are unique and each opening has a side, summary and plan', () => {
  assert.equal(new Set(OPENINGS.map((o) => o.id)).size, OPENINGS.length);
  for (const o of OPENINGS) {
    assert.ok(['w', 'b'].includes(o.side) && o.summary && o.plan.length, o.id);
    if (o.side === 'b') assert.ok(['e4', 'd4'].includes(o.answers), `${o.id} says which first move it answers`);
  }
});

test("Queen's Gambit is White's; Black has Declined and Accepted", () => {
  assert.equal(openingById('queens-gambit').side, 'w');
  assert.equal(openingById('qgd').side, 'b');
  assert.equal(openingById('qga').side, 'b');
});

test('plan status: your move, their move, leaving the book, completion', () => {
  const qg = openingById('queens-gambit');
  assert.deepEqual(planStatus(new Chess(), qg).next.map((m) => m.san), ['d4']);
  assert.equal(planStatus(play('d4'), qg).state, 'their-move');
  const mine = planStatus(play('d4 d5 c4 dxc4 e4'), qg);
  assert.equal(mine.state, 'off-book');
  assert.deepEqual([mine.deviation.byYou, mine.deviation.san, mine.deviation.expected], [true, 'e4', ['Nf3']]);
  const theirs = planStatus(play('d4 d5 c4 h5'), qg);
  assert.equal(theirs.deviation.byYou, false);
  assert.equal(planStatus(play('e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#'), openingById('scholars-mate')).state, 'complete');
  assert.equal(planStatus(new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), qg).state, 'not-from-start');
});

test('positions are matched regardless of move order (transpositions)', () => {
  const s = planStatus(play('d4 Nf6 c4 e6 Nf3 d5'), openingById('queens-gambit'));
  assert.equal(s.state, 'your-move');
});

test('after 1.d4 the Caro-Kann suggests the d4 defences instead', () => {
  const fits = fittingOpenings(play('d4'), 'b', 'caro-kann').map((o) => o.id).sort();
  assert.deepEqual(fits, ['kings-indian', 'qga', 'qgd']);
});
