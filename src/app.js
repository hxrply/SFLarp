import { Chess } from '../vendor/chess.js';
import { analyze, sqName } from './awareness.js';
import { startEngine, fmtScore, scoreValue, pvToSan } from './engine.js';
import { loadFromEditor, loadPosition, gridOf } from './editor.js';
import { OPENINGS, openingById, planStatus, fittingOpenings, noteFor, isBookMove } from './openings.js';
import { whiteCp, winPercent, moveAccuracy, sideAccuracy, classify, LABELS, LABEL_ORDER } from './review.js';

// the document SFLarp is shown in: the page itself, or the floating window after "Pop out"
let doc = document;
const $ = (id) => doc.getElementById(id);
const GLYPH = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
const PIECE_NAME = { k: 'King', q: 'Queen', r: 'Rooks', b: 'Bishops', n: 'Knights', p: 'Pawns' };
const THEMES = [['mate', 'Checkmate'], ['check', 'Checks'], ['capture', 'Captures'], ['threat', 'Threats'], ['fork', 'Forks'], ['discover', 'Discoveries'], ['defend', 'Defensive'], ['develop', 'Development'], ['castle', 'Castling'], ['promo', 'Promotions']];
const PRIORITY = ['mate', 'check', 'fork', 'capture', 'threat', 'discover', 'defend', 'promo', 'castle', 'develop', 'center'];
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// fast game modes: the engine thinks for a fixed time, and a big move card replaces the long panels
const MODES = {
  analysis: { label: 'Analysis' },
  blitz: { label: 'Blitz 3 min', movetime: 1000, lines: 2, ahead: 4, dangers: 2 },
  bullet: { label: 'Bullet 1 min', movetime: 350, lines: 1, ahead: 2, dangers: 1 },
};

let chess = new Chess();
let flipped = false, selected = null, highlight = null, info = null, filter = null;
// editor
let editing = false, editBoard = null, editTool = 'hand', handFrom = null, editBase = null, editStart = null;
// engine
let engine = null, engineStarting = null, engineToken = 0, engineTimer = 0;
let eng = { status: 'idle', lines: [], depth: 0, fen: '', turn: 'w', msg: '' };
// playstyle (opening plan); null when none is chosen
let plan = null;
// game review: null, or { status: 'running' | 'done', hist, fens, evals, moves, idx, done, token }
let review = null;

const settings = { level: '2', warn: true, engine: true, lines: '3', depth: '16', playstyle: '', mode: 'analysis', reviewTime: '600' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('cc-settings') || '{}')); } catch {}
const save = () => { try { localStorage.setItem('cc-settings', JSON.stringify(settings)); } catch {} };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kindOf = (m) => PRIORITY.find((k) => m.tags.some((t) => t.kind === k));
const squareIndex = (n) => (8 - Number(n[1])) * 8 + 'abcdefgh'.indexOf(n[0]);
const say = (t) => { $('msg').textContent = t; };
const speedMode = () => (settings.mode !== 'analysis' && MODES[settings.mode]) || null;

/* ---------- engine ---------- */
const engineMove = (line) => ({ from: line.pv[0].slice(0, 2), to: line.pv[0].slice(2, 4) });
function enginePick(m) {
  if (!settings.engine) return -1;
  return eng.lines.findIndex((l) => l && l.pv[0].slice(0, 2) === m.from && l.pv[0].slice(2, 4) === m.to && (l.pv[0][4] || '') === (m.promotion || ''));
}

function runEngine() {
  clearTimeout(engineTimer);
  const token = ++engineToken;
  if (review) return; // the review is using the engine
  if (editing || !settings.engine || info.gameOver) {
    engine?.stop();
    eng = { status: settings.engine ? 'idle' : 'off', lines: [], depth: 0, fen: '', turn: chess.turn(), msg: '' };
    renderEngine(); drawArrows(); renderMoves(); renderSpeed();
    return;
  }
  eng = { status: eng.status === 'error' ? 'error' : 'thinking', lines: [], depth: 0, fen: chess.fen(), turn: chess.turn(), msg: eng.msg };
  renderEngine(); drawArrows(); renderMoves(); renderSpeed();
  if (eng.status === 'error') return;
  engineTimer = setTimeout(async () => {
    try {
      engineStarting ||= startEngine(); // shared, so overlapping calls never start two workers
      engine = await engineStarting;
    } catch (e) {
      engine = null; engineStarting = null;
      eng = { ...eng, status: 'error', msg: location.protocol === 'file:'
        ? 'The engine cannot start from a local file. Open the hosted page (GitHub Pages) instead.'
        : `${e.message || 'The engine could not be loaded.'} Turn "Engine suggestions" off and on to try again.` };
      renderEngine();
      return;
    }
    if (token !== engineToken) return;
    const fen = chess.fen();
    let topKey = '';
    const speed = speedMode();
    engine.analyze({
      fen,
      depth: Number(settings.depth),
      movetime: speed?.movetime,
      lines: Math.max(1, Math.min(speed ? speed.lines : Number(settings.lines), info.moves.length)),
      onInfo(i) {
        if (token !== engineToken) return;
        eng.lines[i.multipv - 1] = { depth: i.depth, score: i.score, pv: i.pv };
        eng.depth = Math.max(eng.depth, i.depth);
        renderEngine(); renderSpeed();
        const key = eng.lines.map((l) => l && l.pv[0]).join(',');
        if (key !== topKey) { topKey = key; drawArrows(); renderMoves(); }
      },
      onDone({ rejected }) {
        if (token !== engineToken) return;
        eng.status = 'done';
        if (rejected) eng.lines = [];
        renderEngine(); drawArrows(); renderMoves(); renderSpeed();
      },
    });
  }, speedMode() ? 20 : 150);
}

