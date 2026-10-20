# Chess Companion

A pocket "awareness coach" in the spirit of Stockfish, but it **shows possibilities instead of the best move**.

Open `index.html` in any browser (works offline, fine on a phone; or host it on GitHub Pages).

- Tap pieces to play moves for **both** sides and mirror your real game (or load a FEN).
- *Look around*: your hanging/loose pieces, pins, mate threats, targets in their camp, opening checklist.
- *All legal moves*, grouped by piece (never ranked), tagged: check, capture, threat, fork, discovery, defence, development, castling, promotion.
- Optional blunder warnings; "Awareness only" mode hides the move list.

See [NOTES.md](NOTES.md) for the Stockfish research and design.

## Dev
```
node build.mjs     # src/ + vendor/ -> index.html (single file)
node --test tests/
```
`vendor/chess.js` is [chess.js](https://github.com/jhlywa/chess.js) 1.0.0-beta.8 (BSD-2, see `vendor/chess.js.LICENSE`).
