'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// Watch Party uses Supabase Realtime "broadcast" only (no database table needed)
const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { realtime: { params: { eventsPerSecond: 5 } } }
);

const LS_SERVER = 'ms_player_server';
const LS_PREFS = 'ms_player_prefs';
const DEFAULT_PREFS = { download: true, fullscreen: true, party: true, block: true };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const Ico = {
    chevron: <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8z" /></svg>,
    play: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><polygon points="6 4 20 12 6 20 6 4" /></svg>,
    link: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>,
    copy: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 012-2h10" /></svg>,
    users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0" /><path d="M16 4.5a3.5 3.5 0 010 7M18 20a6.5 6.5 0 00-3-5.5" /></svg>,
    full: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
    server: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>,
    gear: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></svg>,
    x: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
};

// servers: [{ key, name, url }]
export default function EmbedPlayer({ servers, title, downloadHref, fileId }) {
    const [active, setActive] = useState(0);
    const [panel, setPanel] = useState(null); // null | 'servers' | 'party' | 'settings'
    const [loaded, setLoaded] = useState(false);
    const [slow, setSlow] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [prefs, setPrefs] = useState(DEFAULT_PREFS);

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
    const frameRef = useRef(null);
    const chRef = useRef(null);
    const serversRef = useRef(servers);
    const clientId = useRef(Math.random().toString(36).slice(2));

    serversRef.current = servers;
    const current = servers[active] || servers[0];
    const showUi = uiVisible || panel !== null;

    const say = useCallback((msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 2600);
    }, []);

    // ---------- saved preferences + auto-join from ?room=CODE ----------
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_SERVER);
            const idx = servers.findIndex((s) => s.key === saved);
            if (idx > 0) setActive(idx);
            const p = JSON.parse(localStorage.getItem(LS_PREFS) || 'null');
            if (p && typeof p === 'object') setPrefs({ ...DEFAULT_PREFS, ...p });
        } catch (e) { /* ignore */ }

        try {
            const r = new URLSearchParams(window.location.search).get('room');
            if (r && /^[A-Za-z0-9]{4,10}$/.test(r)) {
                setRoom(r.toUpperCase());
                setPrefs((p) => ({ ...p, party: true }));
                setPanel('party');
            }
        } catch (e) { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setPref = (key) => {
        setPrefs((p) => {
            const next = { ...p, [key]: !p[key] };
            try { localStorage.setItem(LS_PREFS, JSON.stringify(next)); } catch (e) { /* ignore */ }
            return next;
        });
    };

    // ---------- slow-loading hint ----------
    useEffect(() => {
        setLoaded(false);
        setSlow(false);
        const t = setTimeout(() => setSlow(true), 12000);
        return () => clearTimeout(t);
    }, [active, reloadKey, prefs.block]);

    // ---------- UI auto-hide ----------
    const wake = useCallback(() => {
        setUiVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setUiVisible(false), 3500);
    }, []);

    // show the UI again whenever the server changes or the player reloads
    useEffect(() => {
        wake();
    }, [active, reloadKey, wake]);

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    // When the user clicks inside the player (starts playing) the page window loses focus
    // to the iframe -> hide our controls so the video is clean.
    useEffect(() => {
        const onBlur = () => {
            setTimeout(() => {
                if (document.activeElement === frameRef.current) {
                    clearTimeout(hideTimer.current);
                    setPanel(null);
                    setUiVisible(false);
                }
            }, 60);
        };
        window.addEventListener('blur', onBlur);
        return () => window.removeEventListener('blur', onBlur);
    }, []);

    // ---------- countdown ----------
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

    // ---------- Watch Party: realtime channel ----------
    useEffect(() => {
        if (!room) return undefined;
        const ch = sb.channel(`party:${fileId}:${room}`, {
            config: { broadcast: { self: false }, presence: { key: clientId.current } },
        });

        ch.on('broadcast', { event: 'server' }, ({ payload }) => {
            const i = serversRef.current.findIndex((s) => s.key === payload?.key);
            if (i >= 0) {
                setActive(i);
                setPanel(null);
                say(`Room switched to ${serversRef.current[i].name}`);
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
            if (status === 'SUBSCRIBED') await ch.track({ at: Date.now() });
        });
        chRef.current = ch;

        return () => {
            chRef.current = null;
            sb.removeChannel(ch);
            setPeers(0);
        };
    }, [room, fileId, say, wake, runCountdown]);

    // ---------- actions ----------
    const choose = (i) => {
        setActive(i);
        setPanel(null);
        try { localStorage.setItem(LS_SERVER, servers[i].key); } catch (e) { /* ignore */ }
        if (chRef.current) {
            chRef.current.send({ type: 'broadcast', event: 'server', payload: { key: servers[i].key } });
        }
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
            say('Copy failed');
        }
    };

    const roomLink = (code) => `${window.location.origin}${window.location.pathname}?room=${code}`;

    const createRoom = () => {
        const code = makeCode();
        setRoom(code);
        copy(roomLink(code), `Room ${code} created, link copied`);
    };

    const joinRoom = () => {
        const code = joinInput.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,10}$/.test(code)) {
            say('Enter a valid room code');
            return;
        }
        setRoom(code);
        setJoinInput('');
    };

    const leaveRoom = () => {
        setRoom(null);
        setCountdown(null);
        clearInterval(cdTimer.current);
        say('You left the room');
    };

    const startTogether = () => {
        if (chRef.current) chRef.current.send({ type: 'broadcast', event: 'countdown', payload: {} });
        runCountdown();
    };

    const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

    return (
        <div ref={rootRef} className="ep-root" onMouseMove={wake} onTouchStart={wake}>
            <style>{`
                .ep-root { --ac: #ef4444; --ac2: #dc2626; --ac-soft: rgba(239,68,68,.14); --ac-line: rgba(239,68,68,.55); position: fixed; inset: 0; z-index: 99990; background: #000; color: #e7e2e3; overflow: hidden; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
                .ep-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
                .ep-hot { position: absolute; top: 0; left: 0; right: 0; height: 50px; z-index: 15; }
                .ep-back { position: absolute; inset: 0; z-index: 18; }

                .ep-top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; padding: 8px; pointer-events: none; transition: opacity .35s ease, transform .35s ease; }
                .ep-top > * { pointer-events: auto; }
                .ep-off { opacity: 0; transform: translateY(-6px); }
                .ep-off, .ep-off * { pointer-events: none !important; }

                .ep-pill, .ep-ico { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 28px; border: 1px solid rgba(255,255,255,.12); background: rgba(16,8,10,.72); color: #f5eeee; border-radius: 9px; cursor: pointer; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); font-family: inherit; transition: background .2s, border-color .2s, box-shadow .2s; }
                .ep-pill { padding: 0 10px; font-size: 11.5px; font-weight: 600; }
                .ep-ico { width: 28px; position: relative; }
                .ep-pill:hover, .ep-ico:hover { background: rgba(40,14,18,.92); border-color: var(--ac-line); }
                .ep-ico.live { border-color: var(--ac-line); box-shadow: 0 0 0 3px rgba(239,68,68,.15); color: #fca5a5; }
                .ep-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 8px rgba(239,68,68,.9); flex-shrink: 0; }
                .ep-chev { opacity: .65; display: flex; }
                .ep-right { display: flex; gap: 5px; position: relative; }
                .ep-count { position: absolute; top: -5px; right: -5px; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; background: var(--ac); color: #fff; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

                .ep-now { position: absolute; top: 44px; left: 8px; right: 8px; z-index: 19; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; pointer-events: none; transition: opacity .35s ease; }
                .ep-now .b { font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #fca5a5; border: 1px solid rgba(239,68,68,.45); background: rgba(239,68,68,.12); border-radius: 5px; padding: 2px 7px; }
                .ep-now .t { font-size: 12.5px; font-weight: 700; color: #fff; text-shadow: 0 1px 8px rgba(0,0,0,.9); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                .ep-left { position: relative; }
                .ep-panel { position: absolute; top: 34px; width: min(214px, calc(100vw - 16px)); background: linear-gradient(180deg, rgba(26,12,15,.97), rgba(11,7,9,.98)); border: 1px solid rgba(255,255,255,.1); border-radius: 13px; box-shadow: 0 16px 44px rgba(0,0,0,.8), 0 0 0 1px rgba(239,68,68,.07); overflow: hidden; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
                .ep-panel.left { left: 0; }
                .ep-panel.right { right: 0; }
                .ep-ph { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.07); }
                .ep-ph .ic { width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; background: var(--ac-soft); color: #fca5a5; flex-shrink: 0; }
                .ep-ph .t { font-size: 11.5px; font-weight: 700; color: #fff; }
                .ep-ph .s { font-size: 9.5px; color: #9b8f92; margin-top: 1px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-ph .n { margin-left: auto; font-size: 10px; font-weight: 700; color: #d6caca; background: rgba(255,255,255,.08); border-radius: 999px; padding: 1px 7px; }
                .ep-ph .x { margin-left: auto; width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent; color: #9b8f92; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .ep-ph .x:hover { background: rgba(255,255,255,.08); color: #fff; }

                .ep-list { max-height: min(42vh, 230px); overflow-y: auto; padding: 6px; display: flex; flex-direction: column; gap: 4px; scrollbar-width: thin; scrollbar-color: rgba(239,68,68,.5) transparent; }
                .ep-list::-webkit-scrollbar { width: 4px; }
                .ep-list::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
                .ep-list::-webkit-scrollbar-thumb { background: rgba(239,68,68,.45); border-radius: 999px; }
                .ep-list::-webkit-scrollbar-thumb:hover { background: rgba(239,68,68,.8); }

                .ep-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 5px 7px; border: 1px solid transparent; background: rgba(255,255,255,.035); color: #b5a9ab; border-radius: 9px; cursor: pointer; font-family: inherit; text-align: left; transition: .16s; }
                .ep-row:hover { background: rgba(255,255,255,.075); color: #fff; }
                .ep-row.on { border-color: var(--ac-line); background: var(--ac-soft); color: #fff; }
                .ep-row .ri { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,.07); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .ep-row.on .ri { background: rgba(239,68,68,.35); color: #fecaca; }
                .ep-row .rn { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-sw { width: 26px; height: 15px; border-radius: 999px; background: rgba(255,255,255,.15); position: relative; flex-shrink: 0; transition: .2s; }
                .ep-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: #fff; transition: .2s; }
                .ep-sw.on { background: var(--ac); }
                .ep-sw.on::after { left: 13px; }

                .ep-dl { display: flex; align-items: center; gap: 8px; padding: 5px 7px; border-radius: 9px; background: rgba(255,255,255,.035); border: 1px dashed rgba(255,255,255,.16); }
                .ep-dl a { color: #fca5a5; font-size: 11.5px; font-weight: 700; text-decoration: none; }
                .ep-dl a:hover { text-decoration: underline; }
                .ep-dl small { display: block; font-size: 9px; color: #8d8184; margin-top: 0; }
                .ep-mini { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 8px; border: 0; border-radius: 7px; background: rgba(255,255,255,.1); color: #eadfe0; font-size: 10px; font-weight: 600; cursor: pointer; font-family: inherit; }
                .ep-mini:hover { background: rgba(255,255,255,.18); }

                .ep-set { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 9px; cursor: pointer; font-size: 11px; color: #d6caca; }
                .ep-set:hover { background: rgba(255,255,255,.06); }
                .ep-set span.l { flex: 1; }
                .ep-note { padding: 2px 8px 8px; font-size: 9.5px; line-height: 1.45; color: #8d8184; }

                .ep-pbody { padding: 9px; display: flex; flex-direction: column; gap: 7px; }
                .ep-btn { display: flex; align-items: center; justify-content: center; gap: 6px; height: 30px; border: 0; border-radius: 9px; background: linear-gradient(135deg, var(--ac), var(--ac2)); color: #fff; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit; box-shadow: 0 5px 16px rgba(239,68,68,.28); }
                .ep-btn:hover { filter: brightness(1.12); }
                .ep-btn.ghost { background: rgba(255,255,255,.08); box-shadow: none; color: #eadfe0; }
                .ep-join { display: flex; gap: 5px; }
                .ep-join input { flex: 1; min-width: 0; height: 30px; padding: 0 9px; border-radius: 9px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #fff; font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; font-family: inherit; outline: none; }
                .ep-join input:focus { border-color: var(--ac-line); }
                .ep-join button { padding: 0 12px; height: 30px; border: 0; border-radius: 9px; background: var(--ac); color: #fff; font-weight: 700; font-size: 11.5px; cursor: pointer; font-family: inherit; }
                .ep-code { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 7px 9px; border-radius: 10px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); }
                .ep-code b { font-size: 16px; letter-spacing: .2em; color: #fff; font-family: ui-monospace, monospace; }
                .ep-live { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #fca5a5; }
                .ep-pnote { font-size: 9.5px; line-height: 1.45; color: #8d8184; }

                .ep-center { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; }
                .ep-spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid rgba(255,255,255,.08); border-top-color: var(--ac); border-right-color: rgba(239,68,68,.4); animation: ep-spin .8s linear infinite; }
                @keyframes ep-spin { to { transform: rotate(360deg); } }
                .ep-slow { pointer-events: auto; text-align: center; background: rgba(14,8,10,.92); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 10px 12px; font-size: 11.5px; color: #d6caca; max-width: 84%; }
                .ep-slow .row { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 8px; }

                .ep-cd { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,0,0,.55); backdrop-filter: blur(3px); pointer-events: none; animation: ep-fade .25s; }
                .ep-cd .big { font-size: 76px; font-weight: 800; color: #fff; text-shadow: 0 0 40px rgba(239,68,68,.85); line-height: 1; }
                .ep-cd .sm { font-size: 11.5px; color: #d6caca; letter-spacing: .04em; }
                @keyframes ep-fade { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
                .ep-toast { position: absolute; top: 46px; left: 50%; transform: translateX(-50%); z-index: 40; padding: 6px 13px; border-radius: 999px; background: rgba(14,8,10,.94); border: 1px solid var(--ac-line); color: #f5eeee; font-size: 11px; font-weight: 600; pointer-events: none; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; }
            `}</style>

            <iframe
                ref={frameRef}
                key={`${current.url}-${reloadKey}-${prefs.block ? 'b' : 'o'}`}
                className="ep-frame"
                src={current.url}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                // blocks pop-up / new-tab ads and redirects (no allow-popups, no allow-top-navigation)
                sandbox={prefs.block ? 'allow-scripts allow-same-origin allow-forms allow-presentation' : undefined}
                referrerPolicy="origin"
                onLoad={() => { setLoaded(true); setSlow(false); }}
            />

            {/* When the controls are hidden, hovering/tapping the thin top strip brings them back */}
            {!showUi && <div className="ep-hot" onMouseEnter={wake} onTouchStart={wake} />}

            {/* click outside to close panels */}
            {panel !== null && <div className="ep-back" onClick={() => setPanel(null)} />}

            {!loaded && (
                <div className="ep-center">
                    <div className="ep-spinner" />
                    {slow && (
                        <div className="ep-slow">
                            {current.name} is taking longer than usual.
                            <div className="row">
                                {servers.length > 1 && (
                                    <button type="button" className="ep-pill" onClick={() => choose((active + 1) % servers.length)}>Next server</button>
                                )}
                                <button type="button" className="ep-pill" onClick={() => setReloadKey((k) => k + 1)}>↻ Retry</button>
                                {prefs.block && (
                                    <button type="button" className="ep-pill" onClick={() => setPref('block')} title="Some players refuse to run inside a sandbox">Turn off pop-up block</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {countdown !== null && (
                <div className="ep-cd">
                    <div className="big">{countdown}</div>
                    <div className="sm">{countdown === 'PLAY!' ? 'Press Play now!' : 'Get ready to press Play together'}</div>
                </div>
            )}

            {toast && <div className="ep-toast">{toast}</div>}

            {/* title + now playing (click-through, never blocks the video controls) */}
            <div className="ep-now" style={{ opacity: showUi && panel === null ? 1 : 0 }}>
                <span className="b">▶ Now playing on {current.name}</span>
                {title && <span className="t">{title}</span>}
            </div>

            <div className={`ep-top ${showUi ? '' : 'ep-off'}`}>
                {/* left: servers (+ download) */}
                <div className="ep-left">
                    <button type="button" className="ep-pill" onClick={() => togglePanel('servers')}>
                        <span className="ep-dot" />
                        {current.name}
                        <span className="ep-chev">{Ico.chevron}</span>
                    </button>

                    {panel === 'servers' && (
                        <div className="ep-panel left">
                            <div className="ep-ph">
                                <div className="ic">{Ico.server}</div>
                                <div>
                                    <div className="t">Video Source</div>
                                    <div className="s">Select streaming server</div>
                                </div>
                                <span className="n">{servers.length}</span>
                            </div>

                            <div className="ep-list">
                                {prefs.download && downloadHref && (
                                    <div className="ep-dl">
                                        <span style={{ color: '#fca5a5', display: 'flex' }}>{Ico.link}</span>
                                        <div>
                                            <a href={downloadHref} target="_blank" rel="noopener noreferrer">Download</a>
                                            <small>Click to download</small>
                                        </div>
                                        <button
                                            type="button"
                                            className="ep-mini"
                                            onClick={() => copy(`${window.location.origin}${downloadHref}`, 'Download link copied')}
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
                        </div>
                    )}
                </div>

                {/* right: party, fullscreen, settings */}
                <div className="ep-right">
                    {prefs.party && (
                        <button
                            type="button"
                            className={`ep-ico ${room ? 'live' : ''}`}
                            title="Watch Party"
                            onClick={() => togglePanel('party')}
                        >
                            {Ico.users}
                            {room && peers > 0 && <span className="ep-count">{peers}</span>}
                        </button>
                    )}
                    {prefs.fullscreen && (
                        <button type="button" className="ep-ico" title="Fullscreen" onClick={toggleFullscreen}>{Ico.full}</button>
                    )}
                    <button type="button" className="ep-ico" title="Player settings" onClick={() => togglePanel('settings')}>{Ico.gear}</button>

                    {panel === 'party' && prefs.party && (
                        <div className="ep-panel right">
                            <div className="ep-ph">
                                <div className="ic">{Ico.users}</div>
                                <div className="t">Watch Party</div>
                                <button type="button" className="x" onClick={() => setPanel(null)}>{Ico.x}</button>
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
                                        <div className="ep-pnote">Create a room and share the code or link. Everyone must be on this same video page.</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ep-code">
                                            <b>{room}</b>
                                            <button type="button" className="ep-mini" onClick={() => copy(roomLink(room), 'Room link copied')}>{Ico.copy} Link</button>
                                        </div>
                                        <div className="ep-live"><span className="ep-dot" /> {Math.max(peers, 1)} watching</div>
                                        <button type="button" className="ep-btn" onClick={startTogether}>▶ Start together (3-2-1)</button>
                                        <button type="button" className="ep-btn ghost" onClick={leaveRoom}>Leave room</button>
                                        <div className="ep-pnote">Server changes sync for everyone. Play, pause and seek cannot be synced across different players, so everyone presses Play after the countdown.</div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {panel === 'settings' && (
                        <div className="ep-panel right">
                            <div className="ep-ph">
                                <div className="ic">{Ico.gear}</div>
                                <div className="t">Player Settings</div>
                                <button type="button" className="x" onClick={() => setPanel(null)}>{Ico.x}</button>
                            </div>
                            <div style={{ padding: 6 }}>
                                <div className="ep-set" onClick={() => setPref('download')}><span className="l">Download option</span><span className={`ep-sw ${prefs.download ? 'on' : ''}`} /></div>
                                <div className="ep-set" onClick={() => setPref('fullscreen')}><span className="l">Fullscreen button</span><span className={`ep-sw ${prefs.fullscreen ? 'on' : ''}`} /></div>
                                <div className="ep-set" onClick={() => setPref('party')}><span className="l">Watch Party</span><span className={`ep-sw ${prefs.party ? 'on' : ''}`} /></div>
                                <div className="ep-set" onClick={() => setPref('block')}><span className="l">Block pop-up ads</span><span className={`ep-sw ${prefs.block ? 'on' : ''}`} /></div>
                            </div>
                            <div className="ep-note">Ads shown inside a host&apos;s own player can&apos;t be removed from this page. For those, use an ad-blocker extension (e.g. uBlock Origin) or the Brave browser.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}