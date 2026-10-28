# SFLarp

A pocket chess helper: every legal move explained, plus Stockfish's best lines.

**Live:** https://hxrply.github.io/SFLarp/

## What it does
- **Engine suggestions** – Stockfish 19 (in your browser, nothing is sent anywhere) shows its top 1–5 lines with scores, draws arrows on the board and stars its picks in the move list.
- **Look around** – your hanging/loose pieces, pins, mate threats, targets in their camp, opening checklist.
- **All legal moves**, grouped by piece (never ranked), tagged: check, capture, threat, fork, discovery, defence, development, castling, promotion. Optional blunder warnings.
- **Playstyle** – pick an opening to follow: Queen's Gambit, London System, Italian Game, Ruy Lopez, Scholar's Mate, Fried Liver Attack or King's Gambit as White; Caro-Kann, Sicilian Dragon, French, Scandinavian, King's Indian, Queen's Gambit Declined or Accepted as Black. SFLarp shows the next book move with what it is for (gold arrow, "Play" button), the replies to expect, tells you when either side leaves the book and which other playstyles fit, plus the middlegame plan. Positions are matched, so transpositions count. Choose *None* to use SFLarp without one.
- **Game modes** – *Analysis* (everything), *Blitz 3 min* and *Bullet 1 min*. The fast modes show one big card under the board: your move (or the reply to expect on their turn), the next moves in advance, forced-reply premoves and the most urgent danger; the engine thinks for a fixed 1 s / 0.35 s, and Enter on an empty move box plays the suggestion.
- **Edit position** – place, move or remove *any* piece for either side, pick who moves, then analyse. Handy for "what if they had a knight there".
- Type moves (`e4`, `Nf3`, `O-O`) or tap squares to mirror a live game. Load/copy any FEN. Flip the board.

Engine suggestions can be switched off in Settings (then it is awareness-only).

## Browser extension
SFLarp also comes as an extension that opens in the browser's side panel, next to whatever tab you're on. It asks for no access to the sites you visit.

**Chrome, Edge, Brave, Opera**
1. Download [sflarp-extension.zip](https://hxrply.github.io/SFLarp/sflarp-extension.zip) and unzip it.
2. Open `chrome://extensions` (Edge: `edge://extensions`) and switch on **Developer mode**.
3. Click **Load unpacked** and choose the unzipped folder (the one containing `manifest.json`).
4. Pin SFLarp from the puzzle-piece menu, then click its icon to open the side panel.

**Firefox**: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and pick the zip. Firefox removes temporary add-ons when it restarts (a permanent install needs signing by Mozilla).

To update, download the new zip, replace the folder and press the reload button on the extensions page.

## Hosting
GitHub Pages serves the `gh-pages` branch at https://hxrply.github.io/SFLarp/ (`main` holds the same code, like the other hxrply projects). After changing anything, rebuild and push the same commit to both branches:
```
node build.mjs && git push origin HEAD:main HEAD:gh-pages
```
On a phone, open the link and use *Add to Home Screen*; it then opens full screen like an app.

The engine runs in a Web Worker, so the page must be served over http(s). Opening `index.html` straight from disk still works, but only the awareness features; the engine card says so. If a host blocks WebAssembly, a slower pure-JavaScript Stockfish build takes over automatically.

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
