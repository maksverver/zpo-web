import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { decodeState } from "../game/codec";
import { parseTranscript } from "../game/turn";
import { formatUrlArguments } from "./UrlArguments";
import './IndexPage.css'

export default function IndexPage() {
    const [source, setSource] = useState('empty-board');

    const stateStringRef = useRef<HTMLInputElement>(null);
    const moveListRef    = useRef<HTMLTextAreaElement>(null);

    const handleSourceChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            setSource(e.target.value);
        }, []);

    function handleSubmit(destination: 'edit'|'play'|'view') {
        let params = '';
        if (source === 'state-string') {
            const stateString = stateStringRef.current?.value ?? '';
            let state = undefined;
            try {
                state = decodeState(stateString);
            } catch (e) {
                console.warn('Invalid state string!', stateString, e);
            }
            if (state == null) {
                alert('Invalid state string!');
                return;
            }
            params = formatUrlArguments({state});
        }
        if (source === 'move-list') {
            let turns = undefined;
            try {
                turns = parseTranscript(moveListRef.current?.value ?? '');
            } catch (e) {
                console.warn('Invalid transcript!', e);
            }
            if (turns == null) {
                alert('Invalid transcript!');
                return;
            }
            params = formatUrlArguments({turns});
        }
        document.location.href = `${destination}.html?${params}`;
    }

    function handleFileChange(ev: ChangeEvent<HTMLInputElement>) {
        const reader = new FileReader();
        const files = ev.target.files;
        if (files == null) return;
        reader.readAsText(files[0], "UTF-8");
        reader.onload = (e) => {
            const text = e.target?.result;
            const textArea = moveListRef?.current;
            if (text != null && textArea != null) {
                textArea.value = text as string;
            }
        }
        reader.onerror = (e) => {
            console.error('Error reading file!', e);
            alert('Error reading file!');
        }
    }

    return (
        <div className="index">
            <h1>0·1</h1>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="empty-board"
                        checked={source === 'empty-board'}
                        onChange={handleSourceChange}
                    /> {' '} Empty board
                </label>
            </div>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="state-string"
                        checked={source === 'state-string'}
                        onChange={handleSourceChange}
                    /> {' '} From state string
                </label>
                <div>
                    <input
                        className="code"
                        type="text"
                        name="state-string"
                        ref={stateStringRef}
                        disabled={source !== 'state-string'}
                    />
                </div>
            </div>
            <div>
                <label>
                    <input
                        type="radio"
                        name="source"
                        value="move-list"
                        checked={source === 'move-list'}
                        onChange={handleSourceChange}
                    /> {' '} From move list
                </label>
                <div>
                    <textarea
                        rows={10} cols={40}
                         disabled={source !== 'move-list'}
                         ref={moveListRef}
                    />
                    <br/>
                    <input type="file"
                        disabled={source !== 'move-list'}
                        onChange={handleFileChange}
                    />
                </div>
            </div>
            <hr/>
            <div>
                <button name="destination" value="view" onClick={() => handleSubmit('view')}>View</button>
                {' '}
                <button name="destination" value="edit" onClick={() => handleSubmit('edit')}>Edit</button>
                {' '}
                <button name="destination" value="play" onClick={() => handleSubmit('play')}>Play</button>
            </div>
        </div>
    )
}
