(() => {
/**
 * @license
 * Copyright (c) 2023, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
const WHITE = 'w';
const BLACK = 'b';
const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';
const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY = -1;
const FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q',
};
// prettier-ignore
const SQUARES = [
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
];
const BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
};
/*
 * NOTES ABOUT 0x88 MOVE GENERATION ALGORITHM
 * ----------------------------------------------------------------------------
 * From https://github.com/jhlywa/chess.js/issues/230
 *
 * A lot of people are confused when they first see the internal representation
 * of chess.js. It uses the 0x88 Move Generation Algorithm which internally
 * stores the board as an 8x16 array. This is purely for efficiency but has a
 * couple of interesting benefits:
 *
 * 1. 0x88 offers a very inexpensive "off the board" check. Bitwise AND (&) any
 *    square with 0x88, if the result is non-zero then the square is off the
 *    board. For example, assuming a knight square A8 (0 in 0x88 notation),
 *    there are 8 possible directions in which the knight can move. These
 *    directions are relative to the 8x16 board and are stored in the
 *    PIECE_OFFSETS map. One possible move is A8 - 18 (up one square, and two
 *    squares to the left - which is off the board). 0 - 18 = -18 & 0x88 = 0x88
 *    (because of two-complement representation of -18). The non-zero result
 *    means the square is off the board and the move is illegal. Take the
 *    opposite move (from A8 to C7), 0 + 18 = 18 & 0x88 = 0. A result of zero
 *    means the square is on the board.
 *
 * 2. The relative distance (or difference) between two squares on a 8x16 board
 *    is unique and can be used to inexpensively determine if a piece on a
 *    square can attack any other arbitrary square. For example, let's see if a
 *    pawn on E7 can attack E2. The difference between E7 (20) - E2 (100) is
 *    -80. We add 119 to make the ATTACKS array index non-negative (because the
 *    worst case difference is A8 - H1 = -119). The ATTACKS array contains a
 *    bitmask of pieces that can attack from that distance and direction.
 *    ATTACKS[-80 + 119=39] gives us 24 or 0b11000 in binary. Look at the
 *    PIECE_MASKS map to determine the mask for a given piece type. In our pawn
 *    example, we would check to see if 24 & 0x1 is non-zero, which it is
 *    not. So, naturally, a pawn on E7 can't attack a piece on E2. However, a
 *    rook can since 24 & 0x8 is non-zero. The only thing left to check is that
 *    there are no blocking pieces between E7 and E2. That's where the RAYS
 *    array comes in. It provides an offset (in this case 16) to add to E7 (20)
 *    to check for blocking pieces. E7 (20) + 16 = E6 (36) + 16 = E5 (52) etc.
 */
// prettier-ignore
// eslint-disable-next-line
const Ox88 = {
    a8: 0, b8: 1, c8: 2, d8: 3, e8: 4, f8: 5, g8: 6, h8: 7,
    a7: 16, b7: 17, c7: 18, d7: 19, e7: 20, f7: 21, g7: 22, h7: 23,
    a6: 32, b6: 33, c6: 34, d6: 35, e6: 36, f6: 37, g6: 38, h6: 39,
    a5: 48, b5: 49, c5: 50, d5: 51, e5: 52, f5: 53, g5: 54, h5: 55,
    a4: 64, b4: 65, c4: 66, d4: 67, e4: 68, f4: 69, g4: 70, h4: 71,
    a3: 80, b3: 81, c3: 82, d3: 83, e3: 84, f3: 85, g3: 86, h3: 87,
    a2: 96, b2: 97, c2: 98, d2: 99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
};
const PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15],
};
const PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1],
};
// prettier-ignore
const ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24, 24, 24, 24, 24, 24, 56, 0, 56, 24, 24, 24, 24, 24, 24, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20
];
// prettier-ignore
const RAYS = [
    17, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 15, 0,
    0, 17, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 15, 0, 0,
    0, 0, 17, 0, 0, 0, 0, 16, 0, 0, 0, 0, 15, 0, 0, 0,
    0, 0, 0, 17, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 0,
    0, 0, 0, 0, 17, 0, 0, 16, 0, 0, 15, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 17, 0, 16, 0, 15, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 17, 16, 15, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 0, -1, -1, -1, -1, -1, -1, -1, 0,
    0, 0, 0, 0, 0, 0, -15, -16, -17, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, -15, 0, -16, 0, -17, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, -15, 0, 0, -16, 0, 0, -17, 0, 0, 0, 0, 0,
    0, 0, 0, -15, 0, 0, 0, -16, 0, 0, 0, -17, 0, 0, 0, 0,
    0, 0, -15, 0, 0, 0, 0, -16, 0, 0, 0, 0, -17, 0, 0, 0,
    0, -15, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, -17, 0, 0,
    -15, 0, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, 0, -17
];
const PIECE_MASKS = { p: 0x1, n: 0x2, b: 0x4, r: 0x8, q: 0x10, k: 0x20 };
const SYMBOLS = 'pnbrqkPNBRQK';
const PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
const RANK_1 = 7;
const RANK_2 = 6;
/*
 * const RANK_3 = 5
 * const RANK_4 = 4
 * const RANK_5 = 3
 * const RANK_6 = 2
 */
