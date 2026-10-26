// Thin wrapper around Stockfish.js (UCI over postMessage) plus helpers for reading its output.
import { Chess } from '../vendor/chess.js';

// Tried in order: the fast WebAssembly build, then the pure-JavaScript build for hosts that block WebAssembly.
export const ENGINE_BUILDS = [
  { name: 'Stockfish 19', url: 'vendor/stockfish/stockfish-19-lite-single.js', wasm: 'vendor/stockfish/stockfish-19-lite-single.wasm' },
  { name: 'Stockfish 19 (backup engine, slower)', url: 'vendor/stockfish/stockfish-19-asm.js' },
];

/** False when this page cannot run WebAssembly (e.g. a strict Content-Security-Policy) or the .wasm file is missing. */
async function wasmUsable(wasmUrl) {
  try { new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); } catch { return false; }
  try { return (await fetch(wasmUrl, { method: 'HEAD' })).status !== 404; } catch { return true; } // unknown: let the worker try
}

/** Start the first build that works. Resolves to a ready Engine (with .name) or rejects with the last error. */
export async function startEngine(builds = ENGINE_BUILDS) {
  let lastError = new Error('The engine could not be loaded.');
  for (const b of builds) {
    if (b.wasm && !(await wasmUsable(b.wasm))) continue;
    const engine = new Engine(b.url);
    try { await engine.start(); engine.name = b.name; return engine; } catch (e) { lastError = e; }
  }
  throw lastError;
}

/** Parse one UCI "info ... pv ..." line. Returns null for lines without a usable score + pv. */
export function parseInfo(line) {
  if (!line.startsWith('info ')) return null;
  const t = line.split(' ');
  const o = { multipv: 1 };
  for (let i = 1; i < t.length; i++) {
    switch (t[i]) {
      case 'depth': o.depth = Number(t[++i]); break;
      case 'multipv': o.multipv = Number(t[++i]); break;
      case 'score': {
        const kind = t[++i];
        o.score = { [kind]: Number(t[++i]) };
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') { o.bound = true; i++; }
        break;
      }
      case 'pv': o.pv = t.slice(i + 1); i = t.length; break;
    }
  }
  return o.score && o.pv && o.pv.length && !o.bound ? o : null;
}

/** Score from White's point of view, as text. `turn` is the side to move in the analysed position. */
export function fmtScore(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  if (score.mate !== undefined) {
    const m = score.mate * sign;
    return m > 0 ? `#${m}` : `#-${Math.abs(m)}`;
  }
  const cp = score.cp * sign;
  return `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;
}

/** White-POV number for colouring (mates count as huge). */
export function scoreValue(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  return score.mate !== undefined ? Math.sign(score.mate * sign) * 10000 : score.cp * sign;
}

/** Convert a UCI principal variation into SAN moves, stopping at the first illegal one. */
export function pvToSan(fen, pv, max = 8) {
  const c = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, max)) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return out;
}

export class Engine {
  constructor(url) {
    this.url = url;
    this.worker = null;
    this.ready = null;
    this.job = null;      // job whose output we are showing
    this.queued = null;   // next job, started once the running search has stopped
    this.running = false;
  }

  /** Resolves once the engine answers `readyok`. Rejects (and shuts the worker down) on failure or timeout. */
  start(timeoutMs = 20000) {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const fail = (msg) => { clearTimeout(timer); this.terminate(); reject(new Error(msg)); };
      // a missing or broken .wasm fails inside the worker without an error event, so also time out
      const timer = setTimeout(() => fail('The engine did not start (its .wasm file may be missing).'), timeoutMs);
      try { this.worker = new Worker(this.url); } catch (e) { fail(e.message || 'The engine could not be loaded.'); return; }
      this.worker.onerror = (e) => fail(e.message || 'The engine could not be loaded.');
      this.worker.onmessage = (ev) => this.onLine(String(ev.data), () => { clearTimeout(timer); resolve(); });
      this.send('uci');
    });
    return this.ready;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.job = this.queued = null;
    this.running = false;
  }

  send(cmd) { this.worker?.postMessage(cmd); }

  onLine(line, resolve) {
    if (line === 'uciok') this.send('isready');
    else if (line === 'readyok') resolve();
    else if (line.startsWith('bestmove')) {
      this.running = false;
      const job = this.job;
      if (this.queued) this.flush();
      else if (job) job.onDone?.({ rejected: job.rejected === true });
    } else if (this.job && line.startsWith('info string') && /error|unsupported/i.test(line)) {
      this.job.rejected = true;
    } else if (this.job) {
      const info = parseInfo(line);
      if (info) this.job.onInfo(info);
    }
  }

  flush() {
    const j = this.queued;
    this.queued = null;
    this.job = j;
    this.running = true;
    this.send(`setoption name MultiPV value ${j.lines}`);
    this.send(`position fen ${j.fen}`);
    this.send(j.movetime ? `go movetime ${j.movetime}` : `go depth ${j.depth}`);
  }

  /** Analyse {fen, depth | movetime (ms), lines, onInfo(info), onDone({rejected})}. Replaces any search in progress. */
  analyze(job) {
    this.job = null;           // drop output from the search being replaced
    this.queued = job;
    if (this.running) this.send('stop'); else this.flush();
  }

  stop() {
    this.job = null;
    this.queued = null;
    if (this.running) this.send('stop');
  }
}