function renderEngine() {
  const el = $('engine');
  if (editing || settings.mode === 'bullet') { el.hidden = true; return; }
  el.hidden = false;
  if (!settings.engine) { el.innerHTML = '<h2>Engine</h2><div class="mute">Engine suggestions are off. Turn them on in Settings to see Stockfish\'s best lines.</div>'; return; }
  if (info.gameOver) { el.innerHTML = '<h2>Engine</h2><div class="mute">Game over.</div>'; return; }
  if (eng.status === 'error') { el.innerHTML = `<h2>Engine</h2><div class="bad">${esc(eng.msg)}</div>`; return; }
  const state = eng.status === 'done' ? `depth ${eng.depth}` : eng.lines.length ? `thinking… depth ${eng.depth}${speedMode() ? '' : `/${settings.depth}`}` : 'starting engine…';
  const rows = eng.lines.map((l, r) => {
    if (!l) return '';
    const san = pvToSan(eng.fen, l.pv, 8);
    if (!san.length) return '';
    const v = scoreValue(l.score, eng.turn);
    return `<div class="eline" data-r="${r}"><span class="rank">${r + 1}</span><span class="ev ${v > 30 ? 'pos' : v < -30 ? 'neg' : ''}">${fmtScore(l.score, eng.turn)}</span><span class="pv"><b>${esc(san[0])}</b> ${esc(san.slice(1).join(' '))}</span></div>`;
  }).join('');
  const empty = eng.status === 'done' ? '<div class="bad">Stockfish could not analyse this position.</div>' : '<div class="mute">Working out the best moves…</div>';
  el.innerHTML = `<h2>${esc(engine?.name || 'Stockfish 19')} &middot; <span class="mute" style="text-transform:none;letter-spacing:0">${state}</span></h2>${rows || empty}
   <div class="mute" style="font-size:12px;margin-top:6px">Scores are from White's side (+ is better for White, #3 is mate in 3). Tap a line to see its first move.</div>`;
  el.querySelectorAll('.eline').forEach((row) => {
    row.onclick = () => { const m = engineMove(eng.lines[row.dataset.r]); selected = m.from; highlight = [m.from, m.to]; renderBoard(); };
  });
}

function drawArrows() {
  const svg = $('arrows');
  if (editing || (!review && info.gameOver)) { svg.innerHTML = ''; return; }
  const pt = (name) => {
    const i = squareIndex(name), r = Math.floor(i / 8), f = i % 8;
    return [(flipped ? 7 - f : f) + 0.5, (flipped ? 7 - r : r) + 0.5];
  };
  const arrow = (from, to, color, w, op) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const head = 0.34, half = Math.max(0.17, w * 1.1);
    const bx = x2 - ux * head, by = y2 - uy * head, px = -uy, py = ux;
    return `<g opacity="${op}" fill="${color}" stroke="${color}"><line x1="${x1 + ux * 0.2}" y1="${y1 + uy * 0.2}" x2="${bx}" y2="${by}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<polygon points="${x2},${y2} ${bx + px * half},${by + py * half} ${bx - px * half},${by - py * half}" stroke="none"/></g>`;
  };
  let out = '';
  if (review) {
    const i = review.idx - 1, mv = review.moves?.[i];
    if (i >= 0) {
      const h = review.hist[i];
      out += arrow(h.from, h.to, mv ? LABELS[mv.label].color : '#9aa3b5', 0.15, 0.9);
      const best = review.evals[i]?.best;
      if (mv && best && !['best', 'great', 'book'].includes(mv.label)) out += arrow(best.slice(0, 2), best.slice(2, 4), '#5ac98f', 0.15, 0.85);
    }
    svg.innerHTML = out;
    return;
  }
  // the plan's book move sits underneath, slightly wider, so it still shows when the engine agrees
  if (plan?.state === 'your-move') for (const m of plan.next) out += arrow(m.from, m.to, '#f0b429', 0.22, 0.9);
  if (settings.engine) {
    // in a fast mode on their turn the engine's line is their expected move: show it in their colour
    const theirs = speedMode() && chess.turn() !== mySide();
    eng.lines.forEach((l, k) => {
      if (!l) return;
      const m = engineMove(l);
      out += arrow(m.from, m.to, k === 0 ? (theirs ? '#c9b8ff' : '#5ac98f') : '#5aa9e6', k === 0 ? 0.15 : 0.1, k === 0 ? 0.9 : 0.65);
    });
  }
  svg.innerHTML = out;
}

/* ---------- game review ---------- */
/** Evaluate one position for the review: White-side centipawns, the best move and the second-best score. */
function evaluatePosition(fen, movetime) {
  const c = new Chess(fen);
  if (c.isCheckmate()) return Promise.resolve({ cp: c.turn() === 'w' ? -10000 : 10000, best: null, second: null });
  if (c.isDraw()) return Promise.resolve({ cp: 0, best: null, second: null });
  return new Promise((resolve) => {
    const lines = [];
    engine.analyze({
      fen, movetime, lines: Math.min(2, c.moves().length),
      onInfo(i) { lines[i.multipv - 1] = i; },
      onDone() {
        const [a, b] = lines;
        resolve({ cp: a ? whiteCp(a.score, c.turn()) : 0, best: a?.pv[0] || null, second: b ? whiteCp(b.score, c.turn()) : null });
      },
    });
  });
}

async function startReview() {
  const hist = chess.history({ verbose: true });
  if (!hist.length) { say('Play or enter the moves of a game first, then review it.'); return; }
  if (editing) stopEditing();
  say('');
  const token = {};
  review = { status: 'running', hist, fens: [hist[0].before, ...hist.map((m) => m.after)], evals: [], moves: null, idx: hist.length, done: 0, token };
  clearTimeout(engineTimer); engineToken++;
  doc.body.classList.add('reviewing');
  render();
  try {
    engineStarting ||= startEngine();
    engine = await engineStarting;
  } catch (e) {
    engineStarting = null;
    if (review?.token === token) { review = null; doc.body.classList.remove('reviewing'); refresh(); say(`The review needs the engine: ${e.message}`); }
    return;
  }
  for (let i = 0; i < review.fens.length; i++) {
    const ev = await evaluatePosition(review.fens[i], Number(settings.reviewTime));
    if (review?.token !== token) return; // closed while analysing
    review.evals[i] = ev;
    review.done = i + 1;
    renderReview();
  }
  scoreReview();
  review.status = 'done';
  review.idx = 0;
  render();
}

