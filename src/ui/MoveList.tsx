import React, { useEffect } from "react";
import { formatTurn, type Turn } from "../game/turn";
import classNames from "../util/classNames";
import './MoveList.css'

export type MoveListProps = {
    turns: readonly Turn[];
    redoableTurns?: Turn[];
    selected?: number,
    onUndo?: () => void;
    onRedo?: () => void;
    onSelect?: (i: number) => void;
}

export default function MoveList({turns, redoableTurns, selected, onUndo, onRedo, onSelect}: MoveListProps) {
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

    function formatFancyTurn(turn: Turn) {
        const s = formatTurn(turn);
        if (s.length <= 8) {
            return s;
        }
        return <React.Fragment>{s.substring(0,8)}<br/>{s.substring(8)}</React.Fragment>
    }

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
                <tbody>
                    <tr className={classNames({
                            selectable: onSelect != null,
                            selected: selected === 0,
                        })}
                        onClick={onSelect == null ? undefined : () => onSelect(0)}
                    ><th>0.</th><td colSpan={2} align="center">Start</td></tr>
                    {
                        turns.map((turn, i) => {
                            const j = i + 1;
                            return (
                                <tr key={j}
                                    className={classNames({
                                        selectable: onSelect != null,
                                        selected: selected === j,
                                    })}
                                    onClick={onSelect == null ? undefined : () => onSelect(j)}
                                ><th>{j}.</th>
                                    {j % 2 === 0 ? <td/> : undefined}
                                    <td>{formatFancyTurn(turn)}</td>
                                    {j % 2 === 1 ? <td/> : undefined}
                                </tr>
                            );
                        })
                    }
                    {
                        redoableTurns != null && redoableTurns.map((turn, i) => {
                            const j = turns.length + i + 1;
                            return (
                                <tr key={j}
                                    className={classNames({
                                        redoable: true,
                                        selectable: onSelect != null,
                                        selected: selected === j,
                                    })}
                                ><th>{j}.</th>
                                    {j % 2 === 0 ? <td/> : undefined}
                                    <td>{formatFancyTurn(turn)}</td>
                                    {j % 2 === 1 ? <td/> : undefined}
                                </tr>
                            );
                        })
                    }
                </tbody>
            </table>
            {(onUndo != null || onRedo != null) &&
                <div className="buttons bottom">
                    <button disabled={!canUndo} onClick={onUndo} title="Undo (ctrl-z)">Undo</button>
                    <button disabled={!canRedo} onClick={onRedo} title="Redo (ctrl-y)">Redo</button>
                </div>}
        </div>
    );
}