const RANK_7 = 1;
const RANK_8 = 0;
const SIDES = {
    [KING]: BITS.KSIDE_CASTLE,
    [QUEEN]: BITS.QSIDE_CASTLE,
};
const ROOKS = {
    w: [
        { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h1, flag: BITS.KSIDE_CASTLE },
    ],
    b: [
        { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h8, flag: BITS.KSIDE_CASTLE },
    ],
};
const SECOND_RANK = { b: RANK_7, w: RANK_2 };
const TERMINATION_MARKERS = ['1-0', '0-1', '1/2-1/2', '*'];
// Extracts the zero-based rank of an 0x88 square.
function rank(square) {
    return square >> 4;
}
// Extracts the zero-based file of an 0x88 square.
function file(square) {
    return square & 0xf;
}
function isDigit(c) {
    return '0123456789'.indexOf(c) !== -1;
}
// Converts a 0x88 square to algebraic notation.
function algebraic(square) {
    const f = file(square);
    const r = rank(square);
    return ('abcdefgh'.substring(f, f + 1) +
        '87654321'.substring(r, r + 1));
}
function swapColor(color) {
    return color === WHITE ? BLACK : WHITE;
}
function validateFen(fen) {
    // 1st criterion: 6 space-seperated fields?
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
        return {
            ok: false,
            error: 'Invalid FEN: must contain six space-delimited fields',
        };
    }
    // 2nd criterion: move number field is a integer value > 0?
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
        return {
            ok: false,
            error: 'Invalid FEN: move number must be a positive integer',
        };
    }
    // 3rd criterion: half move counter is an integer >= 0?
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
        return {
            ok: false,
            error: 'Invalid FEN: half move counter number must be a non-negative integer',
        };
    }
    // 4th criterion: 4th field is a valid e.p.-string?
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
        return { ok: false, error: 'Invalid FEN: en-passant square is invalid' };
    }
    // 5th criterion: 3th field is a valid castle-string?
    if (/[^kKqQ-]/.test(tokens[2])) {
        return { ok: false, error: 'Invalid FEN: castling availability is invalid' };
    }
    // 6th criterion: 2nd field is "w" (white) or "b" (black)?
    if (!/^(w|b)$/.test(tokens[1])) {
        return { ok: false, error: 'Invalid FEN: side-to-move is invalid' };
    }
    // 7th criterion: 1st field contains 8 rows?
    const rows = tokens[0].split('/');
    if (rows.length !== 8) {
        return {
            ok: false,
            error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows",
        };
    }
    // 8th criterion: every row is valid?
    for (let i = 0; i < rows.length; i++) {
        // check for right sum of fields AND not two numbers in succession
        let sumFields = 0;
        let previousWasNumber = false;
        for (let k = 0; k < rows[i].length; k++) {
            if (isDigit(rows[i][k])) {
                if (previousWasNumber) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (consecutive number)',
                    };
                }
                sumFields += parseInt(rows[i][k], 10);
                previousWasNumber = true;
            }
            else {
                if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (invalid piece)',
                    };
                }
                sumFields += 1;
                previousWasNumber = false;
            }
        }
        if (sumFields !== 8) {
            return {
                ok: false,
                error: 'Invalid FEN: piece data is invalid (too many squares in rank)',
            };
        }
    }
    // 9th criterion: is en-passant square legal?
    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
        return { ok: false, error: 'Invalid FEN: illegal en-passant square' };
    }
    // 10th criterion: does chess position contain exact two kings?
    const kings = [
        { color: 'white', regex: /K/g },
        { color: 'black', regex: /k/g },
    ];
    for (const { color, regex } of kings) {
        if (!regex.test(tokens[0])) {
            return { ok: false, error: `Invalid FEN: missing ${color} king` };
        }
        if ((tokens[0].match(regex) || []).length > 1) {
            return { ok: false, error: `Invalid FEN: too many ${color} kings` };
        }
    }
    // 11th criterion: are any pawns on the first or eighth rows?
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === 'P')) {
        return {
            ok: false,
            error: 'Invalid FEN: some pawns are on the edge rows',
        };
    }
    return { ok: true };
}
// this function is used to uniquely identify ambiguous moves
function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
        const ambigFrom = moves[i].from;
        const ambigTo = moves[i].to;
        const ambigPiece = moves[i].piece;
        /*
         * if a move of the same piece type ends on the same to square, we'll need
         * to add a disambiguator to the algebraic notation
         */
        if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
            ambiguities++;
            if (rank(from) === rank(ambigFrom)) {
                sameRank++;
            }
            if (file(from) === file(ambigFrom)) {
                sameFile++;
            }
        }
    }
    if (ambiguities > 0) {
        if (sameRank > 0 && sameFile > 0) {
            /*
             * if there exists a similar moving piece on the same rank and file as
             * the move in question, use the square as the disambiguator
             */
            return algebraic(from);
        }
        else if (sameFile > 0) {
            /*
             * if the moving piece rests on the same file, use the rank symbol as the
             * disambiguator
             */
            return algebraic(from).charAt(1);
        }
        else {
            // else use the file symbol
            return algebraic(from).charAt(0);
        }
    }
    return '';
}
function addMove(moves, color, from, to, piece, captured = undefined, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
        for (let i = 0; i < PROMOTIONS.length; i++) {
            const promotion = PROMOTIONS[i];
            moves.push({
                color,
                from,
                to,
                piece,
                captured,
                promotion,
                flags: flags | BITS.PROMOTION,
            });
        }
    }
    else {
        moves.push({
            color,
            from,
            to,
            piece,
            captured,
            flags,
        });
    }
}
function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= 'a' && pieceType <= 'h') {
        const matches = san.match(/[a-h]\d.*[a-h]\d/);
        if (matches) {
            return undefined;
        }
        return PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === 'o') {
        return KING;
    }
    return pieceType;
}
// parses all of the decorators out of a SAN string
function strippedSan(move) {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
}
function trimFen(fen) {
    /*
     * remove last two fields in FEN string as they're not needed when checking
     * for repetition
     */
    return fen.split(' ').slice(0, 4).join(' ');
}
class Chess {
    _board = new Array(128);
    _turn = WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    // tracks number of times a position has been seen for repetition checking
    _positionCount = {};
    constructor(fen = DEFAULT_POSITION) {
        this.load(fen);
    }
    clear({ preserveHeaders = false } = {}) {
        this._board = new Array(128);
        this._kings = { w: EMPTY, b: EMPTY };
        this._turn = WHITE;
        this._castling = { w: 0, b: 0 };
        this._epSquare = EMPTY;
        this._halfMoves = 0;
        this._moveNumber = 1;
        this._history = [];
        this._comments = {};
        this._header = preserveHeaders ? this._header : {};
        this._positionCount = {};
        /*
         * Delete the SetUp and FEN headers (if preserved), the board is empty and
         * these headers don't make sense in this state. They'll get added later
         * via .load() or .put()
         */
        delete this._header['SetUp'];
        delete this._header['FEN'];
    }
    removeHeader(key) {
        if (key in this._header) {
            delete this._header[key];
        }
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
        let tokens = fen.split(/\s+/);
        // append commonly omitted fen tokens
        if (tokens.length >= 2 && tokens.length < 6) {
            const adjustments = ['-', '-', '0', '1'];
            fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ');
        }
        tokens = fen.split(/\s+/);
        if (!skipValidation) {
            const { ok, error } = validateFen(fen);
            if (!ok) {
                throw new Error(error);
            }
        }
        const position = tokens[0];
        let square = 0;
        this.clear({ preserveHeaders });
        for (let i = 0; i < position.length; i++) {
            const piece = position.charAt(i);
            if (piece === '/') {
                square += 8;
            }
            else if (isDigit(piece)) {
                square += parseInt(piece, 10);
            }
            else {
                const color = piece < 'a' ? WHITE : BLACK;
                this._put({ type: piece.toLowerCase(), color }, algebraic(square));
                square++;
            }
        }
        this._turn = tokens[1];
        if (tokens[2].indexOf('K') > -1) {
            this._castling.w |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('Q') > -1) {
            this._castling.w |= BITS.QSIDE_CASTLE;
        }
        if (tokens[2].indexOf('k') > -1) {
            this._castling.b |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('q') > -1) {
            this._castling.b |= BITS.QSIDE_CASTLE;
        }
        this._epSquare = tokens[3] === '-' ? EMPTY : Ox88[tokens[3]];
        this._halfMoves = parseInt(tokens[4], 10);
        this._moveNumber = parseInt(tokens[5], 10);
        this._updateSetup(fen);
        this._incPositionCount(fen);
    }
    fen() {
        let empty = 0;
        let fen = '';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i]) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const { color, type: piece } = this._board[i];
                fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
            }
            else {
                empty++;
            }
            if ((i + 1) & 0x88) {
                if (empty > 0) {
                    fen += empty;
                }
                if (i !== Ox88.h1) {
                    fen += '/';
                }
                empty = 0;
                i += 8;
            }
        }
        let castling = '';
        if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
            castling += 'K';
        }
        if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
            castling += 'Q';
        }
        if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
            castling += 'k';
        }
        if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
            castling += 'q';
        }
        // do we have an empty castling flag?
        castling = castling || '-';
        let epSquare = '-';
        /*
         * only print the ep square if en passant is a valid move (pawn is present
         * and ep capture is not pinned)
         */
        if (this._epSquare !== EMPTY) {
            const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
            const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
            for (const square of squares) {
                // is the square off the board?
                if (square & 0x88) {
                    continue;
                }
                const color = this._turn;
                // is there a pawn that can capture the epSquare?
                if (this._board[square]?.color === color &&
                    this._board[square]?.type === PAWN) {
                    // if the pawn makes an ep capture, does it leave it's king in check?
                    this._makeMove({
                        color,
                        from: square,
                        to: this._epSquare,
                        piece: PAWN,
                        captured: PAWN,
                        flags: BITS.EP_CAPTURE,
                    });
                    const isLegal = !this._isKingAttacked(color);
                    this._undoMove();
                    // if ep is legal, break and set the ep square in the FEN output
                    if (isLegal) {
                        epSquare = algebraic(this._epSquare);
                        break;
                    }
                }
            }
        }
        return [
            fen,
            this._turn,
            castling,
            epSquare,
            this._halfMoves,
            this._moveNumber,
        ].join(' ');
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
        if (this._history.length > 0)
            return;
        if (fen !== DEFAULT_POSITION) {
            this._header['SetUp'] = '1';
            this._header['FEN'] = fen;
        }
        else {
            delete this._header['SetUp'];
            delete this._header['FEN'];
        }
    }
    reset() {
        this.load(DEFAULT_POSITION);
    }
    get(square) {
        return this._board[Ox88[square]] || false;
    }
    put({ type, color }, square) {
        if (this._put({ type, color }, square)) {
            this._updateCastlingRights();
            this._updateEnPassantSquare();
            this._updateSetup(this.fen());
            return true;
        }
        return false;
    }
    _put({ type, color }, square) {
        // check for piece
        if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
            return false;
        }
        // check for valid square
        if (!(square in Ox88)) {
            return false;
        }
        const sq = Ox88[square];
        // don't let the user place more than one king
        if (type == KING &&
            !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
            return false;
        }
        const currentPieceOnSquare = this._board[sq];
        // if one of the kings will be replaced by the piece from args, set the `_kings` respective entry to `EMPTY`
        if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
            this._kings[currentPieceOnSquare.color] = EMPTY;
        }
        this._board[sq] = { type: type, color: color };
        if (type === KING) {
            this._kings[color] = sq;
        }
        return true;
    }
    remove(square) {
        const piece = this.get(square);
        delete this._board[Ox88[square]];
        if (piece && piece.type === KING) {
            this._kings[piece.color] = EMPTY;
        }
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return piece;
    }
    _updateCastlingRights() {
        const whiteKingInPlace = this._board[Ox88.e1]?.type === KING &&
            this._board[Ox88.e1]?.color === WHITE;
        const blackKingInPlace = this._board[Ox88.e8]?.type === KING &&
            this._board[Ox88.e8]?.color === BLACK;
        if (!whiteKingInPlace ||
            this._board[Ox88.a1]?.type !== ROOK ||
            this._board[Ox88.a1]?.color !== WHITE) {
            this._castling.w &= ~BITS.QSIDE_CASTLE;
        }
        if (!whiteKingInPlace ||
            this._board[Ox88.h1]?.type !== ROOK ||
            this._board[Ox88.h1]?.color !== WHITE) {
            this._castling.w &= ~BITS.KSIDE_CASTLE;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.a8]?.type !== ROOK ||
            this._board[Ox88.a8]?.color !== BLACK) {
            this._castling.b &= ~BITS.QSIDE_CASTLE;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.h8]?.type !== ROOK ||
            this._board[Ox88.h8]?.color !== BLACK) {
            this._castling.b &= ~BITS.KSIDE_CASTLE;
        }
    }
    _updateEnPassantSquare() {
        if (this._epSquare === EMPTY) {
            return;
        }
        const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
        const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
        const attackers = [currentSquare + 1, currentSquare - 1];
        if (this._board[startSquare] !== null ||
            this._board[this._epSquare] !== null ||
            this._board[currentSquare]?.color !== swapColor(this._turn) ||
            this._board[currentSquare]?.type !== PAWN) {
            this._epSquare = EMPTY;
            return;
        }
        const canCapture = (square) => !(square & 0x88) &&
            this._board[square]?.color === this._turn &&
            this._board[square]?.type === PAWN;
        if (!attackers.some(canCapture)) {
            this._epSquare = EMPTY;
        }
    }
    _attacked(color, square) {
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }
            // if empty square or wrong color
            if (this._board[i] === undefined || this._board[i].color !== color) {
                continue;
            }
            const piece = this._board[i];
            const difference = i - square;
            // skip - to/from square are the same
            if (difference === 0) {
                continue;
            }
            const index = difference + 119;
            if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
                if (piece.type === PAWN) {
                    if (difference > 0) {
                        if (piece.color === WHITE)
                            return true;
                    }
                    else {
                        if (piece.color === BLACK)
                            return true;
                    }
                    continue;
                }
                // if the piece is a knight or a king
                if (piece.type === 'n' || piece.type === 'k')
                    return true;
                const offset = RAYS[index];
                let j = i + offset;
                let blocked = false;
                while (j !== square) {
                    if (this._board[j] != null) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }
                if (!blocked)
                    return true;
            }
        }
        return false;
    }
    _isKingAttacked(color) {
        const square = this._kings[color];
        return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    isAttacked(square, attackedBy) {
        return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
        return this._isKingAttacked(this._turn);
    }
    inCheck() {
        return this.isCheck();
    }
    isCheckmate() {
        return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
        return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
        /*
         * k.b. vs k.b. (of opposite colors) with mate in 1:
         * 8/8/8/8/1b6/8/B1k5/K7 b - - 0 1
         *
         * k.b. vs k.n. with mate in 1:
         * 8/8/8/8/1n6/8/B7/K1k5 b - - 2 1
         */
        const pieces = {
            b: 0,
            n: 0,
            r: 0,
            q: 0,
            k: 0,
            p: 0,
        };
        const bishops = [];
        let numPieces = 0;
        let squareColor = 0;
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            squareColor = (squareColor + 1) % 2;
            if (i & 0x88) {
                i += 7;
                continue;
            }
            const piece = this._board[i];
            if (piece) {
                pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
                if (piece.type === BISHOP) {
                    bishops.push(squareColor);
                }
                numPieces++;
            }
        }
        // k vs. k
        if (numPieces === 2) {
            return true;
        }
        else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 &&
            (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) {
            return true;
        }
        else if (numPieces === pieces[BISHOP] + 2) {
            // kb vs. kb where any number of bishops are all on the same color
            let sum = 0;
            const len = bishops.length;
            for (let i = 0; i < len; i++) {
                sum += bishops[i];
            }
            if (sum === 0 || sum === len) {
                return true;
            }
        }
        return false;
    }
    isThreefoldRepetition() {
        return this._getPositionCount(this.fen()) >= 3;
    }
    isDraw() {
        return (this._halfMoves >= 100 || // 50 moves per side = 100 half moves
            this.isStalemate() ||
            this.isInsufficientMaterial() ||
            this.isThreefoldRepetition());
    }
    isGameOver() {
        return this.isCheckmate() || this.isStalemate() || this.isDraw();
    }
    moves({ verbose = false, square = undefined, piece = undefined, } = {}) {
        const moves = this._moves({ square, piece });
        if (verbose) {
            return moves.map((move) => this._makePretty(move));
        }
        else {
            return moves.map((move) => this._moveToSan(move, moves));
        }
    }
    _moves({ legal = true, piece = undefined, square = undefined, } = {}) {
        const forSquare = square ? square.toLowerCase() : undefined;
        const forPiece = piece?.toLowerCase();
        const moves = [];
        const us = this._turn;
        const them = swapColor(us);
        let firstSquare = Ox88.a8;
        let lastSquare = Ox88.h1;
        let singleSquare = false;
        // are we generating moves for a single square?
        if (forSquare) {
            // illegal square, return empty moves
            if (!(forSquare in Ox88)) {
                return [];
            }
            else {
                firstSquare = lastSquare = Ox88[forSquare];
                singleSquare = true;
            }
        }
        for (let from = firstSquare; from <= lastSquare; from++) {
            // did we run off the end of the board
            if (from & 0x88) {
                from += 7;
                continue;
            }
            // empty square or opponent, skip
            if (!this._board[from] || this._board[from].color === them) {
                continue;
            }
            const { type } = this._board[from];
            let to;
            if (type === PAWN) {
                if (forPiece && forPiece !== type)
                    continue;
                // single square, non-capturing
                to = from + PAWN_OFFSETS[us][0];
                if (!this._board[to]) {
                    addMove(moves, us, from, to, PAWN);
                    // double square
                    to = from + PAWN_OFFSETS[us][1];
                    if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
                        addMove(moves, us, from, to, PAWN, undefined, BITS.BIG_PAWN);
                    }
                }
                // pawn captures
                for (let j = 2; j < 4; j++) {
                    to = from + PAWN_OFFSETS[us][j];
                    if (to & 0x88)
                        continue;
                    if (this._board[to]?.color === them) {
                        addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
                    }
                    else if (to === this._epSquare) {
                        addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
                    }
                }
            }
            else {
                if (forPiece && forPiece !== type)
                    continue;
                for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
                    const offset = PIECE_OFFSETS[type][j];
                    to = from;
                    while (true) {
                        to += offset;
                        if (to & 0x88)
                            break;
                        if (!this._board[to]) {
                            addMove(moves, us, from, to, type);
                        }
                        else {
                            // own color, stop loop
                            if (this._board[to].color === us)
                                break;
                            addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                            break;
                        }
                        /* break, if knight or king */
                        if (type === KNIGHT || type === KING)
                            break;
                    }
                }
            }
        }
        /*
         * check for castling if we're:
         *   a) generating all moves, or
         *   b) doing single square move generation on the king's square
         */
        if (forPiece === undefined || forPiece === KING) {
            if (!singleSquare || lastSquare === this._kings[us]) {
                // king-side castling
                if (this._castling[us] & BITS.KSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom + 2;
                    if (!this._board[castlingFrom + 1] &&
                        !this._board[castlingTo] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom + 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.KSIDE_CASTLE);
                    }
                }
                // queen-side castling
                if (this._castling[us] & BITS.QSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom - 2;
                    if (!this._board[castlingFrom - 1] &&
                        !this._board[castlingFrom - 2] &&
                        !this._board[castlingFrom - 3] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom - 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.QSIDE_CASTLE);
                    }
                }
            }
        }
        /*
         * return all pseudo-legal moves (this includes moves that allow the king
         * to be captured)
         */
        if (!legal || this._kings[us] === -1) {
            return moves;
        }
        // filter out illegal moves
        const legalMoves = [];
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(us)) {
                legalMoves.push(moves[i]);
            }
            this._undoMove();
        }
        return legalMoves;
    }
    move(move, { strict = false } = {}) {
        /*
         * The move function can be called with in the following parameters:
         *
         * .move('Nxb7')       <- argument is a case-sensitive SAN string
         *
         * .move({ from: 'h7', <- argument is a move object
         *         to :'h8',
         *         promotion: 'q' })
         *
         *
         * An optional strict argument may be supplied to tell chess.js to
         * strictly follow the SAN specification.
         */
        let moveObj = null;
        if (typeof move === 'string') {
            moveObj = this._moveFromSan(move, strict);
        }
        else if (typeof move === 'object') {
            const moves = this._moves();
            // convert the pretty move object to an ugly move object
            for (let i = 0, len = moves.length; i < len; i++) {
                if (move.from === algebraic(moves[i].from) &&
                    move.to === algebraic(moves[i].to) &&
                    (!('promotion' in moves[i]) || move.promotion === moves[i].promotion)) {
                    moveObj = moves[i];
                    break;
                }
            }
        }
        // failed to find move
        if (!moveObj) {
            if (typeof move === 'string') {
                throw new Error(`Invalid move: ${move}`);
            }
            else {
                throw new Error(`Invalid move: ${JSON.stringify(move)}`);
            }
        }
        /*
         * need to make a copy of move because we can't generate SAN after the move
         * is made
         */
        const prettyMove = this._makePretty(moveObj);
        this._makeMove(moveObj);
        this._incPositionCount(prettyMove.after);
        return prettyMove;
    }
    _push(move) {
        this._history.push({
            move,
            kings: { b: this._kings.b, w: this._kings.w },
            turn: this._turn,
            castling: { b: this._castling.b, w: this._castling.w },
            epSquare: this._epSquare,
            halfMoves: this._halfMoves,
            moveNumber: this._moveNumber,
        });
    }
    _makeMove(move) {
        const us = this._turn;
        const them = swapColor(us);
        this._push(move);
        this._board[move.to] = this._board[move.from];
        delete this._board[move.from];
        // if ep capture, remove the captured pawn
        if (move.flags & BITS.EP_CAPTURE) {
            if (this._turn === BLACK) {
                delete this._board[move.to - 16];
            }
            else {
                delete this._board[move.to + 16];
            }
        }
        // if pawn promotion, replace with new piece
        if (move.promotion) {
            this._board[move.to] = { type: move.promotion, color: us };
        }
        // if we moved the king
        if (this._board[move.to].type === KING) {
            this._kings[us] = move.to;
            // if we castled, move the rook next to the king
            if (move.flags & BITS.KSIDE_CASTLE) {
                const castlingTo = move.to - 1;
                const castlingFrom = move.to + 1;
                this._board[castlingTo] = this._board[castlingFrom];
                delete this._board[castlingFrom];
            }
            else if (move.flags & BITS.QSIDE_CASTLE) {
                const castlingTo = move.to + 1;
                const castlingFrom = move.to - 2;
                this._board[castlingTo] = this._board[castlingFrom];
                delete this._board[castlingFrom];
            }
            // turn off castling
            this._castling[us] = 0;
        }
        // turn off castling if we move a rook
        if (this._castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i++) {
                if (move.from === ROOKS[us][i].square &&
                    this._castling[us] & ROOKS[us][i].flag) {
                    this._castling[us] ^= ROOKS[us][i].flag;
                    break;
                }
            }
        }
        // turn off castling if we capture a rook
        if (this._castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i++) {
                if (move.to === ROOKS[them][i].square &&
                    this._castling[them] & ROOKS[them][i].flag) {
                    this._castling[them] ^= ROOKS[them][i].flag;
                    break;
                }
            }
        }
        // if big pawn move, update the en passant square
        if (move.flags & BITS.BIG_PAWN) {
            if (us === BLACK) {
                this._epSquare = move.to - 16;
            }
            else {
                this._epSquare = move.to + 16;
            }
        }
        else {
            this._epSquare = EMPTY;
        }
        // reset the 50 move counter if a pawn is moved or a piece is captured
        if (move.piece === PAWN) {
            this._halfMoves = 0;
        }
        else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            this._halfMoves = 0;
        }
        else {
            this._halfMoves++;
        }
        if (us === BLACK) {
            this._moveNumber++;
        }
        this._turn = them;
    }
    undo() {
        const move = this._undoMove();
        if (move) {
            const prettyMove = this._makePretty(move);
            this._decPositionCount(prettyMove.after);
            return prettyMove;
        }
        return null;
    }
    _undoMove() {
        const old = this._history.pop();
        if (old === undefined) {
            return null;
        }
        const move = old.move;
        this._kings = old.kings;
        this._turn = old.turn;
        this._castling = old.castling;
        this._epSquare = old.epSquare;
        this._halfMoves = old.halfMoves;
        this._moveNumber = old.moveNumber;
        const us = this._turn;
        const them = swapColor(us);
        this._board[move.from] = this._board[move.to];
        this._board[move.from].type = move.piece; // to undo any promotions
        delete this._board[move.to];
        if (move.captured) {
            if (move.flags & BITS.EP_CAPTURE) {
                // en passant capture
                let index;
                if (us === BLACK) {
                    index = move.to - 16;
                }
                else {
                    index = move.to + 16;
                }
                this._board[index] = { type: PAWN, color: them };
            }
            else {
                // regular capture
                this._board[move.to] = { type: move.captured, color: them };
            }
        }
        if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            let castlingTo, castlingFrom;
            if (move.flags & BITS.KSIDE_CASTLE) {
                castlingTo = move.to + 1;
                castlingFrom = move.to - 1;
            }
            else {
                castlingTo = move.to - 2;
                castlingFrom = move.to + 1;
            }
            this._board[castlingTo] = this._board[castlingFrom];
            delete this._board[castlingFrom];
        }
        return move;
    }
    pgn({ newline = '\n', maxWidth = 0, } = {}) {
        /*
         * using the specification from http://www.chessclub.com/help/PGN-spec
         * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
         */
        const result = [];
        let headerExists = false;
        /* add the PGN header information */
        for (const i in this._header) {
            /*
             * TODO: order of enumerated properties in header object is not
             * guaranteed, see ECMA-262 spec (section 12.6.4)
             */
            result.push('[' + i + ' "' + this._header[i] + '"]' + newline);
            headerExists = true;
        }
        if (headerExists && this._history.length) {
            result.push(newline);
        }
        const appendComment = (moveString) => {
            const comment = this._comments[this.fen()];
            if (typeof comment !== 'undefined') {
                const delimiter = moveString.length > 0 ? ' ' : '';
                moveString = `${moveString}${delimiter}{${comment}}`;
            }
            return moveString;
        };
        // pop all of history onto reversed_history
        const reversedHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        const moves = [];
        let moveString = '';
        // special case of a commented starting position with no moves
        if (reversedHistory.length === 0) {
            moves.push(appendComment(''));
        }
        // build the list of moves.  a move_string looks like: "3. e3 e6"
        while (reversedHistory.length > 0) {
            moveString = appendComment(moveString);
            const move = reversedHistory.pop();
            // make TypeScript stop complaining about move being undefined
            if (!move) {
                break;
            }
            // if the position started with black to move, start PGN with #. ...
            if (!this._history.length && move.color === 'b') {
                const prefix = `${this._moveNumber}. ...`;
                // is there a comment preceding the first move?
                moveString = moveString ? `${moveString} ${prefix}` : prefix;
            }
            else if (move.color === 'w') {
                // store the previous generated move_string if we have one
                if (moveString.length) {
                    moves.push(moveString);
                }
                moveString = this._moveNumber + '.';
            }
            moveString =
                moveString + ' ' + this._moveToSan(move, this._moves({ legal: true }));
            this._makeMove(move);
        }
        // are there any other leftover moves?
        if (moveString.length) {
            moves.push(appendComment(moveString));
        }
        // is there a result?
        if (typeof this._header.Result !== 'undefined') {
            moves.push(this._header.Result);
        }
        /*
         * history should be back to what it was before we started generating PGN,
         * so join together moves
         */
        if (maxWidth === 0) {
            return result.join('') + moves.join(' ');
        }
        // TODO (jah): huh?
        const strip = function () {
            if (result.length > 0 && result[result.length - 1] === ' ') {
                result.pop();
                return true;
            }
            return false;
        };
        // NB: this does not preserve comment whitespace.
        const wrapComment = function (width, move) {
            for (const token of move.split(' ')) {
                if (!token) {
                    continue;
                }
                if (width + token.length > maxWidth) {
                    while (strip()) {
                        width--;
                    }
                    result.push(newline);
                    width = 0;
                }
                result.push(token);
                width += token.length;
                result.push(' ');
                width++;
            }
            if (strip()) {
                width--;
            }
            return width;
        };
        // wrap the PGN output at max_width
        let currentWidth = 0;
        for (let i = 0; i < moves.length; i++) {
            if (currentWidth + moves[i].length > maxWidth) {
                if (moves[i].includes('{')) {
                    currentWidth = wrapComment(currentWidth, moves[i]);
                    continue;
                }
            }
            // if the current move will push past max_width
            if (currentWidth + moves[i].length > maxWidth && i !== 0) {
                // don't end the line with whitespace
                if (result[result.length - 1] === ' ') {
                    result.pop();
                }
                result.push(newline);
                currentWidth = 0;
            }
            else if (i !== 0) {
                result.push(' ');
                currentWidth++;
            }
            result.push(moves[i]);
            currentWidth += moves[i].length;
        }
        return result.join('');
    }
    header(...args) {
        for (let i = 0; i < args.length; i += 2) {
            if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') {
                this._header[args[i]] = args[i + 1];
            }
        }
        return this._header;
    }
    loadPgn(pgn, { strict = false, newlineChar = '\r?\n', } = {}) {
        function mask(str) {
            return str.replace(/\\/g, '\\');
        }
        function parsePgnHeader(header) {
            const headerObj = {};
            const headers = header.split(new RegExp(mask(newlineChar)));
            let key = '';
            let value = '';
            for (let i = 0; i < headers.length; i++) {
                const regex = /^\s*\[\s*([A-Za-z]+)\s*"(.*)"\s*\]\s*$/;
                key = headers[i].replace(regex, '$1');
                value = headers[i].replace(regex, '$2');
                if (key.trim().length > 0) {
                    headerObj[key] = value;
                }
            }
            return headerObj;
        }
        // strip whitespace from head/tail of PGN block
        pgn = pgn.trim();
        /*
         * RegExp to split header. Takes advantage of the fact that header and movetext
         * will always have a blank line between them (ie, two newline_char's). Handles
         * case where movetext is empty by matching newlineChar until end of string is
         * matched - effectively trimming from the end extra newlineChar.
         *
         * With default newline_char, will equal:
         * /^(\[((?:\r?\n)|.)*\])((?:\s*\r?\n){2}|(?:\s*\r?\n)*$)/
         */
        const headerRegex = new RegExp('^(\\[((?:' +
            mask(newlineChar) +
            ')|.)*\\])' +
            '((?:\\s*' +
            mask(newlineChar) +
            '){2}|(?:\\s*' +
            mask(newlineChar) +
            ')*$)');
        // If no header given, begin with moves.
        const headerRegexResults = headerRegex.exec(pgn);
        const headerString = headerRegexResults
            ? headerRegexResults.length >= 2
                ? headerRegexResults[1]
                : ''
            : '';
        // Put the board in the starting position
        this.reset();
        // parse PGN header
        const headers = parsePgnHeader(headerString);
        let fen = '';
        for (const key in headers) {
            // check to see user is including fen (possibly with wrong tag case)
            if (key.toLowerCase() === 'fen') {
                fen = headers[key];
            }
            this.header(key, headers[key]);
        }
        /*
         * the permissive parser should attempt to load a fen tag, even if it's the
         * wrong case and doesn't include a corresponding [SetUp "1"] tag
         */
        if (!strict) {
            if (fen) {
                this.load(fen, { preserveHeaders: true });
            }
        }
        else {
            /*
             * strict parser - load the starting position indicated by [Setup '1']
             * and [FEN position]
             */
            if (headers['SetUp'] === '1') {
                if (!('FEN' in headers)) {
                    throw new Error('Invalid PGN: FEN tag must be supplied with SetUp tag');
                }
                // don't clear the headers when loading
                this.load(headers['FEN'], { preserveHeaders: true });
            }
        }
        /*
         * NB: the regexes below that delete move numbers, recursive annotations,
         * and numeric annotation glyphs may also match text in comments. To
         * prevent this, we transform comments by hex-encoding them in place and
         * decoding them again after the other tokens have been deleted.
         *
         * While the spec states that PGN files should be ASCII encoded, we use
         * {en,de}codeURIComponent here to support arbitrary UTF8 as a convenience
         * for modern users
         */
        function toHex(s) {
            return Array.from(s)
                .map(function (c) {
                /*
                 * encodeURI doesn't transform most ASCII characters, so we handle
                 * these ourselves
                 */
                return c.charCodeAt(0) < 128
                    ? c.charCodeAt(0).toString(16)
                    : encodeURIComponent(c).replace(/%/g, '').toLowerCase();
            })
                .join('');
        }
        function fromHex(s) {
            return s.length == 0
                ? ''
                : decodeURIComponent('%' + (s.match(/.{1,2}/g) || []).join('%'));
        }
        const encodeComment = function (s) {
            s = s.replace(new RegExp(mask(newlineChar), 'g'), ' ');
            return `{${toHex(s.slice(1, s.length - 1))}}`;
        };
        const decodeComment = function (s) {
            if (s.startsWith('{') && s.endsWith('}')) {
                return fromHex(s.slice(1, s.length - 1));
            }
        };
        // delete header to get the moves
        let ms = pgn
            .replace(headerString, '')
            .replace(
        // encode comments so they don't get deleted below
        new RegExp(`({[^}]*})+?|;([^${mask(newlineChar)}]*)`, 'g'), function (_match, bracket, semicolon) {
            return bracket !== undefined
                ? encodeComment(bracket)
                : ' ' + encodeComment(`{${semicolon.slice(1)}}`);
        })
            .replace(new RegExp(mask(newlineChar), 'g'), ' ');
        // delete recursive annotation variations
        const ravRegex = /(\([^()]+\))+?/g;
        while (ravRegex.test(ms)) {
            ms = ms.replace(ravRegex, '');
        }
        // delete move numbers
        ms = ms.replace(/\d+\.(\.\.)?/g, '');
        // delete ... indicating black to move
        ms = ms.replace(/\.\.\./g, '');
        /* delete numeric annotation glyphs */
        ms = ms.replace(/\$\d+/g, '');
        // trim and get array of moves
        let moves = ms.trim().split(new RegExp(/\s+/));
        // delete empty entries
        moves = moves.filter((move) => move !== '');
        let result = '';
        for (let halfMove = 0; halfMove < moves.length; halfMove++) {
            const comment = decodeComment(moves[halfMove]);
            if (comment !== undefined) {
                this._comments[this.fen()] = comment;
                continue;
            }
            const move = this._moveFromSan(moves[halfMove], strict);
            // invalid move
            if (move == null) {
                // was the move an end of game marker
                if (TERMINATION_MARKERS.indexOf(moves[halfMove]) > -1) {
                    result = moves[halfMove];
                }
                else {
                    throw new Error(`Invalid move in PGN: ${moves[halfMove]}`);
                }
            }
            else {
                // reset the end of game marker if making a valid move
                result = '';
                this._makeMove(move);
                this._incPositionCount(this.fen());
            }
        }
        /*
         * Per section 8.2.6 of the PGN spec, the Result tag pair must match match
         * the termination marker. Only do this when headers are present, but the
         * result tag is missing
         */
        if (result && Object.keys(this._header).length && !this._header['Result']) {
            this.header('Result', result);
        }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
        let output = '';
        if (move.flags & BITS.KSIDE_CASTLE) {
            output = 'O-O';
        }
        else if (move.flags & BITS.QSIDE_CASTLE) {
            output = 'O-O-O';
        }
        else {
            if (move.piece !== PAWN) {
                const disambiguator = getDisambiguator(move, moves);
                output += move.piece.toUpperCase() + disambiguator;
            }
            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
                if (move.piece === PAWN) {
                    output += algebraic(move.from)[0];
                }
                output += 'x';
            }
            output += algebraic(move.to);
            if (move.promotion) {
                output += '=' + move.promotion.toUpperCase();
            }
        }
        this._makeMove(move);
        if (this.isCheck()) {
            if (this.isCheckmate()) {
                output += '#';
            }
            else {
                output += '+';
            }
        }
        this._undoMove();
        return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
        // strip off any move decorations: e.g Nf3+?! becomes Nf3
        const cleanMove = strippedSan(move);
        let pieceType = inferPieceType(cleanMove);
        let moves = this._moves({ legal: true, piece: pieceType });
        // strict parser
        for (let i = 0, len = moves.length; i < len; i++) {
            if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
                return moves[i];
            }
        }
        // the strict parser failed
        if (strict) {
            return null;
        }
        let piece = undefined;
        let matches = undefined;
        let from = undefined;
        let to = undefined;
        let promotion = undefined;
        /*
         * The default permissive (non-strict) parser allows the user to parse
         * non-standard chess notations. This parser is only run after the strict
         * Standard Algebraic Notation (SAN) parser has failed.
         *
         * When running the permissive parser, we'll run a regex to grab the piece, the
         * to/from square, and an optional promotion piece. This regex will
         * parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
         * f7f8q, b1c3
         *
         * NOTE: Some positions and moves may be ambiguous when using the permissive
         * parser. For example, in this position: 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1,
         * the move b1c3 may be interpreted as Nc3 or B1c3 (a disambiguated bishop
         * move). In these cases, the permissive parser will default to the most
         * basic interpretation (which is b1c3 parsing to Nc3).
         */
        let overlyDisambiguated = false;
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
            piece = matches[1];
            from = matches[2];
            to = matches[3];
            promotion = matches[4];
            if (from.length == 1) {
                overlyDisambiguated = true;
            }
        }
        else {
            /*
             * The [a-h]?[1-8]? portion of the regex below handles moves that may be
             * overly disambiguated (e.g. Nge7 is unnecessary and non-standard when
             * there is one legal knight move to e7). In this case, the value of
             * 'from' variable will be a rank or file, not a square.
             */
            matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
            if (matches) {
                piece = matches[1];
                from = matches[2];
                to = matches[3];
                promotion = matches[4];
                if (from.length == 1) {
                    overlyDisambiguated = true;
                }
            }
        }
        pieceType = inferPieceType(cleanMove);
        moves = this._moves({
            legal: true,
            piece: piece ? piece : pieceType,
        });
        if (!to) {
            return null;
        }
        for (let i = 0, len = moves.length; i < len; i++) {
            if (!from) {
                // if there is no from square, it could be just 'x' missing from a capture
                if (cleanMove ===
                    strippedSan(this._moveToSan(moves[i], moves)).replace('x', '')) {
                    return moves[i];
                }
                // hand-compare move properties with the results from our permissive regex
            }
            else if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                Ox88[from] == moves[i].from &&
                Ox88[to] == moves[i].to &&
                (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                return moves[i];
            }
            else if (overlyDisambiguated) {
                /*
                 * SPECIAL CASE: we parsed a move string that may have an unneeded
                 * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
                 */
                const square = algebraic(moves[i].from);
                if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                    Ox88[to] == moves[i].to &&
                    (from == square[0] || from == square[1]) &&
                    (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                    return moves[i];
                }
            }
        }
        return null;
    }
    ascii() {
        let s = '   +------------------------+\n';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // display the rank
            if (file(i) === 0) {
                s += ' ' + '87654321'[rank(i)] + ' |';
            }
            if (this._board[i]) {
                const piece = this._board[i].type;
                const color = this._board[i].color;
                const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
                s += ' ' + symbol + ' ';
            }
            else {
                s += ' . ';
            }
            if ((i + 1) & 0x88) {
                s += '|\n';
                i += 8;
            }
        }
        s += '   +------------------------+\n';
        s += '     a  b  c  d  e  f  g  h';
        return s;
    }
    perft(depth) {
        const moves = this._moves({ legal: false });
        let nodes = 0;
        const color = this._turn;
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(color)) {
                if (depth - 1 > 0) {
                    nodes += this.perft(depth - 1);
                }
                else {
                    nodes++;
                }
            }
            this._undoMove();
        }
        return nodes;
    }
    // pretty = external move object
    _makePretty(uglyMove) {
        const { color, piece, from, to, flags, captured, promotion } = uglyMove;
        let prettyFlags = '';
        for (const flag in BITS) {
            if (BITS[flag] & flags) {
                prettyFlags += FLAGS[flag];
            }
        }
        const fromAlgebraic = algebraic(from);
        const toAlgebraic = algebraic(to);
        const move = {
            color,
            piece,
            from: fromAlgebraic,
            to: toAlgebraic,
            san: this._moveToSan(uglyMove, this._moves({ legal: true })),
            flags: prettyFlags,
            lan: fromAlgebraic + toAlgebraic,
            before: this.fen(),
            after: '',
        };
        // generate the FEN for the 'after' key
        this._makeMove(uglyMove);
        move.after = this.fen();
        this._undoMove();
        if (captured) {
            move.captured = captured;
        }
        if (promotion) {
            move.promotion = promotion;
            move.lan += promotion;
        }
        return move;
    }
    turn() {
        return this._turn;
    }
    board() {
        const output = [];
        let row = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i] == null) {
                row.push(null);
            }
            else {
                row.push({
                    square: algebraic(i),
                    type: this._board[i].type,
                    color: this._board[i].color,
                });
            }
            if ((i + 1) & 0x88) {
                output.push(row);
                row = [];
                i += 8;
            }
        }
        return output;
    }
    squareColor(square) {
        if (square in Ox88) {
            const sq = Ox88[square];
            return (rank(sq) + file(sq)) % 2 === 0 ? 'light' : 'dark';
        }
        return null;
    }
    history({ verbose = false } = {}) {
        const reversedHistory = [];
        const moveHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            if (verbose) {
                moveHistory.push(this._makePretty(move));
            }
            else {
                moveHistory.push(this._moveToSan(move, this._moves()));
            }
            this._makeMove(move);
        }
        return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. All three methods (`_inc`, `_dec`, and `_get`) trim the
     * irrelevent information from the fen, initialising new positions, and
     * removing old positions from the record if their counts are reduced to 0.
     */
    _getPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        return this._positionCount[trimmedFen] || 0;
    }
    _incPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === undefined) {
            this._positionCount[trimmedFen] = 0;
        }
        this._positionCount[trimmedFen] += 1;
    }
    _decPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === 1) {
            delete this._positionCount[trimmedFen];
        }
        else {
            this._positionCount[trimmedFen] -= 1;
        }
    }
    _pruneComments() {
        const reversedHistory = [];
        const currentComments = {};
        const copyComment = (fen) => {
            if (fen in this._comments) {
                currentComments[fen] = this._comments[fen];
            }
        };
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        copyComment(this.fen());
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            this._makeMove(move);
            copyComment(this.fen());
        }
        this._comments = currentComments;
    }
    getComment() {
        return this._comments[this.fen()];
    }
    setComment(comment) {
        this._comments[this.fen()] = comment.replace('{', '[').replace('}', ']');
    }
    deleteComment() {
        const comment = this._comments[this.fen()];
        delete this._comments[this.fen()];
        return comment;
    }
    getComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            return { fen: fen, comment: this._comments[fen] };
        });
    }
    deleteComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            const comment = this._comments[fen];
            delete this._comments[fen];
            return { fen: fen, comment: comment };
        });
    }
    setCastlingRights(color, rights) {
        for (const side of [KING, QUEEN]) {
            if (rights[side] !== undefined) {
                if (rights[side]) {
                    this._castling[color] |= SIDES[side];
                }
                else {
                    this._castling[color] &= ~SIDES[side];
                }
            }
        }
        this._updateCastlingRights();
        const result = this.getCastlingRights(color);
        return ((rights[KING] === undefined || rights[KING] === result[KING]) &&
            (rights[QUEEN] === undefined || rights[QUEEN] === result[QUEEN]));
    }
    getCastlingRights(color) {
        return {
            [KING]: (this._castling[color] & SIDES[KING]) !== 0,
            [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0,
        };
    }
    moveNumber() {
        return this._moveNumber;
    }
}
//# sourceMappingURL=chess.js.map
// Awareness engine: describes a position and every legal move WITHOUT ranking
// them or naming a "best" move. All analysis is shallow and explainable.


