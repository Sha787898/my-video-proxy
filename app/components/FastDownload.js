'use client';

import { useEffect, useRef, useState } from 'react';
import { getInfo, getLink, publicPath, absolute, createTurbo, fmtBytes, fmtTime, canWriteToDisk, memoryLimit, DL_BASE } from '../utils/turboDownload';

const I = {
    bolt: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>,
    rocket: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2" /><path d="M12 15l-3-3a22 22 0 012-4 12 12 0 019-5c0 3-1 7-5 9a22 22 0 01-3 2z" /><path d="M9 12H4s.6-3 2-4c1.6-1 5 0 5 0M12 15v5s3-.6 4-2c1-1.6 0-5 0-5" /></svg>,
    pause: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>,
    play: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 20 12 7 20" /></svg>,
    stop: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
    shield: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /></svg>,
    resume: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" /></svg>,
    multi: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
    link: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>,
};


function Ring({ pct, state }) {
    const r = 27; const c = 2 * Math.PI * r;
    const col = state === 'done' ? '#22c55e' : state === 'error' ? '#ef4444' : 'var(--ac-hi, #ff8a8f)';
    return (
        <svg className="fd-ring" width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
            <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="6" />
            <circle cx="34" cy="34" r={r} fill="none" stroke={col} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`} transform="rotate(-90 34 34)" style={{ transition: 'stroke-dasharray .3s linear' }} />
            <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{Math.floor(pct)}%</text>
        </svg>
    );
}

function Graph({ values }) {
    if (values.length < 2) return null;
    const w = 200; const h = 34; const max = Math.max(1, ...values);
    const pts = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * w).toFixed(1)} ${(h - 2 - (v / max) * (h - 6)).toFixed(1)}`).join(' ');
    return (
        <svg className="fd-graph" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={`${pts} L${w} ${h} L0 ${h} Z`} fill="var(--ac-hi, #ff8a8f)" opacity=".15" />
            <path d={pts} fill="none" stroke="var(--ac-hi, #ff8a8f)" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export default function FastDownload({ id }) {
    const [info, setInfo] = useState(undefined); // undefined = checking, null = not available
    const [u, setU] = useState(null);
    const [conn, setConn] = useState(8);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [hist, setHist] = useState([]);
    const [finish, setFinish] = useState('');
    const [copied, setCopied] = useState(false);
    const [via, setVia] = useState(''); // '' auto · 'a' public Drive link · 'b' Google account (no quota)
    const ctl = useRef(null);

    useEffect(() => {
        let dead = false;
        getInfo(id).then((i) => { if (!dead) setInfo(i); });
        return () => { dead = true; if (ctl.current) ctl.current.cancel(); };
    }, [id]);

    if (!DL_BASE || info === null) return null; // feature is off or this file has no fast source
    if (info === undefined) return <div className="fd fd-skel" aria-hidden="true"><style>{CSS}</style></div>;

    const running = u && (u.state === 'running' || u.state === 'paused' || u.state === 'saving');
    const finished = u && u.state === 'done';
    const tooBig = !canWriteToDisk() && info.size > memoryLimit();

    const onUpdate = (x) => {
        setU(x);
        if (x.state === 'running') {
            setHist((h) => (h.length > 60 ? h.slice(-60) : h).concat(x.speed));
            setFinish(isFinite(x.eta) && x.eta > 0 ? new Date(Date.now() + x.eta * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
        }
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(absolute(publicPath(id, info.name, via))); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* ignore */ }
    };
    const instant = async () => {
        setBusy(true); setMsg('');
        const r = await getLink(id, 'nav', via);
        setBusy(false);
        if (!r.ok) { setMsg(r.error); return; }
        window.location.assign(r.url); // attachment response: the page stays, the browser downloads (and can resume)
    };
    const turbo = async () => {
        setMsg('');
        let r = { ok: true, url: publicPath(id, info.name, via) };
        if (info.protected) { setBusy(true); r = await getLink(id, 'turbo', via); setBusy(false); }
        if (!r.ok) { setMsg(r.error); return; }
        if (ctl.current) ctl.current.cancel();
        setHist([]);
        ctl.current = createTurbo({ id, info, url: r.url, connections: conn, onUpdate });
        ctl.current.start();
    };

    return (
        <section className="fd" aria-label="Fast download">
            <style>{CSS}</style>
            <div className="fd-head">
                <span className="fd-badge">{I.bolt} Cloud fast download</span>
                <span className="fd-sub">{info.size ? fmtBytes(info.size) : ''}{info.ranges ? ' · resumable' : ''}</span>
            </div>

            {!running && !finished && info.account && (
                <div className="fd-opt">
                    <span>Server</span>
                    <div className="fd-seg">
                        <button type="button" className={via === '' ? 'on' : ''} onClick={() => setVia('')} title="Picks the best working server">Auto</button>
                        <button type="button" className={via === 'b' ? 'on' : ''} onClick={() => setVia('b')} title="Through a Google account, no public-link quota">Server B</button>
                        <button type="button" className={via === 'a' ? 'on' : ''} onClick={() => setVia('a')} title="Public Drive link">Server A</button>
                    </div>
                </div>
            )}
            {info.warn && <p className="fd-note">{info.warn}{info.account ? '' : ' Turbo is unavailable right now, Instant will retry the server.'}</p>}

            {!running && !finished && (
                <div className="fd-btns">
                    {info.protected ? (
                        <button type="button" className="fd-b fd-main" onClick={instant} disabled={busy}>
                            {I.bolt}<span><b>{busy ? 'Preparing…' : 'Instant download'}</b><small>Starts now · browser can resume</small></span>
                        </button>
                    ) : (
                        <a className="fd-b fd-main" href={publicPath(id, info.name, via)} download={info.name} rel="noopener">
                            {I.bolt}<span><b>Instant download</b><small>Starts now · browser can resume</small></span>
                        </a>
                    )}
                    {info.ranges && info.size > 0 && (
                        <button type="button" className="fd-b" onClick={turbo} disabled={tooBig || busy} title={tooBig ? 'Too large for this browser' : ''}>
                            {I.rocket}<span><b>Turbo download</b><small>{conn} connections · pause &amp; resume</small></span>
                        </button>
                    )}
                </div>
            )}

            {!running && !finished && info.ranges && info.size > 0 && (
                <div className="fd-opt">
                    <span>Connections</span>
                    <div className="fd-seg">{[4, 8, 16].map((n) => <button key={n} type="button" className={conn === n ? 'on' : ''} onClick={() => setConn(n)}>{n}</button>)}</div>
                    {!info.protected && <button type="button" className="fd-link" onClick={copyLink}>{I.link} {copied ? 'Copied' : 'Copy download link'}</button>}
                </div>
            )}

            {msg && <p className="fd-err">{msg}</p>}
            {tooBig && <p className="fd-note">Turbo needs Chrome or Edge on a computer for files this big. Instant download works everywhere.</p>}

            {u && u.state !== 'idle' && u.state !== 'cancelled' && (
                <div className="fd-prog">
                    {finished ? (
                        <div className="fd-done">{I.shield} Finished and saved · {fmtBytes(u.size)}</div>
                    ) : (
                        <div className="fd-top">
                            <Ring pct={u.pct} state={u.state} />
                            <div className="fd-spd">
                                <b>{u.state === 'running' ? `${fmtBytes(u.speed)}/s` : u.state === 'paused' ? 'Paused' : u.state === 'saving' ? 'Saving…' : '—'}</b>
                                <small>{fmtBytes(u.bytes)} of {fmtBytes(u.size)}{u.state === 'running' ? ` · ${fmtTime(u.eta)} left${finish ? ` · done ≈ ${finish}` : ''}` : ''}</small>
                                <Graph values={hist} />
                            </div>
                        </div>
                    )}
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

            <div className="fd-chips">
                <span>{I.resume} Resumable</span><span>{I.multi} Multi-connection</span><span>{I.shield} {info.protected ? 'Private link · expires' : 'Hidden source'}</span>
            </div>
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
.fd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fd-chips span { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: #b6c0d0; padding: 4px 9px; border-radius: 99px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); }
.fd-chips svg { color: var(--ac-hi, #ff8a8f); }
.fd-top { display: flex; align-items: center; gap: 14px; }
.fd-ring { flex-shrink: 0; }
.fd-spd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.fd-spd b { font-size: 22px; line-height: 1; color: #fff; letter-spacing: -.02em; } .fd-spd small { font-size: 11px; color: #8e9bb0; font-weight: 600; }
.fd-graph { width: 100%; height: 34px; display: block; }
.fd-done { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); color: #86efac; font-size: 13px; font-weight: 800; animation: fd-pop .45s cubic-bezier(.2,1.4,.4,1); }
@keyframes fd-pop { from { transform: scale(.94); opacity: 0; } }
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
