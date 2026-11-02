'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Watch Party শুধু Supabase Realtime "broadcast" ব্যবহার করে (ডাটাবেজ টেবিল লাগে না)
const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { realtime: { params: { eventsPerSecond: 5 } } }
);

const LS_SERVER = 'ms_player_server';
const LS_BLOCK = 'ms_player_blockpopups';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

// ছোট আইকন
const Ico = {
    chevron: <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8z" /></svg>,
    play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" /></svg>,
    link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>,
    copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>,
    users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.5a3.5 3.5 0 010 7M18 20a6.5 6.5 0 00-3-5.5" /></svg>,
    full: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
    server: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>,
    x: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
};

// servers: [{ key, name, url }]
export default function EmbedPlayer({ servers, title, downloadHref, fileId }) {
    const [active, setActive] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [partyOpen, setPartyOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [slow, setSlow] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [blockPopups, setBlockPopups] = useState(true);

    // Watch Party
    const [room, setRoom] = useState(null);
    const [peers, setPeers] = useState(0);
    const [joinInput, setJoinInput] = useState('');
    const [countdown, setCountdown] = useState(null);
    const [toast, setToast] = useState('');

    const hideTimer = useRef(null);
    const toastTimer = useRef(null);
    const cdTimer = useRef(null);
    const rootRef = useRef(null);
    const chRef = useRef(null);
    const serversRef = useRef(servers);
    const clientId = useRef(Math.random().toString(36).slice(2));

    serversRef.current = servers;
    const current = servers[active] || servers[0];

    const say = useCallback((msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 2800);
    }, []);

    // ---------- সেভ করা পছন্দ + ?room=CODE থেকে অটো-জয়েন ----------
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_SERVER);
            const idx = servers.findIndex((s) => s.key === saved);
            if (idx > 0) setActive(idx);
            const b = localStorage.getItem(LS_BLOCK);
            if (b === '0') setBlockPopups(false);
        } catch (e) { /* ignore */ }

        try {
            const r = new URLSearchParams(window.location.search).get('room');
            if (r && /^[A-Za-z0-9]{4,10}$/.test(r)) {
                setRoom(r.toUpperCase());
                setPartyOpen(true);
            }
        } catch (e) { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- লোডিং / ধীর হলে হিন্ট ----------
    useEffect(() => {
        setLoaded(false);
        setSlow(false);
        const t = setTimeout(() => setSlow(true), 12000);
        return () => clearTimeout(t);
    }, [active, reloadKey, blockPopups]);

    // ---------- UI অটো-হাইড ----------
    const wake = useCallback(() => {
        setUiVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setUiVisible(false), 3500);
    }, []);

    useEffect(() => {
        wake();
        return () => clearTimeout(hideTimer.current);
    }, [wake]);

    // মেনু/পার্টি খোলা থাকলে UI লুকাবে না
    const showUi = uiVisible || menuOpen || partyOpen;

    // ---------- কাউন্টডাউন ----------
    const runCountdown = useCallback(() => {
        clearInterval(cdTimer.current);
        let n = 3;
        setCountdown(n);
        cdTimer.current = setInterval(() => {
            n -= 1;
            if (n > 0) setCountdown(n);
            else if (n === 0) setCountdown('PLAY!');
            else { clearInterval(cdTimer.current); setCountdown(null); }
        }, 1000);
    }, []);

    useEffect(() => () => { clearInterval(cdTimer.current); clearTimeout(toastTimer.current); }, []);

    // ---------- Watch Party: realtime চ্যানেল ----------
    useEffect(() => {
        if (!room) return undefined;
        const ch = sb.channel(`party:${fileId}:${room}`, {
            config: { broadcast: { self: false }, presence: { key: clientId.current } },
        });

        ch.on('broadcast', { event: 'server' }, ({ payload }) => {
            const i = serversRef.current.findIndex((s) => s.key === payload?.key);
            if (i >= 0) {
                setActive(i);
                setMenuOpen(false);
                say(`Room: ${serversRef.current[i].name} এ বদলানো হয়েছে`);
            }
        });
        ch.on('broadcast', { event: 'countdown' }, () => {
            wake();
            runCountdown();
        });
        ch.on('presence', { event: 'sync' }, () => {
            setPeers(Object.keys(ch.presenceState()).length);
        });
        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await ch.track({ at: Date.now() });
            }
        });
        chRef.current = ch;

        return () => {
            chRef.current = null;
            sb.removeChannel(ch);
            setPeers(0);
        };
    }, [room, fileId, say, wake, runCountdown]);

    // ---------- অ্যাকশন ----------
    const choose = (i) => {
        setActive(i);
        setMenuOpen(false);
        try { localStorage.setItem(LS_SERVER, servers[i].key); } catch (e) { /* ignore */ }
        if (chRef.current) {
            chRef.current.send({ type: 'broadcast', event: 'server', payload: { key: servers[i].key } });
        }
        wake();
    };

    const toggleBlock = () => {
        setBlockPopups((v) => {
            try { localStorage.setItem(LS_BLOCK, v ? '0' : '1'); } catch (e) { /* ignore */ }
            return !v;
        });
    };

    const toggleFullscreen = () => {
        const el = rootRef.current;
        if (!el) return;
        try {
            if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
            else document.exitFullscreen && document.exitFullscreen();
        } catch (e) { /* ignore */ }
    };

    const copy = async (text, msg) => {
        try {
            await navigator.clipboard.writeText(text);
            say(msg);
        } catch (e) {
            say('Copy করা যায়নি');
        }
    };

    const roomLink = (code) => `${window.location.origin}${window.location.pathname}?room=${code}`;

    const createRoom = () => {
        const code = makeCode();
        setRoom(code);
        copy(roomLink(code), `Room ${code} — লিংক কপি হয়েছে`);
    };

    const joinRoom = () => {
        const code = joinInput.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,10}$/.test(code)) {
            say('সঠিক Room code দিন');
            return;
        }
        setRoom(code);
        setJoinInput('');
    };

    const leaveRoom = () => {
        setRoom(null);
        setCountdown(null);
        clearInterval(cdTimer.current);
        say('Room ছেড়েছেন');
    };

    const startTogether = () => {
        if (chRef.current) chRef.current.send({ type: 'broadcast', event: 'countdown', payload: {} });
        runCountdown();
    };

    const closeAll = () => { setMenuOpen(false); setPartyOpen(false); };

    return (
        <div ref={rootRef} className="ep-root" onMouseMove={wake} onTouchStart={wake}>
            <style>{`
                .ep-root { position: fixed; inset: 0; z-index: 99990; background: #000; color: #e2e8f0; overflow: hidden; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
                .ep-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
                .ep-hot { position: absolute; top: 0; left: 0; right: 0; height: 52px; z-index: 15; }
                .ep-back { position: absolute; inset: 0; z-index: 18; }

                .ep-top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 10px; pointer-events: none; transition: opacity .3s, transform .3s; }
                .ep-top > * { pointer-events: auto; }
                .ep-off { opacity: 0; transform: translateY(-6px); }
                .ep-off > * { pointer-events: none !important; }

                .ep-pill, .ep-ico { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; border: 1px solid rgba(255,255,255,.14); background: rgba(12,14,24,.72); color: #f1f5f9; border-radius: 10px; cursor: pointer; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); font-family: inherit; transition: background .2s, border-color .2s, box-shadow .2s; }
                .ep-pill { padding: 0 11px; font-size: 12px; font-weight: 600; }
                .ep-ico { width: 32px; }
                .ep-pill:hover, .ep-ico:hover { background: rgba(30,34,56,.9); border-color: rgba(129,140,248,.6); }
                .ep-ico.live { border-color: rgba(239,68,68,.7); box-shadow: 0 0 0 3px rgba(239,68,68,.15); color: #fca5a5; }
                .ep-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,.8); flex-shrink: 0; }
                .ep-chev { opacity: .7; }
                .ep-right { display: flex; gap: 6px; position: relative; }
                .ep-badge { position: absolute; top: -5px; right: -5px; min-width: 15px; height: 15px; padding: 0 3px; border-radius: 8px; background: #ef4444; color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

                .ep-left { position: relative; }
                .ep-panel { position: absolute; top: 40px; width: 262px; background: linear-gradient(180deg, rgba(20,22,36,.96), rgba(10,11,20,.98)); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; box-shadow: 0 18px 48px rgba(0,0,0,.75), 0 0 0 1px rgba(99,102,241,.08); overflow: hidden; backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); }
                .ep-panel.left { left: 0; }
                .ep-panel.right { right: 0; width: 236px; }
                .ep-ph { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-bottom: 1px solid rgba(255,255,255,.07); }
                .ep-ph .ic { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: rgba(129,140,248,.14); color: #a5b4fc; flex-shrink: 0; }
                .ep-ph .t { font-size: 12.5px; font-weight: 700; color: #fff; }
                .ep-ph .s { font-size: 10.5px; color: #8b93a7; margin-top: 1px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-ph .n { margin-left: auto; font-size: 10.5px; font-weight: 700; color: #cbd5e1; background: rgba(255,255,255,.08); border-radius: 999px; padding: 2px 8px; }
                .ep-ph .x { margin-left: auto; width: 24px; height: 24px; border: 0; border-radius: 7px; background: transparent; color: #8b93a7; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .ep-ph .x:hover { background: rgba(255,255,255,.08); color: #fff; }

                .ep-list { max-height: min(54vh, 340px); overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 5px; scrollbar-width: thin; scrollbar-color: rgba(129,140,248,.45) transparent; }
                .ep-list::-webkit-scrollbar { width: 5px; }
                .ep-list::-webkit-scrollbar-track { background: transparent; margin: 6px 0; }
                .ep-list::-webkit-scrollbar-thumb { background: rgba(129,140,248,.4); border-radius: 999px; }
                .ep-list::-webkit-scrollbar-thumb:hover { background: rgba(129,140,248,.7); }

                .ep-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 9px; border: 1px solid transparent; background: rgba(255,255,255,.03); color: #aab1c4; border-radius: 11px; cursor: pointer; font-family: inherit; text-align: left; transition: .18s; }
                .ep-row:hover { background: rgba(255,255,255,.07); color: #fff; }
                .ep-row.on { border-color: rgba(129,140,248,.55); background: rgba(99,102,241,.13); color: #fff; }
                .ep-row .ri { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .ep-row.on .ri { background: rgba(99,102,241,.35); color: #c7d2fe; }
                .ep-row .rn { font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-sw { width: 30px; height: 17px; border-radius: 999px; background: rgba(255,255,255,.14); position: relative; flex-shrink: 0; transition: .2s; }
                .ep-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: .2s; }
                .ep-sw.on { background: #22c55e; }
                .ep-sw.on::after { left: 15px; }

                .ep-dl { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 11px; background: rgba(34,211,238,.06); border: 1px dashed rgba(34,211,238,.28); }
                .ep-dl a { color: #67e8f9; font-size: 12.5px; font-weight: 700; text-decoration: underline; }
                .ep-dl small { display: block; font-size: 10px; color: #7b8499; margin-top: 1px; }
                .ep-mini { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 5px 9px; border: 0; border-radius: 8px; background: rgba(255,255,255,.1); color: #e2e8f0; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
                .ep-mini:hover { background: rgba(255,255,255,.18); }
                .ep-foot { padding: 8px 12px 10px; border-top: 1px solid rgba(255,255,255,.07); display: flex; align-items: center; gap: 10px; font-size: 11px; color: #9aa3b8; cursor: pointer; }

                .ep-pbody { padding: 12px; display: flex; flex-direction: column; gap: 9px; }
                .ep-btn { display: flex; align-items: center; justify-content: center; gap: 7px; height: 34px; border: 0; border-radius: 10px; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 6px 18px rgba(239,68,68,.3); }
                .ep-btn:hover { filter: brightness(1.1); }
                .ep-btn.ghost { background: rgba(255,255,255,.08); box-shadow: none; color: #e2e8f0; }
                .ep-join { display: flex; gap: 6px; }
                .ep-join input { flex: 1; min-width: 0; height: 34px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #fff; font-size: 12.5px; letter-spacing: .12em; text-transform: uppercase; font-family: inherit; outline: none; }
                .ep-join input:focus { border-color: rgba(129,140,248,.7); }
                .ep-join button { padding: 0 14px; height: 34px; border: 0; border-radius: 10px; background: #ef4444; color: #fff; font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: inherit; }
                .ep-code { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px; border-radius: 11px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
                .ep-code b { font-size: 18px; letter-spacing: .22em; color: #fff; font-family: ui-monospace, monospace; }
                .ep-live { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #86efac; }
                .ep-note { font-size: 10px; line-height: 1.45; color: #7b8499; }

                .ep-center { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; pointer-events: none; }
                .ep-spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(255,255,255,.09); border-top-color: #ef4444; border-right-color: rgba(239,68,68,.4); animation: ep-spin .8s linear infinite; }
                @keyframes ep-spin { to { transform: rotate(360deg); } }
                .ep-slow { pointer-events: auto; text-align: center; background: rgba(10,12,22,.9); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 12px 14px; font-size: 12px; color: #cbd5e1; max-width: 82%; }
                .ep-slow .row { display: flex; gap: 6px; justify-content: center; margin-top: 9px; }
                .ep-slow .ep-pill { height: 30px; }

                .ep-cd { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,0,0,.55); backdrop-filter: blur(3px); pointer-events: none; animation: ep-fade .25s; }
                .ep-cd .big { font-size: 84px; font-weight: 800; color: #fff; text-shadow: 0 0 40px rgba(239,68,68,.8); line-height: 1; }
                .ep-cd .sm { font-size: 12px; color: #cbd5e1; letter-spacing: .04em; }
                @keyframes ep-fade { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
                .ep-toast { position: absolute; top: 52px; left: 50%; transform: translateX(-50%); z-index: 40; padding: 7px 14px; border-radius: 999px; background: rgba(12,14,24,.92); border: 1px solid rgba(255,255,255,.14); color: #e2e8f0; font-size: 11.5px; font-weight: 600; pointer-events: none; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; }
            `}</style>

            <iframe
                key={`${current.url}-${reloadKey}-${blockPopups ? 'b' : 'o'}`}
                className="ep-frame"
                src={current.url}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                // pop-up/নতুন ট্যাব বিজ্ঞাপন আটকাতে sandbox (allow-popups ছাড়া)
                sandbox={blockPopups ? 'allow-scripts allow-same-origin allow-forms allow-presentation' : undefined}
                referrerPolicy="origin"
                onLoad={() => { setLoaded(true); setSlow(false); }}
            />

            {/* UI লুকানো থাকলে উপরের পাতলা অংশে মাউস গেলে আবার দেখায় (iframe মাউস ইভেন্ট আটকায়) */}
            {!showUi && <div className="ep-hot" onMouseEnter={wake} onTouchStart={wake} />}

            {/* মেনু/পার্টি খোলা থাকলে বাইরে ক্লিকে বন্ধ */}
            {(menuOpen || partyOpen) && <div className="ep-back" onClick={closeAll} />}

            {!loaded && (
                <div className="ep-center">
                    <div className="ep-spinner" />
                    {slow && (
                        <div className="ep-slow">
                            {current.name} লোড হতে দেরি হচ্ছে।
                            <div className="row">
                                {servers.length > 1 && (
                                    <button type="button" className="ep-pill" onClick={() => choose((active + 1) % servers.length)}>পরের সার্ভার</button>
                                )}
                                <button type="button" className="ep-pill" onClick={() => setReloadKey((k) => k + 1)}>↻ আবার</button>
                                {blockPopups && (
                                    <button type="button" className="ep-pill" onClick={toggleBlock} title="কিছু প্লেয়ার sandbox-এ চলে না">Popup block বন্ধ</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {countdown !== null && (
                <div className="ep-cd">
                    <div className="big">{countdown}</div>
                    <div className="sm">{countdown === 'PLAY!' ? 'এখন Play চাপুন!' : 'সবাই একসাথে Play চাপতে তৈরি হোন'}</div>
                </div>
            )}

            {toast && <div className="ep-toast">{toast}</div>}

            <div className={`ep-top ${showUi ? '' : 'ep-off'}`}>
                {/* বাঁ: সার্ভার + ডাউনলোড */}
                <div className="ep-left">
                    <button
                        type="button"
                        className="ep-pill"
                        onClick={() => { setPartyOpen(false); setMenuOpen((v) => !v); }}
                    >
                        <span className="ep-dot" />
                        {current.name}
                        <span className="ep-chev">{Ico.chevron}</span>
                    </button>

                    {menuOpen && (
                        <div className="ep-panel left">
                            <div className="ep-ph">
                                <div className="ic">{Ico.server}</div>
                                <div>
                                    <div className="t">Video Source</div>
                                    <div className="s">{title || 'Select streaming server'}</div>
                                </div>
                                <span className="n">{servers.length}</span>
                            </div>

                            <div className="ep-list">
                                {downloadHref && (
                                    <div className="ep-dl">
                                        <span style={{ color: '#67e8f9' }}>{Ico.link}</span>
                                        <div>
                                            <a href={downloadHref} target="_blank" rel="noopener noreferrer">Download</a>
                                            <small>Click to download</small>
                                        </div>
                                        <button
                                            type="button"
                                            className="ep-mini"
                                            onClick={() => copy(`${window.location.origin}${downloadHref}`, 'Download লিংক কপি হয়েছে')}
                                        >
                                            {Ico.copy} Copy
                                        </button>
                                    </div>
                                )}

                                {servers.map((s, i) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        className={`ep-row ${i === active ? 'on' : ''}`}
                                        onClick={() => choose(i)}
                                    >
                                        <span className="ri">{Ico.play}</span>
                                        <span className="rn">{s.name}</span>
                                        <span className={`ep-sw ${i === active ? 'on' : ''}`} />
                                    </button>
                                ))}
                            </div>

                            <div className="ep-foot" onClick={toggleBlock}>
                                <span className={`ep-sw ${blockPopups ? 'on' : ''}`} />
                                <span>Pop-up বিজ্ঞাপন আটকান</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ডান: Watch Party + ফুলস্ক্রিন */}
                <div className="ep-right">
                    <button
                        type="button"
                        className={`ep-ico ${room ? 'live' : ''}`}
                        title="Watch Party"
                        onClick={() => { setMenuOpen(false); setPartyOpen((v) => !v); }}
                    >
                        {Ico.users}
                        {room && peers > 0 && <span className="ep-badge">{peers}</span>}
                    </button>
                    <button type="button" className="ep-ico" title="Fullscreen" onClick={toggleFullscreen}>{Ico.full}</button>

                    {partyOpen && (
                        <div className="ep-panel right">
                            <div className="ep-ph">
                                <div className="ic">{Ico.users}</div>
                                <div className="t">Watch Party</div>
                                <button type="button" className="x" onClick={() => setPartyOpen(false)}>{Ico.x}</button>
                            </div>

                            <div className="ep-pbody">
                                {!room ? (
                                    <>
                                        <button type="button" className="ep-btn" onClick={createRoom}>Create Room</button>
                                        <div className="ep-join">
                                            <input
                                                value={joinInput}
                                                onChange={(e) => setJoinInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(); }}
                                                placeholder="Room code"
                                                maxLength={10}
                                            />
                                            <button type="button" onClick={joinRoom}>Join</button>
                                        </div>
                                        <div className="ep-note">রুম বানিয়ে লিংক বা কোড বন্ধুকে দিন। দুজনেই একই ভিডিও পেজে থাকতে হবে।</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ep-code">
                                            <b>{room}</b>
                                            <button type="button" className="ep-mini" onClick={() => copy(roomLink(room), 'Room লিংক কপি হয়েছে')}>{Ico.copy} Link</button>
                                        </div>
                                        <div className="ep-live"><span className="ep-dot" /> {Math.max(peers, 1)} জন দেখছেন</div>
                                        <button type="button" className="ep-btn" onClick={startTogether}>▶ Start together (3-2-1)</button>
                                        <button type="button" className="ep-btn ghost" onClick={leaveRoom}>Leave room</button>
                                        <div className="ep-note">সার্ভার বদলালে সবার সার্ভার বদলায়। প্লে/পজ/সিক আলাদা প্লেয়ার থেকে আসে, তাই কাউন্টডাউন শেষে সবাই নিজে Play চাপবেন।</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}