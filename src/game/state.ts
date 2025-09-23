import { FIELD_COUNT } from "./board";
import { Piece, type PieceType } from "./piece";

// Number of pieces of each type each player starts with. (Note that a player
// can have more than this number of pieces on the board thanks to captures and
// drops.)
export const initialPieceCounts = Object.freeze([1, 1, 2, 4, 8]);

// Total number of pieces each player starts with.
export const INITIAL_PIECE_COUNT = 16;

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
