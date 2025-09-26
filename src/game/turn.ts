import assertLength from "../util/assertLength";
import { BOARD_WIDTH, colIds, rowIds } from "./board";
import { executeSimpleMove, moveTables, setupFields, type SimpleMove } from "./move";
import { pieceIds, type PieceType } from "./piece";
import { INITIAL_PIECE_COUNT, initialPieceCounts, type ColoredPiece, type GameState } from "./state";

export type SetupTurn = {
    type: 'setup',
    color: 0|1,
    pieces: PieceType[] & {length: typeof INITIAL_PIECE_COUNT}
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
        case 'setup': {
            const ids = pieceIds[turn.color];
            return turn.pieces.map(piece => ids[piece]).join('');
        }
        case 'move': {
            return formatCoords(turn.src) + formatCoords(turn.dst);
        }
        case 'drop': {
            return pieceIds[turn.color][turn.piece] + formatCoords(turn.dst);
        }
    }
}

// Decodes a single turn string, or returns null if the turn could
// not be parsed.
export function parseTurn(s: string): null|Turn {
    if (s.length === INITIAL_PIECE_COUNT) {
        let color: 0|1;
        if (pieceIds[0].includes(s[0])) {
            color = 0;
        } else if (pieceIds[1].includes(s[0])) {
            color = 1;
        } else {
            return null;
        }
        const ids = pieceIds[color];
        const pieces: PieceType[] = [];
        for (const ch of s) {
            const i = ids.indexOf(ch);
            if (i === -1) {
                return null;
            }
            pieces.push(i as PieceType);
        }
        return {
            type: 'setup',
            color: color,
            pieces: assertLength(pieces, INITIAL_PIECE_COUNT),
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

export function turnToSimpleMoves(state: GameState, turn: Turn): SimpleMove[] {
    switch (turn.type) {
        case 'setup': {
            const {color} = turn;
            return turn.pieces.map((piece, i) => {
                const dst = setupFields[color][i];
                if (state.hand[color][piece] === 0) {
                    throw new Error('Illegal setup turn: piece is not on hand!');
                }
                if (state.board[dst] != null) {
                    throw new Error('Illegal setup turn: destination field is not empty!');
                }
                return {color, piece, src: -1, dst};
            });
        }

        case 'move': {
            const {src, dst} = turn;
            const cp = state.board[src];
            if (cp == null) {
                throw new Error(`Illegal move turn: source field is empty!`);
            }
            const {color, piece} = cp;
            return [{color, piece, src, dst}];
        }

        case 'drop': {
            const {color, piece, dst} = turn;
            if (state.hand[color][piece] === 0) {
                throw new Error('Illegal drop turn: piece is not on hand!');
            }
            return [{color, piece, src: -1, dst}];
        }
    }
}

// Executes a turn, if possible. It doesn't check if the turn is legal.
// If the turn is definitely illegal an exception may be thrown.
export function executeTurn(gameState: GameState, turn: Turn): GameState {
    for (const simpleMove of turnToSimpleMoves(gameState, turn)) {
        gameState = executeSimpleMove(gameState, simpleMove);
    }
    return endTurn(gameState);
}

// Decodes a transcript into an array of turns.
//
// This validates each turn individually, but doesn't check that the moves are
// valid in the context of the game!
//
// The transcript may contain any amount of whitespace between turns.
//
// Move numbers, which start at the beginning of the line and end with a '.',
// are removed (e.g. '1. a1b2' parses as 'a1b2').
//
// Comments, which start with '#' and end at the end of the line, are removed
// (e.g. 'a1b2 # bla' parses as 'a1b2').
//
// The move "Start" is filtered out. (This allows easy copy/pasting move lists
// from the Codecup site.)
//
// Throws an exception if decoding fails.
export function parseTranscript(transcript: string): Turn[] {
    return transcript
        .replaceAll(/^\d+[.]/gm, '')
        .replaceAll(/#.*$/gm, '')
        .trim()
        .split(/\s+/)
        .filter(s => s !== 'Start')
        .map(moveString => {
            const move = parseTurn(moveString);
            if (move == null) {
                throw new Error(`Failed to decode transcript! Invalid move: ${moveString}`);
            }
            return move;
        });
}

export function createSetupTurn(board: readonly (null|ColoredPiece)[], color: 0|1): SetupTurn {
    const pieces = assertLength(setupFields[color].map(field => {
        const cp = board[field];
        if (cp == null || cp.color !== color) {
            throw new Error('Missing piece in setup!');
        }
        return cp.piece;
    }), 16);
    return { type: 'setup', color, pieces };
}

export function createTurnFromSimpleMove(move: SimpleMove): MoveTurn|DropTurn {
    const {color, piece, src, dst} = move;
    if (dst === -1) {
        throw new Error('Invalid destination for turn!');
    }
    if (src === -1) {
        return {type: 'drop', color, piece, dst};
    } else {
        return {type: 'move', src, dst};
    }
}

function validatePieceCounts(pieces: PieceType[]): boolean {
    const counts = Array.from(initialPieceCounts);
    for (const p of pieces) --counts[p];
    return counts.every(n => n === 0);
}

export function validateTurn(state: GameState, turn: Turn): boolean {
    switch (turn.type) {
        case 'setup': {
            return state.turn < 2 && turn.color === state.turn && validatePieceCounts(turn.pieces);
        }

        case 'move': {
            let srcPiece: ColoredPiece | null;
            let dstPiece: ColoredPiece | null;
            return state.turn >= 2 &&
                ((srcPiece = state.board[turn.src]) != null && srcPiece.color === state.turn % 2) &&
                ((dstPiece = state.board[turn.dst]) == null || dstPiece.color !== state.turn % 2) &&
                (moveTables[srcPiece.piece][turn.src].includes(turn.dst));
        }

        case 'drop': {
            return state.turn >= 2 &&
                turn.color === state.turn % 2 &&
                state.hand[turn.color][turn.piece] > 0 &&
                state.board[turn.dst] == null;
        }
    }
}
