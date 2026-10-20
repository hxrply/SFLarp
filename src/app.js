import { Chess } from '../vendor/chess.js';
import { analyze, sqName } from './awareness.js';

const $ = (id) => document.getElementById(id);
const GLYPH = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
const PIECE_NAME = { k: 'King', q: 'Queen', r: 'Rooks', b: 'Bishops', n: 'Knights', p: 'Pawns' };
const THEMES = [['check', 'Checks'], ['capture', 'Captures'], ['threat', 'Threats'], ['fork', 'Forks'], ['discover', 'Discoveries'], ['defend', 'Defensive'], ['develop', 'Development'], ['castle', 'Castling'], ['promo', 'Promotions']];
const PRIORITY = ['mate', 'check', 'fork', 'capture', 'threat', 'discover', 'defend', 'promo', 'castle', 'develop', 'center'];

let chess = new Chess();
let flipped = false, selected = null, highlight = null, info = null, filter = null;
const settings = { level: '2', warn: true };
try { Object.assign(settings, JSON.parse(localStorage.getItem('cc-settings') || '{}')); } catch {}
const save = () => { try { localStorage.setItem('cc-settings', JSON.stringify(settings)); } catch {} };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kindOf = (m) => PRIORITY.find((k) => m.tags.some((t) => t.kind === k));

function refresh() {
  info = analyze(chess);
  render();
}

function render() {
  renderBoard(); renderStatus(); renderAware(); renderMoves();
  $('fen').value = chess.fen();
}

function renderBoard() {
  const b = $('board'); b.innerHTML = '';
  const dests = new Map();
  if (selected) for (const m of info.moves) if (m.from === selected) dests.set(m.to, m);
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rr = flipped ? 7 - r : r, ff = flipped ? 7 - f : f;
    const name = sqName(rr * 8 + ff), p = chess.get(name);
    const d = document.createElement('div');
    d.className = `sq ${(rr + ff) % 2 ? 'd' : 'l'}${name === selected ? ' sel' : ''}${highlight && highlight.includes(name) ? ' hl' : ''}`;
    d.dataset.sq = name;
    if (p) d.innerHTML = `<span class="p ${p.color}">${GLYPH[p.color + p.type]}</span>`;
    if (dests.has(name)) {
      const k = kindOf(dests.get(name));
      d.insertAdjacentHTML('beforeend', `<span class="dot" style="${k ? `background:var(--${k});opacity:.85` : ''}"></span>`);
    }
    if (f === 0) d.insertAdjacentHTML('beforeend', `<span class="coord">${8 - rr}</span>`);
    d.onclick = () => onSquare(name);
    b.appendChild(d);
  }
}

function onSquare(name) {
  const mv = selected && info.moves.find((m) => m.from === selected && m.to === name);
  if (mv) {
    chess.move({ from: mv.from, to: mv.to, promotion: mv.promotion ? 'q' : undefined }); // auto-queen
    selected = null; highlight = null; refresh(); return;
  }
  const p = chess.get(name);
  selected = p && p.color === chess.turn() && selected !== name ? name : null;
  highlight = null; render();
}

function renderStatus() {
  const side = chess.turn() === 'w' ? 'White' : 'Black';
  let t = `${side} to move`;
  if (info.gameOver === 'checkmate') t = `Checkmate &mdash; ${side === 'White' ? 'Black' : 'White'} wins`;
  else if (info.gameOver) t = `Game over: ${info.gameOver}`;
  else if (info.position.inCheck) t += ' &mdash; <b class="bad">in check</b>';
  $('status').innerHTML = t;
}

