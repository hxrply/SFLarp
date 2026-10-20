import { Chess } from '../vendor/chess.js';
import { analyze, sqName } from './awareness.js';
import { Engine, ENGINE_URL, fmtScore, scoreValue, pvToSan } from './engine.js';
import { loadFromEditor } from './editor.js';

const $ = (id) => document.getElementById(id);
const GLYPH = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
const PIECE_NAME = { k: 'King', q: 'Queen', r: 'Rooks', b: 'Bishops', n: 'Knights', p: 'Pawns' };
const THEMES = [['check', 'Checks'], ['capture', 'Captures'], ['threat', 'Threats'], ['fork', 'Forks'], ['discover', 'Discoveries'], ['defend', 'Defensive'], ['develop', 'Development'], ['castle', 'Castling'], ['promo', 'Promotions']];
const PRIORITY = ['mate', 'check', 'fork', 'capture', 'threat', 'discover', 'defend', 'promo', 'castle', 'develop', 'center'];
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

let chess = new Chess();
let flipped = false, selected = null, highlight = null, info = null, filter = null;
// editor
let editing = false, editBoard = null, editTool = 'hand', handFrom = null;
// engine
let engine = null, engineToken = 0, engineTimer = 0;
let eng = { status: 'idle', lines: [], depth: 0, fen: '', turn: 'w', msg: '' };

const settings = { level: '2', warn: true, engine: true, lines: '3', depth: '16' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('cc-settings') || '{}')); } catch {}
const save = () => { try { localStorage.setItem('cc-settings', JSON.stringify(settings)); } catch {} };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kindOf = (m) => PRIORITY.find((k) => m.tags.some((t) => t.kind === k));
const squareIndex = (n) => (8 - Number(n[1])) * 8 + 'abcdefgh'.indexOf(n[0]);
const say = (t) => { $('msg').textContent = t; };

/* ---------- engine ---------- */
const engineMove = (line) => ({ from: line.pv[0].slice(0, 2), to: line.pv[0].slice(2, 4) });
function enginePick(m) {
  if (!settings.engine) return -1;
  return eng.lines.findIndex((l) => l && l.pv[0].slice(0, 2) === m.from && l.pv[0].slice(2, 4) === m.to);
}

function runEngine() {
  clearTimeout(engineTimer);
  const token = ++engineToken;
  if (editing || !settings.engine || info.gameOver) {
    engine?.stop();
    eng = { status: settings.engine ? 'idle' : 'off', lines: [], depth: 0, fen: '', turn: chess.turn(), msg: '' };
    renderEngine(); drawArrows(); renderMoves();
    return;
  }
  eng = { status: eng.status === 'error' ? 'error' : 'thinking', lines: [], depth: 0, fen: chess.fen(), turn: chess.turn(), msg: eng.msg };
  renderEngine(); drawArrows(); renderMoves();
  if (eng.status === 'error') return;
  engineTimer = setTimeout(async () => {
    try {
      engine ||= new Engine(ENGINE_URL);
      await engine.start();
    } catch (e) {
      engine = null;
      eng = { ...eng, status: 'error', msg: location.protocol === 'file:'
        ? 'The engine cannot start from a local file. Open the hosted page (GitHub Pages) instead.'
        : 'The engine could not be loaded.' };
      renderEngine();
      return;
    }
    if (token !== engineToken) return;
    const fen = chess.fen();
    let topKey = '';
    engine.analyze({
      fen,
      depth: Number(settings.depth),
      lines: Math.max(1, Math.min(Number(settings.lines), info.moves.length)),
      onInfo(i) {
        if (token !== engineToken) return;
        eng.lines[i.multipv - 1] = { depth: i.depth, score: i.score, pv: i.pv };
        eng.depth = Math.max(eng.depth, i.depth);
        renderEngine();
        const key = eng.lines.map((l) => l && l.pv[0]).join(',');
        if (key !== topKey) { topKey = key; drawArrows(); renderMoves(); }
      },
      onDone() { if (token === engineToken) { eng.status = 'done'; renderEngine(); } },
    });
  }, 150);
}

