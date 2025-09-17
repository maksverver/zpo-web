import { useCallback, useState } from 'react';
import { FIELD_COUNT, Piece, initialGameState, type GameState, type MoveGenerator, type PieceType, type Selection, type SimpleMove } from './game';
import GameComponent from './GameComponent';

const initialSetup = Object.freeze([
    Piece.WAZIR, Piece.KNIGHT, Piece.FERZ, Piece.FERZ, Piece.DABBABA, Piece.DABBABA, Piece.DABBABA, Piece.DABBABA,
    Piece.ALFIL, Piece.ALFIL, Piece.ALFIL, Piece.ALFIL, Piece.ALFIL, Piece.ALFIL, Piece.ALFIL, Piece.ALFIL,
]);

// Allows moving any piece anywhere. Useful for setting up arbitrary positions.
const freeMoveGenerator: MoveGenerator = {
    generateSelectable(gs: GameState): Selection[] {
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

    generateDestinations(_gs: GameState, sel: Selection): number[] {
        const res: number[] = [];
        for (let i = -1; i < FIELD_COUNT; ++i) {
            if (sel.src !== i) {
                res.push(i);
            }
        }
        return res;
    },
};

function executeMove(gameState: GameState, move: SimpleMove): GameState {
    const board = Array.from(gameState.board);
    const hand = Array.from(gameState.hand, counts => Array.from(counts));
    if (move.src === -1) {
        --hand[move.color][move.piece];
    } else {
        board[move.src] = undefined;
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
    return {board, hand};
}

export default function App() {
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    const handleMove = useCallback((move: SimpleMove) => {
        setGameState(gameState => executeMove(gameState, move));
    }, []);

    return (
        <GameComponent
            moveGenerator={freeMoveGenerator}
            gameState={gameState}
            onMove={handleMove} />
    );
}
