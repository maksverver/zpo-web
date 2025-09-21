export const BOARD_WIDTH  =  8;
export const BOARD_HEIGHT =  8;
export const FIELD_COUNT  = 64;

export const rowIds = 'abcdefgh';
export const colIds = '12345678';

export const Piece = Object.freeze({
    WAZIR:   0,  // 0.1
    KNIGHT:  1,  // 1.2
    FERZ:    2,  // 1.1
    DABBABA: 3,  // 0.2
    ALFIL:   4,  // 2.2
});

export const pieceIds = [
    'WNFDA',
    'wnfda',
];

// Indices of fields where each player places their initial pieces.
export const setupFields = Object.freeze([
    Object.freeze([
          0,  1,  2,  3,  4,  5,  6,  7,
          8,  9, 10, 11, 12, 13, 14, 15,
    ]),
    Object.freeze([
         48, 49, 50, 51, 52, 53, 54, 55,
         56, 57, 58, 59, 60, 61, 62, 63,
    ]),
]);

export type PieceType = typeof Piece[keyof typeof Piece];

export const PIECE_COUNT = 5;

// Number of pieces of each type each player starts with. (Note that a player
// can have more than this number of pieces on the board thanks to captures and
// drops.)
export const initialPieceCounts = Object.freeze([1, 1, 2, 4, 8]);

// moveTables[piece][src] is an array of possible destinations
export const moveTables = generateMoveTables();

function generateMoveTables(): readonly(readonly (readonly number[])[])[] {
    const res = [];
    for (const [d1, d2] of [[0, 1], [1, 2], [1, 1], [0, 2], [2, 2]]) {
        const pieceTable = [];
        for (let r1 = 0; r1 < BOARD_HEIGHT; ++r1) {
            for (let c1 = 0; c1 < BOARD_WIDTH; ++c1) {
                const dests: number[] = [];
                function addDest(r2: number, c2: number) {
                    if ( 0 <= r2 && r2 < BOARD_HEIGHT &&
                         0 <= c2 && c2 < BOARD_WIDTH ) {
                        const j = BOARD_WIDTH*r2 + c2;
                        if (!dests.includes(j)) {
                            dests.push(j);
                        }
                    }
                }
                addDest(r1 - d1, c1 - d2);
                addDest(r1 - d1, c1 + d2);
                addDest(r1 + d1, c1 - d2);
                addDest(r1 + d1, c1 + d2);
                addDest(r1 - d2, c1 - d1);
                addDest(r1 - d2, c1 + d1);
                addDest(r1 + d2, c1 - d1);
                addDest(r1 + d2, c1 + d1);
                pieceTable.push(Object.freeze(dests));
            }
        }
        res.push(Object.freeze(pieceTable));
    }
    return Object.freeze(res);
}

export type ColoredPiece = {
    color: 0|1;
    piece: PieceType;
}

export type GameState = {
    // hand[color][piece] == number of pieces the player has on hand
    hand: readonly (readonly number[])[],

    // For each of 64 fields in row-major order, the piece on that field, if any.
    board: readonly (null|ColoredPiece)[],

    // 0-based turn index (aka number of turns played so far).
    turn: number,
}

export const initialGameState: GameState = {
    board: Object.freeze(Array(FIELD_COUNT).fill(null)),
    hand:  Object.freeze(Array(2).fill(initialPieceCounts)),
    turn:  0,
};

// Returns a bitmask of the colors of wazirs on the board.
function getWazirs(board: readonly (null|ColoredPiece)[]): 0|1|2|3 {
    let mask = 0;
    for (const cp of board) {
        if (cp != null && cp.piece == Piece.WAZIR) {
            mask |= 1 << cp.color;
            if (mask === 3) break;
        }
    }
    return mask as (0|1|2|3);
}

export function isGameOver({turn, board}: GameState) {
    return turn >= 2 && getWazirs(board) !== 3;
}

export function getWinner({board}: GameState): 0|1|null {
    const mask = getWazirs(board);
    if (mask === 1) return 0;
    if (mask === 2) return 1;
    return null;  // either 0 or 2 colors of wazirs left
}

export type SetupTurn = {
    type: 'setup',
    color: 0|1,
    pieces: PieceType[] & {length: 16}
};

export type MoveTurn = {
    type: 'move',
    src: number,
    dst: number,
};

export type DropTurn = {
    type: 'drop',
    color: 0|1,
    piece: PieceType,
    dst: number,
};

export type Turn = SetupTurn | MoveTurn | DropTurn;

function formatCoords(i: number) {
    const c = i % BOARD_WIDTH;
    const r = (i - c) / BOARD_WIDTH;
    return rowIds[r] + colIds[c];
}

export function formatTurn(turn: Turn): string {
    switch (turn.type) {
        case 'setup':
            const ids = pieceIds[turn.color];
            return turn.pieces.map(piece => ids[piece]).join('');

        case 'move':
            return formatCoords(turn.src) + formatCoords(turn.dst);

        case 'drop':
            return pieceIds[turn.color][turn.piece] + formatCoords(turn.dst);
    }
}

