# Chess Companion

A pocket chess helper: every legal move explained, plus Stockfish's best lines.

**Live page (GitHub Pages):** https://hxrply.github.io/SFLarp/

## What it does
- **Engine suggestions** – Stockfish 19 (in your browser, nothing is sent anywhere) shows its top 1–5 lines with scores, draws arrows on the board and stars its picks in the move list.
- **Look around** – your hanging/loose pieces, pins, mate threats, targets in their camp, opening checklist.
- **All legal moves**, grouped by piece (never ranked), tagged: check, capture, threat, fork, discovery, defence, development, castling, promotion. Optional blunder warnings.
- **Edit position** – place, move or remove *any* piece for either side, pick who moves, then analyse. Handy for "what if they had a knight there".
- Type moves (`e4`, `Nf3`, `O-O`) or tap squares to mirror a live game. Load/copy any FEN. Flip the board.

Engine suggestions can be switched off in Settings (then it is awareness-only).

## Turning on GitHub Pages (one-time)
Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `claude/dazzling-carson-fxnb5n`, folder `/ (root)` → Save.**
After a minute the page is at `https://hxrply.github.io/SFLarp/`. Open it on your phone and use *Add to Home Screen*.

The engine runs in a Web Worker, so the page must be served over http(s) (GitHub Pages is fine). Opening `index.html` straight from disk still works, but only the awareness features; the engine card says so.

## Fair play
Don't use engine suggestions in rated or live games on sites such as chess.com or lichess (it breaks their fair-play rules and gets accounts closed). Use it for analysis, practice, and games with friends who agree to it.

## Dev
```
node build.mjs                    # src/ + vendor/chess.js -> index.html
node --test tests/*.test.mjs
python3 -m http.server 8000       # then open http://localhost:8000/
```
See [NOTES.md](NOTES.md) for how Stockfish works and how the awareness layer differs.

## Third-party code
- `vendor/chess.js` – [chess.js](https://github.com/jhlywa/chess.js) 1.0.0-beta.8 (BSD-2, `vendor/chess.js.LICENSE`).
- `vendor/stockfish/` – [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19, built from [Stockfish](https://github.com/official-stockfish/Stockfish): the lite single-threaded WebAssembly build, plus the pure-JavaScript (asm.js) build used automatically when a host blocks WebAssembly or the `.wasm` is missing. **GPL-3.0**, see `vendor/stockfish/Copying.txt`.
