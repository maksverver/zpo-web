export const Piece = Object.freeze({
    WAZIR:   0,  // 0.1
    KNIGHT:  1,  // 1.2
    FERZ:    2,  // 1.1
    DABBABA: 3,  // 0.2
    ALFIL:   4,  // 2.2
});

export const pieceIds = [
    'WNFDA',
    'wnfda',
];

export type PieceType = typeof Piece[keyof typeof Piece];

export const PIECE_COUNT = 5;
