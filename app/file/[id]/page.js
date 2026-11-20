'use client';

import { use, Suspense, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';
import { embedBase } from '../../utils/embedOrigin';
import { parseConfig, resolvePrefs, readOverrides, saveOverrides, isLocked, themeVars, THEMES, BGS, BRANDS } from '../../utils/playerConfig';
import { Bg3D, BrandMark } from '../../components/Bg3D';
import { trackView } from '../../utils/trackView';
import Mascot from '../../components/Mascot';
import FastDownload from '../../components/FastDownload';
import { MASCOTS } from '../../utils/mascots';
import { parseQuality } from '../../utils/quality';
import { parseFormat, formatAdded, timeAgo } from '../../utils/fileInfo';
import { getInfo, fmtBytes } from '../../utils/turboDownload';

// This page only reads public data: no login session is stored or used.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------- link checks (real checks, run in the browser before the link is shown) ----------
function checkLink(raw) {
    let u;
    try { u = new URL(raw); } catch (e) { return ['The link is not a valid address']; }
    const problems = [];
    if (u.protocol !== 'https:') problems.push('The link is not HTTPS (not encrypted)');
    if (u.username || u.password) problems.push('The link contains hidden login details');
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(u.hostname) || u.hostname.includes(':')) problems.push('The link points to a raw IP address');
    if (u.hostname.split('.').some((p) => p.startsWith('xn--'))) problems.push('The host name uses look-alike characters');
    if (u.port && u.port !== '443') problems.push('The link uses an unusual port');
    if (!u.hostname.includes('.')) problems.push('The host name looks incomplete');
    return problems;
}

// Asks the host for headers only (nothing is downloaded, no cookies, no referrer)
async function reachable(url, ms = 4500) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl.signal });
        return true;
    } catch (e) {
        return false;
    } finally {
        clearTimeout(t);
        ctl.abort();
    }
}

const hostOf = (url) => { try { return new URL(url).hostname; } catch (e) { return ''; } };

const Svg = {
    shield: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>,
    file: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" /><path d="M14 3v5h5" /></svg>,
    play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>,
    down: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></svg>,
    check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
    cross: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
    lockS: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>,
    copy: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6a2 2 0 012-2h9" /></svg>,
    chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>,
    gear: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
    info: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></svg>,
    wrench: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 005.4 5.4l-9.4 9.4a2.1 2.1 0 01-3-3z" /><path d="M14.7 6.3L17 4l3 3" /></svg>,
    refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12a8 8 0 10-2.3 5.6" /><path d="M20 5v5h-5" /></svg>,
    clock: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    warn: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 6v8M12 18h.01" /></svg>,
};


