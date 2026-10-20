// Awareness engine: describes a position and every legal move WITHOUT ranking
// them or naming a "best" move. All analysis is shallow and explainable.
import { Chess } from '../vendor/chess.js';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const LETTER = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
const KNIGHT_JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CENTRE_SQS = new Set(['d4', 'e4', 'd5', 'e5']);

export const sqName = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
const sqIdx = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
const other = (c) => (c === 'w' ? 'b' : 'w');
const label = (p, i) => `${LETTER[p.t]}${sqName(i)}`;
const pieceText = (p, i) => `${NAME[p.t]} on ${sqName(i)}`;

/** chess.js board() -> flat 64-array (index 0 = a8) of {t, c} | null. */
export function parse(chess) {
  return chess.board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));
}

function onBoard(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

/** Pieces of `color` that attack square idx (ignores pins and x-rays). */
export function attackersOf(b, idx, color) {
  const out = [];
  const r = Math.floor(idx / 8), f = idx % 8;
  const at = (rr, ff, types) => {
    if (!onBoard(rr, ff)) return false;
    const p = b[rr * 8 + ff];
    return p && p.c === color && types.includes(p.t);
  };
  // pawns: a white pawn attacks toward row-1, so it sits on row+1
  const pr = color === 'w' ? r + 1 : r - 1;
  for (const df of [-1, 1]) if (at(pr, f + df, ['p'])) out.push({ i: pr * 8 + f + df, t: 'p' });
  for (const [dr, df] of KNIGHT_JUMPS) if (at(r + dr, f + df, ['n'])) out.push({ i: (r + dr) * 8 + f + df, t: 'n' });
  for (const [dr, df] of KING_STEPS) if (at(r + dr, f + df, ['k'])) out.push({ i: (r + dr) * 8 + f + df, t: 'k' });
  const slide = (dirs, types) => {
    for (const [dr, df] of dirs) {
      let rr = r + dr, ff = f + df;
      while (onBoard(rr, ff)) {
        const p = b[rr * 8 + ff];
        if (p) {
          if (p.c === color && types.includes(p.t)) out.push({ i: rr * 8 + ff, t: p.t });
          break;
        }
        rr += dr; ff += df;
      }
    }
  };
  slide(DIAG, ['b', 'q']);
  slide(ORTH, ['r', 'q']);
  return out;
}

/** Material the side `by` nets by capturing on idx and then trading off (swap-off). */
function swap(target, att, def) {
  if (!att.length) return 0;
  return Math.max(0, target - swap(att[0], def, att.slice(1)));
}
export function exchangeGain(b, idx, by) {
  const target = b[idx];
  if (!target || target.c === by) return 0;
  const att = attackersOf(b, idx, by).map((a) => VAL[a.t]).sort((x, y) => x - y);
  const def = attackersOf(b, idx, target.c).map((a) => VAL[a.t]).sort((x, y) => x - y);
  return swap(VAL[target.t], att, def);
}

/** Non-king pieces of `color` that the opponent can win material on. */
export function hanging(b, color) {
  const out = new Map();
  b.forEach((p, i) => {
    if (!p || p.c !== color || p.t === 'k') return;
    const g = exchangeGain(b, i, other(color));
    if (g > 0) out.set(i, g);
  });
  return out;
}

/** Undefended, non-pawn pieces ("loose pieces drop off"). */
function loose(b, color) {
  const out = [];
  b.forEach((p, i) => {
    if (!p || p.c !== color || p.t === 'k' || p.t === 'p') return;
    if (!attackersOf(b, i, color).length) out.push(i);
  });
  return out;
}

/** Absolute pins: pieces of `color` that cannot leave the line to their king. */
function pins(b, color) {
  const k = b.findIndex((p) => p && p.c === color && p.t === 'k');
  if (k < 0) return [];
  const out = [];
  const r = Math.floor(k / 8), f = k % 8;
  for (const [dirs, types] of [[DIAG, ['b', 'q']], [ORTH, ['r', 'q']]]) {
    for (const [dr, df] of dirs) {
      let rr = r + dr, ff = f + df, mid = null;
      while (onBoard(rr, ff)) {
        const i = rr * 8 + ff, p = b[i];
        if (p) {
          if (!mid) { if (p.c !== color) break; mid = i; }
          else {
            if (p.c !== color && types.includes(p.t)) out.push({ piece: mid, by: i });
            break;
          }
        }
        rr += dr; ff += df;
      }
    }
  }
  return out;
}

function material(b) {
  let w = 0, bl = 0;
  for (const p of b) if (p && p.t !== 'k') (p.c === 'w' ? (w += VAL[p.t]) : (bl += VAL[p.t]));
  return { w, b: bl, diff: w - bl };
}

function flipTurn(chess) {
  const f = chess.fen().split(' ');
  f[1] = other(f[1]); f[3] = '-';
  try { return new Chess(f.join(' ')); } catch { return null; }
}

/** Describe the position (not the moves). */
function describePosition(chess, b) {
  const me = chess.turn(), opp = other(me);
  const hangMine = hanging(b, me), hangTheirs = hanging(b, opp);
  const sq = (m) => [...m].map(([i, loss]) => ({ sq: sqName(i), piece: NAME[b[i].t], loss }));
  const mineAbs = pins(b, me).map((x) => ({ sq: sqName(x.piece), piece: NAME[b[x.piece].t], by: sqName(x.by) }));
  const theirAbs = pins(b, opp).map((x) => ({ sq: sqName(x.piece), piece: NAME[b[x.piece].t], by: sqName(x.by) }));
  const mat = material(b);

  let theyThreatenMate = false, theirChecks = 0;
  if (!chess.inCheck()) {
    const flipped = flipTurn(chess);
    if (flipped) {
      const ms = flipped.moves();
      theyThreatenMate = ms.some((m) => m.endsWith('#'));
      theirChecks = ms.filter((m) => m.endsWith('+') || m.endsWith('#')).length;
    }
  }

  const fenParts = chess.fen().split(' ');
  const home = me === 'w' ? 7 : 0;
  const undeveloped = [];
  b.forEach((p, i) => {
    if (p && p.c === me && (p.t === 'n' || p.t === 'b') && Math.floor(i / 8) === home) undeveloped.push(label(p, i));
  });
  const rights = fenParts[2].split('').filter((c) => (me === 'w' ? c === c.toUpperCase() : c === c.toLowerCase()) && c !== '-');

  return {
    turn: me,
    inCheck: chess.inCheck(),
    material: { you: me === 'w' ? mat.w : mat.b, them: me === 'w' ? mat.b : mat.w, diff: me === 'w' ? mat.diff : -mat.diff },
    yourPiecesAttacked: sq(hangMine),
    theirPiecesAttackable: sq(hangTheirs),
    yourLoose: loose(b, me).map((i) => pieceText(b[i], i)),
    theirLoose: loose(b, opp).map((i) => pieceText(b[i], i)),
    yourPins: mineAbs,
    theirPins: theirAbs,
    theyThreatenMate,
    theirChecks,
    opening: Number(fenParts[5]) <= 15 ? { undeveloped, castlingRights: rights.length } : null,
  };
}

/** Per-move tags. Kinds: capture check mate threat fork discover develop castle center promo | warn */
function describeMove(chess, m, b0, ctx) {
  const me = m.color, opp = other(me);
  const from = sqIdx(m.from), to = sqIdx(m.to);
  const tags = [];
  const add = (kind, text) => tags.push({ kind, text });

  chess.move(m.san);
  const b1 = parse(chess);
  const mate = chess.isCheckmate(), check = chess.inCheck();
  const stalemate = chess.isStalemate();
  const allowsMate = !mate && !stalemate && chess.moves().some((s) => s.endsWith('#'));
  chess.undo();

  const hang1 = hanging(b1, me);
  const tgt1 = hanging(b1, opp);
  const oppKing = b1.findIndex((p) => p && p.c === opp && p.t === 'k');

  // --- facts ---
  let net = null;
  if (m.captured) {
    const recapture = exchangeGain(b1, to, opp);
    net = VAL[m.captured] - recapture;
    add('capture', `Takes ${NAME[m.captured]}${m.flags.includes('e') ? ' (en passant)' : ''}`);
    ctx.counts.captures++;
  }
  if (m.promotion) { add('promo', `Promotes to ${NAME[m.promotion]}`); ctx.counts.promotions++; }
  if (m.flags.includes('k') || m.flags.includes('q')) { add('castle', m.flags.includes('k') ? 'Castles kingside' : 'Castles queenside'); ctx.counts.castles++; }
  if (mate) add('mate', 'Checkmate');
  else if (check) {
    const direct = attackersOf(b1, oppKing, me).some((a) => a.i === to);
    add('check', direct ? 'Gives check' : 'Discovered check');
    ctx.counts.checks++;
  }

  // new threats made by this move
  const newTargets = [...tgt1].filter(([i]) => !ctx.tgt0.has(i) || i === to);
  const byMoved = newTargets.filter(([i]) => attackersOf(b1, i, me).some((a) => a.i === to));
  const kingHit = check && attackersOf(b1, oppKing, me).some((a) => a.i === to);
  if (!mate) {
    if (byMoved.length + (kingHit ? 1 : 0) >= 2) {
      add('fork', `Attacks ${byMoved.map(([i]) => pieceText(b1[i], i)).join(' and ')}${kingHit ? ' + king' : ''} at once`);
      ctx.counts.forks++;
    } else {
      for (const [i] of byMoved.slice(0, 3)) add('threat', `Attacks ${pieceText(b1[i], i)}`);
      if (byMoved.length) ctx.counts.threats++;
    }
    const disc = newTargets.filter(([i]) => !byMoved.some(([j]) => j === i));
    for (const [i] of disc.slice(0, 2)) { add('discover', `Uncovers an attack on ${pieceText(b1[i], i)}`); ctx.counts.threats++; }
  }

  // rescues
  for (const [i] of ctx.hang0) {
    const now = i === from ? to : i;
    if (!hang1.has(now)) {
      if (i === from) add('defend', `Moves the threatened ${NAME[b0[i].t]} to safety`);
      else add('defend', `Saves ${pieceText(b0[i], i)}`);
    }
  }

  // development / centre
  const home = me === 'w' ? 7 : 0;
  if ((m.piece === 'n' || m.piece === 'b') && Math.floor(from / 8) === home && !m.captured) add('develop', 'Develops a minor piece');
  if (CENTRE_SQS.has(m.to) && m.piece === 'p') add('center', 'Occupies the centre');

  // --- warnings (hidden in plain mode) ---
  const warn = [];
  if (m.captured && net < 0) warn.push('Loses material in the exchange');
  for (const [i, loss] of hang1) {
    const wasThreatened = ctx.hang0.has(i === to ? from : i);
    if (i === to && m.captured && net >= 0) continue;
    if (i === to) warn.push(`The ${NAME[b1[i].t]} can be captured on ${sqName(i)}`);
    else if (wasThreatened) warn.push(`Doesn't deal with the threat to ${pieceText(b1[i], i)}`);
    else warn.push(`Leaves ${pieceText(b1[i], i)} en prise`);
  }
  if (allowsMate) warn.push('Allows checkmate in 1');
  if (stalemate) warn.push('Stalemate: draws the game');

  return { san: m.san, from: m.from, to: m.to, piece: m.piece, promotion: m.promotion || null, tags, warn, net };
}

/** Full analysis of the side to move. */
export function analyze(chess) {
  const b0 = parse(chess);
  const me = chess.turn();
  const position = describePosition(chess, b0);
  const ctx = {
    counts: { checks: 0, captures: 0, threats: 0, forks: 0, promotions: 0, castles: 0 },
    hang0: hanging(b0, me),
    tgt0: hanging(b0, other(me)),
  };
  const order = { k: 0, q: 1, r: 2, b: 3, n: 4, p: 5 };
  const moves = chess.moves({ verbose: true })
    .map((m) => describeMove(chess, m, b0, ctx))
    // neutral order: by piece type then square. Never by quality.
    .sort((a, c) => order[a.piece] - order[c.piece] || a.from.localeCompare(c.from) || a.to.localeCompare(c.to));
  return {
    position,
    moves,
    counts: { ...ctx.counts, total: moves.length },
    gameOver: chess.isGameOver() ? (chess.isCheckmate() ? 'checkmate' : chess.isStalemate() ? 'stalemate' : 'draw') : null,
  };
}
