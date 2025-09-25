import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import './GameComponent.css';
import type { ColoredPiece, GameState } from '../game/state';
import { colIds, rowIds } from '../game/board';
import type { PieceType } from '../game/piece';
import type { MoveGenerator, Selection, SimpleMove } from '../game/move';

const playerClassNames = Object.freeze(['red', 'blue']);
const fieldColorNames = Object.freeze(['white', 'black']);

const pieceEmoji = Object.freeze([
    Object.freeze(['♔', '♘', '♗', '♖', '♙']),
    Object.freeze(['♚', '♞', '♝', '♜', '♟']),
]);

const pieceNames = Object.freeze([
    'Wazir (0.1)',
    'Knight (1.2)',
    'Ferz (1.1)',
    'Dabbaba (0.2)',
    'Alfil (2.2)',
]);

type FieldProps = {
    r: number;
    c: number;
    cp?: ColoredPiece;
    selected: boolean;
    selectable: boolean;
    onSelect: () => void;
};

const Field = memo(({r, c, cp, selected, selectable, onSelect}: FieldProps) => {
    let className = `field ${fieldColorNames[(r + c) % 2]} ${cp == null ? 'empty' : 'occupied'}`;
    if (selected) className += ' selected';
    if (selectable) className += ' selectable';
    return (
        <div className={className} onClick={selectable ? onSelect : undefined}>
            {cp == null
                ? <div className='label'>{rowIds[r] + colIds[c]}</div>
                : <PieceComponent color={cp.color} piece={cp.piece} />}
        </div>
    );
});

function PieceComponent({color, piece}: {color: 0|1, piece: PieceType}) {
    return (
        <div className={`piece ${playerClassNames[color]}`} title={pieceNames[piece]}>
            {pieceEmoji[color][piece]}
        </div>
    );
}

type HandProps = {
    color: 0|1,
    pieceCounts: readonly number[],  // piece type -> number available
    selected?: PieceType,
    selectable: Set<PieceType>,
    onSelect: (p: PieceType, c: 0|1) => void,
};

const Hand = memo(({color, pieceCounts, selectable: selectablePieces, selected, onSelect}: HandProps) => {
    return (
        <div className="hand">{
             pieceCounts.map((count, i) => {
                const piece = i as PieceType;
                const selectable = selectablePieces.has(piece);
                let className = 'slot';
                if (selectable) className += ' selectable';
                if (selected === piece) className += ' selected';
                return (count > 0 || selectable) &&
                    <div key={i}
                        className={className}
                        onClick={selectable ? () => onSelect(piece, color) : undefined}
                    >
                        {Array.from({length: count}).map((_, i) =>
                            <PieceComponent color={color} piece={piece} key={i}/>)}
                    </div>
            })
        }</div>
    )
});

type BoardProps = {
    pieces: readonly (null|ColoredPiece)[];
    selectable: Set<number>;
    selected: number,
    onSelect: (i: number) => void;
};

const Board = memo(({pieces, selectable, selected, onSelect}: BoardProps) =>  {
    const fields = [];
    for (let r = 0; r < 8; ++r) {
        for (let c = 0; c < 8; ++c) {
            const i = 8*r + c;
            const cp = pieces[i];
            fields.push(
                <Field r={r} c={c} key={i}
                    selected={selected === i}
                    selectable={selectable.has(i)}
                    onSelect={() => onSelect(i)}
                    cp={cp == null ? undefined : cp} />
            );
        }
    }
    return (
        <div className="board">
            {fields}
        </div>
    );
});

export type GameProps = {
    gameState: GameState;
    moveGenerator: MoveGenerator;
    onMove?: (move: SimpleMove) => void,
};

const GameComponent = memo((props: GameProps) => {
    const [selection, setSelection] = useState<null|Selection>();
    const {moveGenerator, gameState, onMove} = props;
    const {hand, board} = gameState;

    const selectInHand = useCallback((piece: PieceType, color: 0|1) => {
        if (selection == null) {
            // New selection.
            setSelection({color, piece, src: -1});
        } else if (selection.color === color && selection.piece === piece && selection.src !== -1) {
            // Execute move.
            onMove?.({...selection, dst: -1});
        } else {
            // Deselect.
            setSelection(null);
        }
    }, [selection, onMove]);

    const selectOnBoard = useCallback((src: number) => {
        if (selection == null) {
            const cp = gameState.board[src];
            if (cp != null) {
                // New selection.
                const {color, piece} = cp;
                setSelection({color, piece, src});
            }
        } else if (selection.src !== src) {
            // Execute move. (Changing the game state will clear the selection.)
            onMove?.({...selection, dst: src});
        } else {
            // Unselect.
            setSelection(null);
        }
    }, [selection, gameState, onMove]);

    const selectable = useMemo(
        () => {
            const inHand = [new Set<PieceType>(), new Set<PieceType>()];
            const onBoard = new Set<number>;
            if (selection == null) {
                for (const {color, piece, src} of moveGenerator.generateSelectable(gameState)) {
                    if (src === -1) {
                        inHand[color].add(piece);
                    } else {
                        onBoard.add(src);
                    }
                }
            } else {
                for (const dst of moveGenerator.generateDestinations(gameState, selection)) {
                    if (dst === -1) {
                        inHand[selection.color].add(selection.piece);
                    }  else {
                        onBoard.add(dst);
                    }
                }
                // Allow deselecting existing piece:
                if (selection.src === -1) {
                    inHand[selection.color].add(selection.piece);
                } else {
                    onBoard.add(selection.src);
                }
            }
            return {inHand, onBoard};
        },
        [moveGenerator, gameState, selection]);

    // Clear the selection whenever the game state changes.
    useEffect(() => {
        // If there is no active selection, nothing needs to be done.
        if (selection == null) return;

        // Keep selection if it's still valid; this helps put down multiple
        // pieces of the same type quickly during setup.
        for (const {color, piece, src} of moveGenerator.generateSelectable(gameState)) {
            if ( color === selection.color &&
                 piece === selection.piece &&
                 src   === selection.src ) {
                return;
            }
        }

        // Otherwise, clear the selection.
        setSelection(null);
    }, [gameState, moveGenerator]);

    return (
        <div className="game">
            <Hand
                color={0}
                pieceCounts={hand[0]}
                selected={selection?.src === -1 && selection.color === 0 ? selection.piece : undefined}
                selectable={selectable.inHand[0]}
                onSelect={selectInHand}
            />
            <Board
                pieces={board}
                selected={selection?.src || -1}
                selectable={selectable.onBoard}
                onSelect={selectOnBoard}
            />
            <Hand
                color={1}
                pieceCounts={hand[1]}
                selected={selection?.src === -1 && selection.color === 1 ? selection.piece : undefined}
                selectable={selectable.inHand[1]}
                onSelect={selectInHand}
            />
        </div>
    );
});

export default GameComponent;
