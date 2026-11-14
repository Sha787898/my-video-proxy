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

    const eta = (mbps) => fmtTime((info.size * 8) / (mbps * 1e6));
    const SERVERS = [
        { k: '', n: 'Auto', d: 'Best working server', I: I.star },
        { k: 'b', n: 'Server B', d: 'Google account · no daily limit', I: I.user },
        { k: 'a', n: 'Server A', d: 'Public Drive link', I: I.cloud },
    ];
    const CONNS = [[4, 'Safe'], [8, 'Fast'], [16, 'Max']];
    const canTurbo = info.ranges && info.size > 0;

    return (
        <section className={`fx ${running ? 'is-run' : ''} ${finished ? 'is-done' : ''}`} aria-label="Fast download">
            <style>{CSS}</style>
            <i className="fx-edge" />

            <div className="fx-top">
                <span className="fx-badge"><i>{I.bolt}</i> Cloud Fast Download</span>
                <span className={`fx-live ${info.warn ? 'warn' : ''}`}><b />{info.warn ? 'Busy' : 'Server ready'}</span>
            </div>

            {!running && !finished && (
                <>
                    <div className="fx-size">
                        <div>
                            <small>File size</small>
                            <b>{info.size ? fmtBytes(info.size) : '—'}</b>
                        </div>
                        {info.size > 0 && (
                            <div className="fx-eta" aria-label="Estimated time">
                                <span><em>20 Mbps</em>{eta(20)}</span>
                                <span><em>50 Mbps</em>{eta(50)}</span>
                                <span><em>100 Mbps</em>{eta(100)}</span>
                            </div>
                        )}
                    </div>

                    {info.account && (
                        <div className="fx-srv" role="radiogroup" aria-label="Server">
                            {SERVERS.map((x) => (
                                <button key={x.k || 'auto'} type="button" role="radio" aria-checked={via === x.k} className={via === x.k ? 'on' : ''} onClick={() => setVia(x.k)}>
                                    <i>{x.I}</i><b>{x.n}</b><small>{x.d}</small>
                                </button>
                            ))}
                        </div>
                    )}

                    {info.warn && <p className="fx-warn">{info.warn}</p>}

                    <a className="fx-cta" href={info.protected ? '#' : publicPath(id, info.name, via)} download={info.name} rel="noopener" onClick={instant} aria-busy={busy}>
                        <span className="fx-cta-i">{I.down}</span>
                        <span className="fx-cta-t"><b>{busy ? 'Preparing…' : 'Download now'}</b><small>Instant start · browser can resume</small></span>
                        <span className="fx-shine" />
                    </a>

                    {canTurbo && (
                        <div className="fx-turbo">
                            <button type="button" className="fx-tbtn" onClick={turbo} disabled={tooBig || busy} title={tooBig ? 'Too large for this browser' : ''}>
                                <span>{I.rocket}</span>
                                <b>Turbo mode</b>
                                <small>{conn} connections · pause &amp; resume</small>
                            </button>
                            <div className="fx-conn" role="radiogroup" aria-label="Connections">
                                {CONNS.map(([n, l]) => (
                                    <button key={n} type="button" role="radio" aria-checked={conn === n} className={conn === n ? 'on' : ''} onClick={() => setConn(n)}><b>{n}</b><small>{l}</small></button>
                                ))}
                            </div>
                        </div>
                    )}
                    {tooBig && <p className="fx-warn">Turbo needs Chrome or Edge on a computer for files this big. Download now works everywhere.</p>}

                    <div className="fx-feat">
                        <span>{I.resume}<b>Resumable</b><small>Continue after a break</small></span>
                        <span>{I.multi}<b>Multi-connection</b><small>Up to 16 at once</small></span>
                        <span>{I.shield}<b>{info.protected ? 'Private link' : 'Hidden source'}</b><small>{info.protected ? 'Expires soon' : 'No origin shown'}</small></span>
                    </div>

                    {!info.protected && (
                        <button type="button" className="fx-copy" onClick={copyLink}>{I.link} {copied ? 'Link copied' : 'Copy download link for IDM / FDM'}</button>
                    )}
                </>
            )}

            {msg && <p className="fx-warn">{msg}</p>}

            {u && u.state !== 'idle' && u.state !== 'cancelled' && (
                <div className="fx-prog">
                    {finished ? (
                        <div className="fx-done">
                            <span>{I.check}</span>
                            <div><b>Download complete</b><small>{fmtBytes(u.size)} saved to your device</small></div>
                        </div>
                    ) : (
                        <>
                            <div className="fx-hero">
                                <Ring pct={u.pct} state={u.state} />
                                <div className="fx-spd">
                                    <b>{u.state === 'running' ? fmtBytes(u.speed) + '/s' : u.state === 'paused' ? 'Paused' : u.state === 'saving' ? 'Saving…' : '—'}</b>
                                    <small>{u.state === 'running' ? `${((u.speed * 8) / 1e6).toFixed(1)} Mbps · ${fmtTime(u.eta)} left${finish ? ` · done ≈ ${finish}` : ''}` : `${fmtBytes(u.bytes)} of ${fmtBytes(u.size)}`}</small>
                                    <Graph values={hist} />
                                </div>
                            </div>
                            <div className="fx-map" aria-hidden="true">
                                {(u.map || []).map((v, i) => <i key={i} className={v >= 1 ? 'd' : v > 0 ? 'a' : ''} style={v > 0 && v < 1 ? { '--p': v } : undefined} />)}
                            </div>
                            <div className="fx-stats">
                                <span><small>Downloaded</small><b>{fmtBytes(u.bytes)}</b></span>
                                <span><small>Connections</small><b>{u.state === 'running' ? u.connections : 0}/{conn}</b></span>
                                <span><small>Parts</small><b>{u.done}/{u.total}</b></span>
                            </div>
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
.fx { position: relative; overflow: hidden; margin: 0 0 12px; padding: 16px; border-radius: 20px; display: flex; flex-direction: column; gap: 14px;
  border: 1px solid rgba(var(--ac-rgb),.4); background: radial-gradient(520px 200px at 0% 0%, rgba(var(--ac-rgb),.22), transparent 65%), radial-gradient(400px 220px at 100% 100%, rgba(var(--ac-rgb),.12), transparent 60%), linear-gradient(180deg, rgba(20,26,40,.96), rgba(10,14,22,.98)); box-shadow: 0 18px 50px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06); }
.fx-edge { position: absolute; top: 0; left: 18px; right: 18px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--ac-hi, #ff8a8f), transparent); background-size: 220% 100%; animation: fx-line 3.2s linear infinite; }
@keyframes fx-line { to { background-position: -220% 0; } }
.fx-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.fx-badge { display: inline-flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #fff; }
.fx-badge i { width: 26px; height: 26px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, rgba(var(--ac-rgb),1), rgba(var(--ac-rgb),.55)); box-shadow: 0 4px 14px rgba(var(--ac-rgb),.45); }
.fx-badge i svg { width: 14px; height: 14px; }
.fx-live { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; color: #4ade80; padding: 5px 11px; border-radius: 99px; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); }
.fx-live b { width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: fx-ping 1.8s infinite; }
.fx-live.warn { color: #fbbf24; background: rgba(245,158,11,.1); border-color: rgba(245,158,11,.35); }
@keyframes fx-ping { 0% { box-shadow: 0 0 0 0 currentColor; } 70% { box-shadow: 0 0 0 7px transparent; } }
.fx-size { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fx-size small, .fx-stats small { display: block; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #6f7c92; }
.fx-size > div > b { display: block; font-size: 30px; line-height: 1.05; font-weight: 800; color: #fff; letter-spacing: -.03em; }
.fx-eta { display: flex; gap: 6px; flex-wrap: wrap; }
.fx-eta span { display: flex; flex-direction: column; padding: 6px 10px; border-radius: 11px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); font-size: 12px; font-weight: 800; color: #f1f4fa; }
.fx-eta em { font-style: normal; font-size: 9.5px; font-weight: 700; color: #7f8ba0; letter-spacing: .04em; }
.fx-srv { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 440px) { .fx-srv { grid-template-columns: 1fr; } }
.fx-srv button { position: relative; text-align: left; display: grid; grid-template-columns: auto 1fr; column-gap: 8px; align-items: center; padding: 10px; border-radius: 13px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #d6dce8; cursor: pointer; font: inherit; transition: border-color .2s, background .2s, transform .15s; }
.fx-srv button:hover { transform: translateY(-1px); border-color: rgba(var(--ac-rgb),.5); }
.fx-srv button i { grid-row: span 2; width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.07); color: #aab5c7; }
.fx-srv button b { font-size: 12.5px; font-weight: 800; color: #fff; } .fx-srv button small { font-size: 10px; color: #7f8ba0; font-weight: 600; line-height: 1.3; }
.fx-srv button.on { border-color: rgba(var(--ac-rgb),.75); background: linear-gradient(180deg, rgba(var(--ac-rgb),.2), rgba(var(--ac-rgb),.06)); box-shadow: 0 0 0 1px rgba(var(--ac-rgb),.3), 0 8px 22px rgba(var(--ac-rgb),.18); }
.fx-srv button.on i { background: rgba(var(--ac-rgb),.9); color: #fff; }
.fx-warn { margin: 0; padding: 9px 12px; border-radius: 11px; font-size: 11.5px; color: #fbbf24; background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.25); }
.fx-cta { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px; padding: 15px 18px; border-radius: 16px; color: #fff; text-decoration: none; cursor: pointer; background: linear-gradient(135deg, rgba(var(--ac-rgb),1), rgba(var(--ac-rgb),.7)); box-shadow: 0 12px 30px rgba(var(--ac-rgb),.4), inset 0 1px 0 rgba(255,255,255,.25); transition: transform .18s, box-shadow .2s, filter .2s; }
.fx-cta:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(var(--ac-rgb),.5), inset 0 1px 0 rgba(255,255,255,.3); filter: brightness(1.06); }
.fx-cta:active { transform: scale(.985); }
.fx-cta-i { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.2); flex-shrink: 0; animation: fx-bob 2.2s ease-in-out infinite; }
@keyframes fx-bob { 50% { transform: translateY(3px); } }
.fx-cta-t b { display: block; font-size: 17px; font-weight: 800; letter-spacing: -.01em; } .fx-cta-t small { font-size: 11.5px; font-weight: 600; opacity: .85; }
.fx-shine { position: absolute; top: 0; bottom: 0; width: 60px; left: -80px; transform: skewX(-20deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent); animation: fx-sh 3.6s ease-in-out infinite; }
@keyframes fx-sh { 0%, 55% { left: -80px; } 100% { left: 110%; } }
.fx-turbo { display: grid; grid-template-columns: 1.25fr 1fr; gap: 8px; }
@media (max-width: 440px) { .fx-turbo { grid-template-columns: 1fr; } }
.fx-tbtn { display: grid; grid-template-columns: auto 1fr; column-gap: 10px; align-items: center; text-align: left; padding: 11px 13px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: inherit; cursor: pointer; transition: background .2s, border-color .2s, transform .15s; }
.fx-tbtn:hover:not(:disabled) { background: rgba(255,255,255,.1); border-color: rgba(var(--ac-rgb),.55); transform: translateY(-1px); }
.fx-tbtn:disabled { opacity: .45; cursor: not-allowed; }
.fx-tbtn span { grid-row: span 2; width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: rgba(var(--ac-rgb),.18); color: var(--ac-hi, #ff8a8f); }
.fx-tbtn b { font-size: 13.5px; font-weight: 800; } .fx-tbtn small { font-size: 10.5px; color: #8e9bb0; font-weight: 600; }
.fx-conn { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.fx-conn button { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px 4px; border-radius: 11px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #b6c0d0; font: inherit; cursor: pointer; transition: all .15s; }
.fx-conn button b { font-size: 14px; font-weight: 800; color: #fff; } .fx-conn button small { font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #7f8ba0; }
.fx-conn button.on { background: rgba(var(--ac-rgb),.85); border-color: transparent; box-shadow: 0 6px 16px rgba(var(--ac-rgb),.3); } .fx-conn button.on small { color: rgba(255,255,255,.85); }
.fx-feat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
@media (max-width: 440px) { .fx-feat { grid-template-columns: 1fr; } .fx-feat span { flex-direction: row !important; text-align: left !important; } }
.fx-feat span { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; padding: 10px 6px; border-radius: 13px; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.06); }
.fx-feat svg { width: 16px; height: 16px; color: var(--ac-hi, #ff8a8f); margin-bottom: 3px; }
.fx-feat b { font-size: 11.5px; font-weight: 800; color: #f1f4fa; } .fx-feat small { font-size: 9.5px; color: #7f8ba0; font-weight: 600; }
.fx-copy { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 12px; border-radius: 12px; border: 1px dashed rgba(255,255,255,.18); background: transparent; color: #b6c0d0; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; }
.fx-copy:hover { color: #fff; border-color: rgba(var(--ac-rgb),.6); background: rgba(var(--ac-rgb),.08); }
.fx-prog { display: flex; flex-direction: column; gap: 12px; }
.fx-hero { display: flex; align-items: center; gap: 14px; }
.fx-spd { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.fx-spd b { font-size: 28px; line-height: 1; font-weight: 800; color: #fff; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.fx-spd small { font-size: 11px; color: #8e9bb0; font-weight: 600; }
.fd-graph { width: 100%; height: 36px; display: block; margin-top: 4px; }
.fx-map { display: grid; grid-template-columns: repeat(auto-fill, minmax(9px, 1fr)); gap: 3px; padding: 10px; border-radius: 12px; background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.06); }
.fx-map i { aspect-ratio: 1; border-radius: 3px; background: rgba(255,255,255,.07); }
.fx-map i.d { background: var(--ac-hi, #ff8a8f); box-shadow: 0 0 6px rgba(var(--ac-rgb),.55); }
.fx-map i.a { background: rgba(var(--ac-rgb), calc(.25 + var(--p, .3) * .6)); animation: fx-pulse 1s ease-in-out infinite; }
@keyframes fx-pulse { 50% { transform: scale(.7); } }
.fx-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.fx-stats span { padding: 9px 10px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
.fx-stats b { display: block; margin-top: 2px; font-size: 14px; font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
.fx-ctl { display: flex; gap: 8px; }
.fx-ctl button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px; border-radius: 13px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.07); color: #fff; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; transition: background .2s; }
.fx-ctl button:hover { background: rgba(255,255,255,.12); } .fx-ctl .go { background: rgba(var(--ac-rgb),.9); border-color: transparent; } .fx-ctl .bad { color: #ff9ea2; border-color: rgba(239,68,68,.35); }
.fx-retry { border: 0; background: transparent; color: #ff8a8f; font: inherit; font-weight: 800; cursor: pointer; text-decoration: underline; }
.fx-done { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 16px; background: linear-gradient(135deg, rgba(34,197,94,.2), rgba(34,197,94,.06)); border: 1px solid rgba(34,197,94,.4); animation: fd-pop .45s cubic-bezier(.2,1.4,.4,1); }
.fx-done > span { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; background: #22c55e; box-shadow: 0 0 0 6px rgba(34,197,94,.18); }
.fx-done b { display: block; font-size: 16px; color: #86efac; } .fx-done small { font-size: 12px; color: #9fb7a8; }
@keyframes fd-pop { from { transform: scale(.94); opacity: 0; } }
.fd-skel { height: 150px; border-radius: 20px; margin: 0 0 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.06); animation: fd-p 1.2s ease-in-out infinite; }
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
`;
