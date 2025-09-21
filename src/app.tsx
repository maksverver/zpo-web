import { useCallback, useReducer, useRef, useState, type ChangeEvent } from 'react';
import { FIELD_COUNT, getWinner, initialGameState, isGameOver, moveTables, type GameState, type MoveGenerator, type PieceType, type Selection, type SimpleMove, type Turn } from './game';
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

function executeSimpleMove(gameState: GameState, move: SimpleMove): GameState {
    const board = Array.from(gameState.board);
    const hand = Array.from(gameState.hand, counts => Array.from(counts));
    if (move.src === -1) {
        --hand[move.color][move.piece];
    } else {
        board[move.src] = null;
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

export type EditAppProps = {
    urlArgs: UrlArguments;
};

export function EditApp({urlArgs}: EditAppProps) {
    const [gameState, setGameState] = useState<GameState>(urlArgs.state);

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

type PlayAppProps = {
    urlArgs: UrlArguments,
};

export function PlayApp({urlArgs}: PlayAppProps) {
    const [appState, dispatch] = useReducer(reduceAppState, {
        gameState: urlArgs.state,
        history: urlArgs.history,
    });
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
            // encodeURIComponent isn't technically necessary here, because the
            // state encoding uses the URL-safe base-64 alphabet, but it's
            // better to be on the safe side.
            params = 'state=' + encodeURIComponent(stateString);
        }
        if (source === 'move-list') {
            const movesList = moveListRef.current?.value ?? '';
            alert(movesList);
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
            {/*
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
                    /><br/>
                    <input type="file" onChange={handleFileChange}/>
                </div>
            </div>
            */}
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
    history: Turn[],
    state: GameState,
};

export function getUrlArguments(query: string = document.location.search) {
    const params = new URLSearchParams(query);
    const stateString = params.get('state');
    if (stateString != null) {
        try {
            return {
                history: [],
                state: decodeState(stateString),
            };
        } catch (e) {
            console.error('Invalid state string!', stateString, e);
            alert('Invalid state string!');
        }
    }
    return {
        history: [],
        state: initialGameState,
    }
}
