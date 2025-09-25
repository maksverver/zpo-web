import { FIELD_COUNT } from "./board";
import { moveTables, setupFields, type MoveGenerator, type Selection } from "./move";
import type { PieceType } from "./piece";
import { isGameOver, type GameState } from "./state";

// Allows no moves.
export const noMoveGenerator: MoveGenerator = Object.freeze({
    generateSelectable: () => [],
    generateDestinations: () => [],
});

// Allows moving any piece anywhere. Useful for setting up arbitrary positions.
export const editMoveGenerator: MoveGenerator = Object.freeze({
    generateSelectable(gs: GameState): readonly Selection[] {
        const res: Selection[] = [];
        for (let p = 0; p < 2; ++p) {
            gs.hand[p].forEach((n, i) => {
                if (n > 0) {
                    const color = p as 0|1;
                    const piece = i as PieceType;
                    res.push({color, piece, src: -1});
                }
            });
        }
        gs.board.forEach((cp, src) => {
            if (cp != null) {
                const {color, piece} = cp;
                res.push({color, piece, src});
            }
        });
        return res;
    },

    generateDestinations(_gs: GameState, sel: Selection): readonly number[] {
        const res: number[] = [];
        for (let i = -1; i < FIELD_COUNT; ++i) {
            if (sel.src !== i) {
                res.push(i);
            }
        }
        return res;
    },
});

// Allows only valid moves.
export const playMoveGenerator: MoveGenerator = Object.freeze({
    generateSelectable(gs: GameState): readonly Selection[] {
        const res: Selection[] = [];
        if (!isGameOver(gs)) {
            const p = gs.turn % 2;
            // Player can always drop a piece in hand.
            gs.hand[p].forEach((n, i) => {
                if (n > 0) {
                    const color = p as 0|1;
                    const piece = i as PieceType;
                    res.push({color, piece, src: -1});
                }
            });
            // Or move any of their pieces on the board.
            gs.board.forEach((cp, src) => {
                if (cp != null && cp.color === p) {
                    const {color, piece} = cp;
                    res.push({color, piece, src});
                }
            });
        }
        return res;
    },

    generateDestinations(gs: GameState, sel: Selection): readonly number[] {
        const res: number[] = [];
        if (!isGameOver(gs)) {
            const p = gs.turn % 2;
            if (gs.turn < 2) {
                // Setup mode.
                if (sel.src !== -1) {
                    res.push(-1);  // take back piece on board
                }
                for (const i of setupFields[p]) {
                    if (sel.src !== i) {
                        res.push(i);  // move/drop piece on board
                    }
                }
            } else {
                // Move mode.
                if (sel.src === -1) {
                    // Move from hand to any empty field.
                    for (let dst = 0; dst < FIELD_COUNT; ++dst) {
                        if (gs.board[dst] == null) {
                            res.push(dst);
                        }
                    }
                } else {
                    // Move from board to an adjacent field that is either empty,
                    // or occupied by the opponent (which leas to a capture).
                    for (const dst of moveTables[sel.piece][sel.src]) {
                        if (gs.board[dst]?.color !== sel.color) {
                            res.push(dst);
                        }
                    }
                }
            }
        }
        return res;
    },
});
