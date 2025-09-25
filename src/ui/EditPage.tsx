import { useCallback, useState } from "react";
import { editMoveGenerator } from "../game/move-generators";
import { executeSimpleMove, type SimpleMove } from "../game/move";
import type { GameState } from "../game/state";
import type { UrlArguments } from "./UrlArguments";
import GameStatus from "./GameStatus";
import GameComponent from "./GameComponent";
import './page.css';

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