function scoreReview() {
  const { hist, evals } = review;
  review.moves = hist.map((m, i) => {
    const mover = (cp) => (m.color === 'w' ? winPercent(cp) : 100 - winPercent(cp));
    const before = mover(evals[i].cp), after = mover(evals[i + 1].cp);
    const drop = Math.max(0, before - after);
    const uci = m.from + m.to + (m.promotion || '');
    const isBest = evals[i].best === uci;
    // "Great": the only good move (the second choice was much worse), not just an obvious recapture
    const recapture = i > 0 && hist[i - 1].captured && hist[i - 1].to === m.to;
    const onlyMove = isBest && !recapture && evals[i].second !== null && before - mover(evals[i].second) >= 15;
    const mate = m.san.endsWith('#'); // delivering mate is always the best move, book line or not
    const label = classify({ drop, isBest: isBest || mate, onlyMove: onlyMove && !mate, inBook: !mate && i < 30 && isBookMove(m.before, m.san) });
    const bestSan = evals[i].best ? pvToSan(m.before, [evals[i].best], 1)[0] : null;
    return { san: m.san, color: m.color, label, drop, accuracy: moveAccuracy(drop), bestSan };
  });
  review.accuracy = { w: sideAccuracy(review.moves.filter((x) => x.color === 'w').map((x) => x.accuracy)), b: sideAccuracy(review.moves.filter((x) => x.color === 'b').map((x) => x.accuracy)) };
}

function closeReview() {
  review = null;
  doc.body.classList.remove('reviewing');
  refresh();
}

function reviewGo(idx) {
  if (!review || review.status !== 'done') return;
  review.idx = Math.max(0, Math.min(review.fens.length - 1, idx));
  renderBoard(); renderStatus(); drawArrows(); renderReview();
}

const fmtEval = (cp) => (Math.abs(cp) >= 10000 ? (cp > 0 ? 'mate for White' : 'mate for Black') : `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(1)}`);
const moveNo = (i) => `${Math.floor(i / 2) + 1}${i % 2 ? '...' : '.'}`;

function reviewGraph() {
  const n = review.fens.length - 1;
  const pts = review.evals.map((e, i) => `${i},${(100 - winPercent(e.cp)).toFixed(2)}`).join(' ');
  const marks = review.moves.map((m, i) => (['mistake', 'blunder'].includes(m.label) ? `<circle cx="${i + 1}" cy="${(100 - winPercent(review.evals[i + 1].cp)).toFixed(2)}" r="3.2" fill="${LABELS[m.label].color}" vector-effect="non-scaling-stroke"/>` : '')).join('');
  return `<svg class="rgraph" viewBox="0 0 ${Math.max(1, n)} 100" preserveAspectRatio="none" role="img" aria-label="Evaluation graph">
    <rect x="0" y="0" width="${Math.max(1, n)}" height="100" fill="#14171f"/>
    <polygon points="0,100 ${pts} ${n},100" fill="#e8ebf2"/>
    <line x1="0" y1="50" x2="${n}" y2="50" stroke="#6b7385" stroke-width="1" vector-effect="non-scaling-stroke"/>
    <line x1="${review.idx}" y1="0" x2="${review.idx}" y2="100" stroke="#f0b429" stroke-width="2" vector-effect="non-scaling-stroke"/>
  </svg><div class="rmarks">${review.moves.map((m, i) => (['mistake', 'blunder'].includes(m.label) ? `<span style="left:${((i + 1) / Math.max(1, n)) * 100}%;background:${LABELS[m.label].color}"></span>` : '')).join('')}</div>`;
}

function renderReview() {
  const el = $('review');
  if (!review) { el.hidden = true; return; }
  el.hidden = false;
  if (review.status === 'running') {
    el.innerHTML = `<h2>Game review</h2>
      <div>Stockfish is checking every move&hellip; position ${review.done} of ${review.fens.length}</div>
      <progress max="${review.fens.length}" value="${review.done}" style="width:100%;margin:8px 0"></progress>
      <button type="button" id="rclose">Cancel</button>`;
    $('rclose').onclick = closeReview;
    return;
  }
  const count = (label, c) => review.moves.filter((m) => m.label === label && m.color === c).length;
  const acc = (v) => (v === null ? '&ndash;' : v.toFixed(1));
  const i = review.idx - 1, cur = review.moves[i];
  let detail = '<span class="mute">Start of the game. Use the arrows to step through it.</span>';
  if (cur) {
    const L = LABELS[cur.label];
    detail = `<b>${moveNo(i)}${esc(cur.san)}</b> <span class="rlabel" style="--c:${L.color}">${L.mark} ${L.name}</span>
      <span class="mute">eval ${fmtEval(review.evals[i + 1].cp)}</span>
      ${['inaccuracy', 'mistake', 'blunder', 'good', 'excellent'].includes(cur.label) && cur.bestSan ? `<div>Best was <b class="good">${esc(cur.bestSan)}</b> (${fmtEval(review.evals[i].cp)}).</div>` : ''}`;
  }
  const mine = mySide();
  const keys = review.moves.map((m, k) => ({ m, k })).filter(({ m }) => m.color === mine && ['mistake', 'blunder'].includes(m.label));
  el.innerHTML = `<div class="rhead"><h2>Game review</h2><button type="button" id="rclose">Back to game</button></div>
    <div class="racc"><div><span class="rbig">${acc(review.accuracy.w)}</span><span class="mute">White accuracy</span></div><div><span class="rbig">${acc(review.accuracy.b)}</span><span class="mute">Black accuracy</span></div></div>
    ${reviewGraph()}
    <div class="rnav"><button type="button" data-go="0" aria-label="First move">⏮</button><button type="button" data-go="${review.idx - 1}" aria-label="Previous move">◀</button><button type="button" data-go="${review.idx + 1}" aria-label="Next move">▶</button><button type="button" data-go="${review.fens.length - 1}" aria-label="Last move">⏭</button></div>
    <div class="rdetail">${detail}</div>
    ${keys.length ? `<div class="rkeys">Your ${keys.length === 1 ? 'mistake' : 'mistakes'} (${sideName(mine)}): ${keys.map(({ m, k }) => `<button type="button" data-go="${k + 1}" style="--c:${LABELS[m.label].color}">${moveNo(k)}${esc(m.san)}${LABELS[m.label].mark}</button>`).join(' ')}</div>` : ''}
    <table class="rtab"><thead><tr><th></th><th>White</th><th>Black</th></tr></thead><tbody>
      ${LABEL_ORDER.map((l) => `<tr><td><span class="rlabel" style="--c:${LABELS[l].color}">${LABELS[l].mark}</span> ${LABELS[l].name}</td><td>${count(l, 'w')}</td><td>${count(l, 'b')}</td></tr>`).join('')}
    </tbody></table>
    <div class="rmoves">${review.moves.map((m, k) => `${k % 2 ? '' : `<span class="mute">${k / 2 + 1}.</span>`}<button type="button" data-go="${k + 1}" class="${k === i ? 'on' : ''}" style="--c:${LABELS[m.label].color}">${esc(m.san)}<sup>${LABELS[m.label].mark}</sup></button>`).join(' ')}</div>
    <div class="mute" style="font-size:12px;margin-top:8px">Labels and accuracy come from Stockfish 19 lite with ${(Number(settings.reviewTime) / 1000).toFixed(2).replace(/0$/, '')} s per position, using lichess's public accuracy formula, so numbers can differ a little from chess.com's.</div>`;
  $('rclose').onclick = closeReview;
  el.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => reviewGo(Number(b.dataset.go)); });
  const g = el.querySelector('.rgraph');
  g.onclick = (e) => { const r = g.getBoundingClientRect(); reviewGo(Math.round(((e.clientX - r.left) / r.width) * (review.fens.length - 1))); };
}

