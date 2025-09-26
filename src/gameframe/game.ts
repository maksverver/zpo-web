// Game Framework definition.
//
// A single game.js file can be generated with:
//
//   npx esbuild --bundle src/gameframe/game.js --minify
//

import {initialGameState, isGameOver, getWinner, type GameState} from  '../game/state';
import {executeTurn, formatTurn, parseTurn, validateTurn} from  '../game/turn';

export const playerIds = Object.freeze(['red', 'blue']);

function setUp(parameters: unknown): GameState|null {
    return parameters == null ? initialGameState : null;
}

function getAllPlayers(_state: GameState): readonly string[] {
    return playerIds;
}

function getActivePlayers(state: GameState): readonly string[] {
    return isGameOver(state) ? [] : [playerIds[state.turn % 2]];
}

function validateMove(state: GameState, player: string, move: string): string|null {
    let turn;
    return (player === playerIds[state.turn % 2] &&
            typeof move === 'string' &&
            (turn = parseTurn(move)) != null &&
            validateTurn(state, turn)) ? formatTurn(turn) : null;
}

function executeMove(state: GameState, _player: string, move: string): GameState {
    return executeTurn(state, parseTurn(move)!);
}

function getScores(state: GameState) {
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
