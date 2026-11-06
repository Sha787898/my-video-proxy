'use client';

import { use, Suspense, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';
import { embedBase } from '../../utils/embedOrigin';
import { parseConfig, resolvePrefs, readOverrides, themeVars } from '../../utils/playerConfig';

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
    warn: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 6v8M12 18h.01" /></svg>,
};

// ---------- the secure download popup ----------
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
.dl-root { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; --ok: #22c55e; --line: rgba(255,255,255,.08); position: relative; min-height: 100vh; display: flex; justify-content: center; padding: 22px 14px 44px; background: #0a0f18; color: #e5e7eb; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; overflow-x: hidden; }
.dl-root::before { content: ''; position: fixed; top: -170px; left: 50%; width: 620px; height: 380px; transform: translateX(-50%); background: radial-gradient(closest-side, rgba(var(--ac-rgb),.26), transparent); pointer-events: none; }
.dl-root * { box-sizing: border-box; }
.dl-card { position: relative; width: 100%; max-width: 560px; align-self: flex-start; padding: 18px; border-radius: 18px; background: linear-gradient(180deg, rgba(18,26,40,.88), rgba(9,13,21,.92)); border: 1px solid var(--line); border-top-color: rgba(var(--ac-rgb),.45); box-shadow: 0 24px 60px rgba(0,0,0,.6); animation: dl-in .4s ease both; }
@keyframes dl-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.dl-head { display: flex; gap: 12px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
.dl-ic { width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ac-tint); background: rgba(var(--ac-rgb),.14); border: 1px solid rgba(var(--ac-rgb),.35); }
.dl-name { margin: 0; font-size: 15px; line-height: 1.35; font-weight: 700; color: #fff; overflow-wrap: anywhere; }
.dl-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.dl-chip { font-size: 10px; font-weight: 600; letter-spacing: .04em; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid var(--line); color: #c4ccda; }
.dl-chip.g { color: #86efac; border-color: rgba(34,197,94,.3); background: rgba(34,197,94,.08); }
.dl-watch { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; aspect-ratio: 16 / 9; margin-top: 14px; border-radius: 14px; border: 1px solid var(--line); background: radial-gradient(circle at 50% 40%, rgba(var(--ac-rgb),.22), rgba(7,11,18,.9) 70%); color: #fff; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color .2s, transform .2s; }
.dl-watch:hover { border-color: rgba(var(--ac-rgb),.6); transform: translateY(-1px); }
.dl-watch .pl { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(var(--ac-rgb),.4); border: 1px solid rgba(var(--ac-rgb),.5); }
.dl-frame { width: 100%; aspect-ratio: 16 / 9; margin-top: 14px; border: 1px solid var(--line); border-radius: 14px; background: #000; overflow: hidden; }
.dl-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
.dl-main { display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%; min-height: 48px; margin-top: 14px; padding: 0 16px; border: 1px solid rgba(var(--ac-rgb),.5); border-radius: 13px; background: linear-gradient(180deg, rgba(var(--ac-rgb),.55), rgba(var(--ac-rgb),.32)); color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; letter-spacing: .02em; cursor: pointer; box-shadow: 0 10px 28px rgba(var(--ac-rgb),.25); transition: transform .2s, filter .2s; }
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
@media (max-width: 420px) { .dl-card { padding: 14px; border-radius: 16px; } .dl-name { font-size: 14px; } }
.dl-noanim .dl-card, .dl-noanim .dl-row, .dl-noanim .dl-modal, .dl-noanim .dl-back, .dl-noanim .dl-shield, .dl-noanim .dl-go, .dl-noanim .dl-watch, .dl-noanim .dl-main, .dl-noanim .dl-ic { animation: none !important; transition: none !important; }
@media (prefers-reduced-motion: reduce) { .dl-card, .dl-row, .dl-modal, .dl-back, .dl-shield, .dl-go { animation: none; } }
`;

function FileDownloadContent({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || 'default';

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [watch, setWatch] = useState(false);
    const [sel, setSel] = useState(null);
    const [ov, setOv] = useState({});
    useEffect(() => { setOv(readOverrides()); }, []);
    const prefs = resolvePrefs(parseConfig(file && file.config), ov);

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
    const best = mirrors.find((m) => m.type === 'download') || mirrors.find((m) => m.type === 'stream');
    const hasPlayer = mirrors.some((m) => m.embed);

    return (
        <div className={`dl-root ${prefs.anim === false ? 'dl-noanim' : ''}`} style={file ? themeVars(prefs) : undefined}>
            <style>{CSS}</style>
            <meta name="referrer" content="no-referrer" />
            <meta name="robots" content="noindex, nofollow" />

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
                                    {file.quality && <span className="dl-chip g">{file.quality}</span>}
                                    <span className="dl-chip">ID {id}</span>
                                </div>
                            </div>
                        </header>

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

                        {best && (
                            <button type="button" className="dl-main" onClick={() => setSel(best)}>
                                {Svg.down} Download <small>via {best.name}</small>
                            </button>
                        )}

                        {mirrors.length > 0 ? (
                            <>
                                <h2 className="dl-h2">All servers</h2>
                                <ul className="dl-list">
                                    {mirrors.map((m, i) => (
                                        <li key={m.id}>
                                            <button type="button" className="dl-row" style={{ '--i': i }} onClick={() => setSel(m)}>
                                                <span className="n">{m.name}</span>
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

                        <p className="dl-foot">
                            Every link is checked before it opens. Links open in a new tab without sending this page&apos;s address, and this page uses no cookies or login.
                        </p>
                    </>
                )}
            </main>

            {sel && <SecureModal mirror={sel} onClose={() => setSel(null)} />}
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