function renderEngine() {
  const el = $('engine');
  if (editing) { el.hidden = true; return; }
  el.hidden = false;
  if (!settings.engine) { el.innerHTML = '<h2>Engine</h2><div class="mute">Engine suggestions are off. Turn them on in Settings to see Stockfish\'s best lines.</div>'; return; }
  if (info.gameOver) { el.innerHTML = '<h2>Engine</h2><div class="mute">Game over.</div>'; return; }
  if (eng.status === 'error') { el.innerHTML = `<h2>Engine</h2><div class="bad">${esc(eng.msg)}</div>`; return; }
  const state = eng.status === 'done' ? `depth ${eng.depth}` : eng.lines.length ? `thinking… depth ${eng.depth}/${settings.depth}` : 'starting engine…';
  const rows = eng.lines.map((l, r) => {
    if (!l) return '';
    const san = pvToSan(eng.fen, l.pv, 8);
    if (!san.length) return '';
    const v = scoreValue(l.score, eng.turn);
    return `<div class="eline" data-r="${r}"><span class="rank">${r + 1}</span><span class="ev ${v > 30 ? 'pos' : v < -30 ? 'neg' : ''}">${fmtScore(l.score, eng.turn)}</span><span class="pv"><b>${esc(san[0])}</b> ${esc(san.slice(1).join(' '))}</span></div>`;
  }).join('');
  el.innerHTML = `<h2>Stockfish 19 &middot; <span class="mute" style="text-transform:none;letter-spacing:0">${state}</span></h2>${rows || '<div class="mute">Working out the best moves…</div>'}
   <div class="mute" style="font-size:12px;margin-top:6px">Scores are from White's side (+ is better for White, #3 is mate in 3). Tap a line to see its first move.</div>`;
  el.querySelectorAll('.eline').forEach((row) => {
    row.onclick = () => { const m = engineMove(eng.lines[row.dataset.r]); selected = m.from; highlight = [m.from, m.to]; renderBoard(); };
  });
}

function drawArrows() {
  const svg = $('arrows');
  if (editing || !settings.engine || info.gameOver) { svg.innerHTML = ''; return; }
  const pt = (name) => {
    const i = squareIndex(name), r = Math.floor(i / 8), f = i % 8;
    return [(flipped ? 7 - f : f) + 0.5, (flipped ? 7 - r : r) + 0.5];
  };
  let out = '';
  eng.lines.forEach((l, k) => {
    if (!l) return;
    const m = engineMove(l);
    const [x1, y1] = pt(m.from), [x2, y2] = pt(m.to);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const head = 0.34, w = k === 0 ? 0.15 : 0.1, color = k === 0 ? '#5ac98f' : '#5aa9e6', op = k === 0 ? 0.9 : 0.65;
    const bx = x2 - ux * head, by = y2 - uy * head, px = -uy, py = ux;
    out += `<g opacity="${op}" fill="${color}" stroke="${color}"><line x1="${x1 + ux * 0.2}" y1="${y1 + uy * 0.2}" x2="${bx}" y2="${by}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<polygon points="${x2},${y2} ${bx + px * 0.17},${by + py * 0.17} ${bx - px * 0.17},${by - py * 0.17}" stroke="none"/></g>`;
  });
  svg.innerHTML = out;
}

/* ---------- core ---------- */
function refresh() {
  info = analyze(chess);
  render();
  runEngine();
}

function render() {
  renderBoard(); renderStatus(); renderAware(); renderMoves(); renderEngine(); drawArrows();
  $('fen').value = chess.fen();
}

function renderBoard() {
  const b = $('board'); b.innerHTML = '';
  const dests = new Map();
  if (!editing && selected) for (const m of info.moves) if (m.from === selected) dests.set(m.to, m);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rr = flipped ? 7 - r : r, ff = flipped ? 7 - f : f;
    const name = sqName(rr * 8 + ff);
    const p = editing ? editBoard[rr * 8 + ff] : (() => { const x = chess.get(name); return x && { t: x.type, c: x.color }; })();
    const d = document.createElement('div');
    const picked = editing && handFrom === rr * 8 + ff;
    d.className = `sq ${(rr + ff) % 2 ? 'd' : 'l'}${(name === selected && !editing) || picked ? ' sel' : ''}${!editing && highlight && highlight.includes(name) ? ' hl' : ''}`;
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
  const side = chess.turn() === 'w' ? 'White' : 'Black';
  let t = `${side} to move`;
  if (info.gameOver === 'checkmate') t = `Checkmate &mdash; ${side === 'White' ? 'Black' : 'White'} wins`;
  else if (info.gameOver) t = `Game over: ${info.gameOver}`;
  else if (info.position.inCheck) t += ' &mdash; <b class="bad">in check</b>';
  $('status').innerHTML = t;
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
  const themes = [['Checks', c.checks], ['Captures', c.captures], ['Threats', c.threats], ['Forks', c.forks], ['Promotions', c.promotions], ['Castling', c.castles]];
  el.innerHTML = `<h2>Look around &mdash; ${you}</h2>
   <div>Material: ${p.material.you} vs ${p.material.them} (<b class="${p.material.diff < 0 ? 'bad' : p.material.diff > 0 ? 'good' : ''}">${sign}</b>) &middot; ${c.total} legal moves${p.theirChecks ? ` &middot; they have ${p.theirChecks} check${p.theirChecks > 1 ? 's' : ''} available` : ''}</div>
   ${danger.length ? `<h2 style="margin-top:10px">Watch out</h2>${list(danger, 'bad')}` : ''}
   ${own.length ? `<h2>Soft spots</h2>${list(own)}` : ''}
   ${chances.length ? `<h2>Opportunities in their camp</h2>${list(chances)}` : ''}
   ${open.length ? `<h2>Opening checklist</h2>${list(open)}` : ''}
   <h2>Ideas available this move</h2>
   <div class="mute" style="font-size:13px">${themes.filter(([, n]) => n).map(([name, n]) => `${name}: ${n}`).join(' &middot; ') || 'No tactics on the board &mdash; quiet position.'}</div>`;
}

