// Game Framework definition.
//
// A single game.js file can be generated with:
//
//   npx esbuild --bundle src/gameframe/game.js --minify
//

import {initialGameState, isGameOver, getWinner, type GameState} from  '../game/state';
import {executeTurn, formatTurn, parseTurn, validateTurn} from  '../game/turn';

export type FullState = GameState & {history: readonly string[]}

export const initialState: FullState = {...initialGameState, history: Object.freeze([])};
export const playerIds = Object.freeze(['red', 'blue']);

function setUp(parameters: unknown): FullState|null {
    return parameters == null ? initialState : null;
}

function getAllPlayers(_state: FullState): readonly string[] {
    return playerIds;
}

function getActivePlayers(state: FullState): readonly string[] {
    return isGameOver(state) ? [] : [playerIds[state.turn % 2]];
}

function validateMove(state: FullState, player: string, move: string): string|null {
    let turn;
    return (player === playerIds[state.turn % 2] &&
            typeof move === 'string' &&
            (turn = parseTurn(move)) != null &&
            validateTurn(state, turn)) ? formatTurn(turn) : null;
}

function executeMove(state: FullState, _player: string, move: string): FullState {
    return {
        ...executeTurn(state, parseTurn(move)!),
        history: [...state.history, move]}
}

function getScores(state: FullState) {
    if (!isGameOver(state)) {
        return {};
    }
    switch (getWinner(state)) {
        case 0:   return { red: 1,   blue: 0   };
        case 1:   return { red: 0,   blue: 1   };
        default:  return { red: 0.5, blue: 0.5 };
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).GAME = {
    setUp, getAllPlayers, getActivePlayers, validateMove, executeMove, getScores };