function onKey(e) {
  if (!review || review.status !== 'done' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') { reviewGo(review.idx - 1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { reviewGo(review.idx + 1); e.preventDefault(); }
}

/* ---------- pop out (floating window) ---------- */
let pipWin = null;
async function popOut() {
  if (pipWin) { pipWin.close(); return; }
  const main = document.querySelector('main');
  // Chrome/Edge: a floating window that stays on top of every app
  if (window.documentPictureInPicture?.requestWindow) {
    try { pipWin = await window.documentPictureInPicture.requestWindow({ width: 420, height: 860 }); } catch { pipWin = null; }
  }
  if (pipWin) {
    for (const el of document.head.querySelectorAll('style, link[rel="stylesheet"]')) pipWin.document.head.append(el.cloneNode(true));
    pipWin.document.title = 'SFLarp';
    pipWin.document.body.className = document.body.className;
    pipWin.document.body.append(main);
    doc = pipWin.document;
    document.getElementById('poppedout').hidden = false;
    pipWin.addEventListener('keydown', onKey);
    pipWin.addEventListener('pagehide', () => {
      document.body.className = doc.body.className;
      document.getElementById('poppedout').after(main);
      doc = document; pipWin = null;
      document.getElementById('poppedout').hidden = true;
      render();
    });
    render();
    return;
  }
  // elsewhere: a separate small window that carries the game over
  try { localStorage.setItem('cc-handoff', chess.pgn()); } catch { /* the new window starts fresh */ }
  if (!window.open(location.href, 'sflarp-mini', 'popup,width=420,height=860')) say('The pop-up was blocked. Allow pop-ups for this page and try again.');
}

/* ---------- fast game modes ---------- */
// the side you are playing: the playstyle's side, otherwise the side at the bottom of the board
const mySide = () => currentOpening()?.side || (flipped ? 'b' : 'w');

/** The move to suggest when it is your turn: the book move while in the opening, else the engine's first choice. */
function suggestion() {
  if (plan?.state === 'your-move') return { san: plan.next[0].san, source: 'book' };
  const l = settings.engine && eng.lines[0];
  if (!l || eng.fen !== chess.fen()) return null;
  const san = pvToSan(eng.fen, l.pv, 1)[0];
  return san ? { san, source: 'engine', score: fmtScore(l.score, eng.turn), pv: l.pv } : null;
}

function renderSpeed() {
  const el = $('speed');
  const speed = speedMode();
  if (!speed || editing || !info) { el.hidden = true; return; }
  el.hidden = false;
  if (info.gameOver) { el.innerHTML = `<div class="slabel">Game over</div><div class="sbig">${info.gameOver === 'checkmate' ? 'Checkmate' : 'Draw'}</div>`; return; }
  const yours = chess.turn() === mySide();
  const l = settings.engine && eng.fen === chess.fen() ? eng.lines[0] : null;
  const pv = l ? pvToSan(eng.fen, l.pv, speed.ahead + 1) : [];
  // dangers, from your point of view whoever is to move
  const p = info.position, dangers = [];
  if (yours) {
    if (p.inCheck) dangers.push('You are in check');
    if (p.theyThreatenMate) dangers.push('They threaten mate in 1');
    for (const x of [...p.yourPiecesAttacked].sort((a, b) => b.loss - a.loss)) dangers.push(`Your ${x.piece} on ${x.sq} is hanging`);
  } else {
    for (const x of [...p.theirPiecesAttackable].sort((a, b) => b.loss - a.loss)) dangers.push(`They can win your ${x.piece} on ${x.sq}`);
  }
  const chain = (moves, firstIsYours) => moves.map((m, i) => ((i % 2 === 0) === firstIsYours ? `<b>${esc(m)}</b>` : `<span class="them">${esc(m)}</span>`)).join(' <span class="mute">&rarr;</span> ');
  let html = '';
  if (yours) {
    const s = suggestion();
    html += `<div class="slabel">Your move</div>`;
    if (!s) html += `<div class="sbig mute">${settings.engine ? 'thinking…' : 'Engine off'}</div>`;
    else {
      const engineAgrees = s.source === 'book' && pv[0] === s.san;
      html += `<div class="sbig">${esc(s.san)} <span class="ssrc">${s.source === 'book' ? `📖 book${pv[0] && !engineAgrees ? ` &middot; engine: ${esc(pv[0])}` : ''}` : `★ ${esc(s.score)}`}</span></div>`;
      // moves ahead: only from the engine line that starts with the suggested move
      if (pv[0] === s.san && pv.length > 1) {
        html += `<div class="sthen">Then: ${chain(pv.slice(1), false)}</div>`;
        const after = new Chess(chess.fen());
        try {
          after.move(s.san);
          const replies = after.moves();
          if (replies.length === 1) html += `<div class="spre">Their reply is forced (${esc(replies[0])}): premove ${esc(pv[2] || '')} is safe.</div>`;
        } catch { /* suggestion no longer legal */ }
      }
    }
  } else {
    html += `<div class="slabel">Their move &middot; type it in</div>`;
    html += pv[0] ? `<div class="sbig them">Expect ${esc(pv[0])}</div>${pv.length > 1 ? `<div class="sthen">Your answer: ${chain(pv.slice(1), true)}</div>` : ''}`
      : `<div class="sbig mute">${settings.engine ? 'thinking…' : 'Engine off'}</div>`;
  }
  if (dangers.length) html += dangers.slice(0, speed.dangers).map((d) => `<div class="sdanger">&#9888; ${esc(d)}</div>`).join('');
  html += `<div class="shint">You are ${sideName(mySide())}${currentOpening() ? '' : ' (Flip to switch)'}. Enter on an empty move box plays your suggested move.</div>`;
  el.innerHTML = html;
}

function applyMode() {
  const speed = speedMode();
  doc.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === settings.mode));
  // fast modes keep the big move card and hide the long reading panels
  $('aware').classList.toggle('speedhide', !!speed);
  $('moves').classList.toggle('speedhide', !!speed);
}

