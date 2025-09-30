import React, { memo, use, useEffect } from "react";
import { encodeState } from "../game/codec";
import { initialGameState } from "../game/state";
import { executeTurn, formatTurn, type Turn } from "../game/turn";
import classNames from "../util/classNames";
import './MoveList.css'

const clipboardWriteEnabled: Promise<boolean> = (async () => {
    if (!navigator.permissions) {
        return false;
    }
    try {
        const {state} = await navigator.permissions.query({name: 'clipboard-write' as PermissionName});
        return state === "granted" || state === "prompt";
    } catch (e) {
        // If the browser doesn't know about this permission, assume we are
        // allowed to write by default. (Worst case, it will fail.) At leat
        // Firefox doesn't support this permission, but does support copying to
        // clipboard, even from iframes.
        console.warn(e);
        return true;
    }
})();

function formatFancyTurn(turn: Turn) {
    const s = formatTurn(turn);
    if (s.length <= 8) {
        return s;
    }
    return <React.Fragment>{s.substring(0,8)}<br/>{s.substring(8)}</React.Fragment>
}

type TurnProps = {
    idx: number;
    turns: readonly Turn[];
    redoable: boolean;
    selected: boolean;
    onSelect?: () => void;
}

function Turn({idx, turns, redoable, selected, onSelect}: TurnProps) {
    const copy = use(clipboardWriteEnabled);
    const turn = turns[idx];
    const num = idx + 1;
    function copyState() {
        const text = encodeState(
            turns.slice(0, idx + 1).reduce(
                (state, turn) => executeTurn(state, turn), initialGameState));
        navigator.clipboard.writeText(text);
        alert('State copied to clipboard!');
    }
    function copyTranscript() {
        const text = turns.slice(0, idx + 1).map(t => formatTurn(t) + '\n').join('');
        navigator.clipboard.writeText(text);
        alert(`Transcript copied to clipboard!`);
    }
    return (
        <React.Fragment>
            <tr className={classNames({
                    redoable: redoable,
                    selected: selected,
                    selectable: onSelect != null,
                })}
                onClick={onSelect == null ? undefined : () => onSelect()}
            ><th>{num}.</th>
                {num % 2 === 0 ? <td/> : undefined}
                <td>{formatFancyTurn(turn)}</td>
                {num % 2 === 1 ? <td/> : undefined}
                {copy &&
                    <td>
                        <span className="copy-to-clipboard" title="Copy state string"
                            onClick={ev => { ev.stopPropagation(); copyState()}}>
                            ♟️
                        </span>
                        <span className="copy-to-clipboard" title="Copy move history"
                            onClick={ev => { ev.stopPropagation(); copyTranscript()}}>
                            📜
                        </span>
                    </td>
                }
            </tr>
        </React.Fragment>
    );
}

export type MoveListProps = {
    turns: readonly Turn[];
    redoableTurns?: Turn[];
    selected?: number,
    onUndo?: () => void;
    onRedo?: () => void;
    onSelect?: (i: number) => void;
}

const MoveList = memo(({turns, redoableTurns, selected, onUndo, onRedo, onSelect}: MoveListProps) => {
    const canUndo = onUndo != null && turns.length > 0;
    const canRedo = onRedo != null && redoableTurns != null && redoableTurns.length > 0;
    const canPrev = onSelect != null && selected != null && selected >= 1;
    const canNext = onSelect != null && selected != null && selected < turns.length;

    function goToPrev() { if (canPrev) onSelect(selected - 1); }
    function goToNext() { if (canNext) onSelect(selected + 1); }
    function goToFrst() { if (canPrev) onSelect(0); }
    function goToLast() { if (canNext) onSelect(turns.length); }

    // Allow undo/redo with ctrl-z/y
    useEffect(() => {
        function handleKeyDown(ev: KeyboardEvent) {
            if (ev.ctrlKey) {
                const callback = {
                    'z': canUndo ? onUndo : undefined,
                    'y': canRedo ? onRedo : undefined,
                }[ev.key];
                if (callback != null) {
                    ev.preventDefault();
                    callback();
                }
            } else {
                const callback = {
                    'ArrowLeft':  goToPrev,
                    'ArrowRight': goToNext,
                    'Home':       goToFrst,
                    'End':        goToLast,
                }[ev.key];
                if (callback != null) {
                    ev.preventDefault();
                    callback();
                    return;
                }
            }
        }
        if (canUndo || canRedo || canPrev || canNext) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    });

    const allTurns = redoableTurns == null ? turns : turns.concat(redoableTurns);

    return (
        <div className="move-list">
            {selected != null && onSelect != null &&
                <div className="buttons top">
                    <button disabled={!canPrev} onClick={goToFrst}>⏮️</button>
                    <button disabled={!canPrev} onClick={goToPrev}>◀️</button>
                    <button disabled={!canNext} onClick={goToNext}>▶️</button>
                    <button disabled={!canNext} onClick={goToLast}>⏭️</button>
                </div>
            }
            <table>
                <thead>
                    <tr className={classNames({
                            selectable: onSelect != null,
                            selected: selected === 0,
                        })}
                        key={0} onClick={onSelect == null ? undefined : () => onSelect(0)}
                    >
                        <td></td>
                        <th>Red</th>
                        <th>Blue</th>
                    </tr>
                </thead>
                <tbody>
                    {allTurns.map((_turn, i) => {
                        return (
                            <Turn key={i + 1} idx={i} turns={allTurns}
                                redoable={i >= turns.length}
                                selected={selected === i + 1}
                                onSelect={onSelect == null ? undefined : () => onSelect(i + 1)}
                            />
                        )
                    })}
                </tbody>
            </table>
            {(onUndo != null || onRedo != null) &&
                <div className="buttons bottom">
                    <button disabled={!canUndo} onClick={onUndo} title="Undo (ctrl-z)">Undo</button>
                    <button disabled={!canRedo} onClick={onRedo} title="Redo (ctrl-y)">Redo</button>
                </div>}
        </div>
    );
});

export default MoveList;
