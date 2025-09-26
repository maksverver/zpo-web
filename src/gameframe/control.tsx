import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client'
import { initialGameState, isGameOver, type GameState } from '../game/state';
import { createSetupTurn, createTurnFromSimpleMove, formatTurn, parseTurn, turnToSimpleMoves, type Turn } from '../game/turn';
import { noMoveGenerator, playMoveGenerator } from '../game/move-generators';
import { executeSimpleMove, setupFields, type SimpleMove } from '../game/move';
import GameComponent from '../ui/GameComponent';
import '../ui/page.css';
import GameStatus from '../ui/GameStatus';
import { playerIds } from './game';

// Hack to prevent error: "Uncaught ReferenceError: React is not defined".
// I haven't really figured out why this happens; it seems to have something to
// do with esbuild not recognizing that tsx files generate code like:
// `React.createElement(blabla)` which requires React to be defined.
globalThis.React = React;

type MoveMode = {
    players: ('red'|'blue')[],
    state: GameState,
    previousState?: GameState,
    lastPlayer?: ('red'|'blue'),
    lastMove?: string,
};

class ModeTracker extends EventTarget {
    currentMode: MoveMode;

    constructor() {
        super();
        this.currentMode = {
            players: [],
            state: initialGameState,
        };
    }

    updateMode(newMode: MoveMode) {
        this.currentMode = newMode;
        this.dispatchEvent(new CustomEvent('modechange', { detail: newMode }));
    }
}

const modeTracker = new ModeTracker();

// Install the message event listener which will receive commands from the
// parent frame.
//
// It's tempting to put this in a React effect hook instead, but effects are
// executed asynchronously, which means we (may) miss the first event. That's
// why it's necessary to install the event listener as part of the global
// initialization.
window.addEventListener('message', (event: MessageEvent) => {
    if (event.source === parent) {
        switch (event.data.mode) {
            case 'setUp':
                // This game is not configurable.
                parent.postMessage({ action: 'setUp', parameters: null }, '*');
                break;

            case 'move':
                console.info('Control switching into move mode');
                modeTracker.updateMode(event.data);
                break;

            default:
                console.warn("Control did not understand message: ", event);
                return;
        }
    }
});

type AppState = {
    players: number,  // bitmask
    gameState: GameState,
    previousState: GameState|null,
    lastMove: Turn|null,
}

function modeToAppState(mode: MoveMode): AppState {
    let players = 0;
    for (const c of mode.players) {
        switch (c) {
            case playerIds[0]: players |= 1; break;
            case playerIds[1]: players |= 2; break;
        }
    }
    return {
        players,
        gameState: mode.state,
        previousState: mode.previousState || null,
        lastMove: mode.lastMove == null ? null : parseTurn(mode.lastMove),
    };
}

function sendTurn(color: 0|1, turn: Turn) {
    parent.postMessage({
        action: 'move',
        move: formatTurn(turn),
        player: playerIds[color],
    }, "*");
}

export function App() {
    const [state, setState] = useState<AppState>({players: 0, gameState: initialGameState, previousState: null, lastMove: null});
    const {players, gameState, previousState, lastMove} = state;
    const nextPlayer = gameState.turn % 2 as 0|1;

    useEffect(() => {
        setState(modeToAppState(modeTracker.currentMode));
        function handleModeChange(ev: Event) {
            setState(modeToAppState((ev as CustomEvent).detail));
        }
        modeTracker.addEventListener('modechange', handleModeChange);
        return () => modeTracker.removeEventListener('modechange', handleModeChange);
    }, []);

    const handleMove = useCallback((move: SimpleMove) => {
        if (gameState.turn < 2) {
            setState((appState: AppState) =>
                ({...appState, gameState: executeSimpleMove(appState.gameState, move)}));
        } else {
            sendTurn(nextPlayer, createTurnFromSimpleMove(move));
        }
    }, [gameState, nextPlayer /* for lint */]);

    const handleFinishSetup = useCallback(() => {
        sendTurn(nextPlayer, createSetupTurn(gameState.board, nextPlayer));
    }, [gameState.board, nextPlayer]);

    const moveEnabled = !isGameOver(gameState) && (players & (1 << nextPlayer)) !== 0;

    const finishSetupEnabled =
        gameState.turn < 2
            ? setupFields[gameState.turn % 2].every(i => gameState.board[i] != null)
            : undefined;

    let lastSimpleMove = undefined;
    if (previousState != null && lastMove != null) {
        const simpleMoves = turnToSimpleMoves(previousState, lastMove);
        if (simpleMoves.length === 1) {
            lastSimpleMove = simpleMoves[0];
        }
    }

    return (
        <div className="page">
            <div className="game-with-status">
                <GameStatus
                    state={gameState}
                    finishSetupEnabled={finishSetupEnabled}
                    onFinishSetup={handleFinishSetup}
                />
                <GameComponent
                    moveGenerator={moveEnabled ? playMoveGenerator : noMoveGenerator}
                    gameState={gameState}
                    onMove={handleMove}
                    lastMove={lastSimpleMove}
                />
            </div>
        </div>
    );
}

createRoot(document.getElementById('app')!).render(
    <App />
);
