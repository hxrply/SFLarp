# Stockfish research notes

Sources: [Lichess blog "How does a chess engine work, in detail"](https://en.lichess.org/@/Daniel_Bernoulli/blog/how-does-a-chess-engine-work-in-detail/Jp71eySC),
[Stockfish NNUE announcement](https://stockfishchess.org/blog/2020/introducing-nnue-evaluation/),
[Stockfish 12 release](https://stockfishchess.org/blog/2020/stockfish-12/).

## What Stockfish does
- **Alpha-beta search** (PVS): explores the move tree, cutting off branches that cannot beat a line already found.
- **Move ordering**: tries likely-best moves first (captures, killers, history) so more cutting-off happens.
- **Pruning / reductions / extensions**: skips or shortens "boring" lines, lengthens forcing ones.
- **Evaluation**: since v12 an **NNUE** neural net scores positions (cheap to update incrementally per move).
- **Output**: a *principal variation* + a score. With UCI `MultiPV` it reports several top lines.
- Talks to GUIs through the **UCI** protocol.

## Why that is "cheating" for a human
Its whole job is to rank moves and name one best. That's the opposite of building your own judgement.

## What this app does instead
| Stockfish | Chess Companion |
|---|---|
| Deep search, ranks moves by score | No search ranking at all; moves are listed by piece, then square |
| One best move + eval | Lists **every** legal move with neutral tags (check, capture, threat, fork, discovery, development, castle, promotion) |
| Silent about threats | "Watch out" panel: hanging pieces, pins, mate-in-1 threats against you |
| - | Optional blunder warnings (leaves piece en prise, allows mate in 1, stalemate) so you can still see the possibilities but stay out of obvious holes |
| - | "Awareness only" mode hides the move list entirely and just shows the board's themes |

## Technique used (all shallow, explainable)
- Attack/defend maps from board geometry (no pins/x-rays) + a **swap-off exchange calculation** to decide if a piece is really en prise.
- 1-ply look at each move's result, plus one reply check for "allows mate in 1".
- Absolute-pin detection along king lines.

## Known limits
No x-ray attackers, no deep tactics (combinations beyond 1-2 plies), no positional/pawn-structure evaluation. Auto-queens on promotion.

## Update: engine mode
The app now bundles Stockfish.js 19 (lite NNUE net, single-threaded WASM, ~1.9 MB) and talks to it over UCI (`uci`, `setoption MultiPV`, `position fen`, `go depth N`, `stop`). Scores are converted to White's point of view; a search being replaced is `stop`ped and its late `bestmove` is used to start the queued one, so output from an old position is never shown for a new one. The awareness layer is unchanged and still never ranks moves; the engine's picks are shown separately (star chips, arrows, engine card).
