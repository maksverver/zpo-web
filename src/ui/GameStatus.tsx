import { decodeState, encodeState } from "../game/codec";
import { getWinner, isGameOver, type GameState } from "../game/state";
import './GameStatus.css';

const playerNames = Object.freeze(['Red', 'Blue']);

export type GameStatusProps = {
    state: GameState;
    onChangeState?: (newState: GameState) => void,
    finishSetupEnabled?: boolean,
    onFinishSetup?: () => void,
};

export default function GameStatus({state, onChangeState, finishSetupEnabled, onFinishSetup}: GameStatusProps) {
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
