import { BOARD_HEIGHT, BOARD_WIDTH } from "./board";
import type { PieceType } from "./piece";
import type { GameState } from "./state";

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