// Decodes a single turn string, or returns null if the turn could
// not be parsed.
export function parseTurn(s: string): null|Turn {
    if (s.length === 16) {
        let color: 0|1;
        if (pieceIds[0].includes(s[0])) {
            color = 0;
        } else if (pieceIds[1].includes(s[0])) {
            color = 1;
        } else {
            return null;
        }
        const ids = pieceIds[color];
        let pieces: PieceType[] = [];
        for (let ch of s) {
            let i = ids.indexOf(ch);
            if (i === -1) {
                return null;
            }
            pieces.push(i as PieceType);
        }
        return {
            type: 'setup',
            color: color,
            pieces: pieces as (PieceType[] & {length: 16}),
        };
    } else if (s.length === 4) {
        const r1 = rowIds.indexOf(s[0]);
        const c1 = colIds.indexOf(s[1]);
        const r2 = rowIds.indexOf(s[2]);
        const c2 = colIds.indexOf(s[3]);
        if (r1 === -1 || c1 === -1 || r2 === -1 || c2 === -1) {
            return null;
        }
        return {
            type: 'move',
            src: BOARD_WIDTH*r1 + c1,
            dst: BOARD_WIDTH*r2 + c2,
        };
    } else if (s.length === 3) {
        let piece: number;
        let color: 0|1;
        if ((piece = pieceIds[0].indexOf(s[0])) !== -1) {
            color = 0;
        } else if ((piece = pieceIds[1].indexOf(s[0])) !== -1) {
            color = 1;
        } else {
            return null;
        }
        const r = rowIds.indexOf(s[1]);
        const c = colIds.indexOf(s[2]);
        if (r === -1 || c === -1) {
            return null;
        }
        return {
            type: 'drop',
            color: color,
            piece: piece as PieceType,
            dst: BOARD_WIDTH*r + c,
        };
    } else {
        // Invalid length.
        return null;
    }
}

export function endTurn(gameState: GameState): GameState {
    return {...gameState, turn: gameState.turn + 1};
}

// Executes a turn, if possible. It doesn't check if the turn is legal.
// If the turn is definitely illegal an exception may be thrown.
export function executeTurn(gameState: GameState, turn: Turn): GameState {

    switch (turn.type) {
        case 'setup': {
            const {color} = turn;
            return endTurn(
                turn.pieces.reduce(
                    (state, piece, i) => {
                        const dst = setupFields[color][i];
                        if (state.hand[color][piece] === 0) {
                            throw new Error('Illegal setup turn: piece is not on hand!');
                        }
                        if (state.board[dst] != null) {
                            throw new Error('Illegal setup turn: destination field is not empty!');
                        }
                        return executeSimpleMove(state, {color, piece, src: -1, dst});
                    }, gameState));
        }

        case 'move': {
            const {src, dst} = turn;
            const cp = gameState.board[src];
            if (cp == null) {
                throw new Error(`Illegal move turn: source field is empty!`);
            }
            const {color, piece} = cp;
            return endTurn(executeSimpleMove(gameState, {color, piece, src, dst}));
        }

        case 'drop': {
            const {color, piece, dst} = turn;
            if (gameState.hand[color][piece] === 0) {
                throw new Error('Illegal drop turn: piece is not on hand!');
            }
            return endTurn(executeSimpleMove(gameState, {color, piece, src: -1, dst}));
        }
    }
}

// Decodes a transcript into an array of turns.
//
// This validates each turn individually, but doesn't check that the moves are
// valid in the context of the game!
//
// The transcript may contain any amount of whitespace between turns.
// Comments, which start with '#' and end at the end of the line, are removed.
//
// Throws an exception if decoding fails.
export function parseTranscript(transcript: string): Turn[] {
    return transcript
        .trim()
        .replaceAll(/#.*/g, '')
        .split(/\s+/)
        .map(moveString => {
            const move = parseTurn(moveString);
            if (move == null) {
                throw new Error(`Failed to decode transcript! Invalid move: ${moveString}`);
            }
            return move;
        });
}

// The stuff below is more for the UI components than general game logic,
// but I can't be arsed to separate it out at the moment.

export type Selection = {
    color: 0|1,
    piece: PieceType
    src: number,  // field index, or -1 for hand
};

export type SimpleMove = Selection & {
    dst: number,  // field index, or -1 for hand
};

export function executeSimpleMove(gameState: GameState, move: SimpleMove): GameState {
    const board = Array.from(gameState.board);
    const hand = Array.from(gameState.hand, counts => Array.from(counts));
    if (move.src === -1) {
        --hand[move.color][move.piece];
    } else {
        board[move.src] = null;
    }
    if (move.dst === -1) {
        ++hand[move.color][move.piece];
    } else {
        const old = board[move.dst];
        if (old != null) {
            ++hand[move.color][old.piece];
        }
        board[move.dst] = {color: move.color, piece: move.piece};
    }
    return {board, hand, turn: gameState.turn};
}


export interface MoveGenerator {
    generateSelectable: (gs: GameState) => readonly Selection[],
    generateDestinations: (gs: GameState, sel: Selection) => readonly number[],
};
