import { useMemo, useState } from "react";
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

    const currentState = states.at(selectedTurn)!;

    const lastMove = useMemo(() => {
        if (selectedTurn === 0) return undefined;
        const prevState = states.at(selectedTurn - 1);
        const lastTurn = turns.at(selectedTurn - 1);
        if (prevState == null || lastTurn == null) return undefined;
        const simpleMoves = turnToSimpleMoves(prevState, lastTurn);
        if (simpleMoves.length !== 1) return undefined;
        return simpleMoves[0];
    }, [states, turns, selectedTurn]);

    return (
        <div className="page">
            <div className="game-with-move-list">
                <div className="game-with-status">
                    <GameStatus state={currentState} />
                    <GameComponent
                        gameState={currentState}
                        lastMove={lastMove}
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