function chooseMode(mode) {
  settings.mode = MODES[mode] ? mode : 'analysis'; save();
  applyMode(); refresh();
}

/* ---------- playstyle ---------- */
const currentOpening = () => openingById(settings.playstyle);
const planPick = (m) => (plan?.state === 'your-move' ? plan.next.findIndex((x) => x.san === m.san) : -1);
const sideName = (c) => (c === 'w' ? 'White' : 'Black');

function buildPlaystylePicker() {
  const opts = (side) => OPENINGS.filter((o) => o.side === side)
    .map((o) => `<option value="${o.id}">${esc(o.name)}${o.answers ? ` (vs 1.${o.answers})` : ''} &middot; ${esc(o.style)}</option>`).join('');
  $('playstyle').innerHTML = `<option value="">None &mdash; just analyse</option><optgroup label="Play as White">${opts('w')}</optgroup><optgroup label="Play as Black">${opts('b')}</optgroup>`;
  $('playstyle').value = currentOpening() ? settings.playstyle : '';
}

function choosePlaystyle(id) {
  settings.playstyle = id; save();
  $('playstyle').value = id;
  const op = currentOpening();
  if (op) flipped = op.side === 'b'; // look at the board from the side you are playing
  refresh();
}

function renderPlan() {
  const el = $('planbody');
  const op = currentOpening();
  if (!op) {
    el.innerHTML = '<div class="mute" style="font-size:13px;margin-top:6px">Pick an opening and SFLarp shows its moves, what each one is for, and the plan afterwards. Choose None to use SFLarp as it is.</div>';
    return;
  }
  const move = (d) => `${d.moveNo}${d.black ? '...' : '.'}${esc(d.san)}`;
  let status = '';
  if (info.gameOver) status = '<div class="mute">Game over.</div>';
  else if (!plan) status = '';
  else if (plan.state === 'your-move') {
    status = `<div class="plabel">Your book move${plan.next.length > 1 ? 's' : ''}</div>` + plan.next.map((m) => `
      <div class="pmove"><b>${esc(m.san)}</b><span class="pnote">${esc(noteFor(op, m.san))}</span><button type="button" data-play="${esc(m.san)}">Play ${esc(m.san)}</button></div>`).join('');
  } else if (plan.state === 'their-move') {
    status = `<div class="plabel">Their move</div><div>The book expects ${plan.next.map((m) => `<b>${esc(m.san)}</b>`).join(', ')}. Enter their move when they play it.</div>`;
  } else if (plan.state === 'complete') {
    status = `<div class="good">&#10003; You've played the whole ${esc(op.name)} line. Follow the game plan below; the engine and the move notes still work as normal.</div>`;
  } else if (plan.state === 'off-book') {
    const d = plan.deviation;
    status = d.byYou
      ? `<div><b class="bad">You left the ${esc(op.name)}</b> with ${move(d)} (the book move was ${d.expected.map(esc).join(' or ')}). Undo to get back on track, or carry on with the plan below.</div>`
      : `<div><b>They left the book</b> with ${move(d)} (the book expected ${d.expected.map(esc).join(' or ')}). You're on your own now: use the game plan below and the engine.</div>`;
  } else {
    status = '<div class="mute">This position wasn\'t reached from the start of a game, so the opening book can\'t follow it. Press New game to play the opening from move 1.</div>';
  }
  const fits = plan && (plan.state === 'off-book' || plan.state === 'not-from-start') && !info.gameOver ? fittingOpenings(chess, op.side, op.id) : [];
  el.innerHTML = `
    <div class="ptitle"><b>${esc(op.name)}</b><span class="chip k-plan">You play ${sideName(op.side)}</span><span class="chip" style="--c:#8a93a8">${esc(op.style)}</span></div>
    <div class="mute" style="font-size:13px">${esc(op.summary)}</div>
    ${op.warning ? `<div class="bad" style="font-size:13px;margin-top:4px">&#9888; ${esc(op.warning)}</div>` : ''}
    <div class="pstatus">${status}</div>
    ${fits.length ? `<div style="font-size:13px">Playstyles that fit this position: ${fits.map((o) => `<button type="button" class="pfit" data-op="${o.id}">${esc(o.name)}</button>`).join(' ')}</div>` : ''}
    <details class="pplan"${plan && (plan.state === 'complete' || plan.state === 'off-book') ? ' open' : ''}><summary>Game plan</summary><ul>${op.plan.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  el.querySelectorAll('[data-play]').forEach((b) => {
    b.onclick = () => { try { chess.move(b.dataset.play); } catch { return; } selected = highlight = null; say(''); refresh(); };
  });
  el.querySelectorAll('[data-op]').forEach((b) => { b.onclick = () => choosePlaystyle(b.dataset.op); });
}

/* ---------- core ---------- */
function refresh() {
  info = analyze(chess);
  plan = currentOpening() ? planStatus(chess, currentOpening()) : null;
  render();
  runEngine();
}

function render() {
  renderBoard(); renderSpeed(); renderStatus(); renderPlan(); renderAware(); renderMoves(); renderEngine(); renderReview(); drawArrows();
  $('popout').textContent = pipWin ? '⧉ Pop back in' : '⧉ Pop out';
  $('fen').value = chess.fen();
}

function renderBoard() {
  const b = $('board'); b.innerHTML = '';
  const dests = new Map();
  const shown = review ? new Chess(review.fens[review.idx]) : chess;
  if (!editing && !review && selected) for (const m of info.moves) if (m.from === selected) dests.set(m.to, m);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rr = flipped ? 7 - r : r, ff = flipped ? 7 - f : f;
    const name = sqName(rr * 8 + ff);
    const p = editing ? editBoard[rr * 8 + ff] : (() => { const x = shown.get(name); return x && { t: x.type, c: x.color }; })();
    const d = document.createElement('div');
    const picked = editing && handFrom === rr * 8 + ff;
    const hl = review ? (review.idx > 0 && [review.hist[review.idx - 1].from, review.hist[review.idx - 1].to].includes(name)) : !editing && highlight && highlight.includes(name);
    d.className = `sq ${(rr + ff) % 2 ? 'd' : 'l'}${(name === selected && !editing && !review) || picked ? ' sel' : ''}${hl ? ' hl' : ''}`;
    d.dataset.sq = name;
    if (p) d.innerHTML = `<span class="p ${p.c}">${GLYPH[p.c + p.t]}</span>`;
    if (dests.has(name)) {
      const k = kindOf(dests.get(name));
      d.insertAdjacentHTML('beforeend', `<span class="dot" style="${k ? `background:var(--${k});opacity:.85` : ''}"></span>`);
    }
    if (f === 0) d.insertAdjacentHTML('beforeend', `<span class="coord">${8 - rr}</span>`);
    d.onclick = () => (editing ? onEditSquare(rr * 8 + ff) : onSquare(name));
    b.appendChild(d);
  }
}