const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const LETTER = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
const KNIGHT_JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const CENTRE_SQS = new Set(['d4', 'e4', 'd5', 'e5']);

const sqName = (i) => 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
const sqIdx = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
const other = (c) => (c === 'w' ? 'b' : 'w');
const label = (p, i) => `${LETTER[p.t]}${sqName(i)}`;
const pieceText = (p, i) => `${NAME[p.t]} on ${sqName(i)}`;

/** chess.js board() -> flat 64-array (index 0 = a8) of {t, c} | null. */
function parse(chess) {
  return chess.board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));
}

function onBoard(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

/** Pieces of `color` that attack square idx (ignores pins and x-rays). */
function attackersOf(b, idx, color) {
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
function exchangeGain(b, idx, by) {
  const target = b[idx];
  if (!target || target.c === by) return 0;
  const att = attackersOf(b, idx, by).map((a) => VAL[a.t]).sort((x, y) => x - y);
  const def = attackersOf(b, idx, target.c).map((a) => VAL[a.t]).sort((x, y) => x - y);
  return swap(VAL[target.t], att, def);
}

/** Non-king pieces of `color` that the opponent can win material on. */
function hanging(b, color) {
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

/** Per-move tags. Kinds: capture check mate threat fork discover defend develop castle center promo | warn */
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
  // squares the moving side's pieces landed on (castling also moves a rook)
  const castle = m.flags.includes('k') ? 'k' : m.flags.includes('q') ? 'q' : null;
  const movers = [to];
  if (castle) movers.push(sqIdx(`${castle === 'k' ? 'f' : 'd'}${m.to[1]}`));
  const byMover = (i) => attackersOf(b1, i, me).some((a) => movers.includes(a.i));

  // --- facts ---
  let net = null;
  if (m.captured) {
    const recapture = exchangeGain(b1, to, opp);
    net = VAL[m.captured] - recapture;
    add('capture', `Takes ${NAME[m.captured]}${m.flags.includes('e') ? ' (en passant)' : ''}`);
    ctx.counts.captures++;
  }
  if (m.promotion) { add('promo', `Promotes to ${NAME[m.promotion]}`); ctx.counts.promotions++; }
  if (castle) { add('castle', castle === 'k' ? 'Castles kingside' : 'Castles queenside'); ctx.counts.castles++; }
  if (mate) { add('mate', 'Checkmate'); ctx.counts.mates++; }
  else if (check) {
    add('check', byMover(oppKing) ? 'Gives check' : 'Discovered check');
    ctx.counts.checks++;
  }

  // new threats made by this move (a mate needs no further description)
  if (!mate) {
    const newTargets = [...tgt1].filter(([i]) => !ctx.tgt0.has(i) || i === to);
    const byMoved = newTargets.filter(([i]) => byMover(i));
    const kingHit = check && byMover(oppKing);
    if (byMoved.length + (kingHit ? 1 : 0) >= 2) {
      add('fork', `Attacks ${byMoved.map(([i]) => pieceText(b1[i], i)).join(' and ')}${kingHit ? ' + king' : ''} at once`);
      ctx.counts.forks++;
    } else if (byMoved.length) {
      for (const [i] of byMoved.slice(0, 3)) add('threat', `Attacks ${pieceText(b1[i], i)}`);
    }
    // targets that became winnable without the moved piece attacking them:
    // either a line opened (a real discovery) or their defence was removed or blocked
    let discovered = false;
    for (const [i] of newTargets.filter(([i]) => !byMoved.some(([j]) => j === i)).slice(0, 2)) {
      const before = new Set(attackersOf(b0, i, me).map((a) => a.i));
      const opened = attackersOf(b1, i, me).some((a) => !movers.includes(a.i) && !before.has(a.i));
      if (opened) { add('discover', `Uncovers an attack on ${pieceText(b1[i], i)}`); discovered = true; }
      else add('threat', `${m.captured ? 'Removes the defender of' : 'Cuts off the defence of'} ${pieceText(b1[i], i)}`);
    }
    if (discovered) ctx.counts.discoveries++;
    if (tags.some((t) => t.kind === 'threat')) ctx.counts.threats++;

    // rescues
    for (const [i] of ctx.hang0) {
      const now = i === from ? to : i;
      if (!hang1.has(now)) {
        if (i === from) add('defend', `Moves the threatened ${NAME[b0[i].t]} to safety`);
        else add('defend', `Saves ${pieceText(b0[i], i)}`);
      }
    }
  }

  // development / centre
  const home = me === 'w' ? 7 : 0;
  if ((m.piece === 'n' || m.piece === 'b') && Math.floor(from / 8) === home && !m.captured) add('develop', 'Develops a minor piece');
  if (CENTRE_SQS.has(m.to) && m.piece === 'p') add('center', 'Occupies the centre');

  // --- warnings (hidden in plain mode) ---
  const warn = [];
  if (!mate && m.captured && net < 0) warn.push('Loses material in the exchange');
  if (!mate) for (const [i] of hang1) {
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
function analyze(chess) {
  const b0 = parse(chess);
  const me = chess.turn();
  const position = describePosition(chess, b0);
  const ctx = {
    counts: { mates: 0, checks: 0, captures: 0, threats: 0, discoveries: 0, forks: 0, promotions: 0, castles: 0 },
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

// Thin wrapper around Stockfish.js (UCI over postMessage) plus helpers for reading its output.


// Tried in order: the fast WebAssembly build, then the pure-JavaScript build for hosts that block WebAssembly.
const ENGINE_BUILDS = [
  { name: 'Stockfish 19', url: 'vendor/stockfish/stockfish-19-lite-single.js', wasm: 'vendor/stockfish/stockfish-19-lite-single.wasm' },
  { name: 'Stockfish 19 (backup engine, slower)', url: 'vendor/stockfish/stockfish-19-asm.js' },
];

/** False when this page cannot run WebAssembly (e.g. a strict Content-Security-Policy) or the .wasm file is missing. */
async function wasmUsable(wasmUrl) {
  try { new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])); } catch { return false; }
  try { return (await fetch(wasmUrl, { method: 'HEAD' })).status !== 404; } catch { return true; } // unknown: let the worker try
}

/** Start the first build that works. Resolves to a ready Engine (with .name) or rejects with the last error. */
async function startEngine(builds = ENGINE_BUILDS) {
  let lastError = new Error('The engine could not be loaded.');
  for (const b of builds) {
    if (b.wasm && !(await wasmUsable(b.wasm))) continue;
    const engine = new Engine(b.url);
    try { await engine.start(); engine.name = b.name; return engine; } catch (e) { lastError = e; }
  }
  throw lastError;
}

/** Parse one UCI "info ... pv ..." line. Returns null for lines without a usable score + pv. */
function parseInfo(line) {
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
function fmtScore(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  if (score.mate !== undefined) {
    const m = score.mate * sign;
    return m > 0 ? `#${m}` : `#-${Math.abs(m)}`;
  }
  const cp = score.cp * sign;
  return `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`;
}

/** White-POV number for colouring (mates count as huge). */
function scoreValue(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  return score.mate !== undefined ? Math.sign(score.mate * sign) * 10000 : score.cp * sign;
}

/** Convert a UCI principal variation into SAN moves, stopping at the first illegal one. */
function pvToSan(fen, pv, max = 8) {
  const c = new Chess(fen);
  const out = [];
  for (const u of pv.slice(0, max)) {
    try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; }
  }
  return out;
}

class Engine {
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

// Position helpers for the board editor and the FEN box: build FENs from a hand-made 64-square grid
// (index 0 = a8) and reject setups that cannot occur in a real game (Stockfish refuses those).


const gridOf = (chess) => chess.board().flat().map((x) => (x ? { t: x.type, c: x.color } : null));

/** Castling rights that the piece placement still allows (king and rook on their home squares). */
function placementRights(grid) {
  const at = (i, t, c) => grid[i] && grid[i].t === t && grid[i].c === c;
  let rights = '';
  if (at(60, 'k', 'w')) { if (at(63, 'r', 'w')) rights += 'K'; if (at(56, 'r', 'w')) rights += 'Q'; }
  if (at(4, 'k', 'b')) { if (at(7, 'r', 'b')) rights += 'k'; if (at(0, 'r', 'b')) rights += 'q'; }
  return rights;
}

/** FEN for a grid. Castling rights are `allowed` filtered down to what the placement permits. */
function fenFromBoard(grid, turn, { allowed = 'KQkq', ep = '-', half = 0, full = 1 } = {}) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = grid[r * 8 + f];
      if (!p) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += p.c === 'w' ? p.t.toUpperCase() : p.t;
    }
    rows.push(row + (empty || ''));
  }
  const rights = placementRights(grid).split('').filter((c) => allowed.includes(c)).join('');
  return `${rows.join('/')} ${turn} ${rights || '-'} ${ep} ${half} ${full}`;
}

/** Piece-count checks for one grid. Returns an error message or null. */
function gridProblem(grid) {
  const n = { w: {}, b: {} };
  let badPawn = false;
  grid.forEach((p, i) => {
    if (!p) return;
    n[p.c][p.t] = (n[p.c][p.t] || 0) + 1;
    if (p.t === 'p' && (i < 8 || i >= 56)) badPawn = true;
  });
  if (n.w.k !== 1 || n.b.k !== 1) return 'Each side needs exactly one king.';
  if (badPawn) return 'Pawns cannot stand on the first or last rank.';
  for (const c of ['w', 'b']) {
    const side = c === 'w' ? 'White' : 'Black';
    const pawns = n[c].p || 0;
    if (pawns > 8) return `${side} has more than 8 pawns.`;
    // every piece beyond the starting set must have come from a promoted pawn
    const extra = Math.max(0, (n[c].q || 0) - 1) + Math.max(0, (n[c].r || 0) - 2) + Math.max(0, (n[c].b || 0) - 2) + Math.max(0, (n[c].n || 0) - 2);
    if (extra > 8 - pawns) return `${side} has too many pieces: each extra queen, rook, bishop or knight needs a missing pawn (it would have to be a promotion).`;
  }
  return null;
}

/**
 * Load a FEN as a real-game position. Castling rights the placement does not support are dropped.
 * Returns {chess} or {error}.
 */
function loadPosition(fen) {
  let chess;
  try { chess = new Chess(fen.trim()); } catch (e) { return { error: `That FEN is not valid (${e.message}).` }; }
  const grid = gridOf(chess);
  const problem = gridProblem(grid);
  if (problem) return { error: problem };
  const [, turn, rights, ep, half, full] = chess.fen().split(' ');
  const fixed = fenFromBoard(grid, turn, { allowed: rights, ep, half, full });
  try { chess = new Chess(fixed); } catch (e) { return { error: `That position is not valid (${e.message}).` }; }
  // the side that is NOT to move must not be in check (this also rules out touching kings)
  const flipped = fixed.split(' ');
  flipped[1] = turn === 'w' ? 'b' : 'w';
  flipped[3] = '-';
  let waitingInCheck = false;
  try { waitingInCheck = new Chess(flipped.join(' ')).inCheck(); } catch { waitingInCheck = true; }
  if (waitingInCheck) {
    const waiting = turn === 'w' ? 'Black' : 'White';
    return { error: `${waiting}'s king is under attack but it is not ${waiting}'s move, which can't happen in a real game. Move a piece or change the side to move.` };
  }
  return { chess };
}

/**
 * Validate an edited grid. `base` is the FEN the edit started from: its castling rights are kept
 * where the placement still allows them, and its move number is kept.
 */
function loadFromEditor(grid, turn, base) {
  const problem = gridProblem(grid);
  if (problem) return { error: problem };
  const [, , rights = 'KQkq', , , full = '1'] = (base || '').split(' ');
  return loadPosition(fenFromBoard(grid, turn, { allowed: base ? rights : 'KQkq', full }));
}

// Playstyles: opening repertoires the user can choose to follow. Each has book lines (main line plus the
// replies an opponent is likely to try), a short note for each of "your" moves and a middlegame plan.
// Book lookups are by position, so transpositions are recognised.


const OPENINGS = [
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
function buildBook(op) {
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
const bookFor = (op) => books.get(op.id) || books.set(op.id, buildBook(op)).get(op.id);
const openingById = (id) => OPENINGS.find((o) => o.id === id) || null;
const noteFor = (op, san) => op.notes[san] || op.notes[san.replace(/[+#]$/, '')] || '';

/**
 * Where the game stands relative to an opening.
 * state: 'your-move' | 'their-move' (with `next` book moves), 'complete', 'off-book' (with `deviation`),
 *        or 'not-from-start' when the position never came from the opening.
 */
function planStatus(chess, op) {
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
function fittingOpenings(chess, side, exceptId) {
  const k = posKey(chess.fen());
  return OPENINGS.filter((o) => o.side === side && o.id !== exceptId && (bookFor(o).get(k) || []).length);
}

/** True when `san` played from the position `fen` is a move in any of the opening books. */
function isBookMove(fen, san) {
  const k = posKey(fen);
  return OPENINGS.some((o) => (bookFor(o).get(k) || []).some((m) => m.san === san));
}

// Game review maths: winning chances, per-move accuracy and move labels.
// Winning chances and accuracy follow lichess's published formulas; the label thresholds follow
// chess.com's "expected points" bands (a drop of 0.05 = 5 percentage points of winning chances, etc.).

/** Engine score for the side to move -> centipawns from White's side (mates become +/-10000). */
function whiteCp(score, turn) {
  const sign = turn === 'w' ? 1 : -1;
  if (score.mate !== undefined) return sign * (score.mate > 0 ? 10000 : -10000);
  return sign * score.cp;
}

/** White's winning chances in percent (0-100) for a centipawn score from White's side. */
function winPercent(cpWhite) {
  const cp = Math.max(-1000, Math.min(1000, cpWhite));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Accuracy (0-100) of one move that dropped the mover's winning chances by `drop` points. */
function moveAccuracy(drop) {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, drop)) - 3.1669));
}

/** One side's game accuracy: average of the plain and the harmonic mean, so single blunders still count. */
function sideAccuracy(accs) {
  if (!accs.length) return null;
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const harmonic = accs.length / accs.reduce((a, b) => a + 1 / Math.max(1, b), 0);
  return (mean + harmonic) / 2;
}

const LABELS = {
  book: { name: 'Book', mark: '📖', color: '#c9a36a' },
  great: { name: 'Great', mark: '!', color: '#5aa9e6' },
  best: { name: 'Best', mark: '★', color: '#5ac98f' },
  excellent: { name: 'Excellent', mark: '👍', color: '#8fd19e' },
  good: { name: 'Good', mark: '✓', color: '#a7c4a0' },
  inaccuracy: { name: 'Inaccuracy', mark: '?!', color: '#f2c94c' },
  mistake: { name: 'Mistake', mark: '?', color: '#f0a23b' },
  blunder: { name: 'Blunder', mark: '??', color: '#ff5c5c' },
};
const LABEL_ORDER = ['great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'];

/**
 * Label one move.
 * drop: how many points of winning chances the move cost the mover.
 * isBest: the move is the engine's first choice. onlyMove: the best move was much better than the next one.
 * inBook: the move is in one of the opening books.
 */
function classify({ drop, isBest, onlyMove = false, inBook = false }) {
  if (inBook && drop < 5) return 'book';
  if (isBest) return onlyMove ? 'great' : 'best';
  if (drop < 2) return 'excellent';
  if (drop < 5) return 'good';
  if (drop < 10) return 'inaccuracy';
  if (drop < 20) return 'mistake';
  return 'blunder';
}








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
// inside a frame (e.g. an embedded copy) browsers allow neither floating windows nor reliable pop-ups
try { if (window.self !== window.top) $('popout').hidden = true; } catch { $('popout').hidden = true; }
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

})();