const matchesFilter = (m, f) => (f === 'engine' ? enginePick(m) >= 0 : m.tags.some((t) => t.kind === f));

function renderMoves() {
  const el = $('moves');
  if (editing) { el.hidden = true; return; }
  el.hidden = false;
  if (info.gameOver) { el.innerHTML = ''; return; }
  if (settings.level === '1') { el.innerHTML = '<h2>Moves</h2><div class="mute">The move list is hidden. Switch "Move list" in Settings to see it.</div>'; return; }
  const present = THEMES.filter(([k]) => info.moves.some((m) => m.tags.some((t) => t.kind === k)));
  const hasEngine = info.moves.some((m) => enginePick(m) >= 0);
  let html = `<h2>All ${info.moves.length} legal moves</h2><div class="themes">
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
      const star = pick >= 0 ? `<span class="chip k-engine">★ Engine #${pick + 1}</span>` : '';
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
const gridOf = (c) => c.board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));
const START_GRID = gridOf(new Chess(START_FEN));

function buildPalette() {
  const tools = [['hand', '✋ Move'], ...['w', 'b'].flatMap((c) => ['k', 'q', 'r', 'b', 'n', 'p'].map((t) => [c + t, GLYPH[c + t]])), ['x', '✕']];
  $('palette').innerHTML = tools.map(([k, label]) => `<button type="button" data-t="${k}" class="${k[0] === 'w' || k[0] === 'b' ? k[0] : ''}${k === editTool ? ' on' : ''}" aria-label="${k}">${label}</button>`).join('');
  $('palette').querySelectorAll('button').forEach((b) => { b.onclick = () => { editTool = b.dataset.t; handFrom = null; buildPalette(); renderBoard(); }; });
}

function startEditing() {
  editing = true; selected = highlight = handFrom = null;
  editBoard = gridOf(chess); editTool = 'hand';
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
$('undo').onclick = () => { if (editing) return; chess.undo(); selected = highlight = null; say(''); refresh(); };
$('flip').onclick = () => { flipped = !flipped; render(); };
$('edit').onclick = () => (editing ? ($('ecancel').onclick()) : startEditing());
$('new').onclick = () => { stopEditing(); chess = new Chess(); selected = highlight = filter = null; say(''); refresh(); };
$('eclear').onclick = () => { editBoard = Array(64).fill(null); handFrom = null; say(''); renderBoard(); };
$('estart').onclick = () => { editBoard = START_GRID.map((p) => p && { ...p }); $('editturn').value = 'w'; handFrom = null; say(''); renderBoard(); };
$('ereset').onclick = () => { editBoard = gridOf(chess); $('editturn').value = chess.turn(); handFrom = null; say(''); renderBoard(); };
$('ecancel').onclick = () => { stopEditing(); say(''); refresh(); };
$('edone').onclick = () => {
  const r = loadFromEditor(editBoard, $('editturn').value);
  if (r.error) { say(r.error); return; }
  stopEditing(); chess = r.chess; selected = highlight = filter = null; say(''); refresh();
};
$('loadfen').onclick = () => {
  try { const c = new Chess($('fen').value.trim()); stopEditing(); chess = c; selected = highlight = null; say(''); refresh(); }
  catch { say('That FEN is not valid.'); }
};
$('moveform').onsubmit = (e) => {
  e.preventDefault();
  const txt = $('mvin').value.trim();
  if (!txt) return;
  try { chess.move(txt); } catch { say(`"${txt}" is not a legal move here.`); return; }
  $('mvin').value = ''; say(''); selected = highlight = null; refresh();
};
$('level').value = settings.level; $('warn').checked = settings.warn;
$('engineon').checked = settings.engine; $('lines').value = settings.lines; $('depth').value = settings.depth;
$('level').onchange = (e) => { settings.level = e.target.value; save(); renderMoves(); };
$('warn').onchange = (e) => { settings.warn = e.target.checked; save(); renderMoves(); };
$('engineon').onchange = (e) => { settings.engine = e.target.checked; save(); eng.status = 'idle'; runEngine(); };
$('lines').onchange = (e) => { settings.lines = e.target.value; save(); runEngine(); };
$('depth').onchange = (e) => { settings.depth = e.target.value; save(); runEngine(); };
refresh();
