import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import './GameComponent.css';
import type { ColoredPiece, GameState } from '../game/state';
import { BOARD_WIDTH, colIds, rowIds } from '../game/board';
import type { PieceType } from '../game/piece';
import type { MoveGenerator, Selection, SimpleMove } from '../game/move';

const playerClassNames = Object.freeze(['red', 'blue']);
const fieldColorNames = Object.freeze(['white', 'black']);

const pieceEmoji = Object.freeze([
    Object.freeze(['♔', '♘', '♙', '♖', '♗']),
    Object.freeze(['♚', '♞', '♟', '♜', '♝']),
]);

const pieceNames = Object.freeze([
    'Wazir (0.1)',
    'Knight (1.2)',
    'Ferz (1.1)',
    'Dabbaba (0.2)',
    'Alfil (2.2)',
]);

const PIECE_MIME_TYPE = 'application/x-piece';

type PieceProps = {
    color: 0|1;
    piece: PieceType;
    lastMove?: SimpleMove;
    draggable?: boolean;
    onDragStart?: (ev: React.DragEvent<unknown>) => void;
    onDragEnd?:   (ev: React.DragEvent<unknown>) => void;
}

function PieceComponent({color, piece, lastMove, draggable, onDragStart, onDragEnd}: PieceProps) {
    let className = `piece ${playerClassNames[color]}`;
    let style = undefined;
    if (lastMove != null) {
        className += ' moving';
        if (lastMove.src == -1) {
            style = {animationName: `piece-drop`};
        } else {
            const c1 = lastMove.src % BOARD_WIDTH;
            const r1 = (lastMove.src - c1) / BOARD_WIDTH;
            const c2 = lastMove.dst % BOARD_WIDTH;
            const r2 = (lastMove.dst - c2) / BOARD_WIDTH;
            const dr = r2 - r1;
            const dc = c2 - c1;
            style = {animationName: `piece-move-${-dc}-${-dr}`};
        }
    }

    return (
        <div
            className={className}
            title={pieceNames[piece]}
            style={style}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {pieceEmoji[color][piece]}
        </div>
    );
}

type FieldProps = {
    r: number;
    c: number;
    cp?: ColoredPiece;
    lastMove?: SimpleMove;
    selected: boolean;
    selectable: boolean;
    onSelect: () => void;
    onDeselect: () => void;
};

const Field = memo(({r, c, cp, lastMove, selected, selectable, onSelect, onDeselect}: FieldProps) => {
    const i = BOARD_WIDTH*r + c;
    let className = `field ${fieldColorNames[(r + c) % 2]} ${cp == null ? 'empty' : 'occupied'}`;
    if (selected) className += ' selected';
    if (selectable) className += ' selectable';
    if (lastMove != null) {
        if (i === lastMove.src) className += ' moved-from';
        if (i === lastMove.dst) className += ' moved-to';
    }
    return (
        <div
            className={className}
            onClick={selectable ? () => onSelect() : undefined}
            onDragOver={ev => {
                if (ev.dataTransfer.types.includes(PIECE_MIME_TYPE)) {
                    ev.preventDefault();
                }
            }}
            onDrop={ev => {
                if (ev.dataTransfer.types.includes(PIECE_MIME_TYPE)) {
                    onSelect?.();
                }
            }}
        >
            {cp == null
                ? <div className='label'>{rowIds[r] + colIds[c]}</div>
                : <PieceComponent
                        color={cp.color}
                        piece={cp.piece}
                        lastMove={i === lastMove?.dst ? lastMove : undefined}
                        draggable={selectable}
                        onDragStart={selectable ? (ev) => {
                            ev.dataTransfer.setData(PIECE_MIME_TYPE, String(i));
                            onSelect?.();
                        } : undefined}
                        onDragEnd={() => onDeselect?.()}
                    />}
        </div>
    );
});

type HandProps = {
    color: 0|1;
    pieceCounts: readonly number[];  // piece type -> number available
    sources: Set<PieceType>;
    destinations: Set<PieceType>;
    selected?: PieceType;
    onSelect: (p: PieceType, c: 0|1) => void;
    onDeselect: () => void;
    onMoveTo: () => void;
};

const Hand = memo(({color, pieceCounts, sources, destinations, selected, onSelect, onDeselect, onMoveTo}: HandProps) => {
    return (
        <div className="hand">{
             pieceCounts.map((count, i) => {
                const piece = i as PieceType;
                const selectable = sources.has(piece) ||  destinations.has(piece);
                let className = 'slot';
                if (selectable) className += ' selectable';
                if (selected === piece) className += ' selected';
                return (count > 0 || selectable) &&
                    <div key={i}
                        className={className}
                        onClick={() => {
                            if (destinations.has(piece)) {
                                onMoveTo();
                            } else if (piece !== selected && sources.has(piece)) {
                                onSelect(piece, color);
                            } else {
                                onDeselect();
                            }
                        }}
                        draggable={sources.has(piece)}
                        onDragStart={ev => {
                            ev.dataTransfer.setData(PIECE_MIME_TYPE, String(-1));
                            onSelect(piece, color);
                        }}
                        onDragEnd={() => onDeselect()}
                        onDragOver={ev => {
                            if (ev.dataTransfer.types.includes(PIECE_MIME_TYPE)) {
                                ev.preventDefault();
                            }
                        }}
                        onDrop={ev => {
                            if (ev.dataTransfer.types.includes(PIECE_MIME_TYPE)) {
                                onMoveTo();
                            }
                        }}
                    >
                        {Array.from({length: count}).map((_, i) =>
                            <PieceComponent key={i} color={color} piece={piece}
                        />)}
                    </div>
            })
        }</div>
    )
});

