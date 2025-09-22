import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from 'react';
import { parseTranscript, FIELD_COUNT, getWinner, initialGameState, isGameOver, moveTables, type GameState, type MoveGenerator, type PieceType, type Selection, type SimpleMove, type Turn, formatTurn, parseTurn, setupFields, executeSimpleMove, executeTurn, endTurn, createSetupTurn, createTurnFromSimpleMove } from './game';
import GameComponent from './GameComponent';
import { decodeState, encodeState } from './codec';
import './app.css';
import React from 'react';

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
        const turnString = String(state.turn + 1);
        const s = prompt('Turn', turnString);
        if (s == null || s === turnString) return;  // canceled/unchanged
        const newTurn = Number.parseInt(s);
        if (!Number.isInteger(newTurn) || newTurn < 1 || newTurn > 1000000) {
            console.error('Invalid turn number!', s);
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
            console.error('Invalid state string!', s, e);
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

// Allows only valid moves.
const playMoveGenerator: MoveGenerator = {
    generateSelectable(gs: GameState): readonly Selection[] {
        const res: Selection[] = [];
        if (!isGameOver(gs)) {
            const p = gs.turn % 2;
            // Player can always drop a piece in hand.
            gs.hand[p].forEach((n, i) => {
                if (n > 0) {
                    const color = p as 0|1;
                    const piece = i as PieceType;
                    res.push({color, piece, src: -1});
                }
            });
            // Or move any of their pieces on the board.
            gs.board.forEach((cp, src) => {
                if (cp != null && cp.color === p) {
                    const {color, piece} = cp;
                    res.push({color, piece, src});
                }
            });
        }
        return res;
    },

    generateDestinations(gs: GameState, sel: Selection): readonly number[] {
        const res: number[] = [];
        if (!isGameOver(gs)) {
            const p = gs.turn % 2;
            if (gs.turn < 2) {
                // Setup mode.
                if (sel.src !== -1) {
                    res.push(-1);  // take back piece on board
                }
                for (const i of setupFields[p]) {
                    if (sel.src !== i) {
                        res.push(i);  // move/drop piece on board
                    }
                }
            } else {
                // Move mode.
                if (sel.src === -1) {
                    // Move from hand to any empty field.
                    for (let dst = 0; dst < FIELD_COUNT; ++dst) {
                        if (gs.board[dst] == null) {
                            res.push(dst);
                        }
                    }
                } else {
                    // Move from board to an adjacent field that is either empty,
                    // or occupied by the opponent (which leas to a capture).
                    for (const dst of moveTables[sel.piece][sel.src]) {
                        if (gs.board[dst]?.color !== sel.color) {
                            res.push(dst);
                        }
                    }
                }
            }
        }
        return res;
    },
};

export type EditAppProps = {
    urlArgs: UrlArguments;
};

export function EditApp({urlArgs}: EditAppProps) {
    const [gameState, setGameState] = useState<GameState>(urlArgs.states.at(-1)!);

    const handleMove = useCallback((move: SimpleMove) => {
        setGameState(gameState => executeSimpleMove(gameState, move));
    }, []);

    return (
        <div className="app">
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

type MoveListProps = {
    turns: readonly Turn[];
    redoableTurns?: Turn[];
    onUndo?: () => void;
    onRedo?: () => void;
}

export function MoveList({turns, redoableTurns, onUndo, onRedo}: MoveListProps) {
    const canUndo = onUndo != null && turns.length > 0;
    const canRedo = onRedo != null && redoableTurns != null && redoableTurns.length > 0;

    // Allow undo/redo with ctrl-z/y
    useEffect(() => {
        function handleKeyDown(ev: KeyboardEvent) {
            if (ev.ctrlKey) {
                if (ev.key === 'z') {
                    if (canUndo) {
                        ev.preventDefault();
                        onUndo!();
                    }
                } else if (ev.key === 'y') {
                    if (canRedo) {
                        ev.preventDefault();
                        onRedo!();
                    }
                }
            }
        }
        if (canUndo || canRedo) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [onUndo, onRedo, canUndo, canRedo]);

    function formatFancyTurn(turn: Turn) {
        const s = formatTurn(turn);
        if (s.length <= 8) {
            return s;
        }
        return <React.Fragment>{s.substring(0,8)}<br/>{s.substring(8)}</React.Fragment>
    }

    return (
        <div className="move-list">
            {/*
            <div className="buttons top">
                <button disabled={true}>⏮️</button>
                <button disabled={true}>◀️</button>
                <button disabled={true}>▶️</button>
                <button disabled={true}>⏭️</button>
            </div>
            */}
            <table>
                <tbody>
                    <tr><th>0.</th><td colSpan={2} align="center">Start</td></tr>
                    {
                        turns.map((turn, i) => (
                            <tr key={i}>
                                <th>{i + 1}.</th>
                                {i % 2 === 1 ? <td/> : undefined}
                                <td>{formatFancyTurn(turn)}</td>
                                {i % 2 === 0 ? <td/> : undefined}
                            </tr>
                        ))
                    }
                    {
                        redoableTurns != null && redoableTurns.map((turn, i) => (
                            <tr className="redoable" key={turns.length + i}>
                                <th>{turns.length + i + 1}.</th>
                                {(turns.length + i) % 2 === 1 ? <td/> : undefined}
                                <td>{formatFancyTurn(turn)}</td>
                                {(turns.length + i) % 2 === 0 ? <td/> : undefined}
                            </tr>
                        ))
                    }
                </tbody>
            </table>
            {(onUndo != null || onRedo != null) &&
                <div className="buttons bottom">
                    <button disabled={!canUndo} onClick={onUndo} title="Undo (ctrl-z)">Undo</button>
                    <button disabled={!canRedo} onClick={onRedo} title="Redo (ctrl-y)">Redo</button>
                </div>}
        </div>
    );
}

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
            if (redoStack.length) {
                const [nextTurn, nextState] = redoStack.at(-1);
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

type PlayAppProps = {
    urlArgs: UrlArguments,
};

export function PlayApp({urlArgs}: PlayAppProps) {
    const [appState, dispatch] = useReducer(reducePlayAppState, {
        currentState: urlArgs.states.at(-1)!,
        states: urlArgs.states,
        turns: urlArgs.turns,
        redoStack: [],
    });
    const {currentState, turns, redoStack} = appState;

    const handleMove = useCallback((move: SimpleMove) => {
        dispatch({type: 'play-move', move});
    }, []);
    const handleFinishSetup = useCallback(() => dispatch({type: 'finish-setup'}), []);
    const handleUndo = useCallback(() => dispatch({type: 'undo-move'}), []);
    const handleRedo = useCallback(() => dispatch({type: 'redo-move'}), []);

    const redoableTurns = useMemo(() => redoStack.map(([turn]) => turn).reverse(), [redoStack]);

    const finishSetupEnabled =
        currentState.turn < 2
            ? setupFields[currentState.turn % 2].every(i => currentState.board[i] != null)
            : undefined;

    return (
        <div className="app">
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

export function MainApp() {
    const [source, setSource] = useState('empty-board');

    const stateStringRef = useRef<HTMLInputElement>(null);
    const moveListRef    = useRef<HTMLTextAreaElement>(null);

    const handleSourceChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            setSource(e.target.value);
        }, []);

    function handleSubmit(destination: 'edit'|'play') {
        let params = '';
        if (source === 'state-string') {
            const stateString = stateStringRef.current?.value ?? '';
            let state = undefined;
            try {
                state = decodeState(stateString);
            } catch (e) {
                console.warn('Invalid state string!', stateString, e);
            }
            if (state == null) {
                alert('Invalid state string!');
                return;
            }
            params = formatUrlArguments({state});
        }
        if (source === 'move-list') {
            let turns = undefined;
            try {
                turns = parseTranscript(moveListRef.current?.value ?? '');
            } catch (e) {
                console.warn('Invalid transcript!', e);
            }
            if (turns == null) {
                alert('Invalid transcript!');
                return;
            }
            params = formatUrlArguments({turns});
        }
        document.location.href = `${destination}.html?${params}`;
    }

    function handleFileChange(ev: ChangeEvent<HTMLInputElement>) {
        const reader = new FileReader();
        const files = ev.target.files;
        if (files == null) return;
        reader.readAsText(files[0], "UTF-8");
        reader.onload = (e) => {
            const text = e.target?.result;
            const textArea = moveListRef?.current;
            if (text != null && textArea != null) {
                textArea.value = text as string;
            }
        }
        reader.onerror = (e) => {
            console.error('Error reading file!', e);
            alert('Error reading file!');
        }
    }

    return (
        <div className="main">
            <h1>0·1</h1>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="empty-board"
                        checked={source === 'empty-board'}
                        onChange={handleSourceChange}
                    /> {' '} Empty board
                </label>
            </div>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="state-string"
                        checked={source === 'state-string'}
                        onChange={handleSourceChange}
                    /> {' '} From state string
                </label>
                <div>
                    <input
                        className="code"
                        type="text"
                        name="state-string"
                        ref={stateStringRef}
                        disabled={source !== 'state-string'}
                    />
                </div>
            </div>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="move-list"
                        checked={source === 'move-list'}
                        onChange={handleSourceChange}
                    /> {' '} From move list
                </label>
                <div>
                    <textarea
                        rows={10} cols={40}
                         disabled={source !== 'move-list'}
                         ref={moveListRef}
                    />
                    <br/>
                    <input type="file"
                        disabled={source !== 'move-list'}
                        onChange={handleFileChange}
                    />
                </div>
            </div>
            <hr/>
            <div>
                <button name="destination" value="edit" onClick={() => handleSubmit('edit')}>Edit</button>
                {' '}
                <button name="destination" value="play" onClick={() => handleSubmit('play')}>Play</button>
            </div>
        </div>
    )
}

export type UrlArguments = {
    // List of game states. Must not be empty.
    states: GameState[],

    // List of turns. length turns === length.states - 1.
    // gamestate[i] is the state before turn[i] and after turn[i-1].
    turns: Turn[],
};

export function formatUrlArguments(args: {state: GameState}|{turns: Turn[]}) {
    let params = new URLSearchParams();
    if ('state' in args) {
        params.append('state', encodeState(args.state));
    }
    if ('turns' in args) {
        params.append('turns', args.turns.map(formatTurn).join('-'));
    }
    return params.toString();
}

export function parseUrlArguments(query: string = document.location.search): UrlArguments {
    const params = new URLSearchParams(query);

    // Parse `turns` parameter:
    const turnsString = params.get('turns');
    if (turnsString != null) {
        let state = initialGameState;
        let states: GameState[] = [];
        states.push(state);
        const turnStrings = turnsString.split('-');
        let turns: Turn[] = [];
        for (let i = 0; i < turnStrings.length; ++i) {
            const turnString = turnStrings[i];
            const turn = parseTurn(turnString);
            if (turn == null) {
                console.error('Invalid turn', i, turnString)
                alert(`Turn ${i + 1} is invalid`);
                break;
            }
            try {
                state = executeTurn(state, turn);
            } catch (e) {
                console.error('Illegal turn', i, turnString, e);
                alert(`Turn ${i + 1} is illegal!`);
                break;
            }
            turns.push(turn);
            states.push(state);
        };
        return {states, turns};
    }

    // Parse `state` parameter:
    const stateString = params.get('state');
    if (stateString != null) {
        let state = undefined;
        try {
            state = decodeState(stateString);
        } catch (e) {
            console.error('Invalid state string!', stateString, e);
            alert('Invalid state string!');
        }
        if (state != undefined) {
            return {states: [state], turns: []};
        }
    }

    // Default: start from initial game state (empty board).
    return {states: [initialGameState], turns: []};
}
