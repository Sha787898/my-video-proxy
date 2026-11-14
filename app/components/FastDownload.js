'use client';

import { useEffect, useRef, useState } from 'react';
import { getInfo, directUrl, createTurbo, fmtBytes, fmtTime, canWriteToDisk, memoryLimit, DL_BASE } from '../utils/turboDownload';

const I = {
    bolt: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>,
    rocket: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2" /><path d="M12 15l-3-3a22 22 0 012-4 12 12 0 019-5c0 3-1 7-5 9a22 22 0 01-3 2z" /><path d="M9 12H4s.6-3 2-4c1.6-1 5 0 5 0M12 15v5s3-.6 4-2c1-1.6 0-5 0-5" /></svg>,
    pause: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
    play: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20" /></svg>,
    stop: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
    link: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>,
};

export default function FastDownload({ id }) {
    const [info, setInfo] = useState(undefined); // undefined = checking, null = not available
    const [u, setU] = useState(null);
    const [conn, setConn] = useState(8);
    const [copied, setCopied] = useState(false);
    const ctl = useRef(null);

    useEffect(() => {
        let dead = false;
        getInfo(id).then((i) => { if (!dead) setInfo(i); });
        return () => { dead = true; if (ctl.current) ctl.current.cancel(); };
    }, [id]);

    if (!DL_BASE || info === null) return null; // feature is off or this file has no fast source
    if (info === undefined) return <div className="fd fd-skel" aria-hidden="true"><style>{CSS}</style></div>;

    const running = u && (u.state === 'running' || u.state === 'paused' || u.state === 'saving');
    const tooBig = !canWriteToDisk() && info.size > memoryLimit();
    const start = () => {
        if (ctl.current) ctl.current.cancel();
        ctl.current = createTurbo({ id, info, connections: conn, onUpdate: setU });
        ctl.current.start();
    };
    const copy = async () => {
        try { await navigator.clipboard.writeText(directUrl(id, info.name)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* ignore */ }
    };

    return (
        <section className="fd" aria-label="Fast download">
            <style>{CSS}</style>
            <div className="fd-head">
                <span className="fd-badge">{I.bolt} Cloud fast download</span>
                <span className="fd-sub">{info.size ? fmtBytes(info.size) : ''}{info.ranges ? ' · resumable' : ''}</span>
            </div>

            {!running && (!u || u.state !== 'done') && (
                <div className="fd-btns">
                    <a className="fd-b fd-main" href={directUrl(id, info.name)} download={info.name} rel="noopener">
                        {I.bolt}<span><b>Instant download</b><small>Starts now · browser can resume</small></span>
                    </a>
                    {info.ranges && info.size > 0 && (
                        <button type="button" className="fd-b" onClick={start} disabled={tooBig} title={tooBig ? 'Too large for this browser' : ''}>
                            {I.rocket}<span><b>Turbo download</b><small>{conn} connections · pause &amp; resume</small></span>
                        </button>
                    )}
                </div>
            )}

            {!running && (!u || u.state !== 'done') && info.ranges && info.size > 0 && (
                <div className="fd-opt">
                    <span>Connections</span>
                    <div className="fd-seg">{[4, 8, 16].map((n) => <button key={n} type="button" className={conn === n ? 'on' : ''} onClick={() => setConn(n)}>{n}</button>)}</div>
                    <button type="button" className="fd-link" onClick={copy}>{I.link} {copied ? 'Copied' : 'Copy direct link'}</button>
                </div>
            )}

            {tooBig && <p className="fd-note">Turbo needs Chrome or Edge on a computer for files this big. Instant download works everywhere.</p>}

            {u && u.state !== 'idle' && u.state !== 'cancelled' && (
                <div className="fd-prog">
                    <div className="fd-bar"><i style={{ width: `${Math.min(100, u.pct).toFixed(2)}%` }} className={u.state === 'done' ? 'ok' : u.state === 'error' ? 'bad' : ''} /></div>
                    <div className="fd-stats">
                        <span><b>{u.pct.toFixed(1)}%</b> · {fmtBytes(u.bytes)} / {fmtBytes(u.size)}</span>
                        {u.state === 'running' && <span><b>{fmtBytes(u.speed)}/s</b> · {fmtTime(u.eta)} left</span>}
                        {u.state === 'paused' && <span>Paused</span>}
                        {u.state === 'saving' && <span>Saving file…</span>}
                        {u.state === 'done' && <span className="ok">Finished and saved</span>}
                    </div>
                    {u.state === 'error' && <p className="fd-err">{u.error} <button type="button" className="fd-link" onClick={() => ctl.current && ctl.current.resume()}>Retry</button></p>}
                    {(u.state === 'running' || u.state === 'paused') && (
                        <div className="fd-ctl">
                            {u.state === 'running'
                                ? <button type="button" className="fd-s" onClick={() => ctl.current.pause()}>{I.pause} Pause</button>
                                : <button type="button" className="fd-s" onClick={() => ctl.current.resume()}>{I.play} Resume</button>}
                            <button type="button" className="fd-s bad" onClick={() => { ctl.current.cancel(); }}>{I.stop} Cancel</button>
                            <span className="fd-live">{u.state === 'running' ? `${u.connections} live · ${u.done}/${u.total} parts` : `${u.done}/${u.total} parts kept`}</span>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

const CSS = `
.fd { margin: 0 0 10px; padding: 12px; border-radius: 14px; border: 1px solid rgba(var(--ac-rgb),.35); background: linear-gradient(180deg, rgba(var(--ac-rgb),.1), rgba(255,255,255,.02)); display: flex; flex-direction: column; gap: 10px; }
.fd-skel { height: 92px; opacity: .5; animation: fd-p 1.2s ease-in-out infinite; }
@keyframes fd-p { 50% { opacity: .9; } }
.fd-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.fd-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--ac-hi, #ff8a8f); }
.fd-sub { font-size: 11px; color: #8e9bb0; font-weight: 600; }
.fd-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 420px) { .fd-btns { grid-template-columns: 1fr; } }
.fd-b { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #f4f6fa; cursor: pointer; text-align: left; text-decoration: none; font: inherit; transition: transform .15s, background .2s, border-color .2s; min-width: 0; }
.fd-b:hover:not(:disabled) { transform: translateY(-1px); background: rgba(255,255,255,.09); border-color: rgba(var(--ac-rgb),.5); }
.fd-b:disabled { opacity: .45; cursor: not-allowed; }
.fd-b span { display: flex; flex-direction: column; min-width: 0; }
.fd-b b { font-size: 13px; font-weight: 800; }
.fd-b small { font-size: 10.5px; color: #9aa6ba; font-weight: 600; }
.fd-main { background: linear-gradient(135deg, rgba(var(--ac-rgb),.95), rgba(var(--ac-rgb),.7)); border-color: transparent; box-shadow: 0 6px 20px rgba(var(--ac-rgb),.3); }
.fd-main small { color: rgba(255,255,255,.85); }
.fd-main:hover:not(:disabled) { background: linear-gradient(135deg, rgba(var(--ac-rgb),1), rgba(var(--ac-rgb),.8)); }
.fd-opt { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #8e9bb0; font-weight: 700; }
.fd-seg { display: inline-flex; border: 1px solid rgba(255,255,255,.12); border-radius: 9px; overflow: hidden; }
.fd-seg button { border: 0; background: transparent; color: #b6c0d0; padding: 5px 11px; font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.fd-seg button.on { background: rgba(var(--ac-rgb),.85); color: #fff; }
.fd-link { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; border: 0; background: transparent; color: var(--ac-hi, #ff8a8f); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.fd-note, .fd-err { margin: 0; font-size: 11px; color: #f5b94a; }
.fd-err { color: #ff7b80; }
.fd-prog { display: flex; flex-direction: column; gap: 7px; }
.fd-bar { height: 9px; border-radius: 9px; background: rgba(255,255,255,.08); overflow: hidden; }
.fd-bar i { display: block; height: 100%; border-radius: 9px; background: linear-gradient(90deg, rgba(var(--ac-rgb),.8), var(--ac-hi, #ff8a8f)); transition: width .25s linear; background-size: 200% 100%; }
.fd-bar i.ok { background: #22c55e; } .fd-bar i.bad { background: #ef4444; }
.fd-stats { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: #aab5c7; }
.fd-stats b { color: #fff; } .fd-stats .ok { color: #4ade80; font-weight: 800; }
.fd-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fd-s { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #f4f6fa; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.fd-s.bad { color: #ff9ea2; border-color: rgba(239,68,68,.35); }
.fd-live { margin-left: auto; font-size: 10.5px; color: #8e9bb0; font-weight: 700; }
`;