type BoardProps = {
    pieces: readonly (null|ColoredPiece)[];
    lastMove?: SimpleMove;
    sources: Set<number>;
    destinations: Set<number>;
    source: number|null;
    onSourceChanged: (source: number|null) => void;
    onMoveTo: (destination: number) => void;
};

const Board = memo(({pieces, lastMove, sources, destinations, source, onSourceChanged, onMoveTo}: BoardProps) => {
    const fields = [];
    for (let r = 0; r < 8; ++r) {
        for (let c = 0; c < 8; ++c) {
            const i = 8*r + c;
            const cp = pieces[i];
            function handleSelect() {
                if (source != null && destinations.has(i)) {
                    onMoveTo(i);
                } else if (source !== i && sources.has(i)) {
                    onSourceChanged(i);
                } else {
                    onSourceChanged(null);
                }
            }
            function handleDeselect() {
                if (source != null) {
                    onSourceChanged(null);
                }
            }
            fields.push(
                <Field r={r} c={c} key={i}
                    lastMove={lastMove}
                    selected={source === i}
                    selectable={sources.has(i) || destinations.has(i)}
                    onSelect={handleSelect}
                    onDeselect={handleDeselect}
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
    lastMove?: SimpleMove,
    moveGenerator: MoveGenerator;
    onMove?: (move: SimpleMove) => void,
};

const GameComponent = memo((props: GameProps) => {
    const [selection, setSelection] = useState<null|Selection>();
    const {gameState, lastMove, moveGenerator, onMove} = props;
    const {hand, board} = gameState;

    const handleSourceChange = useCallback((src: number|null) => {
        if (src != null) {
            const cp = gameState.board[src];
            if (cp != null) {
                // New selection.
                const {color, piece} = cp;
                setSelection({color, piece, src});
            }
        } else {
            // Unselect.
            setSelection(null);
        }
    }, [gameState]);

    const handleMoveTo = useCallback((dst: number) => {
        // Execute move. (Changing the game state will clear the selection.)
        if (selection != null) {
            onMove?.({...selection, dst});
        }
    }, [selection, onMove]);

    const {sourceInHand, destInHand, sourceOnBoard, destOnBoard} = useMemo(
        () => {
            const sourceInHand  = [new Set<PieceType>(), new Set<PieceType>()];
            const destInHand    = [new Set<PieceType>(), new Set<PieceType>()];
            const sourceOnBoard = new Set<number>;
            const destOnBoard   = new Set<number>;
            for (const {color, piece, src} of moveGenerator.generateSelectable(gameState)) {
                if (src === -1) {
                    sourceInHand[color].add(piece);
                } else {
                    sourceOnBoard.add(src);
                }
            }
            if (selection != null) {
                for (const dst of moveGenerator.generateDestinations(gameState, selection)) {
                    if (dst === -1) {
                        destInHand[selection.color].add(selection.piece);
                    }  else {
                        destOnBoard.add(dst);
                    }
                }
            }
            return {sourceInHand, destInHand, sourceOnBoard, destOnBoard};
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
    }, [gameState, moveGenerator, selection]);

    return (
        <div className="game">
            <Hand
                color={0}
                pieceCounts={hand[0]}
                sources={sourceInHand[0]}
                destinations={destInHand[0]}
                selected={selection?.src === -1 && selection.color === 0 ? selection.piece : undefined}
                onSelect={piece => setSelection({color: 0, piece, src: -1})}
                onDeselect={() => setSelection(null)}
                onMoveTo={() => handleMoveTo(-1)}
            />
            <Board
                pieces={board}
                lastMove={lastMove}
                sources={sourceOnBoard}
                destinations={destOnBoard}
                source={selection?.src ?? null}
                onSourceChanged={handleSourceChange}
                onMoveTo={handleMoveTo}
            />
            <Hand
                color={1}
                pieceCounts={hand[1]}
                selected={selection?.src === -1 && selection.color === 1 ? selection.piece : undefined}
                sources={sourceInHand[1]}
                destinations={destInHand[1]}
                onSelect={piece => setSelection({color: 1, piece, src: -1})}
                onDeselect={() => setSelection(null)}
                onMoveTo={() => handleMoveTo(-1)}
            />
        </div>
    );
});

export default GameComponent;
