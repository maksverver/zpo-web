import { useCallback, useReducer, useState } from 'react';
import { FIELD_COUNT, getWinner, initialGameState, isGameOver, type GameState, type MoveGenerator, type PieceType, type Selection, type SimpleMove, type Turn } from './game';
import GameComponent from './GameComponent';
import { decodeState, encodeState } from './codec';
import './app.css';

const playerNames = Object.freeze(['Red', 'Blue']);

type GameStatusProps = {
    state: GameState;
    onChangeState?: (newState: GameState) => void,
    finishSetupEnabled?: boolean,
    onFinishSetup?: () => void,
};

function GameStatus({state, onChangeState, finishSetupEnabled, onFinishSetup}: GameStatusProps) {
    const stateString = encodeState(state);

    function handleTurnClicked() {
        if (onChangeState == null) return;
        const s = prompt('Turn', String(state.turn));
        if (s == null || s === String(state.turn)) return;  // canceled/unchanged
        const newTurn = Number.parseInt(s);
        if (!Number.isInteger(newTurn) || newTurn < 1 || newTurn > 1000000) {
            console.log('Invalid turn number!', s);
            alert('Invalid turn number!');
            return;
        }
        onChangeState({...state, turn: newTurn - 1});
    }

    function handleStateClicked() {
        if (onChangeState == null) return;
        const s = prompt('State string', stateString);
        if (s == null || s === stateString) return;  // canceled/unchanged
        let newState;
        try {
            newState = decodeState(s.trim());
        } catch (e) {
            console.log('Invalid state string!', s, e);
            alert('Invalid state string!');
            return;
        }
        onChangeState(newState);
    }

    const turnString = `Turn ${state.turn + 1}`;
    const gameOver = isGameOver(state);
    const winner = gameOver ? getWinner(state) : undefined;
    const nextPlayerString =
        state.turn < 2 ? `${playerNames[state.turn%2]} to set up` :
        gameOver ? (winner == null ? 'Indeterminate' : `${playerNames[winner]} won!`) :
        `${playerNames[state.turn%2]} to move`;

    return (
        <div className="game-status">
            <div className="turn">
                {onChangeState ?
                    <a href="#" onClick={e => { handleTurnClicked(); e.preventDefault(); }}>
                        {turnString}
                    </a> :
                    turnString
                }: {nextPlayerString}
            </div>
            <div className="actions">
                {onFinishSetup != null && finishSetupEnabled != null &&
                    <button disabled={!finishSetupEnabled} onClick={onFinishSetup}>Finish Setup</button>}
            </div>
            <div className="code">{
                onChangeState ?
                    <a href="#" onClick={e => { handleStateClicked(); e.preventDefault(); }}>
                        {stateString}
                    </a> :
                    stateString
            }</div>
        </div>
    );
}

// Allows moving any piece anywhere. Useful for setting up arbitrary positions.
const editMoveGenerator: MoveGenerator = {
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

const setupFields = Object.freeze([
    Object.freeze([
          0,  1,  2,  3,  4,  5,  6,  7,
          8,  9, 10, 11, 12, 13, 14, 15,
    ]),
    Object.freeze([
         48, 49, 50, 51, 52, 53, 54, 55,
         56, 57, 58, 59, 60, 61, 62, 63,
    ]),
]);

// Allows only valid moves.
const playMoveGenerator: MoveGenerator = {
    generateSelectable(gs: GameState): Selection[] {
        const res: Selection[] = [];
        const p = gs.turn % 2;
        if (gs.turn < 2) {
            // Setup mode.
            gs.hand[p].forEach((n, i) => {
                if (n > 0) {
                    const color = p as 0|1;
                    const piece = i as PieceType;
                    res.push({color, piece, src: -1});
                }
            });
            gs.board.forEach((cp, src) => {
                if (cp != null) {
                    const {color, piece} = cp;
                    res.push({color, piece, src});
                }
            });
        } else {
            // Move mode.
            // TODO
        }
        return res;
    },

    generateDestinations(gs: GameState, sel: Selection): number[] {
        const res: number[] = [];
        const p = gs.turn % 2;
        if (gs.turn < 2) {
            // Setup mode.
            if (sel.src !== -1) {
                res.push(-1);
            }
            for (const i of setupFields[p]) {
                if (sel.src !== i) {
                    res.push(i);
                }
            }
        } else {
            // Move mode.
            // TODO
        }
        return res;
    },
};

function executeSimpleMove(gameState: GameState, move: SimpleMove): GameState {
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
    return {board, hand, turn: gameState.turn};
}

export function EditApp() {
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    const handleMove = useCallback((move: SimpleMove) => {
        setGameState(gameState => executeSimpleMove(gameState, move));
    }, []);

    return (
        <div className="app">
            <div className="game-holder">
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

type PlayAppState = {
    gameState: GameState,
    history: Turn[],
};

const initialAppState: PlayAppState = {
    gameState: initialGameState,
    history: [],
};

type PlayAppAction = {
    type: 'finish-setup',
} | {
    type: 'play-move',
    move: SimpleMove,
};

function reduceAppState(appState: PlayAppState, action: PlayAppAction) {
    function incTurn(gameState: GameState): GameState {
        return {...gameState, turn: gameState.turn + 1};
    }

    switch (action.type) {
        case 'finish-setup':
            // TODO: construct move for history
            return {...appState, gameState: incTurn(appState.gameState)};

        case 'play-move':
            {
                let newGameState = executeSimpleMove(appState.gameState, action.move);
                // Automatically end turn after a single move, except during setup.
                if (newGameState.turn >= 2) {
                    // TODO: construct move for history
                    newGameState = incTurn(newGameState);
                }
                return {...appState, gameState: newGameState};
            }
    }
}

export function PlayApp() {
    const [appState, dispatch] = useReducer(reduceAppState, initialAppState);
    const {gameState} = appState;

    const handleMove = useCallback((move: SimpleMove) => {
        dispatch({type: 'play-move', move});
    }, []);
    const handleFinishSetup = useCallback(() => {
        dispatch({type: 'finish-setup'});
    }, []);

    const finishSetupEnabled =
        gameState.turn < 2
            ? setupFields[gameState.turn % 2].every(i => gameState.board[i] != null)
            : undefined;

    return (
        <div className="app">
            <div className="game-holder">
                <GameStatus
                    state={gameState}
                    finishSetupEnabled={finishSetupEnabled}
                    onFinishSetup={handleFinishSetup}
                />
                <GameComponent
                    moveGenerator={playMoveGenerator}
                    gameState={gameState}
                    onMove={handleMove}
                />
            </div>
        </div>
    );
}
