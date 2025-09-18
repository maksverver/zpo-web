export const BOARD_WIDTH  =  8;
export const BOARD_HEIGHT =  8;
export const FIELD_COUNT  = 64;

export const Piece = Object.freeze({
    WAZIR:   0,  // 0.1
    KNIGHT:  1,  // 1.2
    FERZ:    2,  // 1.1
    DABBABA: 3,  // 0.2
    ALFIL:   4,  // 2.2
});

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
        let pieceTable = [];
        for (let r1 = 0; r1 < BOARD_HEIGHT; ++r1) {
            for (let c1 = 0; c1 < BOARD_WIDTH; ++c1) {
                let dests: number[] = [];
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
    board: readonly (undefined|ColoredPiece)[],

    // 0-based turn index (aka number of turns played so far).
    turn: number,
}

export const initialGameState: GameState = {
    board: Array.from({length: FIELD_COUNT}),
    hand:  [initialPieceCounts, initialPieceCounts],
    turn:  0,
};

// Returns a bitmask of the colors of wazirs on the board.
function getWazirs(board: readonly (undefined|ColoredPiece)[]): 0|1|2|3 {
    let mask = 0;
    for (const cp of board) {
        if (cp != null && cp.piece == Piece.WAZIR) {
            mask |= 1 << cp.color;
            if (mask === 3) break;
        }
    }
    return mask as (0|1|2|3);
}

export function isGameOver({board}: GameState) {
    return getWazirs(board) !== 3;
}

export function getWinner({board}: GameState): 0|1|undefined {
    const mask = getWazirs(board);
    if (mask === 1) return 0;
    if (mask === 2) return 1;
    return undefined;  // either 0 or 2 colors of wazirs left
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

export interface MoveGenerator {
    generateSelectable: (gs: GameState) => readonly Selection[],
    generateDestinations: (gs: GameState, sel: Selection) => readonly number[],
};
