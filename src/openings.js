// Playstyles: opening repertoires the user can choose to follow. Each has book lines (main line plus the
// replies an opponent is likely to try), a short note for each of "your" moves and a middlegame plan.
// Book lookups are by position, so transpositions are recognised.
import { Chess } from '../vendor/chess.js';

export const OPENINGS = [
  {
    id: 'queens-gambit', name: "Queen's Gambit", side: 'w', style: 'Classical',
    summary: 'Play d4 and c4, offering a wing pawn so Black gives up the centre.',
    plan: [
      'Control the centre squares e4 and d5 with pawns and knights.',
      'Develop in this order: Nc3, Nf3, Bg5 (or Bf4), e3, Bd3, castle.',
      'If Black takes on c4, play e3 and Bxc4 to win the pawn back with a developing move.',
      'Middlegame: the minority attack (b4-b5) against Black\'s c6/d5 pawns, or the e4 push in the centre.',
    ],
    lines: [
      'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7',
      'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
      'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4',
      'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3',
      'd4 d5 c4 Nc6 Nf3 Bg4 cxd5 Bxf3 gxf3 Qxd5 e3',
      'd4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bg5 O-O e3',
      'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3',
      'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O',
      'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6',
      'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4',
    ],
    notes: {
      d4: 'Claim the centre with the queen\'s pawn.',
      c4: 'The gambit: attack d5 from the side. If Black takes, you win the pawn back later.',
      Nc3: 'Adds pressure on d5 and prepares e4.',
      Nf3: 'Develops and controls e5.',
      Bg5: 'Pins the f6 knight, the main defender of d5.',
      Bh4: 'Keeps the pin.',
      e3: 'Opens a path for the f1 bishop.',
      Bxc4: 'Wins the gambit pawn back while developing.',
      cxd5: 'Releases the tension to fix Black\'s pawn structure.',
      Bxe7: 'Trades off Black\'s good bishop.',
      a4: 'Stops ...b5, which would hold on to the extra c4 pawn.',
      g3: 'Fianchetto: the bishop on g2 will aim down the long diagonal.',
      Bg2: 'Bishop on the long diagonal, pressing on d5 and b7.',
      'O-O': 'Get the king safe before the middlegame.',
      gxf3: 'Recapture towards the centre; the open g-file can help later.',
      e4: 'Take the full centre while Black is still developing.',
      Be2: 'Simple development; castle next.',
      d5: 'Gain space and cramp Black\'s pieces.',
    },
  },
  {
    id: 'london', name: 'London System', side: 'w', style: 'Solid system',
    summary: 'The same easy setup against almost anything: d4, Bf4, e3, Nf3, c3, Nbd2, Bd3.',
    plan: [
      'Build the setup without worrying about Black\'s moves: d4, Bf4, e3, Nf3, c3, Nbd2, Bd3, castle.',
      'Play Bf4 before e3, otherwise e3 shuts the c1 bishop in.',
      'If Black plays ...Bd6 to trade bishops, retreat Bg3.',
      'Middlegame: Ne5 and f4 for a kingside attack, or Qc2 and h4 if Black castles early.',
    ],
    lines: [
      'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3',
      'd4 d5 Bf4 c5 e3 Nc6 c3 Nf6 Nd2 Qb6 Qb3',
      'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3',
      'd4 Nf6 Bf4 e6 e3 c5 c3 d5 Nd2 Nc6 Ngf3 Bd6 Bg3 O-O Bd3',
      'd4 Nf6 Bf4 d5 e3 e6 Nf3 Bd6 Bg3 O-O Bd3 c5 c3',
      'd4 e6 Bf4 d5 e3 Nf6 Nf3 c5 c3',
      'd4 f5 Bf4 Nf6 e3 e6 Nf3',
    ],
    notes: {
      d4: 'Claim the centre.',
      Bf4: 'The London bishop: out before e3 locks it in.',
      e3: 'Supports d4 and frees the f1 bishop.',
      Nf3: 'Develops and controls e5.',
      c3: 'Supports d4 and gives the bishop a retreat to c2 later.',
      Nbd2: 'Keeps c3 for the pawn and supports e4.',
      Nd2: 'Keeps c3 for the pawn and supports e4.',
      Ngf3: 'Develops and controls e5.',
      Bg3: 'Sidestep ...Bd6 so Black cannot trade on equal terms.',
      Bd3: 'Aims at Black\'s king side.',
      Be2: 'A quieter square when Black fianchettoes.',
      h3: 'Gives the bishop a home on h2 and stops ...Nh5 or ...Bg4.',
      Qb3: 'Meets ...Qb6 and protects b2.',
    },
  },
  {
    id: 'italian', name: 'Italian Game', side: 'w', style: 'Classical',
    summary: '1.e4 e5 2.Nf3 Nc6 3.Bc4: quick development with the bishop aimed at f7.',
    plan: [
      'Develop quickly: Nf3, Bc4, c3, d3, castle, Re1.',
      'Prepare d4 with c3 to build a big centre.',
      'Reroute the b1 knight: Nbd2-f1-g3 towards the kingside.',
      'Play a4 if Black tries ...b5 to chase the bishop.',
    ],
    lines: [
      'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3',
      'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1',
      'e4 e5 Nf3 Nc6 Bc4 Be7 d4 exd4 Nxd4 Nf6 Nc3 O-O O-O',
      'e4 e5 Nf3 d6 Bc4 Nf6 d3 Be7 O-O O-O c3',
      'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4',
    ],
    notes: {
      e4: 'Open lines for the queen and the f1 bishop.',
      Nf3: 'Develops and attacks e5.',
      Bc4: 'The Italian bishop, aimed at f7.',
      c3: 'Prepares d4.',
      d3: 'Solid: supports e4 and opens the c1 bishop.',
      d4: 'Strike in the centre while you are ahead in development.',
      Nxd4: 'Recapture with a centralised knight.',
      Nc3: 'Develops and covers d5.',
      'O-O': 'Castle before opening the position.',
      Re1: 'Supports e4 and prepares Nbd2-f1.',
      Bb3: 'Keeps the bishop safe from ...b5 and ...Na5.',
      Nxe5: 'Takes the pawn: Black usually wins it back.',
    },
  },
  {
    id: 'ruy-lopez', name: 'Ruy Lopez', side: 'w', style: 'Classical',
    summary: '1.e4 e5 2.Nf3 Nc6 3.Bb5: pressure e5 by attacking its defender.',
    plan: [
      'Keep the pressure on e5 by targeting the c6 knight.',
      'Prepare d4 with c3, and play h3 to stop ...Bg4.',
      'Reroute the b1 knight: Nbd2-f1-g3.',
      'In the Exchange variation you get the better pawn structure for the endgame.',
    ],
    lines: [
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
      'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4',
      'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
      'e4 e5 Nf3 Nc6 Bb5 Bc5 c3 Nf6 O-O O-O d4',
      'e4 e5 Nf3 Nc6 Bb5 d6 d4 Bd7 Nc3 Nf6 O-O',
    ],
    notes: {
      e4: 'Open lines for the queen and the f1 bishop.',
      Nf3: 'Develops and attacks e5.',
      Bb5: 'Attacks the knight that defends e5.',
      Ba4: 'Keep the pin; the bishop can drop back to b3 later.',
      Bb3: 'Bishop on the a2-g8 diagonal, eyeing f7.',
      Bxc6: 'The Exchange variation: damages Black\'s pawns.',
      'O-O': 'Castle; e4 is defended tactically for now.',
      Re1: 'Protects e4.',
      c3: 'Prepares d4 and a retreat square for the bishop.',
      h3: 'Stops ...Bg4 before playing d4.',
      d4: 'Open the centre while your king is safe.',
      dxe5: 'Gains space and kicks the knight.',
      Qxd8: 'Trades queens: Black loses the right to castle.',
      'Qxd8+': 'Trades queens: Black loses the right to castle.',
      Nc3: 'Develops and defends e4.',
    },
  },
  {
    id: 'scholars-mate', name: "Scholar's Mate", side: 'w', style: 'Trap',
    summary: 'Queen and bishop gang up on f7 for mate in 4. Works on beginners only.',
    warning: 'Good players punish this: your queen comes out early and gets chased. If Black defends f7, stop attacking and develop normally.',
    plan: [
      'Aim the queen (h5 or f3) and the c4 bishop at f7, which only Black\'s king defends.',
      'If Black defends with ...g6, ...Qe7, ...Qf6 or ...Nf6 in time, drop the attack.',
      'Then develop normally: Nf3 or Ne2, Nc3, d3, castle.',
    ],
    lines: [
      'e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#',
      'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#',
      'e4 e5 Bc4 Bc5 Qh5 Nf6 Qxf7#',
      'e4 e5 Bc4 Nc6 Qh5 g6 Qf3 Nf6 Ne2 Bg7 Nbc3 d6 d3',
      'e4 e5 Bc4 Bc5 Qh5 g6 Qf3 Nf6 Ne2',
      'e4 e5 Bc4 Nc6 Qh5 Qe7 Nc3 Nf6 Qh4',
      'e4 e5 Bc4 Nf6 d3 Bc5 Nf3 d6 O-O',
    ],
    notes: {
      e4: 'Opens the way for the queen and the f1 bishop.',
      Bc4: 'First attacker on f7.',
      Qh5: 'Second attacker on f7, and it hits e5 too. Threat: Qxf7#.',
      'Qxf7#': 'Checkmate.',
      Qf3: 'Renews the threat on f7 after ...g6 kicked the queen.',
      Qh4: 'The trap is defended: step back and develop.',
      Ne2: 'f7 is covered now; develop and castle.',
      Nbc3: 'Normal development.',
      Nc3: 'f7 is covered; develop instead of chasing.',
      d3: 'Solid: supports e4 and opens the c1 bishop.',
      Nf3: 'Black stopped the trap early: switch to a normal Italian setup.',
      'O-O': 'Castle and play a normal game.',
    },
  },
  {
    id: 'fried-liver', name: 'Fried Liver Attack', side: 'w', style: 'Aggressive',
    summary: 'Italian with 4.Ng5: hit f7 twice and sacrifice a knight if Black allows it.',
    plan: [
      'After 3...Nf6 play Ng5 to attack f7 twice.',
      'If Black recaptures ...Nxd5, sacrifice Nxf7! then Qf3+ and Nc3 to pile onto the pinned knight.',
      'If Black plays the best reply ...Na5, keep the extra pawn with Bb5+ and Be2.',
      'Against ...Bc5 the safe answer is Bxf7+ and Bd5.',
    ],
    lines: [
      'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3 Ncb4 a3 Nxc2+ Kd1 Nxa1 Nxd5',
      'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2 h6 Nf3 e4 Ne5',
      'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bd5',
      'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2',
    ],
    notes: {
      e4: 'Open lines for the queen and the f1 bishop.',
      Nf3: 'Develops and attacks e5.',
      Bc4: 'Aim at f7.',
      Ng5: 'Second attacker on f7.',
      exd5: 'Take back and keep the attack on f7.',
      Nxf7: 'The Fried Liver sacrifice: drag the king out.',
      'Qf3+': 'Check, and it attacks the pinned knight on d5.',
      Nc3: 'Third attacker on d5.',
      a3: 'Kick the b4 knight.',
      Kd1: 'Forced, but your attack continues.',
      Nxd5: 'Win the piece back with a strong attack.',
      'Bb5+': 'Keep the pawn and develop with check.',
      dxc6: 'Grab another pawn.',
      Be2: 'Safe square; you are a pawn up.',
      Nf3: 'Retreat the knight; it was attacked.',
      Ne5: 'A strong central outpost.',
      'Bxf7+': 'Take a pawn with check.',
      Bd5: 'Centralise the bishop; Black\'s king is stuck in the centre.',
      c3: 'Prepare d4 against ...Bc5.',
      d4: 'Strike in the centre.',
      cxd4: 'Big pawn centre.',
      Bd2: 'Block the check and offer a trade.',
    },
  },
  {
    id: 'kings-gambit', name: "King's Gambit", side: 'w', style: 'Aggressive',
    summary: '1.e4 e5 2.f4: sacrifice a pawn to open the f-file and grab the centre.',
    plan: [
      'Open the f-file and build a centre with d4.',
      'Castle kingside quickly and aim the rook and c4 bishop at f7.',
      'Win the f4 pawn back later, usually with Bxf4.',
    ],
    lines: [
      'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 Bc4 d5 exd5 Bd6',
      'e4 e5 f4 exf4 Nf3 d5 exd5 Nf6 Bb5+ c6 dxc6 bxc6 Bc4',
      'e4 e5 f4 exf4 Nf3 d6 d4 g5 h4 g4 Ng1',
      'e4 e5 f4 Bc5 Nf3 d6 c3 Nf6 d4 exd4 cxd4 Bb4+ Bd2',
      'e4 e5 f4 d5 exd5 e4 d3 Nf6 dxe4 Nxe4 Nf3',
    ],
    notes: {
      e4: 'Open lines for the queen and the f1 bishop.',
      f4: 'The gambit: offer the f-pawn to deflect e5.',
      Nf3: 'Develops and stops ...Qh4+.',
      h4: 'Undermine the g5 pawn that defends f4.',
      Ne5: 'The Kieseritzky knight: active and central.',
      Bc4: 'Aims at f7.',
      exd5: 'Take the central pawn.',
      'Bb5+': 'Develop with check.',
      dxc6: 'Grab material.',
      d4: 'Build the big centre.',
      Ng1: 'Retreat; the knight comes back out via e2 or c3.',
      c3: 'Prepares d4 against ...Bc5.',
      cxd4: 'Big pawn centre.',
      Bd2: 'Block the check.',
      d3: 'Challenge the advanced e4 pawn.',
      dxe4: 'Clear the centre.',
    },
  },
  {
    id: 'caro-kann', name: 'Caro-Kann Defence', side: 'b', style: 'Solid', answers: 'e4',
    summary: 'Against 1.e4 play ...c6 and ...d5: a rock-solid centre with no weaknesses.',
    plan: [
      'Support ...d5 with ...c6.',
      'Get the light-squared bishop out (...Bf5 or ...Bg4) before playing ...e6.',
      'Then ...e6, ...Nd7, ...Ngf6, castle.',
      'Against the Advance (e5) break with ...c5; your structure is very hard to attack.',
    ],
    lines: [
      'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7 h5 Bh7 Bd3 Bxd3 Qxd3 e6',
      'e4 c6 d4 d5 Nd2 dxe4 Nxe4 Bf5 Ng3 Bg6',
      'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6',
      'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7',
      'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7',
      'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6',
      'e4 c6 d3 d5 Nd2 e5 Ngf3 Bd6 g3 Nf6',
      'e4 c6 c4 d5 exd5 cxd5 cxd5 Nf6',
    ],
    notes: {
      c6: 'Prepares ...d5 with pawn support.',
      d5: 'Challenge e4 straight away.',
      dxe4: 'Release the tension and develop the bishop next.',
      Bf5: 'The good bishop comes out before ...e6 locks it in.',
      Bg6: 'Keeps the bishop; it can drop back to h7.',
      h6: 'Gives the bishop h7 if White pushes h5.',
      Nd7: 'Covers e5 and prepares ...Ngf6.',
      Bh7: 'Safe square for the bishop.',
      Bxd3: 'Trade off White\'s attacking bishop.',
      e6: 'Now ...e6: the bishop is already outside the pawn chain.',
      c5: 'Hit the base of White\'s pawn chain.',
      Nc6: 'Develops and adds pressure on d4.',
      cxd5: 'Symmetrical structure; develop actively.',
      Nf6: 'Develops and defends d5.',
      Bg4: 'Pins the f3 knight or annoys the queen.',
      Qd7: 'Protects b7 and connects the rooks.',
      Be7: 'Develop and castle.',
      Bxf3: 'Give the bishop for the knight to keep ...e6 and ...d5 solid.',
      e5: 'Against a slow setup take the centre with ...e5.',
      Bd6: 'Develops and protects e5.',
    },
  },
  {
    id: 'sicilian-dragon', name: 'Sicilian Dragon', side: 'b', style: 'Aggressive', answers: 'e4',
    summary: 'Against 1.e4 play ...c5 and fianchetto the bishop on g7 for sharp counterplay.',
    plan: [
      'Trade the c-pawn for White\'s d-pawn to get a half-open c-file.',
      'Fianchetto: ...g6 and ...Bg7 on the long diagonal.',
      'Develop ...Nc6, ...Bd7, ...Rc8 and attack on the queenside (...Ne5-c4, ...b5).',
      'Watch for White\'s h4-h5 attack against your king.',
    ],
    lines: [
      'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 Bc4 Bd7 O-O-O Rc8 Bb3',
      'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be2 Bg7 O-O O-O Be3 Nc6',
      'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6',
      'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',
      'e4 c5 d4 cxd4 c3 Nf6 e5 Nd5 cxd4 d6',
      'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6',
    ],
    notes: {
      c5: 'The Sicilian: fight for d4 from the side.',
      d6: 'Controls e5 and opens the c8 bishop.',
      cxd4: 'Swap a wing pawn for a centre pawn.',
      Nf6: 'Develops and attacks e4.',
      g6: 'The Dragon fianchetto.',
      Bg7: 'The Dragon bishop on the long diagonal.',
      'O-O': 'Castle before the fight starts.',
      Nc6: 'Develops and hits d4.',
      Bd7: 'Connects the rooks and prepares ...Rc8.',
      Rc8: 'Rook on the half-open c-file.',
      Qxd7: 'Recapture and connect the rooks.',
      Nd5: 'Centralised knight after White\'s e5.',
      d5: 'Strike in the centre.',
      e6: 'Controls d5 and f5.',
    },
  },
  {
    id: 'french', name: 'French Defence', side: 'b', style: 'Solid', answers: 'e4',
    summary: 'Against 1.e4 play ...e6 and ...d5: a strong pawn chain and counterattacks with ...c5 and ...f6.',
    plan: [
      'Build the chain ...e6 and ...d5.',
      'When White plays e5, hit the chain with ...c5, and later ...f6.',
      'Your light-squared bishop is the problem piece: trade it or reroute it (...b6 and ...Ba6).',
      'Your play is on the queenside; White\'s is on the kingside.',
    ],
    lines: [
      'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 O-O Nf3 c5',
      'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7',
      'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4',
      'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
      'e4 e6 d4 d5 Nd2 c5 exd5 exd5 Ngf3 Nc6',
      'e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O',
      'e4 e6 Nf3 d5 Nc3 Nf6 e5 Nfd7 d4 c5',
    ],
    notes: {
      e6: 'Prepares ...d5 with support.',
      d5: 'Challenge e4.',
      Nf6: 'Develops and attacks e4.',
      Be7: 'Unpins the knight.',
      Nfd7: 'Retreat; the knight heads for b6 or supports ...c5.',
      Qxe7: 'Recapture and connect the rooks.',
      'O-O': 'Castle before opening the position.',
      c5: 'The key French break against d4.',
      Bb4: 'The Winawer: pin the c3 knight.',
      'Bxc3+': 'Double White\'s pawns.',
      Ne7: 'Develops towards f5 and keeps f7 free.',
      Nc6: 'Adds pressure on d4.',
      Qb6: 'Hits d4 and b2.',
      c4: 'Gain space on the queenside.',
      exd5: 'Symmetrical; develop actively.',
      Bd6: 'Active bishop.',
    },
  },
  {
    id: 'scandinavian', name: 'Scandinavian Defence', side: 'b', style: 'Direct', answers: 'e4',
    summary: 'Against 1.e4 play 1...d5 at once and recapture with the queen.',
    plan: [
      'Challenge e4 immediately with ...d5.',
      'After ...Qxd5 and Nc3, put the queen on a5 where it is safe and active.',
      'Develop ...Nf6, ...c6, ...Bf5 or ...Bg4, ...e6, castle.',
      'Simple, solid positions with few early tactics.',
    ],
    lines: [
      'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5 Bd2 e6',
      'e4 d5 exd5 Qxd5 Nf3 Bg4 Be2 Nc6 O-O O-O-O',
      'e4 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6',
      'e4 d5 e5 Bf5 d4 e6 Nf3 c5',
      'e4 d5 Nc3 d4 Nce2 e5 Ng3 Be6',
    ],
    notes: {
      d5: 'Hit e4 straight away.',
      Qxd5: 'Take back with the queen.',
      Qa5: 'Safe and active: pins along the a5-e1 diagonal.',
      Nf6: 'Develops and controls e4.',
      c6: 'Gives the queen a retreat and controls d5 and b5.',
      Bf5: 'Develop the bishop before ...e6.',
      e6: 'Solid pawn chain; the bishop is already out.',
      Bg4: 'Pin the f3 knight.',
      Nc6: 'Develops and hits d4.',
      'O-O-O': 'Castle long: the rook lands on the open d-file.',
      d4: 'Gain space and kick the knight.',
      e5: 'Take the centre.',
      Be6: 'Develops and covers d5.',
      c5: 'Hit the base of the chain.',
    },
  },
  {
    id: 'kings-indian', name: "King's Indian Defence", side: 'b', style: 'Aggressive', answers: 'd4',
    summary: 'Against 1.d4 let White build a big centre, then attack it with ...e5 and a kingside pawn storm.',
    plan: [
      'Fianchetto (...g6, ...Bg7) and castle quickly.',
      'Strike the centre with ...e5 (or ...c5).',
      'If White closes the centre with d5, attack the king: ...Nh5 or ...Nd7, then ...f5-f4 and ...g5.',
    ],
    lines: [
      'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7',
      'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5',
      'd4 Nf6 Nf3 g6 g3 Bg7 Bg2 O-O O-O d6 c4 Nbd7 Nc3 e5',
      'd4 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 d6 h3 Nbd7',
      'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nc6 Nc3 a6',
      'd4 Nf6 Bg5 g6 Bxf6 exf6 e3 Bg7',
    ],
    notes: {
      Nf6: 'Flexible: controls e4 and d5.',
      g6: 'Prepares the fianchetto.',
      Bg7: 'The King\'s Indian bishop on the long diagonal.',
      d6: 'Prepares ...e5.',
      'O-O': 'Castle before the centre opens.',
      e5: 'The key break: hit d4.',
      Nc6: 'Adds pressure on d4.',
      Ne7: 'Reroutes towards the kingside for ...f5.',
      Nd7: 'Clears the way for ...f5.',
      Nh5: 'Prepares ...f5 and eyes f4.',
      Nbd7: 'Supports ...e5.',
      a6: 'Prepares ...Rb8 and ...b5.',
      exf6: 'Recapture towards the centre; the bishop on g7 is strong.',
    },
  },
  {
    id: 'qgd', name: "Queen's Gambit Declined", side: 'b', style: 'Solid', answers: 'd4',
    summary: 'Against 1.d4 hold the centre with ...d5 and ...e6, then free your game with ...c5.',
    plan: [
      'Hold d5 with ...e6 rather than taking on c4.',
      'Develop ...Nf6, ...Be7, castle, ...Nbd7.',
      'Free your position with ...c5 or ...dxc4 followed by ...c5 or ...e5.',
      'The Tartakower setup (...h6, ...b6, ...Bb7) gets the problem bishop out.',
    ],
    lines: [
      'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7',
      'd4 d5 c4 e6 Nc3 Nf6 Nf3 Be7 Bg5 O-O e3 h6 Bh4',
      'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O e3 c5',
      'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7',
      'd4 d5 Nf3 Nf6 c4 e6 Nc3 Be7',
      'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6',
    ],
    notes: {
      d5: 'Claim your share of the centre.',
      e6: 'Declines the gambit and keeps d5 solid.',
      Nf6: 'Develops and defends d5.',
      Be7: 'Unpins and prepares castling.',
      'O-O': 'Castle early.',
      h6: 'Ask the bishop what it wants.',
      b6: 'Tartakower: the bishop goes to b7.',
      Nxd5: 'Recapture and offer trades to free your position.',
      Qxe7: 'Recapture and connect the rooks.',
      c5: 'The freeing break.',
      exd5: 'Recapture with the pawn for a solid centre.',
      Nbd7: 'Supports ...c5 or ...e5 later.',
      Nc6: 'Adds pressure on d4.',
      Bd6: 'Offers to trade White\'s active bishop.',
    },
  },
  {
    id: 'qga', name: "Queen's Gambit Accepted", side: 'b', style: 'Classical', answers: 'd4',
    summary: 'Against 1.d4 d5 2.c4 take the pawn, then give it back for quick, free development.',
    plan: [
      'Take on c4 with ...dxc4. Don\'t try to hold the pawn: White gets it back.',
      'Develop fast while White spends a move recapturing: ...Nf6, ...e6, ...c5, ...a6.',
      'Strike the centre with ...c5 (or ...e5) and aim for ...b5 and ...Bb7.',
    ],
    lines: [
      'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 a4 Nc6',
      'd4 d5 c4 dxc4 e4 e5 Nf3 exd4 Bxc4 Bb4+ Nbd2 Nc6',
      'd4 d5 c4 dxc4 e3 e5 Bxc4 exd4 exd4 Nf6 Nf3 Bd6',
      'd4 d5 c4 dxc4 Nc3 e5 d5 Nf6 e4 Bc5',
      'd4 d5 Nf3 Nf6 c4 dxc4 e3 e6 Bxc4 c5 O-O a6',
      'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6',
    ],
    notes: {
      d5: 'Claim your share of the centre.',
      dxc4: 'Accept the gambit; you will give the pawn back for free development.',
      Nf6: 'Develops and controls e4.',
      e6: 'Opens the f8 bishop.',
      c5: 'Hit d4 straight away.',
      a6: 'Prepares ...b5 and stops Bb5.',
      Nc6: 'Develops and adds pressure on d4.',
      e5: 'Strike back in the centre.',
      exd4: 'Win the centre pawn back.',
      'Bb4+': 'Develop with check.',
      Bd6: 'Active bishop aimed at h2.',
      Bc5: 'Active bishop on the a7-g1 diagonal.',
    },
  },
];

const posKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

/** Map position -> book moves (an empty array marks the end of a line). Throws on an illegal line. */
export function buildBook(op) {
  const book = new Map();
  for (const line of op.lines) {
    const c = new Chess();
    for (const san of line.split(' ')) {
      const k = posKey(c.fen());
      const m = c.move(san);
      const list = book.get(k) || [];
      if (!list.some((x) => x.san === m.san)) list.push({ san: m.san, from: m.from, to: m.to, promotion: m.promotion || null });
      book.set(k, list);
    }
    const end = posKey(c.fen());
    if (!book.has(end)) book.set(end, []);
  }
  return book;
}

const books = new Map();
export const bookFor = (op) => books.get(op.id) || books.set(op.id, buildBook(op)).get(op.id);
export const openingById = (id) => OPENINGS.find((o) => o.id === id) || null;
export const noteFor = (op, san) => op.notes[san] || op.notes[san.replace(/[+#]$/, '')] || '';

/**
 * Where the game stands relative to an opening.
 * state: 'your-move' | 'their-move' (with `next` book moves), 'complete', 'off-book' (with `deviation`),
 *        or 'not-from-start' when the position never came from the opening.
 */
export function planStatus(chess, op) {
  const book = bookFor(op);
  const here = book.get(posKey(chess.fen()));
  if (here && here.length) return { state: chess.turn() === op.side ? 'your-move' : 'their-move', next: here };
  if (here) return { state: 'complete' };
  const hist = chess.history({ verbose: true });
  for (let i = hist.length - 1; i >= 0; i--) {
    const expected = book.get(posKey(hist[i].before));
    if (!expected) continue;
    if (!expected.length) return { state: 'complete' };
    return {
      state: 'off-book',
      deviation: { moveNo: Math.floor(i / 2) + 1, black: hist[i].color === 'b', san: hist[i].san, byYou: hist[i].color === op.side, expected: expected.map((x) => x.san) },
    };
  }
  return { state: 'not-from-start' };
}

/** Other playstyles for the same side whose book contains this position (with moves still to come). */
export function fittingOpenings(chess, side, exceptId) {
  const k = posKey(chess.fen());
  return OPENINGS.filter((o) => o.side === side && o.id !== exceptId && (bookFor(o).get(k) || []).length);
}
