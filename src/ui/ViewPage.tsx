import { useState } from "react";
import { noMoveGenerator } from "../game/move-generators";
import type { UrlArguments } from "./UrlArguments";
import GameStatus from "./GameStatus";
import GameComponent from "./GameComponent";
import MoveList from "./MoveList";
import './page.css';
import { turnToSimpleMoves } from "../game/turn";

export type ViewAppProps = {
    urlArgs: UrlArguments,
};

export default function ViewPage({urlArgs}: ViewAppProps) {
    const {states, turns} = urlArgs;
    const [selectedTurn, setSelectedTurn] = useState(turns.length);

    if (selectedTurn > turns.length) {
        // This may happen if props change. React will rerender immediately.
        setSelectedTurn(turns.length);
        return;
    }

    function getLastMove() {
        if (selectedTurn === 0 || selectedTurn > turns.length) {
            return undefined;
        }
        const prevState = states[selectedTurn - 1];
        const lastTurn = turns[selectedTurn - 1];
        const simpleMoves = turnToSimpleMoves(prevState, lastTurn);
        if (simpleMoves.length !== 1) return undefined;
        return simpleMoves[0];
    }

    const currentState = states.at(selectedTurn)!;

    return (
        <div className="page">
            <div className="game-with-move-list">
                <div className="game-with-status">
                    <GameStatus state={currentState} />
                    <GameComponent
                        gameState={currentState}
                        lastMove={getLastMove()}
                        moveGenerator={noMoveGenerator}
                    />
                </div>
                <MoveList
                    turns={turns}
                    selected={selectedTurn}
                    onSelect={setSelectedTurn}
                />
            </div>
        </div>
    );
}
