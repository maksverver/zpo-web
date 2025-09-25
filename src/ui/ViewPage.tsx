import { useState } from "react";
import { noMoveGenerator } from "../game/move-generators";
import type { UrlArguments } from "./UrlArguments";
import GameStatus from "./GameStatus";
import GameComponent from "./GameComponent";
import MoveList from "./MoveList";
import './page.css';

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

    return (
        <div className="page">
            <div className="game-with-move-list">
                <div className="game-with-status">
                    <GameStatus state={currentState} />
                    <GameComponent
                        moveGenerator={noMoveGenerator}
                        gameState={currentState}
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