const list = (items, cls = '') => (items.length ? `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');

function renderAware() {
  const p = info.position, c = info.counts, you = p.turn === 'w' ? 'White' : 'Black';
  const el = $('aware');
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
  const themes = THEMES.map(([k, n]) => [k, n, k === 'check' ? c.checks : k === 'capture' ? c.captures : k === 'threat' ? c.threats : k === 'fork' ? c.forks : k === 'promo' ? c.promotions : k === 'castle' ? c.castles : null]);
  el.innerHTML = `<h2>Look around &mdash; ${you}</h2>
   <div>Material: ${p.material.you} vs ${p.material.them} (<b class="${p.material.diff < 0 ? 'bad' : p.material.diff > 0 ? 'good' : ''}">${sign}</b>) &middot; ${c.total} legal moves${p.theirChecks ? ` &middot; they have ${p.theirChecks} check${p.theirChecks > 1 ? 's' : ''} available` : ''}</div>
   ${danger.length ? `<h2 style="margin-top:10px">Watch out</h2>${list(danger, 'bad')}` : ''}
   ${own.length ? `<h2>Soft spots</h2>${list(own)}` : ''}
   ${chances.length ? `<h2>Opportunities in their camp</h2>${list(chances)}` : ''}
   ${open.length ? `<h2>Opening checklist</h2>${list(open)}` : ''}
   <h2>Ideas available this move</h2>
   <div class="mute" style="font-size:13px">${themes.filter(([, , n]) => n).map(([, name, n]) => `${name}: ${n}`).join(' &middot; ') || 'No tactics on the board &mdash; quiet position.'}</div>`;
}

function renderMoves() {
  const el = $('moves');
  if (info.gameOver) { el.innerHTML = ''; return; }
  if (settings.level === '1') { el.innerHTML = '<h2>Moves</h2><div class="mute">Awareness-only mode: legal moves are hidden. Switch Detail to see them.</div>'; return; }
  const present = THEMES.filter(([k]) => info.moves.some((m) => m.tags.some((t) => t.kind === k)));
  let html = `<h2>All ${info.moves.length} legal moves</h2><div class="themes">
    ${present.map(([k, n]) => `<span class="chip k-${k}${filter && filter !== k ? ' off' : ''}" data-f="${k}">${n}</span>`).join('')}
    ${filter ? '<span class="chip" data-f="" style="--c:#667">show all</span>' : ''}</div>`;
  const groups = {};
  for (const m of info.moves) if (!filter || m.tags.some((t) => t.kind === filter)) (groups[m.piece] ||= []).push(m);
  for (const k of ['k', 'q', 'r', 'b', 'n', 'p']) {
    if (!groups[k]) continue;
    html += `<div class="grp">${PIECE_NAME[k]}</div>`;
    for (const m of groups[k]) {
      const idx = info.moves.indexOf(m);
      const chips = m.tags.map((t) => `<span class="chip k-${t.kind}" title="${esc(t.text)}">${esc(t.text)}</span>`).join('');
      let verdict = '';
      if (settings.warn && m.net !== null) verdict = m.net > 0 ? ' <span class="good">(wins material)</span>' : m.net === 0 ? ' <span class="mute">(even trade)</span>' : '';
      const warns = settings.warn ? m.warn.map((w) => `<span class="chip warn">⚠ ${esc(w)}</span>`).join('') : '';
      html += `<div class="mv" data-i="${idx}"><b>${esc(m.san)}</b>${chips}${verdict}${warns}</div>`;
    }
  }
  el.innerHTML = html;
  el.querySelectorAll('[data-f]').forEach((c) => { c.onclick = () => { filter = c.dataset.f || null; renderMoves(); }; });
  el.querySelectorAll('.mv').forEach((row) => {
    row.onclick = () => { const m = info.moves[row.dataset.i]; selected = m.from; highlight = [m.from, m.to]; renderBoard(); };
  });
}

$('undo').onclick = () => { chess.undo(); selected = highlight = null; refresh(); };
$('flip').onclick = () => { flipped = !flipped; render(); };
$('new').onclick = () => { chess = new Chess(); selected = highlight = filter = null; refresh(); };
$('loadfen').onclick = () => {
  try { chess = new Chess($('fen').value.trim()); selected = highlight = null; refresh(); }
  catch { alert('That FEN is not valid.'); }
};
$('level').value = settings.level; $('warn').checked = settings.warn;
$('level').onchange = (e) => { settings.level = e.target.value; save(); renderMoves(); };
$('warn').onchange = (e) => { settings.warn = e.target.checked; save(); renderMoves(); };
refresh();
