'use client';

import { useState } from 'react';
import { openInVlc, VLC_ICON } from '../utils/vlc';
import { DL_BASE, publicPath } from '../utils/turboDownload';

// Small standard button for the download page: plays the file in the VLC app (all audio tracks + subtitles).
export default function VlcButton({ id, name }) {
    const [note, setNote] = useState('');
    if (!DL_BASE || !id) return null;
    const go = () => {
        const t = openInVlc(publicPath(id, name), name);
        setNote(t);
        if (t) setTimeout(() => setNote(''), 6000);
    };
    return (
        <div className="vlcb-wrap">
            <style>{`
.vlcb-wrap { margin-top: 10px; }
.vlcb { width: 100%; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #e6e9ef; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; text-align: left; transition: background .2s, border-color .2s, transform .15s; }
.vlcb:hover { background: rgba(255,136,0,.1); border-color: rgba(255,136,0,.45); transform: translateY(-1px); }
.vlcb:focus-visible { outline: 2px solid rgba(255,136,0,.7); outline-offset: 2px; }
.vlcb svg { width: 22px; height: 22px; flex-shrink: 0; }
.vlcb span.t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vlcb small { font-size: 11px; font-weight: 600; color: #8e9bb0; white-space: nowrap; }
@media (max-width: 380px) { .vlcb small { display: none; } }
.vlcb-note { margin: 6px 2px 0; font-size: 11.5px; color: #9aa6b8; }
`}</style>
            <button type="button" className="vlcb" onClick={go} aria-label="Play in VLC">
                <span dangerouslySetInnerHTML={{ __html: VLC_ICON }} style={{ display: 'inline-flex' }} />
                <span className="t">Play in VLC</span>
                <small>all audio &amp; subtitles</small>
            </button>
            {note && <p className="vlcb-note" role="status">{note}</p>}
        </div>
    );
}
