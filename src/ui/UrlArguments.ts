import { decodeState, encodeState } from "../game/codec";
import { initialGameState, type GameState } from "../game/state";
import { executeTurn, formatTurn, parseTurn, type Turn } from "../game/turn";

export type UrlArguments = {
    // List of game states. Must not be empty.
    states: GameState[],

    // List of turns. length turns === length.states - 1.
    // gamestate[i] is the state before turn[i] and after turn[i-1].
    turns: Turn[],
};

export function formatUrlArguments(args: {state: GameState}|{turns: Turn[]}) {
    const params = new URLSearchParams();
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
        const states: GameState[] = [];
        const turns: Turn[] = [];
        let state = initialGameState;
        states.push(state);
        const turnStrings = turnsString.split('-');
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