function onSquare(name) {
  if (review) return;
  const mv = selected && info.moves.find((m) => m.from === selected && m.to === name);
  if (mv) {
    chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion ? 'q' : undefined }); // auto-queen
    selected = null; highlight = null; say(''); refresh(); return;
  }
  const p = chess.get(name);
  selected = p && p.color === chess.turn() && selected !== name ? name : null;
  highlight = null; render();
}

function renderStatus() {
  if (editing) { $('status').innerHTML = 'Editing the position'; return; }
  if (review) { $('status').innerHTML = review.idx ? `After ${review.idx % 2 ? `${(review.idx + 1) / 2}.` : `${review.idx / 2}...`}${esc(review.hist[review.idx - 1].san)}` : 'Start of the game'; return; }
  const side = chess.turn() === 'w' ? 'White' : 'Black';
  let t = `${side} to move`;
  if (info.gameOver === 'checkmate') t = `Checkmate &mdash; ${side === 'White' ? 'Black' : 'White'} wins`;
  else if (info.gameOver) t = `Game over: ${info.gameOver}`;
  else if (info.position.inCheck) t += ' &mdash; <b class="bad">in check</b>';
  if (info.gameOver && chess.history().length) t += ' &middot; <button type="button" id="reviewnow">📊 Review this game</button>';
  $('status').innerHTML = t;
  $('reviewnow')?.addEventListener('click', startReview);
}

