'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    check: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
    down: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>,
    cloud: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 18a4 4 0 01-.5-8A6 6 0 0118 9a4.5 4.5 0 01-.5 9z" /></svg>,
    user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>,
    star: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z" /></svg>,
    chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
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
    const [note, setNote] = useState(null); // popup: { kind: 'wait' | 'busy', text }
    const [via, setVia] = useState(''); // '' auto · 'a' public Drive link · 'b' Google account (no quota)
    const [opt, setOpt] = useState(false); // options row (connections, copy link) is folded by default
    const ctl = useRef(null);
    const lastTick = useRef(0);

    useEffect(() => {
        let dead = false;
        getInfo(id).then((i) => { if (!dead) setInfo(i); });
        return () => { dead = true; if (ctl.current) ctl.current.cancel(); };
    }, [id]);

    if (!DL_BASE || info === null) return null; // feature is off or this file has no fast source
    if (info === undefined) return <div className="fd-skel" aria-hidden="true"><style>{CSS}</style></div>;

    const running = u && (u.state === 'running' || u.state === 'paused' || u.state === 'saving');
    const finished = u && u.state === 'done';
    const tooBig = !canWriteToDisk() && info.size > memoryLimit();

    const onUpdate = (x) => {
        const now = Date.now();
        if (x.state === 'running' && now - lastTick.current < 140) return; // keep the page smooth, only state changes are never skipped
        lastTick.current = now;
        setU(x);
        if (x.state === 'running') {
            setHist((h) => (h.length > 60 ? h.slice(-60) : h).concat(x.speed));
            setFinish(isFinite(x.eta) && x.eta > 0 ? new Date(Date.now() + x.eta * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
        }
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(absolute(publicPath(id, info.name, via))); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* ignore */ }
    };
    // asks the server for 1 byte first, so a busy / quota-limited file shows a friendly popup instead of a raw error page
    const preflight = async (url) => {
        try {
            const r = await fetch(url, { headers: { Range: 'bytes=0-0' }, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
            if (r.ok || r.status === 206) { try { r.body && r.body.cancel(); } catch (e) { /* ignore */ } return { ok: true }; }
            const j = await r.json().catch(() => null);
            return { ok: false, error: (j && j.error) || `The download server answered ${r.status}`, quota: r.status === 429 };
        } catch (e) { return { ok: false, error: 'Could not reach the download server. Check your connection and try again.' }; }
    };
    const resolveUrl = async (kind) => {
        if (info.protected) { const r = await getLink(id, kind, via); return r.ok ? { ok: true, url: r.url } : { ok: false, error: r.error }; }
        return { ok: true, url: publicPath(id, info.name, via) };
    };
    const go = async (mode, tries = 0) => {
        if (mode === 'turbo' && !(info.ranges && info.size > 0)) return;
        setBusy(true); setMsg(''); setNote({ kind: 'wait', text: 'Preparing your download…' });
        const r = await resolveUrl(mode === 'turbo' ? 'turbo' : 'nav');
        const chk = r.ok ? await preflight(r.url) : r;
        setBusy(false);
        if (!chk.ok) {
            setNote({ kind: 'busy', text: chk.error, quota: chk.quota, retry: () => go(mode), mode });
            return;
        }
        setNote(null);
        if (mode === 'turbo') {
            if (ctl.current) ctl.current.cancel();
            setHist([]);
            ctl.current = createTurbo({ id, info, url: r.url, connections: conn, onUpdate });
            ctl.current.start();
        } else {
            window.location.assign(r.url); // attachment response: the page stays, the browser downloads (and can resume)
        }
    };
    const instant = (e) => { if (e) e.preventDefault(); go('instant'); };
    const turbo = () => go('turbo');

    const SERVERS = [{ k: '', n: 'Auto' }, { k: 'b', n: 'Server B' }, { k: 'a', n: 'Server A' }];
    const canTurbo = info.ranges && info.size > 0;
    const tp = u && u.state !== 'idle' && u.state !== 'cancelled';

    return (
        <section className={`fx ${running ? 'is-run' : ''} ${finished ? 'is-done' : ''}`} aria-label="Fast download">
            <style>{CSS}</style>

            <div className="fx-top">
                <span className="fx-badge"><i>{I.bolt}</i><b>Fast download</b>{info.size > 0 && <em>{fmtBytes(info.size)}</em>}</span>
                <span className={`fx-live ${info.warn ? 'warn' : ''}`}><b />{info.warn ? 'Busy' : 'Ready'}</span>
            </div>

            {!running && !finished && (
                <>
                    {info.warn && <p className="fx-warn">{info.warn}</p>}

                    <div className="fx-row">
                        <a className="fx-cta" href={info.protected ? '#' : publicPath(id, info.name, via)} download={info.name} rel="noopener" onClick={instant} aria-busy={busy}>
                            {I.down}<span>{busy ? 'Preparing…' : 'Download'}</span>
                            <span className="fx-shine" />
                        </a>
                        {canTurbo && (
                            <button type="button" className="fx-turbo" onClick={turbo} disabled={tooBig || busy} title={tooBig ? 'Needs Chrome or Edge on a computer for this size' : `Turbo: ${conn} connections, pause and resume`}>
                                {I.rocket}<span>Turbo</span>
                            </button>
                        )}
                    </div>

                    <button type="button" className="fx-more" aria-expanded={opt} onClick={() => setOpt((o) => !o)}>
                        <span>Resumable · Multi-connection · Hidden source</span>
                        <i className={opt ? 'up' : ''}>{I.chev}</i>
                    </button>

                    {opt && (
                        <div className="fx-opts">
                            {info.account && (
                                <div className="fx-o">
                                    <small>Server</small>
                                    <div className="fx-seg" role="radiogroup" aria-label="Server">
                                        {SERVERS.map((x) => (
                                            <button key={x.k || 'auto'} type="button" role="radio" aria-checked={via === x.k} className={via === x.k ? 'on' : ''} onClick={() => setVia(x.k)}>{x.n}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {canTurbo && (
                                <div className="fx-o">
                                    <small>Turbo connections</small>
                                    <div className="fx-seg" role="radiogroup" aria-label="Connections">
                                        {[[4, 'Safe'], [8, 'Fast'], [16, 'Max']].map(([n, l]) => (
                                            <button key={n} type="button" role="radio" aria-checked={conn === n} className={conn === n ? 'on' : ''} onClick={() => setConn(n)}>{n} <em>{l}</em></button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {tooBig && <p className="fx-warn">Turbo needs Chrome or Edge on a computer for files this big.</p>}
                            {!info.protected && <button type="button" className="fx-copy" onClick={copyLink}>{I.link} {copied ? 'Link copied' : 'Copy link for IDM / FDM'}</button>}
                        </div>
                    )}
                </>
            )}

            {msg && <p className="fx-warn">{msg}</p>}

            {tp && (
                <div className="fx-prog">
                    {finished ? (
                        <div className="fx-done"><span>{I.check}</span><div><b>Download complete</b><small>{fmtBytes(u.size)} saved</small></div></div>
                    ) : (
                        <>
                            <div className="fx-hero">
                                <Ring pct={u.pct} state={u.state} />
                                <div className="fx-spd">
                                    <b>{u.state === 'running' ? `${fmtBytes(u.speed)}/s` : u.state === 'paused' ? 'Paused' : u.state === 'saving' ? 'Saving…' : '—'}</b>
                                    <small>{fmtBytes(u.bytes)} of {fmtBytes(u.size)}{u.state === 'running' ? ` · ${fmtTime(u.eta)} left` : ''}</small>
                                    <small className="fx-sub">{u.state === 'running' ? `${((u.speed * 8) / 1e6).toFixed(1)} Mbps · ${u.connections}/${conn} connections · ${u.done}/${u.total} parts${finish ? ` · done ≈ ${finish}` : ''}` : `${u.done}/${u.total} parts kept`}</small>
                                </div>
                            </div>
                            <div className="fx-bar"><i style={{ width: `${Math.min(100, u.pct).toFixed(2)}%` }} /></div>
                            <Graph values={hist} />
                        </>
                    )}
                    {u.state === 'error' && <p className="fx-warn">{u.error} <button type="button" className="fx-retry" onClick={() => ctl.current && ctl.current.resume()}>Retry</button></p>}
                    {(u.state === 'running' || u.state === 'paused') && (
                        <div className="fx-ctl">
                            {u.state === 'running'
                                ? <button type="button" onClick={() => ctl.current.pause()}>{I.pause} Pause</button>
                                : <button type="button" className="go" onClick={() => ctl.current.resume()}>{I.play} Resume</button>}
                            <button type="button" className="bad" onClick={() => ctl.current.cancel()}>{I.stop} Cancel</button>
                        </div>
                    )}
                </div>
            )}

            {note && createPortal(
                <div className="fd-pop" role="dialog" aria-modal="true" aria-label="Download status" onClick={() => note.kind === 'busy' && setNote(null)}>
                    <div className="fd-pop-c" onClick={(e) => e.stopPropagation()}>
                        {note.kind === 'wait' ? (
                            <>
                                <div className="fd-spin" />
                                <h4>Preparing your download</h4>
                                <p>Checking the fastest server for this file…</p>
                            </>
                        ) : (
                            <>
                                <div className="fd-warn">{I.bolt}</div>
                                <h4>{note.quota ? 'This file is busy right now' : 'Download could not start'}</h4>
                                <p>{note.quota ? 'Google Drive limits how many people can download one file per day, and this file reached that limit. The limit resets automatically, usually within 24 hours.' : note.text}</p>
                                <ul>
                                    {info.account && via !== 'b' && <li>Try <b>Server B</b>, it does not use the public limit.</li>}
                                    <li>Use another server from the <b>All servers</b> list.</li>
                                    <li>Or press <b>Try again</b> in a little while.</li>
                                </ul>
                                <div className="fd-pop-b">
                                    {info.account && via !== 'b' && <button type="button" className="fd-b fd-main" onClick={() => { setVia('b'); setNote(null); }}><span><b>Switch to Server B</b></span></button>}
                                    <button type="button" className="fd-b" onClick={() => note.retry()}><span><b>Try again</b></span></button>
                                    <button type="button" className="fd-b" onClick={() => setNote(null)}><span><b>Close</b></span></button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.querySelector('.dl-root') || document.body
            )}
        </section>
    );
}

const CSS = `
.fx { position: relative; overflow: hidden; margin: 14px 0 0; padding: 12px; border-radius: 16px; display: flex; flex-direction: column; gap: 10px;
  border: 1px solid rgba(var(--ac-rgb),.32); background: radial-gradient(420px 140px at 0% 0%, rgba(var(--ac-rgb),.16), transparent 65%), linear-gradient(180deg, rgba(20,26,40,.94), rgba(10,14,22,.96)); box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05); }
.fx-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.fx-badge { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.fx-badge i { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; background: linear-gradient(135deg, rgba(var(--ac-rgb),1), rgba(var(--ac-rgb),.55)); }
.fx-badge i svg { width: 12px; height: 12px; }
.fx-badge b { font-size: 12.5px; font-weight: 800; color: #fff; letter-spacing: .01em; }
.fx-badge em { font-style: normal; font-size: 11px; font-weight: 700; color: #8e9bb0; padding: 2px 8px; border-radius: 99px; background: rgba(255,255,255,.06); }
.fx-live { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; color: #4ade80; flex-shrink: 0; }
.fx-live b { width: 6px; height: 6px; border-radius: 50%; background: currentColor; animation: fx-ping 1.8s infinite; }
.fx-live.warn { color: #fbbf24; }
@keyframes fx-ping { 0% { box-shadow: 0 0 0 0 currentColor; } 70% { box-shadow: 0 0 0 6px transparent; } }
.fx-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.fx-cta { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 42px; padding: 0 16px; border-radius: 12px; color: #fff; font-size: 14px; font-weight: 800; text-decoration: none; cursor: pointer; background: linear-gradient(180deg, rgba(var(--ac-rgb),.88), rgba(var(--ac-rgb),.62)); box-shadow: 0 4px 14px rgba(var(--ac-rgb),.22), inset 0 1px 0 rgba(255,255,255,.16); transition: transform .15s, filter .2s; -webkit-tap-highlight-color: transparent; }
.fx-cta:hover { filter: brightness(1.07); transform: translateY(-1px); } .fx-cta:active { transform: scale(.985); }
.fx-cta svg { width: 16px; height: 16px; }
.fx-shine { position: absolute; top: 0; bottom: 0; width: 46px; left: -70px; transform: skewX(-20deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); animation: fx-sh 3.8s ease-in-out infinite; pointer-events: none; }
@keyframes fx-sh { 0%, 55% { left: -70px; } 100% { left: 115%; } }
.fx-turbo { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: background .2s, border-color .2s; -webkit-tap-highlight-color: transparent; }
.fx-turbo:hover:not(:disabled) { background: rgba(255,255,255,.1); border-color: rgba(var(--ac-rgb),.55); }
.fx-turbo:disabled { opacity: .4; cursor: not-allowed; } .fx-turbo svg { width: 16px; height: 16px; color: var(--ac-hi, #ff8a8f); }
.fx-seg { display: flex; padding: 3px; gap: 3px; border-radius: 11px; background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.07); }
.fx-seg button { flex: 1; min-height: 32px; border: 0; border-radius: 8px; background: transparent; color: #aab5c7; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; transition: background .15s, color .15s; -webkit-tap-highlight-color: transparent; }
.fx-seg button em { font-style: normal; font-size: 9.5px; font-weight: 700; opacity: .7; text-transform: uppercase; letter-spacing: .04em; margin-left: 3px; }
.fx-seg button.on { background: rgba(var(--ac-rgb),.9); color: #fff; box-shadow: 0 3px 10px rgba(var(--ac-rgb),.3); }
.fx-more { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 2px; border: 0; background: transparent; color: #7f8ba0; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; text-align: left; }
.fx-more:hover { color: #b6c0d0; }
.fx-more i { display: inline-flex; transition: transform .2s; } .fx-more i.up { transform: rotate(180deg); }
.fx-opts { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06); animation: fx-in .2s ease; }
@keyframes fx-in { from { opacity: 0; transform: translateY(-4px); } }
.fx-o small { display: block; margin-bottom: 5px; font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #6f7c92; }
.fx-copy { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; border-radius: 10px; border: 1px dashed rgba(255,255,255,.2); background: transparent; color: #b6c0d0; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.fx-copy:hover { color: #fff; border-color: rgba(var(--ac-rgb),.6); }
.fx-warn { margin: 0; padding: 8px 10px; border-radius: 10px; font-size: 11.5px; line-height: 1.4; color: #fbbf24; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); }
.fx-prog { display: flex; flex-direction: column; gap: 9px; }
.fx-hero { display: flex; align-items: center; gap: 12px; }
.fx-ring { flex-shrink: 0; width: 56px; height: 56px; }
.fx-spd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fx-spd b { font-size: 22px; line-height: 1.05; font-weight: 800; color: #fff; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.fx-spd small { font-size: 11px; color: #8e9bb0; font-weight: 600; } .fx-spd .fx-sub { font-size: 10.5px; color: #6f7c92; }
.fx-bar { height: 6px; border-radius: 6px; background: rgba(255,255,255,.08); overflow: hidden; }
.fx-bar i { display: block; height: 100%; border-radius: 6px; background: linear-gradient(90deg, rgba(var(--ac-rgb),.85), var(--ac-hi, #ff8a8f)); transition: width .25s linear; }
.fd-graph { width: 100%; height: 28px; display: block; }
.fx-ctl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.fx-ctl button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.07); color: #fff; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.fx-ctl .go { background: rgba(var(--ac-rgb),.9); border-color: transparent; } .fx-ctl .bad { color: #ff9ea2; border-color: rgba(239,68,68,.35); }
.fx-retry { border: 0; background: transparent; color: #ff8a8f; font: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
.fx-done { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 13px; background: linear-gradient(135deg, rgba(34,197,94,.2), rgba(34,197,94,.06)); border: 1px solid rgba(34,197,94,.4); animation: fd-pop .4s cubic-bezier(.2,1.4,.4,1); }
.fx-done > span { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; background: #22c55e; flex-shrink: 0; }
.fx-done > span svg { width: 18px; height: 18px; }
.fx-done b { display: block; font-size: 14px; color: #86efac; } .fx-done small { font-size: 11.5px; color: #9fb7a8; }
@keyframes fd-pop { from { transform: scale(.94); opacity: 0; } }
@media (max-width: 420px) {
  .fx { padding: 10px; border-radius: 14px; }
  .fx-cta { padding: 0 12px; min-height: 46px; } .fx-turbo { min-height: 46px; } .fx-turbo { padding: 0 13px; }
  .fx-spd b { font-size: 20px; }
}
.fd-skel { height: 96px; border-radius: 16px; margin: 0 0 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); animation: fd-p 1.2s ease-in-out infinite; }
@keyframes fd-p { 50% { opacity: .55; } }
.fd-b { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #f4f6fa; cursor: pointer; font: inherit; justify-content: center; text-align: center; }
.fd-b b { font-size: 13px; font-weight: 800; } .fd-main { background: linear-gradient(135deg, rgba(var(--ac-rgb),.95), rgba(var(--ac-rgb),.7)); border-color: transparent; }
.fd-pop { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(4,6,10,.72); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); animation: fd-fade .2s ease; }
@keyframes fd-fade { from { opacity: 0; } }
.fd-pop-c { width: 100%; max-width: 380px; padding: 22px 20px; border-radius: 18px; text-align: center; background: linear-gradient(180deg, #151c2a, #0c1119); border: 1px solid rgba(var(--ac-rgb),.4); box-shadow: 0 30px 70px rgba(0,0,0,.65); animation: fd-pop .3s cubic-bezier(.2,1.3,.4,1); }
.fd-pop-c h4 { margin: 10px 0 6px; font-size: 16px; font-weight: 800; color: #fff; }
.fd-pop-c p { margin: 0 0 10px; font-size: 12.5px; line-height: 1.5; color: #a3aec2; }
.fd-pop-c ul { margin: 0 0 14px; padding: 10px 12px 10px 28px; text-align: left; font-size: 12px; color: #b6c0d0; background: rgba(255,255,255,.04); border-radius: 11px; line-height: 1.6; }
.fd-pop-b { display: flex; flex-direction: column; gap: 8px; }
.fd-spin { width: 38px; height: 38px; margin: 4px auto 0; border-radius: 50%; border: 3px solid rgba(255,255,255,.12); border-top-color: var(--ac-hi, #ff8a8f); animation: fd-rot .8s linear infinite; }
@keyframes fd-rot { to { transform: rotate(360deg); } }
.fd-warn { width: 44px; height: 44px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fbbf24; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.35); }
.fd-warn svg { width: 20px; height: 20px; }
@media (prefers-reduced-motion: reduce) { .fx-edge, .fx-live b, .fx-cta-i, .fx-shine, .fx-map i.a, .fd-spin, .fd-pop, .fd-pop-c, .fx-done { animation: none !important; } }
@media (prefers-reduced-motion: reduce) { .fx-live b, .fx-shine, .fd-spin, .fd-pop, .fd-pop-c, .fx-done, .fx-opts { animation: none !important; } }
`;
