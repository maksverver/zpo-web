import { useCallback, useMemo, useReducer } from "react";
import { executeSimpleMove, setupFields, type SimpleMove } from "../game/move";
import { playMoveGenerator } from "../game/move-generators";
import { type GameState } from "../game/state";
import { createSetupTurn, createTurnFromSimpleMove, endTurn, type Turn } from "../game/turn";
import GameStatus from "./GameStatus";
import GameComponent from "./GameComponent";
import MoveList from "./MoveList";
import type { UrlArguments } from "./UrlArguments";
import './page.css';

type PlayAppState = {
    currentState: GameState,
    states: GameState[],
    turns: Turn[],
    redoStack: [Turn, GameState][],
};

type PlayAppAction = {
    type: 'finish-setup',
} | {
    type: 'play-move',
    move: SimpleMove,
} | {
    type: 'undo-move',
} | {
    type: 'redo-move',
};

function reducePlayAppState(appState: PlayAppState, action: PlayAppAction): PlayAppState {
    const {currentState, states, turns, redoStack} = appState;
    const nextPlayer = currentState.turn % 2 as 0|1;
    switch (action.type) {
        case 'finish-setup': {
            const nextState = endTurn(currentState);
            return {
                currentState: nextState,
                turns: [...turns, createSetupTurn(nextState.board, nextPlayer)],
                states: [...states, nextState],
                redoStack: [],
            };
        }
        case 'play-move': {
            let nextState = executeSimpleMove(currentState, action.move);
            if (nextState.turn < 2) {
                // Setup: apply moves to current state without creating a turn
                // (which will be done by a finish-setup action).
                return { currentState: nextState, turns, states, redoStack };
            } else {
                // Play: create a turn.
                nextState = endTurn(nextState);
                return {
                    currentState: nextState,
                    turns: [...turns, createTurnFromSimpleMove(action.move)],
                    states: [...states, nextState],
                    redoStack: [],
                };
            }
        }
        case 'undo-move': {
            if (turns.length > 0 && states.length > 1) {
                return {
                    currentState: states.at(-2)!,
                    turns: turns.slice(0, -1),
                    states: states.slice(0, -1),
                    redoStack: [...redoStack, [turns.at(-1)!, states.at(-1)!]],
                }
            } else {
                console.warn('Empty move history; cannot undo!');
                return appState;
            }
        }
        case 'redo-move': {
            if (redoStack.length > 0) {
                const [nextTurn, nextState] = redoStack.at(-1)!;
                return {
                    currentState: nextState,
                    turns: [...turns, nextTurn],
                    states: [...states, nextState],
                    redoStack: redoStack.slice(0, -1),
                }
            } else {
                console.warn('Empty redo stack; cannot redo!');
                return appState;
            }
        }
    }
}

export type PlayAppProps = {
    urlArgs: UrlArguments,
};

export default function PlayPage({urlArgs}: PlayAppProps) {
    const [appState, dispatch] = useReducer(reducePlayAppState, {
        currentState: urlArgs.states.at(-1)!,
        states: urlArgs.states,
        turns: urlArgs.turns,
        redoStack: [],
    });
    const {currentState, turns, redoStack} = appState;

    const handleMove = useCallback((move: SimpleMove) => dispatch({type: 'play-move', move}), []);
    const handleFinishSetup = useCallback(() => dispatch({type: 'finish-setup'}), []);
    const handleUndo = useCallback(() => dispatch({type: 'undo-move'}), []);
    const handleRedo = useCallback(() => dispatch({type: 'redo-move'}), []);

    const redoableTurns = useMemo(() => redoStack.map(([turn]) => turn).reverse(), [redoStack]);

    const finishSetupEnabled =
        currentState.turn < 2
            ? setupFields[currentState.turn % 2].every(i => currentState.board[i] != null)
            : undefined;

    return (
        <div className="page">
            <div className="game-with-move-list">
                <div className="game-with-status">
                    <GameStatus
                        state={currentState}
                        finishSetupEnabled={finishSetupEnabled}
                        onFinishSetup={handleFinishSetup}
                    />
                    <GameComponent
                        moveGenerator={playMoveGenerator}
                        gameState={currentState}
                        onMove={handleMove}
                    />
                </div>
                <MoveList
                    turns={turns}
                    redoableTurns={redoableTurns}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                />
            </div>
        </div>
    );
}