const list = (items, cls = '') => (items.length ? `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');

function renderAware() {
  const el = $('aware');
  if (editing) { el.hidden = true; return; }
  el.hidden = false;
  const p = info.position, c = info.counts, you = p.turn === 'w' ? 'White' : 'Black';
  if (info.gameOver) { el.innerHTML = '<h2>Look around</h2><div class="mute">Game over.</div>'; return; }
  const sign = p.material.diff > 0 ? `+${p.material.diff}` : p.material.diff;
  const danger = [];
  if (p.theyThreatenMate) danger.push('<b class="bad">They threaten checkmate in 1 if you pass.</b>');
  for (const x of p.yourPiecesAttacked) danger.push(`Your ${x.piece} on <b>${x.sq}</b> can be won (about ${x.loss} pt${x.loss > 1 ? 's' : ''}).`);
  for (const x of p.yourPins) danger.push(`Your ${x.piece} on ${x.sq} is pinned to your king by ${x.by}.`);
  const chances = [];
  for (const x of p.theirPiecesAttackable) chances.push(`Their ${x.piece} on <b>${x.sq}</b> is attackable (about ${x.loss} pt${x.loss > 1 ? 's' : ''}).`);
  for (const x of p.theirPins) chances.push(`Their ${x.piece} on ${x.sq} is pinned to their king by ${x.by}.`);
  for (const x of p.theirLoose) chances.push(`Loose (undefended): their ${x}.`);
  const own = p.yourLoose.map((x) => `Your ${x} is undefended.`);
  const open = [];
  if (p.opening) {
    if (p.opening.undeveloped.length) open.push(`Still at home: ${p.opening.undeveloped.join(', ')}`);
    open.push(p.opening.castlingRights ? 'You can still castle.' : 'Castling rights are gone.');
  }
  const themes = [['Checkmate', c.mates], ['Checks', c.checks], ['Captures', c.captures], ['Threats', c.threats], ['Discoveries', c.discoveries], ['Forks', c.forks], ['Promotions', c.promotions], ['Castling', c.castles]];
  el.innerHTML = `<h2>Look around &mdash; ${you}</h2>
   <div>Material: ${p.material.you} vs ${p.material.them} (<b class="${p.material.diff < 0 ? 'bad' : p.material.diff > 0 ? 'good' : ''}">${sign}</b>) &middot; ${c.total} legal moves${p.theirChecks ? ` &middot; they have ${p.theirChecks} check${p.theirChecks > 1 ? 's' : ''} available` : ''}</div>
   ${danger.length ? `<h2 style="margin-top:10px">Watch out</h2>${list(danger, 'bad')}` : ''}
   ${own.length ? `<h2>Soft spots</h2>${list(own)}` : ''}
   ${chances.length ? `<h2>Opportunities in their camp</h2>${list(chances)}` : ''}
   ${open.length ? `<h2>Opening checklist</h2>${list(open)}` : ''}
   <h2>Ideas available this move</h2>
   <div class="mute" style="font-size:13px">${themes.filter(([, n]) => n).map(([name, n]) => `${name}: ${n}`).join(' &middot; ') || 'No tactics on the board &mdash; quiet position.'}</div>`;
}

const matchesFilter = (m, f) => (f === 'engine' ? enginePick(m) >= 0 : f === 'plan' ? planPick(m) >= 0 : m.tags.some((t) => t.kind === f));

function renderMoves() {
  const el = $('moves');
  if (editing) { el.hidden = true; return; }
  el.hidden = false;
  if (info.gameOver) { el.innerHTML = ''; return; }
  if (settings.level === '1') { el.innerHTML = '<h2>Moves</h2><div class="mute">The move list is hidden. Switch "Move list" in Settings to see it.</div>'; return; }
  const present = THEMES.filter(([k]) => info.moves.some((m) => m.tags.some((t) => t.kind === k)));
  const hasEngine = info.moves.some((m) => enginePick(m) >= 0);
  const hasPlan = info.moves.some((m) => planPick(m) >= 0);
  if (filter === 'plan' && !hasPlan) filter = null; // the book move was played; show everything again
  let html = `<h2>All ${info.moves.length} legal moves</h2><div class="themes">
    ${hasPlan ? `<span class="chip k-plan${filter && filter !== 'plan' ? ' off' : ''}" data-f="plan">📖 Plan move</span>` : ''}
    ${hasEngine ? `<span class="chip k-engine${filter && filter !== 'engine' ? ' off' : ''}" data-f="engine">★ Engine picks</span>` : ''}
    ${present.map(([k, n]) => `<span class="chip k-${k}${filter && filter !== k ? ' off' : ''}" data-f="${k}">${n}</span>`).join('')}
    ${filter ? '<span class="chip" data-f="" style="--c:#667">show all</span>' : ''}</div>`;
  const groups = {};
  for (const m of info.moves) if (!filter || matchesFilter(m, filter)) (groups[m.piece] ||= []).push(m);
  for (const k of ['k', 'q', 'r', 'b', 'n', 'p']) {
    if (!groups[k]) continue;
    html += `<div class="grp">${PIECE_NAME[k]}</div>`;
    for (const m of groups[k]) {
      const idx = info.moves.indexOf(m);
      const pick = enginePick(m);
      const star = (planPick(m) >= 0 ? '<span class="chip k-plan">📖 Plan</span>' : '') + (pick >= 0 ? `<span class="chip k-engine">★ Engine #${pick + 1}</span>` : '');
      const chips = m.tags.map((t) => `<span class="chip k-${t.kind}" title="${esc(t.text)}">${esc(t.text)}</span>`).join('');
      let verdict = '';
      if (settings.warn && m.net !== null) verdict = m.net > 0 ? ' <span class="good">(wins material)</span>' : m.net === 0 ? ' <span class="mute">(even trade)</span>' : '';
      const warns = settings.warn ? m.warn.map((w) => `<span class="chip warn">⚠ ${esc(w)}</span>`).join('') : '';
      html += `<div class="mv" data-i="${idx}"><b>${esc(m.san)}</b>${star}${chips}${verdict}${warns}</div>`;
    }
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-f]').forEach((c) => { c.onclick = () => { filter = c.dataset.f || null; renderMoves(); }; });
  el.querySelectorAll('.mv').forEach((row) => {
    row.onclick = () => { const m = info.moves[row.dataset.i]; selected = m.from; highlight = [m.from, m.to]; renderBoard(); };
  });
}

/* ---------- position editor ---------- */
const START_GRID = gridOf(new Chess(START_FEN));

function buildPalette() {
  const tools = [['hand', '✋ Move'], ...['w', 'b'].flatMap((c) => ['k', 'q', 'r', 'b', 'n', 'p'].map((t) => [c + t, GLYPH[c + t]])), ['x', '✕']];
  $('palette').innerHTML = tools.map(([k, label]) => `<button type="button" data-t="${k}" class="${k[0] === 'w' || k[0] === 'b' ? k[0] : ''}${k === editTool ? ' on' : ''}" aria-label="${k}">${label}</button>`).join('');
  $('palette').querySelectorAll('button').forEach((b) => { b.onclick = () => { editTool = b.dataset.t; handFrom = null; buildPalette(); renderBoard(); }; });
}

function startEditing() {
  editing = true; selected = highlight = handFrom = null;
  editBoard = gridOf(chess); editTool = 'hand';
  editBase = chess.fen(); editStart = JSON.stringify(editBoard);
  $('editturn').value = chess.turn();
  $('editor').hidden = false; $('moveform').hidden = true; $('edit').classList.add('on');
  say(''); buildPalette(); runEngine(); render();
}

