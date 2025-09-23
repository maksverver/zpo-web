import { useCallback, useState } from "react";
import type { UrlArguments } from "./UrlArguments";
import type { GameState } from "../game/state";
import { executeSimpleMove, type MoveGenerator, type Selection, type SimpleMove } from "../game/move";
import type { PieceType } from "../game/piece";
import { FIELD_COUNT } from "../game/board";
import GameStatus from "./GameStatus";
import GameComponent from "./GameComponent";
import './page.css';

// Allows moving any piece anywhere. Useful for setting up arbitrary positions.
const editMoveGenerator: MoveGenerator = {
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
};

export type EditAppProps = {
    urlArgs: UrlArguments;
};

export default function EditPage({urlArgs}: EditAppProps) {
    const [gameState, setGameState] = useState<GameState>(urlArgs.states.at(-1)!);

    const handleMove = useCallback((move: SimpleMove) => {
        setGameState(gameState => executeSimpleMove(gameState, move));
    }, []);

    return (
        <div className="page">
            <div className="game-with-status">
                <GameStatus
                    state={gameState}
                    onChangeState={setGameState}
                />
                <GameComponent
                    moveGenerator={editMoveGenerator}
                    gameState={gameState}
                    onMove={handleMove}
                />
            </div>
        </div>
    );
}
