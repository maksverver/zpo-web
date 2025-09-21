// Implements base-64 encoding of game states.
//
// See docs/encoding.txt in the main repo for technical details.

import { FIELD_COUNT, Piece, PIECE_COUNT, type GameState } from "./game";

const base64Digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

class Encoder {
    nbit: number;
    bits: number;
    digits: number[];

    constructor() {
        this.nbit = 0;
        this.bits = 0;
        this.digits = [];
    }

    addBit(i: number) {
        if (i) {
            this.bits |= 1 << this.nbit;
        }
        if (++this.nbit === 6) {
            this.digits.push(this.bits);
            this.nbit = 0;
            this.bits = 0;
        }
    }

    addBits(i: number, n: number) {
        while (n --> 0) {
            this.addBit(i & 1);
            i >>= 1;
        }
    }

    addUnaryInt(n: number) {
        while (n --> 0) this.addBit(0);
        this.addBit(1);
    }

    addLastInt(i: number) {
        do {
            this.addBit(i & 1);
            i >>= 1;
        } while(i);
    }

    finish() {
        if (this.nbit != 0) {
            this.digits.push(this.bits);
            this.nbit = 0;
            this.bits = 0;
        }
        return this.digits.map(d => base64Digits[d]).join('');
    }
}

class Decoder {
    nbit: number;
    bits: number;
    chars: string;
    pos: number;

    constructor(chars: string) {
        this.chars = chars;
        this.nbit = 0;
        this.bits = 0;
        this.pos  = 0;
    }

    getBit(): 0|1 {
        if (this.nbit === 0) {
            if (this.pos === this.chars.length) {
                throw new Error('No bits remaining!');
            }
            const i = base64Digits.indexOf(this.chars[this.pos]);
            if (i === -1) {
                throw new Error(`Invalid base64 digit at index ${this.pos}`);
            }
            ++this.pos;
            this.bits = i;
            this.nbit = 6;
        }
        --this.nbit;
        const res = this.bits & 1;
        this.bits >>= 1;
        return res as (0|1);
    }

    getBits(n: number): number {
        let res = 0;
        for (let i = 0; i < n; ++i) {
            res = res | (this.getBit() << i);
        }
        return res;
    }

    getUnary(): number {
        let n = 0;
        while (this.getBit() === 0) ++n;
        return n;
    }

    get bitsLeft(): number {
        return 6*(this.chars.length - this.pos) + this.nbit;
    }

    getLastInt(): number {
        const n = this.bitsLeft;
        if (n < 1) {
            throw new Error('No bits remaining!');
        } else if (n > 31) {
            throw new Error('Too many bits remaining!');
        } else {
            return this.getBits(n);
        }
    }
}

export function encodeState(state: GameState): string {
    const enc = new Encoder();
    // Pieces on board.
    for (let i = 0; i < FIELD_COUNT; ++i) {
        const cp = state.board[i];
        if (cp == null) {
            enc.addBit(0);
        } else {
            enc.addBit(1);
            enc.addBit(cp.color);
            switch (cp.piece) {
                case Piece.WAZIR:   enc.addBits(0, 4); break;
                case Piece.KNIGHT:  enc.addBits(8, 4); break;
                case Piece.FERZ:    enc.addBits(4, 3); break;
                case Piece.DABBABA: enc.addBits(2, 2); break;
                case Piece.ALFIL:   enc.addBits(1, 1); break;
                default: throw new Error(`Unknown piece type ${cp.piece}`);
            }
        }
    }
    // Pieces in hand.
    for (let color = 0; color < 2; ++color) {
        for (let piece = 0; piece < PIECE_COUNT; ++piece) {
            enc.addUnaryInt(state.hand[color][piece]);
        }
    }
    // Turn.
    enc.addLastInt(state.turn);
    return enc.finish();
}

export function decodeState(str: string): GameState {
    const dec = new Decoder(str);
    // Pieces on board.
    const board = Array.from({length: FIELD_COUNT}, () =>
            dec.getBit() === 0 ?  null : {
                color:  dec.getBit(),
                piece:  dec.getBit() === 1 ? Piece.ALFIL :
                        dec.getBit() === 1 ? Piece.DABBABA :
                        dec.getBit() === 1 ? Piece.FERZ :
                        dec.getBit() === 1 ? Piece.KNIGHT :
                            Piece.WAZIR });
    // Pieces in hand.
    const hand: number[][] = [[], []];
    for (let color = 0; color < 2; ++color) {
        for (let piece = 0; piece < PIECE_COUNT; ++piece) {
            hand[color][piece] = dec.getUnary();
        }
    }
    // Turn.
    const turn = dec.getLastInt();
    return {board, hand, turn};
}