function stopEditing() {
  editing = false; handFrom = null; $('editor').hidden = true; $('moveform').hidden = false; $('edit').classList.remove('on');
}

function onEditSquare(i) {
  if (editTool === 'hand') {
    if (handFrom === null) { if (editBoard[i]) handFrom = i; }
    else { if (i !== handFrom) { editBoard[i] = editBoard[handFrom]; editBoard[handFrom] = null; } handFrom = null; }
  } else if (editTool === 'x') editBoard[i] = null;
  else editBoard[i] = { c: editTool[0], t: editTool[1] };
  say(''); renderBoard();
}

/* ---------- wiring ---------- */
const leaveReview = () => { if (review) { review = null; doc.body.classList.remove('reviewing'); } };
$('undo').onclick = () => { if (editing) return; leaveReview(); chess.undo(); selected = highlight = null; say(''); refresh(); };
$('reviewbtn').onclick = () => (review ? closeReview() : startReview());
$('popout').onclick = popOut;
document.getElementById('popback').onclick = () => pipWin?.close();
window.addEventListener('keydown', onKey);
$('flip').onclick = () => { flipped = !flipped; render(); };
$('edit').onclick = () => (editing ? ($('ecancel').onclick()) : (leaveReview(), startEditing()));
$('new').onclick = () => { leaveReview(); stopEditing(); chess = new Chess(); selected = highlight = filter = null; say(''); refresh(); };
// a cleared board is a fresh setup (castling allowed wherever king and rook stand at home)
$('eclear').onclick = () => { editBoard = Array(64).fill(null); editBase = null; handFrom = null; say(''); renderBoard(); };
$('estart').onclick = () => { editBoard = START_GRID.map((p) => p && { ...p }); editBase = START_FEN; $('editturn').value = 'w'; handFrom = null; say(''); renderBoard(); };
$('ereset').onclick = () => { editBoard = gridOf(chess); editBase = chess.fen(); $('editturn').value = chess.turn(); handFrom = null; say(''); renderBoard(); };
$('ecancel').onclick = () => { stopEditing(); say(''); refresh(); };
$('edone').onclick = () => {
  const turn = $('editturn').value;
  if (editBase === chess.fen() && JSON.stringify(editBoard) === editStart && turn === chess.turn()) {
    stopEditing(); say(''); refresh(); return; // nothing changed: keep the game, its history and its rights
  }
  const r = loadFromEditor(editBoard, turn, editBase);
  if (r.error) { say(r.error); return; }
  stopEditing(); chess = r.chess; selected = highlight = filter = null; say(''); refresh();
};
$('loadfen').onclick = () => {
  const r = loadPosition($('fen').value);
  if (r.error) { say(r.error); return; }
  leaveReview(); stopEditing(); chess = r.chess; selected = highlight = filter = null; say(''); refresh();
};
/** Typed move -> played move, accepting nc3 / 0-0 / oo / e2e4 as well as proper SAN. */
function playTyped(txt) {
  const tries = [txt];
  const castle = txt.replace(/[-\s]/g, '').toUpperCase().replace(/0/g, 'O');
  if (castle === 'OO') tries.push('O-O');
  if (castle === 'OOO') tries.push('O-O-O');
  if (/^[nbrqk]/.test(txt)) tries.push(txt[0].toUpperCase() + txt.slice(1)); // "bxc3" is tried as a pawn move first
  for (const t of tries) { try { return chess.move(t); } catch { /* try the next spelling */ } }
  const coord = txt.toLowerCase().match(/^([a-h][1-8])-?([a-h][1-8])=?([qrbn])?$/);
  if (coord) { try { return chess.move({ from: coord[1], to: coord[2], promotion: coord[3] || 'q' }); } catch { /* not legal */ } }
  return null;
}
$('moveform').onsubmit = (e) => {
  e.preventDefault();
  let txt = $('mvin').value.trim();
  if (!txt && speedMode() && chess.turn() === mySide()) txt = suggestion()?.san || '';
  if (!txt) return;
  if (!playTyped(txt)) {
    say(chess.isGameOver() ? 'The game is over.' : `"${txt}" is not a legal move here. Try e4, Nf3, exd5, O-O or e2e4.`);
    return;
  }
  $('mvin').value = ''; say(''); selected = highlight = null; refresh();
  if (speedMode() && matchMedia('(pointer: fine)').matches) $('mvin').focus(); // keep typing; phones keep the board visible
};
buildPlaystylePicker();
// the extension download is offered on the website only (not inside the extension itself)
if (/(^|\.)github\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) $('getext').hidden = false;
doc.querySelectorAll('#modes button').forEach((b) => { b.onclick = () => chooseMode(b.dataset.mode); });
applyMode();
if (currentOpening()) flipped = currentOpening().side === 'b';
$('playstyle').onchange = (e) => choosePlaystyle(e.target.value);
$('level').value = settings.level; $('warn').checked = settings.warn;
$('reviewtime').value = settings.reviewTime;
$('reviewtime').onchange = (e) => { settings.reviewTime = e.target.value; save(); };
// a game handed over from "Pop out" in a browser without floating windows
try {
  const handoff = localStorage.getItem('cc-handoff');
  if (handoff) { localStorage.removeItem('cc-handoff'); chess.loadPgn(handoff); }
} catch { /* start a new game */ }
$('engineon').checked = settings.engine; $('lines').value = settings.lines; $('depth').value = settings.depth;
$('level').onchange = (e) => { settings.level = e.target.value; save(); renderMoves(); };
$('warn').onchange = (e) => { settings.warn = e.target.checked; save(); renderMoves(); };
$('engineon').onchange = (e) => { settings.engine = e.target.checked; save(); eng.status = 'idle'; runEngine(); };
$('lines').onchange = (e) => { settings.lines = e.target.value; save(); runEngine(); };
$('depth').onchange = (e) => { settings.depth = e.target.value; save(); runEngine(); };
refresh();