// ---------- the Metadata popup (opened from the small "Metadata" button next to the file name) ----------
function MetaModal({ file, id, rows, onClose }) {
    const [live, setLive] = useState(undefined); // undefined = loading, null = not available
    const [flash, setFlash] = useState('');
    useEffect(() => {
        let dead = false;
        getInfo(id).then((i) => { if (!dead) setLive(i); });
        return () => { dead = true; };
    }, [id]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const copy = async (label, text) => {
        try { await navigator.clipboard.writeText(String(text)); setFlash(label); setTimeout(() => setFlash(''), 1400); } catch (e) { /* ignore */ }
    };
    const delivery = [];
    if (live) {
        if (live.size) delivery.push(['Exact size', `${Number(live.size).toLocaleString()} bytes (${fmtBytes(live.size)})`]);
        if (live.mime) delivery.push(['MIME type', live.mime]);
        delivery.push(['Resume / multi-connection', live.ranges ? 'Supported' : 'Not supported']);
        delivery.push(['Fast server', live.warn ? 'Busy right now' : 'Ready']);
    }
    const groups = rows.filter((g) => g.items.length);
    return (
        <div className="dl-back" onClick={onClose} role="dialog" aria-modal="true" aria-label="File metadata">
            <div className="dl-meta" onClick={(e) => e.stopPropagation()}>
                <div className="dl-meta-h">
                    <span className="dl-meta-ic">{Svg.info}</span>
                    <div className="dl-meta-t"><b>Metadata</b><small title={file.name}>{file.name}</small></div>
                    <button type="button" className="dl-meta-x" aria-label="Close" onClick={onClose}>{Svg.cross}</button>
                </div>
                <div className="dl-meta-b">
                    {groups.map((g) => (
                        <section key={g.title}>
                            <h3>{g.title}</h3>
                            <div className="dl-meta-g">
                                {g.items.map(([k, v]) => (
                                    <button type="button" key={k} className="dl-meta-c" onClick={() => copy(k, v)} title="Tap to copy">
                                        <span>{k}</span><b>{v}</b>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                    {(live === undefined || delivery.length > 0) && (
                        <section>
                            <h3>Delivery{live === undefined ? ' · checking…' : ''}</h3>
                            <div className="dl-meta-g">
                                {delivery.map(([k, v]) => (
                                    <button type="button" key={k} className="dl-meta-c" onClick={() => copy(k, v)} title="Tap to copy"><span>{k}</span><b>{v}</b></button>
                                ))}
                                {live === undefined && <div className="dl-meta-c dl-skel" style={{ minHeight: 48 }} />}
                            </div>
                        </section>
                    )}
                </div>
                <div className="dl-meta-f">
                    <button type="button" onClick={() => copy('File name', file.name)}>{Svg.copy}File name</button>
                    <button type="button" onClick={() => copy('Page link', window.location.href)}>{Svg.copy}Page link</button>
                    <button type="button" onClick={() => copy('ID', id)}>{Svg.copy}ID</button>
                </div>
                <div className={`dl-meta-toast ${flash ? 'on' : ''}`}>{flash ? `${flash} copied` : ''}</div>
            </div>
        </div>
    );
}

// ---------- the secure download popup ----------
// ---------- Check & repair (owner only) ----------
const STATE_LABEL = { ok: 'Working', dead: 'Needs repair', missing: 'Missing', pending: 'In progress', nokey: 'Setup needed', checking: 'Checking', fixing: 'Uploading', fixed: 'Fixed', failed: 'Try again' };

function RepairModal({ id, onClose, onDone }) {
    const [phase, setPhase] = useState('checking'); // checking | ready | fixing | done | error
    const [rows, setRows] = useState([]);
    const [source, setSource] = useState(null);
    const [msg, setMsg] = useState('');
    const [log, setLog] = useState([]);
    const sessRef = useRef(null);
    useEffect(() => {
        const k = (e) => { if (e.key === 'Escape' && phase !== 'fixing') onClose(); };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [onClose, phase]);

    const headers = (s) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${s.access_token}` });
    const runCheck = async () => {
        setPhase('checking'); setMsg('');
        try {
            const { data } = await ownerClient().auth.getSession();
            const s = data && data.session;
            if (!s) { setPhase('error'); setMsg('Please log in to your dashboard first.'); return; }
            sessRef.current = s;
            const res = await fetch('/api/repair', { method: 'POST', headers: headers(s), body: JSON.stringify({ fileId: id }) });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.rows) { setPhase('error'); setMsg(d.error || 'The check could not finish. Try again.'); return; }
            setRows(d.rows); setSource(d.source); setPhase('ready');
        } catch (e) { setPhase('error'); setMsg('The check could not finish. Try again.'); }
    };
    useEffect(() => { runCheck(); /* eslint-disable-next-line */ }, []);

    const todo = rows.filter((r) => r.fix && (r.state === 'missing' || r.state === 'dead'));
    const srcBad = source && (source.state === 'deleted' || source.state === 'private');
    const setRow = (rid, state, note) => setRows((cur) => cur.map((r) => (r.id === rid ? { ...r, state, note: note ?? r.note } : r)));

    const repair = async () => {
        const s = sessRef.current;
        if (!s || !todo.length || srcBad) return;
        setPhase('fixing'); setLog([]);
        const say = (t) => setLog((l) => [...l, t]);
        const main = todo.filter((r) => r.id !== 'vidara' && r.id !== 'vidshared');
        const only = []; const force = [];
        main.forEach((r) => { const ids = r.id === 'pdlink' ? (r.group || []) : [r.id]; ids.forEach((x) => { only.push(x); if (r.state === 'dead') force.push(x); }); });
        todo.forEach((r) => setRow(r.id, 'fixing', 'Uploading...'));
        const post = async (url, body) => { const res = await fetch(url, { method: 'POST', headers: headers(s), body: JSON.stringify(body) }); const d = await res.json().catch(() => ({})); return { ok: res.ok, d }; };
        try {
            const { data: fr } = await ownerClient().from('files').select('original_url').eq('id', id).maybeSingle();
            const link = fr && fr.original_url;
            if (!link) { setPhase('error'); setMsg('This file has no Google Drive link saved.'); return; }
            if (only.length) {
                say('Uploading the missing copies');
                await post('/api/upload', { links: link, uploadType: 'gdrive', fileId: id, phase: 'main', only, force });
            }
            if (todo.some((r) => r.id === 'vidara')) {
                say('Uploading to Vidara');
                await post('/api/upload', { links: link, uploadType: 'gdrive', fileId: id, phase: 'serial', only: ['vidara'], force: todo.find((r) => r.id === 'vidara').state === 'dead' ? ['vidara'] : [] });
            }
            if (todo.some((r) => r.id === 'vidshared')) {
                say('Preparing VidShared');
                await post('/api/vidshared', { fileId: id, force: todo.find((r) => r.id === 'vidshared').state === 'dead' });
            }
            say('Checking again');
            await new Promise((r) => setTimeout(r, 4000));
            const res = await fetch('/api/repair', { method: 'POST', headers: headers(s), body: JSON.stringify({ fileId: id }) });
            const d = await res.json().catch(() => ({}));
            if (res.ok && d.rows) {
                const was = new Set(todo.map((r) => r.id));
                setRows(d.rows.map((r) => (was.has(r.id) && (r.state === 'ok' || r.state === 'pending') ? { ...r, state: r.state === 'ok' ? 'fixed' : r.state } : (was.has(r.id) ? { ...r, state: 'failed', note: 'Still not ready. Try again in a minute' } : r))));
                setSource(d.source);
            }
            setPhase('done');
            if (onDone) onDone();
        } catch (e) { setPhase('error'); setMsg('Repair stopped. Nothing was lost; you can try again.'); }
    };

    const good = rows.filter((r) => r.state === 'ok' || r.state === 'fixed').length;
    return (
        <div className="dl-back" onClick={() => { if (phase !== 'fixing') onClose(); }} role="dialog" aria-modal="true" aria-label="Check and repair files">
            <div className="dl-meta dl-rep" onClick={(e) => e.stopPropagation()}>
                <div className="dl-meta-h">
                    <span className="dl-meta-ic">{Svg.wrench}</span>
                    <div className="dl-meta-t">
                        <b>Check &amp; repair files</b>
                        <small>{phase === 'checking' ? 'Looking at every server...' : phase === 'fixing' ? 'Please keep this window open' : rows.length ? `${good} of ${rows.length} servers are fine` : 'Nothing to show'}</small>
                    </div>
                    <button type="button" className="dl-meta-x" onClick={onClose} disabled={phase === 'fixing'} aria-label="Close">{Svg.cross}</button>
                </div>
                <div className="dl-meta-b">
                    {phase === 'checking' && <div className="dl-rep-wait"><i className="dl-rep-spin" />Checking servers...</div>}
                    {phase === 'error' && <div className="dl-rep-note bad">{msg}</div>}
                    {source && phase !== 'checking' && (
                        <div className={`dl-rep-note ${source.state === 'ok' ? 'ok' : source.state === 'unknown' ? 'warn' : 'bad'}`}>
                            <b>Google Drive source</b>
                            <span>{source.note}</span>
                            {source.state === 'deleted' && <span>Old copies on the servers may still play, but new uploads and repairs cannot run. Add a new Drive link to this file to restore it.</span>}
                        </div>
                    )}
                    {rows.length > 0 && phase !== 'checking' && (
                        <ul className="dl-rep-list">
                            {rows.map((r) => (
                                <li key={r.id} className={`dl-rep-row s-${r.state}`}>
                                    <span className="dl-rep-dot">{r.state === 'fixing' ? <i className="dl-rep-spin sm" /> : r.state === 'ok' || r.state === 'fixed' ? Svg.check : r.state === 'pending' ? Svg.clock : '!'}</span>
                                    <span className="dl-rep-n"><b>{r.name}</b><small>{r.note}</small></span>
                                    <span className="dl-rep-s">{STATE_LABEL[r.state] || r.state}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {phase === 'fixing' && log.length > 0 && <div className="dl-rep-log">{log[log.length - 1]}...</div>}
                    {phase === 'done' && <div className="dl-rep-note ok"><b>Finished</b><span>Servers that were already fine were not touched, so nothing was uploaded twice. Some hosts need a few minutes to finish; you can check again later.</span></div>}
                </div>
                <div className="dl-meta-f">
                    <button type="button" onClick={runCheck} disabled={phase === 'checking' || phase === 'fixing'}>{Svg.refresh}Check again</button>
                    <button type="button" className="dl-rep-go" onClick={repair} disabled={phase === 'checking' || phase === 'fixing' || !todo.length || srcBad}>
                        {phase === 'fixing' ? 'Repairing...' : todo.length ? `Repair ${todo.length} ${todo.length === 1 ? 'server' : 'servers'}` : 'All good'}
                    </button>
                </div>
            </div>
        </div>
    );
}

let _owner = null;
function ownerClient() {
    if (!_owner) _owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return _owner;
}

function SecureModal({ mirror, onClose }) {
    const [phase, setPhase] = useState('link'); // link -> host -> prep -> ready | blocked
    const [problems, setProblems] = useState([]);
    const [hostOk, setHostOk] = useState(null);
    const goRef = useRef(null);

    useEffect(() => {
        let dead = false;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        (async () => {
            await sleep(900);
            if (dead) return;
            const p = checkLink(mirror.url);
            if (p.length) { setProblems(p); setPhase('blocked'); return; }
            setPhase('host');
            const [ok] = await Promise.all([reachable(mirror.url), sleep(1000)]);
            if (dead) return;
            setHostOk(ok);
            setPhase('prep');
            await sleep(1200);
            if (dead) return;
            setPhase('ready');
        })();
        return () => { dead = true; };
    }, [mirror]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);

    useEffect(() => { if (phase === 'ready' && goRef.current) goRef.current.focus(); }, [phase]);

    const idx = { link: 0, host: 1, prep: 2, ready: 3, blocked: 0 }[phase];
    const progress = phase === 'blocked' ? 100 : [12, 45, 78, 100][idx];
    const host = hostOf(mirror.url);

    const steps = [
        { t: 'Checking the link', d: 'HTTPS, address and host name' },
        { t: `Contacting ${mirror.name}`, d: hostOk === false ? 'No reply yet. You can still try the link.' : 'Making sure the server answers' },
        { t: 'Preparing your download', d: 'Creating a private, no-referrer link' },
    ];
    const state = (i) => {
        if (phase === 'blocked') return i === 0 ? 'bad' : 'wait';
        if (i < idx) return i === 1 && hostOk === false ? 'warn' : 'ok';
        if (i === idx) return 'run';
        return 'wait';
    };

    return (
        <div className="dl-back" onClick={onClose}>
            <div className="dl-modal" role="dialog" aria-modal="true" aria-label="Secure download" onClick={(e) => e.stopPropagation()}>
                <div className={`dl-shield ${phase === 'ready' ? 'ok' : phase === 'blocked' ? 'bad' : ''}`}>{Svg.shield}</div>
                <h3>{phase === 'ready' ? 'Your download is ready' : phase === 'blocked' ? 'Link blocked' : 'Secure download'}</h3>
                <p className="dl-sub">
                    {phase === 'ready' ? `Opens ${host} in a new tab` : phase === 'blocked' ? 'This link failed our safety check' : 'Please wait a few seconds'}
                </p>

                <div className="dl-bar"><i style={{ width: `${progress}%` }} className={phase === 'blocked' ? 'bad' : phase === 'ready' ? 'ok' : ''} /></div>

                <ul className="dl-steps">
                    {steps.map((s, i) => (
                        <li key={s.t} className={`st-${state(i)}`}>
                            <span className="dot">{state(i) === 'ok' ? Svg.check : state(i) === 'bad' ? Svg.cross : state(i) === 'warn' ? Svg.warn : state(i) === 'run' ? <span className="spin" /> : null}</span>
                            <span className="tx"><b>{s.t}</b><small>{s.d}</small></span>
                        </li>
                    ))}
                </ul>

                {phase === 'blocked' && (
                    <ul className="dl-prob">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
                )}

                {phase === 'ready' && (
                    <a
                        ref={goRef}
                        className="dl-go"
                        href={mirror.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        referrerPolicy="no-referrer"
                        onClick={() => setTimeout(onClose, 500)}
                    >
                        {Svg.down} Download now
                    </a>
                )}
                {phase !== 'ready' && (
                    <button type="button" className="dl-cancel" onClick={onClose}>{phase === 'blocked' ? 'Close' : 'Cancel'}</button>
                )}

                <p className="dl-note">
                    We verify the <b>link</b>, not the file inside it. Scan downloads with your antivirus. This page uses no cookies and sends no referrer to {mirror.name}.
                </p>
            </div>
        </div>
    );
}

const CSS = `
.dl-root { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; --ok: #22c55e; --line: rgba(255,255,255,.08); position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 84px 14px 44px; background: #0a0f18; color: #e5e7eb; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; overflow-x: hidden; }
.dl-root::before { content: ''; position: fixed; top: -170px; left: 50%; width: 620px; height: 380px; transform: translateX(-50%); background: radial-gradient(closest-side, rgba(var(--ac-rgb),.26), transparent); pointer-events: none; }
.dl-root * { box-sizing: border-box; }
.dl-top { position: fixed; top: 0; left: 0; right: 0; z-index: 60; height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 16px; background: rgba(8,12,20,.74); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
.dl-top::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--ac-rgb), .7), transparent); opacity: .7; }
.dl-top-r { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.dl-secure { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 600; color: #86efac; border: 1px solid rgba(34,197,94,.3); background: rgba(34,197,94,.08); }
.dl-cfg { position: relative; }
.dl-cfg > button { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line); background: rgba(14,20,30,.85); color: #cdd5e2; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: border-color .2s, transform .3s; }
.dl-cfg > button:hover { border-color: rgba(var(--ac-rgb), .6); transform: rotate(40deg); }
.dl-cfg-panel { position: absolute; right: 0; top: 48px; width: min(300px, calc(100vw - 28px)); max-height: calc(100vh - 90px); overflow-y: auto; padding: 14px; border-radius: 16px; background: rgba(10,15,24,.97); border: 1px solid var(--line); box-shadow: 0 20px 50px rgba(0,0,0,.6); animation: dl-fade .18s ease both; }
.dl-cfg-panel h4 { margin: 0 0 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8e9bb0; }
.dl-seg { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
.dl-seg button { flex: 1 1 28%; min-height: 36px; border-radius: 9px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #cdd5e2; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.dl-seg button.on { border-color: rgba(var(--ac-rgb), .65); background: rgba(var(--ac-rgb), .16); color: var(--ac-tint); }
.dl-sws { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.dl-sw { position: relative; width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,.14); cursor: pointer; padding: 0; overflow: hidden; }
.dl-sw.on { border-color: #fff; box-shadow: 0 0 0 2px rgba(var(--ac-rgb), .55); }
.dl-sw input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }
.dl-card { position: relative; width: 100%; max-width: 560px; align-self: center; z-index: 1; -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); padding: 18px; border-radius: 18px; background: linear-gradient(180deg, rgba(18,26,40,.88), rgba(9,13,21,.92)); border: 1px solid var(--line); border-top-color: rgba(var(--ac-rgb),.45); box-shadow: 0 24px 60px rgba(0,0,0,.6); animation: dl-in .4s ease backwards; }
.dl-card::after { content: ''; position: absolute; top: -1px; left: 24px; right: 24px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, var(--ac-hi), transparent); background-size: 220% 100%; animation: dl-line 3.4s linear infinite; pointer-events: none; }
@keyframes dl-line { from { background-position: 220% 0; } to { background-position: -120% 0; } }
.dl-main { overflow: hidden; }
.dl-main::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent); transform: skewX(-20deg); animation: dl-shine 4.2s ease-in-out infinite; pointer-events: none; }
@keyframes dl-shine { 0%, 55% { left: -40%; } 100% { left: 130%; } }
@keyframes dl-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.dl-head { display: flex; gap: 12px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
.dl-ic { width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ac-tint); background: rgba(var(--ac-rgb),.14); border: 1px solid rgba(var(--ac-rgb),.35); }
.dl-name { margin: 0; font-size: 15px; line-height: 1.35; font-weight: 700; color: #fff; overflow-wrap: anywhere; }
.dl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.dl-chip { font-size: 10px; font-weight: 600; letter-spacing: .04em; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid var(--line); color: #c4ccda; }
.dl-chip.g { color: #86efac; border-color: rgba(34,197,94,.3); background: rgba(34,197,94,.08); }
.dl-chip.h { color: #fcd34d; border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.1); }
.dl-chip.s { color: var(--ac-tint); border-color: rgba(var(--ac-rgb),.35); background: rgba(var(--ac-rgb),.12); }
.dl-grid { display: block; }
.dl-acts { display: flex; gap: 8px; margin-top: 10px; }
.dl-acts button { flex: 1; min-height: 38px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #d6dce8; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s, border-color .2s; }
.dl-acts button:hover { background: rgba(255,255,255,.09); border-color: rgba(var(--ac-rgb),.45); }
.dl-spec { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 0; }
.dl-spec > div { padding: 9px 11px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.03); min-width: 0; }
.dl-spec dt { font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #67748a; }
.dl-spec dd { margin: 3px 0 0; font-size: 12.5px; font-weight: 600; color: #f1f1f3; overflow-wrap: anywhere; }
.dl-h2-first { margin-top: 16px; }
.dl-row .t.b { color: #86efac; background: rgba(34,197,94,.14); }
@media (min-width: 1024px) {
  .dl-ic { width: 56px; height: 56px; border-radius: 15px; }
  .dl-head { gap: 16px; padding-bottom: 18px; }
  .dl-chips { gap: 8px; margin-top: 12px; }
  .dl-chip { font-size: 11.5px; padding: 5px 12px; }
  .dl-colB { position: sticky; top: 76px; align-self: start; padding: 18px 18px 14px; border-radius: 16px; background: rgba(255,255,255,.025); border: 1px solid var(--line); }
  .dl-colB .dl-h2-first { margin-top: 0; }
  .dl-watch .pl { width: 60px; height: 60px; transition: transform .25s, box-shadow .25s; }
  .dl-watch:hover .pl { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(var(--ac-rgb),.18); }
  .dl-row { min-height: 52px; }
  .dl-card { max-width: 1080px; padding: 26px 28px; border-radius: 22px; }
  .dl-name { font-size: 18px; }
  .dl-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr); gap: 28px; align-items: start; margin-top: 4px; }
  .dl-colB .dl-h2-first { margin-top: 18px; }
  .dl-colB .dl-list { max-height: 430px; overflow-y: auto; padding-right: 4px; }
  .dl-main { min-height: 54px; font-size: 15px; }
  .dl-foot { text-align: center; }
}
.dl-watch { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; aspect-ratio: 16 / 9; margin-top: 14px; border-radius: 14px; border: 1px solid var(--line); background: radial-gradient(circle at 50% 40%, rgba(var(--ac-rgb),.22), rgba(7,11,18,.9) 70%); color: #fff; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color .2s, transform .2s; }
.dl-watch:hover { border-color: rgba(var(--ac-rgb),.6); transform: translateY(-1px); }
.dl-watch .pl { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(var(--ac-rgb),.4); border: 1px solid rgba(var(--ac-rgb),.5); }
.dl-frame { width: 100%; aspect-ratio: 16 / 9; margin-top: 14px; border: 1px solid var(--line); border-radius: 14px; background: #000; overflow: hidden; }
.dl-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
.dl-main { position: relative; display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 48px; margin-top: 14px; padding: 0 16px; border: 1px solid rgba(var(--ac-rgb),.5); border-radius: 13px; background: linear-gradient(180deg, rgba(var(--ac-rgb),.55), rgba(var(--ac-rgb),.32)); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; letter-spacing: .02em; cursor: pointer; box-shadow: 0 10px 28px rgba(var(--ac-rgb),.25); transition: transform .2s, filter .2s; }
.dl-main:hover { transform: translateY(-1px); filter: brightness(1.12); }
.dl-main small { font-size: 10.5px; font-weight: 500; opacity: .75; }
.dl-h2 { margin: 20px 2px 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8e9bb0; }
.dl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dl-row { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 0 10px 0 12px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.03); color: #e5e7eb; font-family: inherit; text-align: left; cursor: pointer; overflow: hidden; transition: background .2s, border-color .2s, transform .2s; animation: dl-row .35s cubic-bezier(.22,.9,.28,1) backwards; animation-delay: calc(var(--i, 0) * 45ms + 80ms); }
@keyframes dl-row { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.dl-row::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 2px; border-radius: 2px; background: var(--ac); transform: scaleY(0); transition: transform .25s; }
.dl-row:hover { background: rgba(255,255,255,.06); border-color: rgba(var(--ac-rgb),.45); transform: translateX(2px); }
.dl-row:hover::before { transform: scaleY(1); }
.dl-row .n { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-row .t { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 3px 7px; border-radius: 6px; background: rgba(255,255,255,.07); color: #aab5c7; }
.dl-row .t.s { color: var(--ac-tint); background: rgba(var(--ac-rgb),.16); }
.dl-row .go { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(var(--ac-rgb),.2); color: var(--ac-tint); transition: background .2s; }
.dl-row:hover .go { background: rgba(var(--ac-rgb),.5); color: #fff; }
.dl-foot { margin: 16px 2px 0; font-size: 10.5px; line-height: 1.55; color: #67748a; }
.dl-empty { text-align: center; padding: 36px 8px; color: #a6b1c4; font-size: 13px; }
.dl-empty b { display: block; color: #fff; font-size: 16px; margin-bottom: 6px; }
.dl-skel { height: 14px; border-radius: 7px; background: linear-gradient(90deg, rgba(255,255,255,.04), rgba(255,255,255,.1), rgba(255,255,255,.04)); background-size: 200% 100%; animation: dl-sh 1.2s linear infinite; }
@keyframes dl-sh { to { background-position: -200% 0; } }

.dl-back { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,.68); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); animation: dl-fade .2s ease both; }
@keyframes dl-fade { from { opacity: 0; } to { opacity: 1; } }
.dl-modal { width: min(420px, 100%); max-height: 100%; overflow-y: auto; padding: 22px 20px 18px; text-align: center; border-radius: 20px; background: linear-gradient(180deg, rgba(18,26,40,.97), rgba(9,13,21,.98)); border: 1px solid var(--line); border-top-color: rgba(var(--ac-rgb),.55); box-shadow: 0 30px 80px rgba(0,0,0,.7); animation: dl-pop .28s cubic-bezier(.2,.9,.3,1) both; }
@keyframes dl-pop { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
.dl-shield { width: 56px; height: 56px; margin: 0 auto 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--ac-tint); background: rgba(var(--ac-rgb),.16); border: 1px solid rgba(var(--ac-rgb),.4); animation: dl-pulse 1.8s ease-in-out infinite; }
.dl-shield.ok { color: #4ade80; background: rgba(34,197,94,.12); border-color: rgba(34,197,94,.4); animation: none; }
.dl-shield.bad { color: #fca5a5; animation: none; }
@keyframes dl-pulse { 50% { box-shadow: 0 0 0 9px rgba(var(--ac-rgb),.0), 0 0 0 0 rgba(var(--ac-rgb),.4); transform: scale(1.04); } }
.dl-modal h3 { margin: 0; font-size: 17px; font-weight: 700; color: #fff; }
.dl-sub { margin: 4px 0 14px; font-size: 12px; color: #8e9bb0; overflow-wrap: anywhere; }
.dl-bar { height: 4px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.dl-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--ac), var(--ac-hi)); transition: width .6s ease; }
.dl-bar i.ok { background: linear-gradient(90deg, #16a34a, #4ade80); }
.dl-bar i.bad { background: #ef4444; }
.dl-steps { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; text-align: left; }
.dl-steps li { display: flex; gap: 11px; align-items: flex-start; opacity: .45; transition: opacity .3s; }
.dl-steps li.st-run, .dl-steps li.st-ok, .dl-steps li.st-warn, .dl-steps li.st-bad { opacity: 1; }
.dl-steps .dot { width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid rgba(255,255,255,.18); color: #fff; }
.st-ok .dot { background: #16a34a; border-color: #16a34a; }
.st-warn .dot { background: #d97706; border-color: #d97706; }
.st-bad .dot { background: #dc2626; border-color: #dc2626; }
.dl-steps .spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid rgba(255,255,255,.2); border-top-color: var(--ac-hi); animation: dl-spin .7s linear infinite; }
@keyframes dl-spin { to { transform: rotate(360deg); } }
.dl-steps .tx b { display: block; font-size: 12.5px; font-weight: 600; color: #f3f4f6; }
.dl-steps .tx small { display: block; margin-top: 1px; font-size: 10.5px; color: #8e9bb0; }
.dl-prob { margin: 12px 0 0; padding: 10px 12px 10px 28px; text-align: left; font-size: 11.5px; color: #fca5a5; background: rgba(220,38,38,.1); border: 1px solid rgba(220,38,38,.3); border-radius: 10px; }
.dl-go { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 46px; margin-top: 16px; border-radius: 12px; border: 1px solid rgba(74,222,128,.5); background: linear-gradient(180deg, #16a34a, #15803d); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 10px 26px rgba(22,163,74,.3); animation: dl-pop .3s ease both; }
.dl-go:hover { filter: brightness(1.1); }
.dl-cancel { width: 100%; min-height: 40px; margin-top: 16px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.05); color: #cdd5e2; font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.dl-cancel:hover { background: rgba(255,255,255,.09); }
.dl-note { margin: 14px 0 0; font-size: 10px; line-height: 1.55; color: #67748a; }
.dl-note b { color: #97a3b8; font-weight: 600; }
@media (max-width: 480px) { .dl-secure { display: none; } .dl-top { padding: 0 12px; } }
@media (max-width: 420px) { .dl-card { padding: 14px; border-radius: 16px; } .dl-name { font-size: 14px; } }
.dl-noanim .dl-card::after, .dl-noanim .dl-main::after { animation: none !important; }
.dl-noanim .dl-card, .dl-noanim .dl-row, .dl-noanim .dl-modal, .dl-noanim .dl-back, .dl-noanim .dl-shield, .dl-noanim .dl-go, .dl-noanim .dl-watch, .dl-noanim .dl-main, .dl-noanim .dl-ic { animation: none !important; transition: none !important; }
@media (prefers-reduced-motion: reduce) { .dl-card::after, .dl-main::after, .dl-card, .dl-row, .dl-modal, .dl-back, .dl-shield, .dl-go { animation: none; } }
/* calmer bottom actions */
.dl-colA .dl-main { justify-content: flex-start; gap: 12px; min-height: 52px; margin-top: 12px; padding: 0 12px; border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025)); border: 1px solid var(--line); box-shadow: none; text-align: left; font-weight: 600; letter-spacing: 0; }
.dl-colA .dl-main::after { display: none; }
.dl-colA .dl-main:hover { filter: none; transform: translateY(-1px); border-color: rgba(var(--ac-rgb),.5); background: linear-gradient(180deg, rgba(var(--ac-rgb),.14), rgba(255,255,255,.03)); }
.dl-main-i { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--ac-hi, #ff8a8f); background: rgba(var(--ac-rgb),.14); border: 1px solid rgba(var(--ac-rgb),.28); }
.dl-main-i svg { width: 15px; height: 15px; }
.dl-main-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dl-main-t b { font-size: 13px; font-weight: 700; color: #f1f4fa; }
.dl-main-t small { font-size: 11px; font-weight: 500; opacity: 1; color: #8e9bb0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl-main-go { color: #6f7c92; display: flex; transition: transform .2s, color .2s; } .dl-colA .dl-main:hover .dl-main-go { transform: translateX(3px); color: var(--ac-hi, #ff8a8f); }
.dl-colA .dl-acts { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 10px; }
.dl-colA .dl-acts button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; border-radius: 12px; background: rgba(255,255,255,.035); color: #c9d1de; font-size: 12.5px; font-weight: 700; -webkit-tap-highlight-color: transparent; }
.dl-colA .dl-acts button svg { color: var(--ac-hi, #ff8a8f); flex-shrink: 0; }
.dl-colA .dl-acts button:hover { transform: translateY(-1px); color: #fff; }
/* ---- header chips: date + Metadata button ---- */
.dl-chip.d { display: inline-flex; align-items: center; gap: 5px; color: #b8c4d8; }
.dl-chip.d svg { opacity: .8; }
.dl-chip.i { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-family: inherit; color: var(--ac-tint); border-color: rgba(var(--ac-rgb),.4); background: rgba(var(--ac-rgb),.12); transition: background .2s, transform .2s; }
.dl-chip.i:hover { background: rgba(var(--ac-rgb),.24); transform: translateY(-1px); }
/* ---- Metadata popup ---- */
.dl-meta { position: relative; width: min(560px, 100%); max-height: 100%; display: flex; flex-direction: column; border-radius: 20px; background: linear-gradient(180deg, rgba(18,26,40,.98), rgba(9,13,21,.99)); border: 1px solid var(--line); border-top-color: rgba(var(--ac-rgb),.55); box-shadow: 0 30px 80px rgba(0,0,0,.7); animation: dl-pop .28s cubic-bezier(.2,.9,.3,1) both; overflow: hidden; }
.dl-meta-h { display: flex; align-items: center; gap: 11px; padding: 14px 14px 12px 16px; border-bottom: 1px solid var(--line); }
.dl-meta-ic { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--ac-hi, #ff8a8f); background: rgba(var(--ac-rgb),.14); border: 1px solid rgba(var(--ac-rgb),.3); }
.dl-meta-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; text-align: left; }
.dl-meta-t b { font-size: 14px; color: #fff; }
.dl-meta-t small { font-size: 11px; color: #8e9bb0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dl-meta-x { width: 32px; height: 32px; border-radius: 10px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #c9d1de; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.dl-meta-x:hover { background: rgba(255,255,255,.1); }
.dl-meta-b { padding: 4px 16px 6px; overflow-y: auto; text-align: left; }
.dl-meta-b h3 { margin: 14px 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; color: #8e9bb0; }
.dl-meta-g { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.dl-meta-c { display: flex; flex-direction: column; gap: 3px; text-align: left; padding: 9px 11px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.03); min-width: 0; cursor: pointer; font-family: inherit; color: inherit; transition: border-color .2s, background .2s; }
.dl-meta-c:hover { border-color: rgba(var(--ac-rgb),.45); background: rgba(var(--ac-rgb),.07); }
.dl-meta-c span { font-size: 9.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #67748a; }
.dl-meta-c b { font-size: 12.5px; font-weight: 600; color: #f1f1f3; overflow-wrap: anywhere; }
.dl-meta-f { display: flex; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid var(--line); margin-top: 8px; }
.dl-meta-f button { flex: 1; min-height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 11px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #c9d1de; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.dl-meta-f button:hover { background: rgba(255,255,255,.09); color: #fff; border-color: rgba(var(--ac-rgb),.45); }
.dl-meta-f button svg { color: var(--ac-hi, #ff8a8f); }
.dl-meta-toast { position: absolute; left: 50%; bottom: 62px; transform: translate(-50%, 8px); padding: 6px 13px; border-radius: 999px; background: rgba(34,197,94,.16); border: 1px solid rgba(34,197,94,.4); color: #86efac; font-size: 11.5px; font-weight: 700; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
.dl-meta-toast.on { opacity: 1; transform: translate(-50%, 0); }

.dl-rep { width: min(600px, 100%); }
.dl-rep-list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.dl-rep-row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,.03); text-align: left; }
.dl-rep-dot { width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; background: rgba(255,255,255,.07); color: #c9d1de; }
.dl-rep-n { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dl-rep-n b { font-size: 13px; color: #fff; font-weight: 650; }
.dl-rep-n small { font-size: 11px; color: #8e9bb0; }
.dl-rep-s { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; white-space: nowrap; background: rgba(255,255,255,.06); color: #c9d1de; }
.dl-rep-row.s-ok .dl-rep-dot, .dl-rep-row.s-fixed .dl-rep-dot { background: rgba(34,197,94,.18); color: #86efac; }
.dl-rep-row.s-ok .dl-rep-s, .dl-rep-row.s-fixed .dl-rep-s { background: rgba(34,197,94,.14); color: #86efac; }
.dl-rep-row.s-dead .dl-rep-dot, .dl-rep-row.s-failed .dl-rep-dot { background: rgba(239,68,68,.18); color: #fca5a5; }
.dl-rep-row.s-dead .dl-rep-s, .dl-rep-row.s-failed .dl-rep-s { background: rgba(239,68,68,.14); color: #fca5a5; }
.dl-rep-row.s-missing .dl-rep-dot, .dl-rep-row.s-nokey .dl-rep-dot { background: rgba(245,158,11,.18); color: #fcd34d; }
.dl-rep-row.s-missing .dl-rep-s, .dl-rep-row.s-nokey .dl-rep-s { background: rgba(245,158,11,.14); color: #fcd34d; }
.dl-rep-note { margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #c9d1de; text-align: left; }
.dl-rep-note b { color: #fff; font-size: 12.5px; }
.dl-rep-note.ok { border-color: rgba(34,197,94,.35); background: rgba(34,197,94,.07); }
.dl-rep-note.warn { border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.07); }
.dl-rep-note.bad { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.08); }
.dl-rep-wait, .dl-rep-log { display: flex; align-items: center; gap: 10px; padding: 22px 4px; font-size: 13px; color: #c9d1de; }
.dl-rep-log { padding: 12px 2px 4px; font-size: 12px; color: #8e9bb0; }
.dl-rep-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.18); border-top-color: var(--ac-hi, #ff8a8f); animation: dl-rep-r .8s linear infinite; display: inline-block; }
.dl-rep-spin.sm { width: 12px; height: 12px; }
@keyframes dl-rep-r { to { transform: rotate(360deg); } }
.dl-rep-go { background: rgba(var(--ac-rgb),.2) !important; border-color: rgba(var(--ac-rgb),.5) !important; color: #fff !important; }
.dl-meta-f button:disabled { opacity: .45; cursor: not-allowed; }
.dl-rep-open { margin-top: 12px; width: 100%; min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; border: 1px dashed rgba(var(--ac-rgb),.45); background: rgba(var(--ac-rgb),.06); color: #e6e9ef; font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; }
.dl-rep-open:hover { background: rgba(var(--ac-rgb),.14); }
.dl-rep-open svg { color: var(--ac-hi, #ff8a8f); }
@media (max-width: 480px) { .dl-meta-g { grid-template-columns: 1fr; } .dl-meta { border-radius: 18px; } }
`;

function FileDownloadContent({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || 'default';

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [watch, setWatch] = useState(false);
    const [sel, setSel] = useState(null);
    const [ov, setOv] = useState({});
    const [cfgOpen, setCfgOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [metaOpen, setMetaOpen] = useState(false);
    const [repOpen, setRepOpen] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    useEffect(() => {
        let dead = false;
        (async () => {
            try {
                const c = ownerClient();
                const { data } = await c.auth.getSession();
                const uid = data && data.session && data.session.user.id;
                if (!uid || !id) return;
                const { data: row } = await c.from('files').select('id').eq('id', id).eq('user_id', uid).maybeSingle();
                if (!dead && row) setIsOwner(true);
            } catch (e) { /* not the owner: no button */ }
        })();
        return () => { dead = true; };
    }, [id]);
    useEffect(() => { setOv(readOverrides()); }, []);
    useEffect(() => { if (id && id !== 'default') trackView(id, 'page'); }, [id]);
    const cfgObj = parseConfig(file && file.config);
    const prefs = resolvePrefs(cfgObj, ov);
    const vars = themeVars(prefs);
    const can = (k) => !isLocked(cfgObj.locked, k);
    const patch = (p) => {
        const ok = {};
        Object.keys(p).forEach((k) => { if (can(k)) ok[k] = p[k]; });
        if (!Object.keys(ok).length) return;
        setOv((prev) => { const next = { ...prev, ...ok }; saveOverrides(next); return next; });
    };
    const anyOpen = can('theme') || can('bg') || can('brand') || can('anim') || can('mascot');

    useEffect(() => {
        let dead = false;
        (async () => {
            if (id && id !== 'default') {
                const { data, error } = await supabase.rpc('public_file', { p_id: id });
                if (!dead && !error && data) setFile(data);
            }
            if (!dead) setLoading(false);
        })();
        return () => { dead = true; };
    }, [id]);

    const mirrors = resolveMirrors(file?.mirrors, file?.domains).filter((m) => m.url);
    // VidShared plays inside the player already, so only its download link is listed (no second "stream" row)
    const listed = mirrors.filter((m) => m.id !== 'vidshared');
    const best = listed.find((m) => m.type === 'download') || listed.find((m) => m.type === 'stream');
    const hasPlayer = mirrors.some((m) => m.embed);
    const q = parseQuality(file?.name);
    const streamN = listed.filter((m) => m.type === 'stream').length;
    const copyPage = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* ignore */ }
    };
    const fmt = file ? parseFormat(file.name, file.mime) : parseFormat('');
    const addedRaw = file ? (file.created_at || file.date) : '';
    const addedTxt = addedRaw ? formatAdded(addedRaw) : '';
    const agoTxt = addedRaw && /T|:/.test(String(addedRaw)) ? timeAgo(addedRaw) : '';
    // just the date for the small chip (the full date + time + "x hours ago" is in the Metadata popup)
    const shortDate = (() => {
        if (!addedRaw) return '';
        const raw = String(addedRaw).trim();
        const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    })();
    const keep = (arr) => arr.filter(([, v]) => v);
    const metaRows = [
        { title: 'File', items: keep([
            ['File name', file?.name], ['File format', fmt.label ? `${fmt.label}${fmt.long ? ` (${fmt.long})` : ''}` : ''], ['Type', fmt.kind && fmt.mime ? `${fmt.kind} · ${fmt.mime}` : (fmt.mime || fmt.kind)],
            ['File size', file?.size], ['Added on', addedTxt ? `${addedTxt}${agoTxt ? ` · ${agoTxt}` : ''}` : ''], ['File ID', id],
        ]) },
        { title: 'Video', items: keep([['Resolution', q.res], ['Video codec', q.codec], ['HDR', q.hdr], ['Bit depth', q.bit], ['Source', q.source]]) },
        { title: 'Servers', items: keep([['Available', listed.length ? `${listed.length} (${streamN} stream · ${listed.length - streamN} download)` : '']]) },
    ];

    return (
        <div className={`dl-root ${prefs.anim === false ? 'dl-noanim' : ''}`} style={file ? vars : undefined}>
            <style>{CSS}</style>
            {!loading && <Bg3D kind={prefs.bg} rgb={vars['--ac-rgb']} animate={prefs.anim !== false} />}
            <meta name="referrer" content="no-referrer" />
            <meta name="robots" content="noindex, nofollow" />

            {!loading && (
                <header className="dl-top">
                    <BrandMark name={prefs.brandName} anim={prefs.brand} animate={prefs.anim !== false} size={26} fontSize={14} />
                    <div className="dl-top-r">
                        <span className="dl-secure">{Svg.lockS} Secure page</span>
                {file && anyOpen && (
                <div className="dl-cfg">
                    {cfgOpen && (
                        <div className="dl-cfg-panel" role="dialog" aria-label="Page style">
                            {can('theme') && (<>
                                <h4>Colour</h4>
                                <div className="dl-sws">
                                    {THEMES.map((t) => (
                                        <button key={t.id} type="button" title={t.name} aria-label={t.name} className={`dl-sw ${prefs.theme === t.id ? 'on' : ''}`} style={{ background: t.ac }} onClick={() => patch({ theme: t.id })} />
                                    ))}
                                    <label className={`dl-sw ${prefs.theme === 'custom' ? 'on' : ''}`} title="Custom colour" style={{ background: 'conic-gradient(#e5383b,#f59e0b,#10b981,#06b6d4,#8b5cf6,#ec4899,#e5383b)' }}>
                                        <input type="color" value={prefs.customColor} onChange={(e) => patch({ theme: 'custom', customColor: e.target.value })} aria-label="Custom colour" />
                                    </label>
                                </div>
                            </>)}
                            {can('bg') && (<>
                                <h4>3D background</h4>
                                <div className="dl-seg">{BGS.map(([k, l]) => <button key={k} type="button" className={prefs.bg === k ? 'on' : ''} onClick={() => patch({ bg: k })}>{l}</button>)}</div>
                            </>)}
                            {can('brand') && (<>
                                <h4>Name animation</h4>
                                <div className="dl-seg">{BRANDS.map(([k, l]) => <button key={k} type="button" className={prefs.brand === k ? 'on' : ''} onClick={() => patch({ brand: k })}>{l}</button>)}</div>
                            </>)}
                            {can('mascot') && (<>
                                <h4>Mascot</h4>
                                <div className="dl-seg">
                                    <button type="button" className={prefs.mascot !== false ? 'on' : ''} onClick={() => patch({ mascot: true })}>On</button>
                                    <button type="button" className={prefs.mascot === false ? 'on' : ''} onClick={() => patch({ mascot: false })}>Off</button>
                                </div>
                                {prefs.mascot !== false && <div className="dl-seg">{MASCOTS.map((m) => <button key={m.id} type="button" className={prefs.mascotChar === m.id ? 'on' : ''} onClick={() => patch({ mascotChar: m.id })}>{m.name}</button>)}</div>}
                            </>)}
                            {can('anim') && (<>
                                <h4>Motion</h4>
                                <div className="dl-seg">
                                    <button type="button" className={prefs.anim !== false ? 'on' : ''} onClick={() => patch({ anim: true })}>On</button>
                                    <button type="button" className={prefs.anim === false ? 'on' : ''} onClick={() => patch({ anim: false })}>Off</button>
                                </div>
                            </>)}
                        </div>
                    )}
                    <button type="button" aria-label="Page style" aria-expanded={cfgOpen} onClick={() => setCfgOpen((o) => !o)}>{Svg.gear}</button>
                </div>
            )}
                    </div>
                </header>
            )}

            <main className="dl-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '6px 0' }}>
                        <div className="dl-skel" style={{ width: '70%', height: 18 }} />
                        <div className="dl-skel" style={{ width: '40%' }} />
                        <div className="dl-skel" style={{ height: 120, marginTop: 8 }} />
                    </div>
                ) : !file ? (
                    <div className="dl-empty"><b>File not found</b>This link is wrong or the file was removed.</div>
                ) : (
                    <>
                        <header className="dl-head">
                            <div className="dl-ic">{Svg.file}</div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <h1 className="dl-name">{file.name}</h1>
                                <div className="dl-chips">
                                    {file.size && <span className="dl-chip">{file.size}</span>}
                                    {fmt.label && <span className="dl-chip" title={fmt.long ? `${fmt.long}${fmt.note ? `: ${fmt.note}` : ''}` : undefined}>{fmt.label}</span>}
                                    {q.found ? (<>
                                        {q.res && <span className="dl-chip g">{q.res}</span>}
                                        {q.hdr && <span className={`dl-chip ${/DoVi|HDR/.test(q.hdr) ? 'h' : ''}`}>{q.hdr}</span>}
                                        {q.bit && <span className="dl-chip">{q.bit}</span>}
                                        {q.codec && <span className="dl-chip">{q.codec}</span>}
                                        {q.source && <span className="dl-chip s">{q.source}</span>}
                                    </>) : (file.quality && file.quality !== '1080p WEB-DL' && <span className="dl-chip g">{file.quality}</span>)}
                                    <span className="dl-chip">ID {id}</span>
                                    {shortDate && <span className="dl-chip d" title={`Added ${addedTxt}${agoTxt ? ` · ${agoTxt}` : ''}`}>{Svg.clock}{shortDate}</span>}
                                    <button type="button" className="dl-chip i" onClick={() => setMetaOpen(true)} aria-haspopup="dialog">{Svg.info}Metadata</button>
                                </div>
                            </div>
                        </header>

                        <div className="dl-grid">
                        <div className="dl-colA">
                        {hasPlayer && (watch ? (
                            <div className="dl-frame">
                                <iframe
                                    src={`${embedBase('')}/embed/${id}`}
                                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                    allowFullScreen
                                    title="Player"
                                />
                            </div>
                        ) : (
                            <button type="button" className="dl-watch" onClick={() => setWatch(true)}>
                                <span className="pl">{Svg.play}</span> Watch online
                            </button>
                        ))}

                        <FastDownload id={id} />

                        {best && (
                            <button type="button" className="dl-main" onClick={() => setSel(best)}>
                                <span className="dl-main-i">{Svg.down}</span>
                                <span className="dl-main-t"><b>More ways to download</b><small>via {best.name}</small></span>
                                <span className="dl-main-go" aria-hidden="true">{Svg.chev}</span>
                            </button>
                        )}

                        <div className="dl-acts">
                            <button type="button" onClick={copyPage}>{Svg.copy}{copied ? 'Link copied' : 'Copy page link'}</button>
                            {hasPlayer && !watch && <button type="button" onClick={() => setWatch(true)}>{Svg.play}Play here</button>}
                        </div>
                        </div>

                        <aside className="dl-colB">
                        {listed.length > 0 ? (
                            <>
                                <h2 className="dl-h2 dl-h2-first">All servers</h2>
                                <ul className="dl-list">
                                    {listed.map((m, i) => (
                                        <li key={m.id}>
                                            <button type="button" className="dl-row" style={{ '--i': i }} onClick={() => setSel(m)}>
                                                <span className="n">{m.name}</span>
                                                {best && m.id === best.id && <span className="t b">Best</span>}
                                                <span className={`t ${m.type === 'stream' ? 's' : ''}`}>{m.type === 'stream' ? 'Stream' : 'Download'}</span>
                                                <span className="go">{Svg.down}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <div className="dl-empty">No download servers are available for this file yet.</div>
                        )}
                        {isOwner && <button type="button" className="dl-rep-open" onClick={() => setRepOpen(true)}>{Svg.wrench}Check &amp; repair files</button>}

                        </aside>
                        </div>

                        <p className="dl-foot">
                            Every link is checked before it opens. Links open in a new tab without sending this page&apos;s address, and this page uses no cookies or login.
                        </p>
                    </>
                )}
            </main>

            {sel && <SecureModal mirror={sel} onClose={() => setSel(null)} />}
            {repOpen && <RepairModal id={id} onClose={() => setRepOpen(false)} onDone={() => { try { window.dispatchEvent(new Event('ms-refresh')); } catch (e) { /* ignore */ } }} />}
            {metaOpen && file && <MetaModal file={file} id={id} rows={metaRows} onClose={() => setMetaOpen(false)} />}
            {file && <Mascot config={file.config ?? null} page="download" />}
        </div>
    );
}

export default function FileDownloadPage({ params }) {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0f18', color: '#8e9bb0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>Loading...</div>}>
            <FileDownloadContent params={params} />
        </Suspense>
    );
}
