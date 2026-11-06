'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { THEMES, LOADERS, LOOKS, WAITS, parseConfig, resolvePrefs, readOverrides, saveOverrides, isLocked, themeVars } from '../../utils/playerConfig';

// Watch Party uses Supabase Realtime "broadcast" only (no database table needed)
const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { realtime: { params: { eventsPerSecond: 5 } }, auth: { persistSession: false, autoRefreshToken: false } }
);

const LS_SERVER = 'ms_player_server';
function Loader({ kind }) {
    if (kind === 'dots') return <div className="ep-ld ep-ld-dots"><span /><span /><span /></div>;
    if (kind === 'bars') return <div className="ep-ld ep-ld-bars"><span /><span /><span /><span /><span /></div>;
    if (kind === 'pulse') return <div className="ep-ld ep-ld-pulse"><i /></div>;
    if (kind === 'orbit') return <div className="ep-ld ep-ld-orbit"><i /><i /></div>;
    return <div className="ep-spinner" />;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

const Ico = {
    crop: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14" /></svg>,
    lock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>,
    back: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>,
    next: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>,
    rotl: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>,
    rotr: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>,
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
export default function EmbedPlayer({ servers, title, downloadHref, fileId, config }) {
    const [active, setActive] = useState(0);
    const [panel, setPanel] = useState(null); // null | 'servers' | 'party' | 'settings'
    const [loaded, setLoaded] = useState(false);
    const [slow, setSlow] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [nowShow, setNowShow] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [ov, setOv] = useState({}); // only what THIS visitor changed
    const [partyForce, setPartyForce] = useState(false);
    const cfg = useMemo(() => parseConfig(config), [config]);
    const can = (k) => !isLocked(cfg.locked, k);
    const prefs = useMemo(() => {
        const p = resolvePrefs(cfg, ov);
        if (partyForce && !isLocked(cfg.locked, 'party')) p.party = true;
        return p;
    }, [cfg, ov, partyForce]);
    const [view, setView] = useState({ fit: 'fit', zoom: 1, rot: 0 });
    const [urls, setUrls] = useState({});
    const [locked, setLocked] = useState(false);
    const [holding, setHolding] = useState(false);
    const holdTimer = useRef(null);
    const lockTimer = useRef(null);
    const [lockShow, setLockShow] = useState(true);
    const [box, setBox] = useState({ w: 0, h: 0 });

    // Watch Party
    const [room, setRoom] = useState(null);
    const [peers, setPeers] = useState(0);
    const [joinInput, setJoinInput] = useState('');
    const [countdown, setCountdown] = useState(null);
    const [toast, setToast] = useState('');

    const hideTimer = useRef(null);
    const nowTimer = useRef(null);
    const toastTimer = useRef(null);
    const cdTimer = useRef(null);
    const rootRef = useRef(null);
    const frameRef = useRef(null);
    const chRef = useRef(null);
    const serversRef = useRef(servers);
    const clientId = useRef(Math.random().toString(36).slice(2));

    serversRef.current = servers;
    const activeRef = useRef(0);
    activeRef.current = active;
    const tried = useRef(new Set());
    const current = servers[active] || servers[0];
    // protection level per server: strict (no pop-ups, no redirects) | relaxed (pop-ups allowed, page redirects still blocked) | off
    const level = prefs.block ? ((prefs.sb || {})[current.key] || (current.key === 'vidara' ? 'off' : 'strict')) : 'off';
    const sandboxOn = level !== 'off';
    const guardOn = prefs.guard; // only when the user switches it on: it also asks on a normal reload
    const curUrl = urls[current.key] || current.url || '';

    const say = useCallback((msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 2600);
    }, []);

    // ---------- auto-switch: moves to the next server when the current one clearly is not working ----------
    const autoAdvance = useCallback((why) => {
        const list = serversRef.current;
        const cur = list[activeRef.current];
        if (!cur) return;
        tried.current.add(cur.key);
        const next = list.findIndex((s) => !tried.current.has(s.key));
        if (next < 0) {
            tried.current = new Set([cur.key]);
            say('Auto-switch: no other server answered. Use Retry or pick one yourself');
            return;
        }
        setActive(next);
        setPanel(null);
        say(`${cur.name} ${why}. Switched to ${list[next].name}`);
    }, [say]);

    // ---------- saved preferences + auto-join from ?room=CODE ----------
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LS_SERVER);
            const idx = servers.findIndex((s) => s.key === saved);
            if (idx > 0) setActive(idx);
            setOv(readOverrides());
        } catch (e) { /* ignore */ }

        try {
            const r = new URLSearchParams(window.location.search).get('room');
            if (r && /^[A-Za-z0-9]{4,10}$/.test(r)) {
                setRoom(r.toUpperCase());
                setPartyForce(true); // a room link always shows the Watch Party button
                setPanel('party');
            }
        } catch (e) { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // a visitor's choice is stored as an override; a setting the admin locked can not be changed
    const patchPrefs = (patch) => {
        const allowed = {};
        Object.keys(patch).forEach((k) => { if (!isLocked(cfg.locked, k)) allowed[k] = patch[k]; });
        if (Object.keys(allowed).length === 0) return;
        setOv((prev) => {
            const next = { ...prev, ...allowed };
            saveOverrides(next);
            return next;
        });
    };
    const setPref = (key, value) => patchPrefs({ [key]: value });
    const resetLook = () => setOv((prev) => {
        const next = { ...prev };
        ['theme', 'customColor', 'look', 'loader', 'anim'].forEach((k) => { delete next[k]; });
        saveOverrides(next);
        return next;
    });

    // ---------- redirect guard: asks before the page is navigated away (e.g. by an ad script) ----------
    useEffect(() => {
        if (!guardOn) return undefined;
        const skip = { v: false };
        const key = (e) => {
            if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
                skip.v = true;
                setTimeout(() => { skip.v = false; }, 1500);
            }
        };
        const h = (e) => { if (skip.v) return undefined; e.preventDefault(); e.returnValue = ''; return ''; };
        window.addEventListener('keydown', key, true);
        window.addEventListener('beforeunload', h);
        return () => { window.removeEventListener('keydown', key, true); window.removeEventListener('beforeunload', h); };
    }, [guardOn]);

    // ---------- measure the stage (used for crop / zoom / rotate) ----------
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return undefined;
        const upd = () => setBox({ w: el.clientWidth, h: el.clientHeight });
        upd();
        let ro;
        if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(upd); ro.observe(el); }
        window.addEventListener('resize', upd);
        return () => { if (ro) ro.disconnect(); window.removeEventListener('resize', upd); };
    }, []);

    // let the player extend under the camera cut-out / notch on phones
    useEffect(() => {
        try {
            let m = document.querySelector('meta[name=viewport]');
            if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
            const c = m.getAttribute('content') || 'width=device-width, initial-scale=1';
            if (!/viewport-fit/.test(c)) m.setAttribute('content', `${c}, viewport-fit=cover`);
        } catch (e) { /* ignore */ }
    }, []);

    // ---------- fetch the real host URL of the active server on demand ----------
    useEffect(() => {
        const key = current.key;
        if (current.url || urls[key]) return undefined;
        let dead = false;
        fetch('/api/embed-src', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fileId, key }) })
            .then((r) => r.json())
            .then((d) => {
                if (dead) return;
                if (d && d.url) setUrls((u) => ({ ...u, [key]: d.url }));
                else say('Could not load this server');
            })
            .catch(() => { if (!dead) say('Network error, try Retry'); });
        return () => { dead = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current.key, fileId, reloadKey]);

    // ---------- loading hint ----------
    useEffect(() => {
        setLoaded(false);
        setSlow(false);
        const t = setTimeout(() => setSlow(true), 12000);
        return () => clearTimeout(t);
    }, [active, reloadKey, sandboxOn]);

    // auto-switch 1: the server page did not finish loading in time
    useEffect(() => {
        if (loaded) { tried.current = new Set(); return undefined; }
        if (!prefs.autoSwitch) return undefined;
        const t = setTimeout(() => autoAdvance('did not respond'), (Number(prefs.autoSec) || 15) * 1000);
        return () => clearTimeout(t);
    }, [active, reloadKey, loaded, prefs.autoSwitch, prefs.autoSec, autoAdvance]);

    // auto-switch 2: the host itself says the video is gone / the host is down
    useEffect(() => {
        if (!prefs.autoSwitch) return undefined;
        let dead = false;
        fetch('/api/embed-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fileId, key: current.key }) })
            .then((r) => r.json())
            .then((d) => { if (!dead && d && d.ok === false) autoAdvance(d.reason || 'looks unavailable'); })
            .catch(() => { /* ignore: no answer means no switch */ });
        return () => { dead = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, reloadKey, prefs.autoSwitch]);

    // ---------- "Now playing" badge: shows on load / server change / reload, then fades out ----------
    useEffect(() => {
        setNowShow(true);
        clearTimeout(nowTimer.current);
        nowTimer.current = setTimeout(() => setNowShow(false), 4500);
        return () => clearTimeout(nowTimer.current);
    }, [active, reloadKey]);

    // When the viewer clicks inside the player (page loses focus to the iframe) hide the badge right away
    useEffect(() => {
        const onBlur = () => {
            setTimeout(() => {
                if (document.activeElement === frameRef.current) {
                    setNowShow(false);
                    setUiVisible(false);
                }
            }, 0);
        };
        window.addEventListener('blur', onBlur);
        return () => window.removeEventListener('blur', onBlur);
    }, []);

    // ---------- UI auto-hide ----------
    const wake = useCallback(() => {
        setUiVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setUiVisible(false), 3500);
    }, []);

    useEffect(() => {
        wake();
        return () => clearTimeout(hideTimer.current);
    }, [wake]);

    const showUi = uiVisible || panel !== null;

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

    useEffect(() => () => {
        clearInterval(cdTimer.current);
        clearTimeout(toastTimer.current);
    }, []);

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
        tried.current = new Set();
        setActive(i);
        setPanel(null);
        try { localStorage.setItem(LS_SERVER, servers[i].key); } catch (e) { /* ignore */ }
        if (chRef.current) {
            chRef.current.send({ type: 'broadcast', event: 'server', payload: { key: servers[i].key } });
        }
        wake();
    };

    const toggleFullscreen = async () => {
        const el = rootRef.current;
        if (!el) return;
        const d = document;
        try {
            if (!(d.fullscreenElement || d.webkitFullscreenElement)) {
                const req = el.requestFullscreen || el.webkitRequestFullscreen;
                if (!req) { say('This browser has no fullscreen for pages. Use the player\'s own button.'); return; }
                await req.call(el);
                try { if (window.innerHeight > window.innerWidth) await window.screen.orientation.lock('landscape'); } catch (e) { /* not supported */ }
            } else {
                try { window.screen.orientation.unlock(); } catch (e) { /* ignore */ }
                const ex = d.exitFullscreen || d.webkitExitFullscreen;
                if (ex) ex.call(d);
            }
        } catch (e) { say('Fullscreen is blocked here: the page that embeds this player needs allowfullscreen on its iframe'); }
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

    const leaveRoom = (silent) => {
        setRoom(null);
        setCountdown(null);
        clearInterval(cdTimer.current);
        if (silent !== true) say('You left the room');
    };

    const startTogether = () => {
        if (chRef.current) chRef.current.send({ type: 'broadcast', event: 'countdown', payload: {} });
        runCountdown();
    };

    // keyboard: F fullscreen, S servers, L lock, Esc closes panels (ignored while typing)
    const kb = useRef({});
    kb.current = {
        fullscreen: toggleFullscreen,
        servers: () => togglePanel('servers'),
        lock: () => { setLocked(true); setPanel(null); pokeLock(); },
    };
    useEffect(() => {
        const h = (e) => {
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const k = String(e.key).toLowerCase();
            if (k === 'f') kb.current.fullscreen();
            else if (k === 's') kb.current.servers();
            else if (k === 'l') kb.current.lock();
            else if (e.key === 'Escape') setPanel(null);
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    // crop / zoom / rotate applied to the player frame
    const swap = view.rot % 180 !== 0;
    const iw = swap ? box.h : box.w;
    const ih = swap ? box.w : box.h;
    let sx = 1;
    let sy = 1;
    if (iw > 0 && ih > 0) {
        const r = iw / ih;
        const a = 16 / 9;
        if (view.fit === 'fill') { sx = Math.max(r / a, a / r); sy = sx; }
        else if (view.fit === 'stretch') { if (r > a) sx = r / a; else sy = a / r; }
    }
    sx *= view.zoom;
    sy *= view.zoom;
    const transformed = view.fit !== 'fit' || view.zoom !== 1 || view.rot !== 0;
    const frameStyle = box.w > 0 ? {
        right: 'auto', bottom: 'auto', left: '50%', top: '50%', width: iw, height: ih,
        transform: `translate(-50%, -50%) rotate(${view.rot}deg) scale(${sx}, ${sy})`,
    } : undefined;

    const setLevel = (lv) => {
        if (lv !== 'off' && !prefs.block) setPref('block', true);
        setPref('sb', { ...(prefs.sb || {}), [current.key]: lv });
    };

    // the unlock button fades out after 5 s; touching the screen brings it back
    const pokeLock = () => {
        setLockShow(true);
        clearTimeout(lockTimer.current);
        lockTimer.current = setTimeout(() => setLockShow(false), 5000);
    };

    const startHold = () => {
        setHolding(true);
        clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => { setLocked(false); setHolding(false); clearTimeout(lockTimer.current); say('Unlocked'); }, 700);
    };
    const endHold = () => { clearTimeout(holdTimer.current); setHolding(false); };

    const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

    return (
        <div
            ref={rootRef}
            className={`ep-root ${prefs.anim === false ? 'ep-noanim' : ''}`}
            data-look={prefs.look || 'dark'}
            style={themeVars(prefs)}
            onMouseMove={wake}
            onTouchStart={wake}
        >
            <style>{`
                .ep-root { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; --acsoft: rgba(229,56,59,.10); --line: rgba(255,255,255,.07); position: fixed; inset: 0; z-index: 99990; background: #000; color: #e5e7eb; overflow: hidden; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
                .ep-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
                .ep-hot { position: absolute; top: 0; left: 0; right: 0; height: 48px; z-index: 15; }
                .ep-back { position: absolute; inset: 0; z-index: 18; }

                .ep-top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 8px; pointer-events: none; transition: opacity .3s, transform .3s; }
                .ep-top > * { pointer-events: auto; }
                .ep-off { opacity: 0; transform: translateY(-6px); }
                .ep-off > * { pointer-events: none !important; }

                .ep-pill, .ep-ico { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 28px; border: 1px solid var(--line); background: rgba(8,12,20,.78); color: #eceef2; border-radius: 8px; cursor: pointer; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); font-family: inherit; overflow: hidden; transition: background .2s, border-color .2s, transform .2s; }
                .ep-pill { padding: 0 10px; font-size: 11px; font-weight: 600; letter-spacing: .02em; }
                .ep-ico { width: 28px; }
                .ep-pill::after, .ep-ico::after { content: ''; position: absolute; left: 10%; right: 10%; bottom: 0; height: 1.5px; background: linear-gradient(90deg, transparent, var(--ac-hi), transparent); transform: scaleX(0); transition: transform .3s ease; }
                .ep-pill:hover, .ep-ico:hover { background: rgba(16,24,38,.94); border-color: rgba(var(--ac-rgb),.4); transform: translateY(-1px); }
                .ep-pill:hover::after, .ep-ico:hover::after { transform: scaleX(1); }
                .ep-ico:active, .ep-pill:active { transform: scale(.95); }
                .ep-ico.live { border-color: rgba(var(--ac-rgb),.6); color: var(--ac-tint); }
                .ep-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 6px rgba(var(--ac-rgb),.8); flex-shrink: 0; animation: ep-pulse 2s ease-in-out infinite; }
                @keyframes ep-pulse { 50% { opacity: .45; } }
                .ep-chev { opacity: .6; display: flex; transition: transform .25s; }
                .ep-pill:hover .ep-chev { transform: translateY(1px); }
                .ep-right { display: flex; gap: 5px; position: relative; }
                .ep-badge { position: absolute; top: -4px; right: -4px; min-width: 13px; height: 13px; padding: 0 3px; border-radius: 7px; background: var(--ac); color: #fff; font-size: 8.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
                .ep-left { position: relative; }

                .ep-panel { position: absolute; top: 34px; width: min(204px, calc(100vw - 16px)); background: linear-gradient(180deg, rgba(15,22,34,.97), rgba(7,11,18,.98)); border: 1px solid rgba(255,255,255,.09); border-top: 1px solid rgba(var(--ac-rgb),.45); border-radius: 12px; box-shadow: 0 14px 40px rgba(0,0,0,.75); overflow: hidden; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transform-origin: top left; animation: ep-pop .2s ease-out; }
                @keyframes ep-pop { from { opacity: 0; transform: translateY(-6px) scale(.97); } to { opacity: 1; transform: none; } }
                .ep-panel.left { left: 0; }
                .ep-panel.right { right: 0; width: min(200px, calc(100vw - 16px)); transform-origin: top right; }
                .ep-ph { display: flex; align-items: center; gap: 7px; padding: 7px 8px 7px 10px; border-bottom: 1px solid var(--line); }
                .ep-ph .ic { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: var(--acsoft); color: var(--ac-tint); flex-shrink: 0; }
                .ep-ph .t { font-size: 11px; font-weight: 700; color: #fff; letter-spacing: .03em; }
                .ep-ph .s { font-size: 9px; color: #8e9bb0; margin-top: 1px; max-width: 104px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-ph .n { margin-left: auto; font-size: 9px; font-weight: 700; color: #cdd5e2; background: rgba(255,255,255,.07); border-radius: 999px; padding: 1px 6px; }
                .ep-ph .x, .ep-ph .g { width: 22px; height: 22px; border: 0; border-radius: 6px; background: transparent; color: #8e9bb0; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; transition: .2s; flex-shrink: 0; }
                .ep-ph .x { margin-left: auto; }
                .ep-ph .x:hover, .ep-ph .g:hover { background: rgba(255,255,255,.08); color: #fff; }
                .ep-ph .g:hover svg { transform: rotate(60deg); }
                .ep-ph .g svg { transition: transform .35s; }

                .ep-list { max-height: min(42vh, 230px); overflow-y: auto; padding: 4px 6px 6px; display: flex; flex-direction: column; gap: 2px; scrollbar-width: thin; scrollbar-color: rgba(var(--ac-rgb),.4) transparent; }
                .ep-list::-webkit-scrollbar { width: 3px; }
                .ep-list::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
                .ep-list::-webkit-scrollbar-thumb { background: rgba(var(--ac-rgb),.4); border-radius: 999px; }

                /* line-style server rows: thin accent line, slide + underline sweep on hover */
                .ep-row { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; height: 28px; padding: 0 8px 0 10px; border: 0; background: transparent; color: #a6b1c4; border-radius: 6px; cursor: pointer; font-family: inherit; text-align: left; overflow: hidden; transition: background .2s, color .2s, padding .2s; }
                .ep-row::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; border-radius: 2px; background: var(--ac); transform: scaleY(0); transition: transform .25s ease; box-shadow: 0 0 8px rgba(var(--ac-rgb),.7); }
                .ep-row::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: 0; height: 1px; background: linear-gradient(90deg, rgba(var(--ac-rgb),.7), transparent); transform: scaleX(0); transform-origin: left; transition: transform .35s ease; }
                .ep-row:hover { background: rgba(255,255,255,.04); color: #fff; padding-left: 14px; }
                .ep-row:hover::after { transform: scaleX(1); }
                .ep-row:hover .ri { color: var(--ac-hi); transform: scale(1.15); }
                .ep-row.on { background: linear-gradient(90deg, var(--acsoft), transparent); color: #fff; }
                .ep-row.on::before { transform: scaleY(1); }
                .ep-row .ri { display: flex; color: #666b79; flex-shrink: 0; transition: .2s; }
                .ep-row.on .ri { color: var(--ac-hi); }
                .ep-row .rn { font-size: 10.5px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .ep-row .cur { font-size: 8px; font-weight: 700; letter-spacing: .12em; color: var(--ac-hi); }

                .ep-sw { width: 22px; height: 12px; border-radius: 999px; background: rgba(255,255,255,.14); position: relative; flex-shrink: 0; transition: .2s; }
                .ep-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 8px; height: 8px; border-radius: 50%; background: #fff; transition: .2s; }
                .ep-sw.on { background: var(--ac); }
                .ep-sw.on::after { left: 12px; }

                .ep-dl { display: flex; align-items: center; gap: 7px; padding: 5px 8px; margin-bottom: 2px; border-radius: 8px; background: rgba(255,255,255,.03); border: 1px solid var(--line); transition: border-color .2s; }
                .ep-dl:hover { border-color: rgba(var(--ac-rgb),.4); }
                .ep-dl a { color: var(--ac-tint); font-size: 11px; font-weight: 700; text-decoration: none; }
                .ep-dl a:hover { text-decoration: underline; }
                .ep-dl small { display: block; font-size: 8.5px; color: #7b8090; margin-top: 1px; }
                .ep-mini { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 3px 7px; border: 0; border-radius: 6px; background: rgba(255,255,255,.08); color: #e5e7eb; font-size: 9.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: .2s; }
                .ep-mini:hover { background: rgba(var(--ac-rgb),.35); }

                .ep-set { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border: 0; background: transparent; color: #d1d5db; border-radius: 7px; cursor: pointer; font-family: inherit; text-align: left; transition: .2s; }
                .ep-set:hover { background: rgba(255,255,255,.05); padding-left: 11px; }
                .ep-set .l { flex: 1; min-width: 0; }
                .ep-set .l b { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: .02em; }
                .ep-set .l i { display: block; font-style: normal; font-size: 8.5px; color: #6f7d93; margin-top: 1px; line-height: 1.3; }
                .ep-tip { padding: 6px 10px 8px; font-size: 9px; line-height: 1.45; color: #6f7d93; border-top: 1px solid var(--line); }

                .ep-pbody { padding: 9px; display: flex; flex-direction: column; gap: 7px; }
                .ep-btn { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 6px; height: 28px; border: 1px solid rgba(var(--ac-rgb),.5); border-radius: 8px; background: rgba(var(--ac-rgb),.14); color: var(--ac-tint); font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; transition: .2s; }
                .ep-btn:hover { background: rgba(var(--ac-rgb),.26); transform: translateY(-1px); }
                .ep-btn.ghost { background: rgba(255,255,255,.05); border-color: var(--line); color: #cdd5e2; }
                .ep-join { display: flex; gap: 5px; }
                .ep-join input { flex: 1; min-width: 0; height: 28px; padding: 0 9px; border-radius: 8px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #fff; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-family: inherit; outline: none; transition: border-color .2s; }
                .ep-join input:focus { border-color: rgba(var(--ac-rgb),.6); }
                .ep-join button { padding: 0 11px; height: 28px; border: 0; border-radius: 8px; background: var(--ac); color: #fff; font-weight: 700; font-size: 11px; cursor: pointer; font-family: inherit; transition: .2s; }
                .ep-join button:hover { filter: brightness(1.15); }
                .ep-code { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 6px 9px; border-radius: 9px; background: rgba(255,255,255,.04); border: 1px solid var(--line); }
                .ep-code b { font-size: 15px; letter-spacing: .2em; color: #fff; font-family: ui-monospace, monospace; }
                .ep-live { display: flex; align-items: center; gap: 6px; font-size: 10.5px; color: var(--ac-tint); }
                .ep-note { font-size: 9px; line-height: 1.45; color: #6f7d93; }

                .ep-center { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; }
                .ep-spinner { width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(255,255,255,.07); border-top-color: var(--ac); animation: ep-spin .8s linear infinite; }
                @keyframes ep-spin { to { transform: rotate(360deg); } }
                .ep-slow { pointer-events: auto; text-align: center; background: rgba(9,13,21,.93); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; font-size: 11px; color: #d1d5db; max-width: 86%; }
                .ep-slow .row { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 8px; }

                /* "Now playing" overlay: never blocks clicks, fades out by itself */
                .ep-now { position: absolute; left: 12px; bottom: 14px; z-index: 12; pointer-events: none; transition: opacity .6s ease, transform .6s ease; max-width: 70vw; }
                .ep-now.hide { opacity: 0; transform: translateY(6px); }
                .ep-now .b { display: inline-block; padding: 2px 8px; font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ac-tint); border-left: 2px solid var(--ac); background: rgba(7,11,18,.7); border-radius: 3px; }
                .ep-now .t { margin-top: 5px; font-size: 13px; font-weight: 700; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,.9); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

                .ep-cd { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,0,0,.6); backdrop-filter: blur(3px); pointer-events: none; animation: ep-fade .25s; }
                .ep-cd .big { font-size: 76px; font-weight: 800; color: #fff; text-shadow: 0 0 36px rgba(var(--ac-rgb),.8); line-height: 1; }
                .ep-cd .sm { font-size: 11px; color: #d1d5db; letter-spacing: .04em; }
                @keyframes ep-fade { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: none; } }
                .ep-toast { position: absolute; top: 44px; left: 50%; transform: translateX(-50%); z-index: 40; padding: 6px 12px; border-radius: 999px; background: rgba(9,13,21,.95); border: 1px solid var(--line); color: #f3f4f6; font-size: 10.5px; font-weight: 600; pointer-events: none; white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis; }


                /* compact overrides */
                .ep-top { padding-top: max(8px, env(safe-area-inset-top)); padding-left: max(8px, env(safe-area-inset-left)); padding-right: max(8px, env(safe-area-inset-right)); }
                .ep-panel { width: min(176px, calc(100vw - 16px)); }
                .ep-panel.right { width: min(192px, calc(100vw - 16px)); }
                .ep-list { max-height: min(40vh, 190px); padding: 3px 5px 5px; gap: 1px; }
                .ep-row { height: 23px; padding: 0 6px 0 9px; gap: 7px; }
                .ep-row .rn { font-size: 9.5px; letter-spacing: .08em; }
                .ep-row .ri svg { width: 9px; height: 9px; }
                .ep-ph { padding: 6px 7px 6px 9px; }
                .ep-ph .s { max-width: 88px; }
                .ep-dl { height: 24px; padding: 0 4px 0 8px; margin-bottom: 3px; gap: 4px; }
                .ep-dl a { flex: 1; display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--ac-tint); }
                .ep-dl a svg { width: 11px; height: 11px; }
                .ep-mini { margin-left: 0; padding: 3px 6px; }
                .ep-seg { display: flex; gap: 3px; }
                .ep-seg button { flex: 1; height: 24px; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.04); color: #b6bac6; font-size: 10px; font-weight: 600; cursor: pointer; font-family: inherit; transition: .2s; }
                .ep-seg button:hover { background: rgba(255,255,255,.09); color: #fff; transform: translateY(-1px); }
                .ep-seg button.on { border-color: rgba(var(--ac-rgb),.6); background: var(--acsoft); color: var(--ac-tint); }
                .ep-rng { display: flex; flex-direction: column; gap: 4px; font-size: 10px; color: #a6b1c4; }
                .ep-rng b { color: #fff; float: right; font-weight: 600; }
                .ep-rng input { width: 100%; accent-color: var(--ac); }

                /* v4: roomier rows, responsive widths, no text selection, fresh top scrim */
                .ep-root, .ep-root * { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
                .ep-join input { -webkit-user-select: text; user-select: text; }
                .ep-top::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 72px; background: linear-gradient(180deg, rgba(0,0,0,.55), transparent); pointer-events: none; z-index: -1; }
                .ep-panel { width: clamp(190px, 46vw, 244px); max-width: calc(100vw - 16px); }
                .ep-panel.right { width: clamp(196px, 48vw, 252px); }
                .ep-list { max-height: min(48vh, 270px); padding: 5px 6px 7px; gap: 2px; }
                .ep-ph { gap: 10px; padding: 9px 10px 9px 11px; }
                .ep-ph .t { font-size: 12px; }
                .ep-ph .s { font-size: 9.5px; max-width: clamp(90px, 28vw, 130px); }
                .ep-ph .n { margin-left: auto; font-size: 10px; padding: 2px 7px; }
                .ep-ph .g, .ep-ph .x { width: 26px; height: 26px; }
                .ep-ph .n + .g { margin-left: 8px; }
                .ep-row { height: 31px; padding: 0 9px 0 12px; gap: 9px; }
                .ep-row .rn { font-size: 11px; letter-spacing: .08em; }
                .ep-row .ri svg { width: 11px; height: 11px; }
                .ep-row .cur { font-size: 8.5px; }
                .ep-row:hover { padding-left: 16px; }
                .ep-dl { height: 30px; padding: 0 5px 0 10px; margin-bottom: 4px; }
                .ep-dl a { font-size: 10.5px; }
                .ep-dl a svg { width: 12px; height: 12px; }
                .ep-set .l b { font-size: 11px; }
                .ep-set .l i { font-size: 9px; }
                .ep-set { padding: 7px 9px; }
                .ep-seg button { height: 28px; font-size: 10.5px; }
                .ep-pill { height: 30px; font-size: 11.5px; }
                .ep-ico { width: 30px; height: 30px; }
                .ep-panel { top: 38px; }
                @media (max-height: 380px) {
                    .ep-list { max-height: 34vh; }
                    .ep-row { height: 27px; }
                    .ep-ph { padding: 6px 8px; }
                }

                /* v5: scrollable panels on small screens, green = live/on status, red = brand accent */
                .ep-panel { display: flex; flex-direction: column; max-height: calc(100vh - 46px); max-height: calc(100dvh - 46px); }
                .ep-panel > * { flex-shrink: 0; }
                .ep-panel > .ep-list, .ep-panel > .ep-scroll, .ep-panel > .ep-pbody { flex-shrink: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(var(--ac-rgb),.4) transparent; }
                .ep-scroll::-webkit-scrollbar, .ep-pbody::-webkit-scrollbar { width: 3px; }
                .ep-scroll::-webkit-scrollbar-thumb, .ep-pbody::-webkit-scrollbar-thumb { background: rgba(var(--ac-rgb),.4); border-radius: 999px; }
                .ep-list { max-height: min(60vh, 320px); max-height: min(60dvh, 320px); }
                .ep-ph { padding: 9px 14px 9px 12px; }
                .ep-ph .n + .g { margin-left: 8px; margin-right: 2px; }
                .ep-row { height: 34px; padding: 0 10px 0 13px; box-shadow: inset 0 -1px 0 rgba(255,255,255,.045); }
                .ep-row:last-child { box-shadow: none; }
                .ep-row .ri { width: 20px; height: 20px; border-radius: 50%; background: rgba(255,255,255,.05); align-items: center; justify-content: center; }
                .ep-row.on .ri { background: rgba(var(--ac-rgb),.2); }
                .ep-row .cur { display: inline-flex; align-items: center; gap: 5px; color: #4ade80; font-weight: 700; letter-spacing: .12em; }
                .ep-row .cur::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.9); animation: ep-pulse 2s ease-in-out infinite; }
                .ep-dl { height: 32px; }
                .ep-dot { background: #22c55e; box-shadow: 0 0 7px rgba(34,197,94,.85); }
                .ep-live { color: #86efac; }
                .ep-ico.live { border-color: rgba(34,197,94,.6); color: #86efac; }
                .ep-badge { background: #16a34a; }
                .ep-sw.on { background: #22c55e; }
                .ep-lv { padding: 8px 8px 6px; margin-top: 4px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
                .ep-lvl { font-size: 9.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #a6b1c4; }
                @media (max-height: 380px) {
                    .ep-row { height: 28px; }
                    .ep-set { padding: 5px 8px; }
                    .ep-set .l i { display: none; }
                    .ep-tip { display: none; }
                }

                /* v6: container-aware sizes, glass panels, darker muted red, rows that unfold one by one */
                .ep-root { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; --acsoft: rgba(229,56,59,.10); container-type: size; }
                .ep-pill, .ep-ico { background: rgba(7,11,18,.5); }
                .ep-panel { width: clamp(168px, 44cqw, 236px); max-width: calc(100cqw - 16px); max-height: calc(100cqh - 48px); background: linear-gradient(180deg, rgba(13,19,30,.6), rgba(7,10,17,.74)); border: 1px solid rgba(255,255,255,.08); border-top-color: rgba(var(--ac-rgb),.45); backdrop-filter: blur(22px) saturate(1.2); -webkit-backdrop-filter: blur(22px) saturate(1.2); box-shadow: 0 12px 34px rgba(0,0,0,.55); transform-origin: top center; animation: ep-unfold .32s cubic-bezier(.2,.8,.2,1) both; }
                .ep-panel.right { width: clamp(176px, 46cqw, 244px); }
                @keyframes ep-unfold { from { opacity: 0; transform: perspective(600px) rotateX(-18deg) scaleY(.6); } to { opacity: 1; transform: none; } }
                .ep-list { --rh: 34px; perspective: 700px; max-height: min(calc(100cqh - 118px), 320px); }
                .ep-row { height: var(--rh); transform-origin: top center; animation: ep-fold .42s cubic-bezier(.22,.9,.28,1) backwards; animation-delay: calc(var(--i, 0) * 70ms + 60ms); }
                .ep-dl { --rh: 32px; overflow: hidden; transform-origin: top center; animation: ep-fold .42s cubic-bezier(.22,.9,.28,1) backwards; animation-delay: 60ms; }
                @keyframes ep-fold { 0% { height: 0; opacity: 0; transform: rotateX(-90deg); } 55% { opacity: 1; } 100% { height: var(--rh); opacity: 1; transform: none; } }
                .ep-scroll .ep-set { transform-origin: top center; overflow: hidden; animation: ep-fold2 .38s cubic-bezier(.22,.9,.28,1) backwards; animation-delay: calc(var(--i, 0) * 55ms + 60ms); }
                @keyframes ep-fold2 { 0% { max-height: 0; opacity: 0; transform: rotateX(-90deg); } 100% { max-height: 72px; opacity: 1; transform: none; } }
                .ep-row .rn { font-size: 11.5px; }
                .ep-row .ri { width: 22px; height: 22px; }
                @media (pointer: coarse) {
                    .ep-list { --rh: 40px; }
                    .ep-row .rn { font-size: 12px; }
                    .ep-ico { width: 34px; height: 34px; }
                    .ep-pill { height: 34px; }
                    .ep-set { padding: 9px 10px; }
                }
                @container (max-height: 300px) {
                    .ep-ph .s { display: none; }
                    .ep-ph { padding: 6px 12px 6px 10px; }
                    .ep-list { --rh: 32px; }
                    .ep-dl { --rh: 28px; height: 28px; }
                    .ep-tip, .ep-set .l i { display: none; }
                    .ep-panel { top: 36px; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .ep-panel, .ep-row, .ep-dl, .ep-scroll .ep-set { animation: none; }
                }

                /* v7: header never clips the gear, faster unfold, lock screen */
                .ep-ph > div:not(.ic) { flex: 1; min-width: 0; }
                .ep-ph .s { max-width: none; }
                .ep-ph .n { margin-left: 0; flex-shrink: 0; }
                .ep-ph .n + .g { margin-left: 2px; }
                .ep-ph .g, .ep-ph .x { flex-shrink: 0; }
                .ep-panel { animation-duration: .2s; }
                .ep-row { animation-duration: .26s; animation-delay: calc(var(--i, 0) * 32ms + 20ms); }
                .ep-dl { animation-duration: .26s; animation-delay: 20ms; }
                .ep-scroll .ep-set { animation-duration: .24s; animation-delay: calc(var(--i, 0) * 28ms + 20ms); }
                .ep-lock { position: absolute; inset: 0; z-index: 14; background: transparent; touch-action: none; cursor: not-allowed; }
                .ep-lockbtn { position: absolute; right: max(12px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(7,11,18,.55); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: #d7dae2; font-family: inherit; font-size: 10.5px; font-weight: 600; letter-spacing: .04em; cursor: pointer; overflow: hidden; touch-action: none; }
                .ep-lockbtn::before { content: ''; position: absolute; inset: 0; background: rgba(var(--ac-rgb),.55); transform: scaleX(0); transform-origin: left; }
                .ep-lockbtn.hold::before { transform: scaleX(1); transition: transform .7s linear; }
                .ep-lockbtn > * { position: relative; display: flex; }

                /* v8: lock button hides after 5s, any touch shows it again */
                .ep-lockbtn { height: 38px; padding: 0 16px 0 6px; gap: 10px; border-radius: 999px; background: linear-gradient(180deg, rgba(18,27,42,.74), rgba(7,11,18,.82)); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 8px 24px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06); font-size: 11px; letter-spacing: .07em; text-transform: uppercase; color: #e6e8ee; opacity: 0; pointer-events: none; transform: translateY(8px); transition: opacity .3s ease, transform .3s ease; }
                .ep-lockbtn.show { opacity: 1; pointer-events: auto; transform: none; }
                .ep-lockbtn .lic { width: 26px; height: 26px; border-radius: 50%; background: rgba(var(--ac-rgb),.28); align-items: center; justify-content: center; color: var(--ac-tint); transition: background .2s; }
                .ep-lockbtn.hold .lic { background: rgba(var(--ac-rgb),.65); }

                /* v9: compact on small players (phones, small embedded boxes) */
                @container (max-width: 520px) {
                    .ep-panel { width: clamp(150px, 54cqw, 196px); top: 32px; border-radius: 10px; }
                    .ep-panel.right { width: clamp(156px, 56cqw, 204px); }
                    .ep-ph { padding: 5px 8px 5px 9px; gap: 6px; }
                    .ep-ph .ic, .ep-ph .s { display: none; }
                    .ep-ph .t { font-size: 10px; white-space: nowrap; letter-spacing: .04em; }
                    .ep-ph .n { font-size: 8.5px; padding: 1px 5px; }
                    .ep-ph .g, .ep-ph .x { width: 20px; height: 20px; }
                    .ep-ph .g svg { width: 12px; height: 12px; }
                    .ep-list { --rh: 29px; padding: 3px 4px 5px; max-height: calc(100cqh - 84px); }
                    .ep-row { padding: 0 6px 0 10px; gap: 7px; }
                    .ep-row .rn { font-size: 10px; letter-spacing: .06em; }
                    .ep-row .ri { width: 17px; height: 17px; }
                    .ep-row .ri svg { width: 8px; height: 8px; }
                    .ep-row .cur { font-size: 7.5px; }
                    .ep-dl { --rh: 26px; height: 26px; }
                    .ep-dl a { font-size: 9.5px; }
                    .ep-set { padding: 5px 8px; }
                    .ep-set .l b { font-size: 10px; }
                    .ep-lv { padding: 6px 6px 4px; }
                    .ep-pill { height: 28px; font-size: 10.5px; padding: 0 9px; }
                    .ep-ico { width: 28px; height: 28px; }
                }

                /* v10: rows never get squashed (old phones), explicit edges for older browsers, icon alignment */
                .ep-list > *, .ep-pbody > *, .ep-scroll > * { flex-shrink: 0; }
                .ep-root, .ep-frame, .ep-back, .ep-center, .ep-lock, .ep-cd { top: 0; right: 0; bottom: 0; left: 0; }
                .ep-now .b { display: inline-flex; align-items: center; gap: 6px; }
                .ep-seg button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; }
                @media (max-width: 480px) {
                    .ep-now .t { font-size: 12px; }
                    .ep-cd .big { font-size: 60px; }
                }

                /* v11: themes, panel looks, loaders, reduced motion */
                .ep-root[data-look="glass"] .ep-panel { background: rgba(18,22,30,.52) !important; -webkit-backdrop-filter: blur(18px) saturate(1.3); backdrop-filter: blur(18px) saturate(1.3); }
                .ep-root[data-look="glass"] .ep-pill, .ep-root[data-look="glass"] .ep-ico { background: rgba(255,255,255,.09) !important; -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
                .ep-root[data-look="black"] .ep-panel { background: #000 !important; border-color: rgba(255,255,255,.16); }
                .ep-root[data-look="black"] .ep-pill, .ep-root[data-look="black"] .ep-ico { background: #000 !important; }

                .ep-noanim .ep-panel, .ep-noanim .ep-row, .ep-noanim .ep-set, .ep-noanim .ep-pill, .ep-noanim .ep-ico, .ep-noanim .ep-top,
                .ep-noanim .ep-now, .ep-noanim .ep-toast, .ep-noanim .ep-seg button, .ep-noanim .ep-sw, .ep-noanim .ep-sw::after, .ep-noanim .ep-slow { animation: none !important; transition: none !important; }

                .ep-ld { display: flex; align-items: center; justify-content: center; min-height: 40px; }
                .ep-ld-dots span { width: 9px; height: 9px; margin: 0 3px; border-radius: 50%; background: var(--ac); animation: ep-bounce 1s infinite ease-in-out; }
                .ep-ld-dots span:nth-child(2) { animation-delay: .15s; }
                .ep-ld-dots span:nth-child(3) { animation-delay: .3s; }
                @keyframes ep-bounce { 0%, 80%, 100% { transform: scale(.4); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }
                .ep-ld-bars span { width: 4px; height: 26px; margin: 0 2px; border-radius: 2px; background: var(--ac); animation: ep-bar 1s infinite ease-in-out; }
                .ep-ld-bars span:nth-child(2) { animation-delay: .1s; }
                .ep-ld-bars span:nth-child(3) { animation-delay: .2s; }
                .ep-ld-bars span:nth-child(4) { animation-delay: .3s; }
                .ep-ld-bars span:nth-child(5) { animation-delay: .4s; }
                @keyframes ep-bar { 0%, 40%, 100% { transform: scaleY(.35); } 20% { transform: scaleY(1); } }
                .ep-ld-pulse i { width: 38px; height: 38px; border-radius: 50%; background: var(--ac); animation: ep-pulse2 1.3s infinite ease-out; }
                @keyframes ep-pulse2 { 0% { transform: scale(.3); opacity: .9; } 100% { transform: scale(1.3); opacity: 0; } }
                .ep-ld-orbit { position: relative; width: 44px; height: 44px; }
                .ep-ld-orbit i { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--ac); animation: ep-spin 1s linear infinite; }
                .ep-ld-orbit i + i { top: 8px; right: 8px; bottom: 8px; left: 8px; border-top-color: var(--ac-hi); animation-duration: 1.5s; animation-direction: reverse; }

                .ep-sws { display: flex; flex-wrap: wrap; gap: 8px; padding: 2px 2px 4px; }
                .ep-sw2 { position: relative; width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: 2px solid rgba(255,255,255,.14); cursor: pointer; padding: 0; overflow: hidden; }
                .ep-sw2.on { border-color: #fff; box-shadow: 0 0 0 2px rgba(var(--ac-rgb), .55); }
                .ep-sw2.custom { background: conic-gradient(#e5383b, #f59e0b, #10b981, #06b6d4, #8b5cf6, #ec4899, #e5383b); }
                .ep-sw2 input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }
                .ep-seg.wrap { flex-wrap: wrap; }
                .ep-seg.wrap button { flex: 1 1 28%; }
                .ep-lvl.sp { margin-top: 8px; }
            `}</style>

            <iframe
                ref={frameRef}
                key={`${curUrl}-${reloadKey}-${level}`}
                style={frameStyle}
                className="ep-frame"
                src={curUrl || 'about:blank'}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                // blocks pop-up / new-tab ads and redirects (no allow-popups, no allow-top-navigation)
                sandbox={level === 'off' ? undefined : `allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock allow-pointer-lock${level === 'relaxed' ? ' allow-popups allow-modals' : ''}`}
                webkitallowfullscreen="true"
                mozallowfullscreen="true"
                referrerPolicy="origin"
                onLoad={() => { if (curUrl) { setLoaded(true); setSlow(false); } }}
            />

            {/* When the UI is hidden the thin top strip wakes it up (the iframe swallows mouse events) */}
            {!showUi && <div className="ep-hot" onMouseEnter={wake} onTouchStart={wake} />}

            {/* click outside closes any open panel */}
            {panel !== null && <div className="ep-back" onClick={() => setPanel(null)} />}

            {!loaded && (
                <div className="ep-center">
                    <Loader kind={prefs.loader} />
                    {slow && (
                        <div className="ep-slow">
                            {current.name} is taking a while to load.
                            <div className="row">
                                {servers.length > 1 && (
                                    <button type="button" className="ep-pill" onClick={() => choose((active + 1) % servers.length)}>Next server</button>
                                )}
                                <button type="button" className="ep-pill" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
                                {sandboxOn && can('block') && (
                                    <button
                                        type="button"
                                        className="ep-pill"
                                        onClick={() => setLevel(level === 'strict' ? 'relaxed' : 'off')}
                                        title="Some players refuse to run inside a strict sandbox"
                                    >
                                        {level === 'strict' ? 'Try relaxed blocker' : 'Blocker off + redirect guard'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* "Now playing" badge + title (fades out automatically, never blocks the player controls) */}
            {prefs.title && (
                <div className={`ep-now ${nowShow ? '' : 'hide'}`}>
                    <span className="b">{Ico.play} Now playing on {current.name}</span>
                    {title && <div className="t">{title}</div>}
                </div>
            )}

            {countdown !== null && (
                <div className="ep-cd">
                    <div className="big">{countdown}</div>
                    <div className="sm">{countdown === 'PLAY!' ? 'Hit Play now!' : 'Get ready — everyone press Play together'}</div>
                </div>
            )}

            {locked && (
                <div className="ep-lock" onPointerDown={pokeLock}>
                    <button
                        type="button"
                        className={`ep-lockbtn ${lockShow ? 'show' : ''} ${holding ? 'hold' : ''}`}
                        title="Hold to unlock"
                        onClick={(e) => e.stopPropagation()}
                        onContextMenu={(e) => e.preventDefault()}
                        onPointerDown={startHold}
                        onPointerUp={endHold}
                        onPointerLeave={endHold}
                        onPointerCancel={endHold}
                    >
                        <span className="lic">{Ico.lock}</span><span>Hold to unlock</span>
                    </button>
                </div>
            )}

            {toast && <div className="ep-toast">{toast}</div>}

            <div className={`ep-top ${showUi ? '' : 'ep-off'}`}>
                {/* left: server list */}
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
                                    <div className="s">{title || 'Select server'}</div>
                                </div>
                                <span className="n">{servers.length}</span>
                                <button type="button" className="g" title="Settings" onClick={() => setPanel('settings')}>{Ico.gear}</button>
                            </div>

                            <div className="ep-list">
                                {prefs.download && downloadHref && (
                                    <div className="ep-dl">
                                        <a href={downloadHref} target="_blank" rel="noopener noreferrer">{Ico.link} Download</a>
                                        <button
                                            type="button"
                                            className="ep-mini"
                                            title="Copy download link"
                                            onClick={() => copy(`${window.location.origin}${downloadHref}`, 'Download link copied')}
                                        >
                                            {Ico.copy}
                                        </button>
                                    </div>
                                )}

                                {servers.map((s, i) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        style={{ '--i': i + 1 }}
                                        className={`ep-row ${i === active ? 'on' : ''}`}
                                        onClick={() => choose(i)}
                                    >
                                        <span className="ri">{Ico.play}</span>
                                        <span className="rn">{s.name}</span>
                                        {i === active && <span className="cur">LIVE</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {panel === 'settings' && (
                        <div className="ep-panel left">
                            <div className="ep-ph">
                                <button type="button" className="g" title="Back" onClick={() => setPanel('servers')}>{Ico.back}</button>
                                <div className="t">Settings</div>
                                <button type="button" className="x" onClick={() => setPanel(null)}>{Ico.x}</button>
                            </div>
                            <div className="ep-scroll" style={{ padding: 4 }}>
                                {[
                                    ['block', 'Pop-up blocker', 'Sandbox: blocks new tabs & redirects'],
                                    ['guard', 'Redirect guard', 'Asks before this page is left or reloaded'],
                                    ['download', 'Download link', 'Show in server menu'],
                                    ['fullscreen', 'Fullscreen button', 'Show on top bar'],
                                    ['lock', 'Lock button', 'Show on top bar'],
                                    ['party', 'Watch Party', 'Show on top bar'],
                                    ['title', 'Title overlay', 'Now playing badge'],
                                    ['autoSwitch', 'Auto-switch server', 'Moves on if a server does not work'],
                                ].filter(([key]) => can(key)).map(([key, label, desc], idx) => (
                                    <button
                                        key={key}
                                        type="button"
                                        style={{ '--i': idx }}
                                        className="ep-set"
                                        onClick={() => {
                                            const nextVal = !prefs[key];
                                            setPref(key, nextVal);
                                            if (key === 'party' && !nextVal) leaveRoom(true);
                                            if (key === 'autoSwitch') tried.current = new Set();
                                            if (key === 'block' && nextVal) setPref('sb', {});
                                        }}
                                    >
                                        <span className="l"><b>{label}</b><i>{desc}</i></span>
                                        <span className={`ep-sw ${prefs[key] ? 'on' : ''}`} />
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="ep-set"
                                    style={{ '--i': 7 }}
                                    onClick={() => { setLocked(true); setPanel(null); pokeLock(); say('Screen locked. Touch the screen to show the unlock button'); }}
                                >
                                    <span className="l"><b>Lock screen</b><i>Touches can't reach the player</i></span>
                                    <span style={{ opacity: 0.7, display: 'flex' }}>{Ico.lock}</span>
                                </button>
                                {can('block') && (
                                <div className="ep-lv">
                                    <div className="ep-lvl">Protection · {current.name}</div>
                                    <div className="ep-seg">
                                        {[['strict', 'Strict'], ['relaxed', 'Relaxed'], ['off', 'Off']].map(([k, l]) => (
                                            <button key={k} type="button" className={level === k ? 'on' : ''} onClick={() => setLevel(k)}>{l}</button>
                                        ))}
                                    </div>
                                    <div className="ep-note">Strict blocks pop-ups and redirects. Relaxed allows pop-ups but still blocks page redirects. Off: only the redirect guard helps. Saved per server. Vidara starts Off.</div>
                                </div>
                                )}
                                {prefs.autoSwitch && can('autoSwitch') && (
                                    <div className="ep-lv">
                                        <div className="ep-lvl">Wait before switching</div>
                                        <div className="ep-seg">
                                            {WAITS.map(([k, l]) => (
                                                <button key={k} type="button" className={Number(prefs.autoSec) === k ? 'on' : ''} onClick={() => setPref('autoSec', k)}>{l}</button>
                                            ))}
                                        </div>
                                        <div className="ep-note">If a server has not loaded after this time, or its host says the video is removed, the next server opens by itself. It cannot see inside the video, so a video that loads but will not play is not detected.</div>
                                    </div>
                                )}
                                {(can('theme') || can('look') || can('loader') || can('anim')) && (
                                <button type="button" className="ep-set" onClick={() => setPanel('look')}>
                                    <span className="l"><b>Appearance</b><i>Theme, style, loader, motion</i></span>
                                    <span className="ep-sw2 on" style={{ width: 14, height: 14, background: 'var(--ac)', borderWidth: 1 }} />
                                </button>
                                )}
                                <button type="button" className="ep-set" onClick={() => setPanel('view')}>
                                    <span className="l"><b>Frame{transformed ? ' •' : ''}</b><i>Fit, zoom &amp; rotate</i></span>
                                    <span style={{ opacity: 0.6, display: 'flex' }}>{Ico.next}</span>
                                </button>
                            </div>
                            <div className="ep-tip">
                                Ads drawn inside the video itself need a browser ad blocker (uBlock Origin, Brave, AdGuard). Keys: F fullscreen, S servers, L lock.
                            </div>
                        </div>
                    )}

                    {panel === 'look' && (
                        <div className="ep-panel left">
                            <div className="ep-ph">
                                <button type="button" className="g" title="Back" onClick={() => setPanel('settings')}>{Ico.back}</button>
                                <div className="t">Appearance</div>
                                <button type="button" className="x" onClick={() => setPanel(null)}>{Ico.x}</button>
                            </div>
                            <div className="ep-pbody">
                                {can('theme') && (<>
                                <div className="ep-lvl">Theme colour</div>
                                <div className="ep-sws">
                                    {THEMES.map((t) => (
                                        <button key={t.id} type="button" title={t.name} aria-label={t.name} className={`ep-sw2 ${prefs.theme === t.id ? 'on' : ''}`} style={{ background: t.ac }} onClick={() => setPref('theme', t.id)} />
                                    ))}
                                    <label className={`ep-sw2 custom ${prefs.theme === 'custom' ? 'on' : ''}`} title="Custom colour">
                                        <input
                                            type="color"
                                            value={/^#[0-9a-f]{6}$/i.test(prefs.customColor || '') ? prefs.customColor : '#e5383b'}
                                            onChange={(e) => patchPrefs({ theme: 'custom', customColor: e.target.value })}
                                        />
                                    </label>
                                </div>
                                </>)}
                                {can('look') && (<>
                                <div className="ep-lvl sp">Panel style</div>
                                <div className="ep-seg">
                                    {LOOKS.map(([k, l]) => (
                                        <button key={k} type="button" className={(prefs.look || 'dark') === k ? 'on' : ''} onClick={() => setPref('look', k)}>{l}</button>
                                    ))}
                                </div>
                                </>)}
                                {can('loader') && (<>
                                <div className="ep-lvl sp">Loading animation</div>
                                <div className="ep-seg wrap">
                                    {LOADERS.map(([k, l]) => (
                                        <button key={k} type="button" className={(prefs.loader || 'ring') === k ? 'on' : ''} onClick={() => setPref('loader', k)}>{l}</button>
                                    ))}
                                </div>
                                <div className="ep-ld" style={{ minHeight: 52 }}><Loader kind={prefs.loader} /></div>
                                </>)}
                                {can('anim') && (
                                <button type="button" className="ep-set" onClick={() => setPref('anim', prefs.anim === false)}>
                                    <span className="l"><b>Animations</b><i>Panel and button motion</i></span>
                                    <span className={`ep-sw ${prefs.anim !== false ? 'on' : ''}`} />
                                </button>
                                )}
                                <button
                                    type="button"
                                    className="ep-btn ghost"
                                    onClick={resetLook}
                                >
                                    Reset to default
                                </button>
                            </div>
                        </div>
                    )}

                    {panel === 'view' && (
                        <div className="ep-panel left">
                            <div className="ep-ph">
                                <button type="button" className="g" title="Back" onClick={() => setPanel('settings')}>{Ico.back}</button>
                                <div className="t">Frame</div>
                                <button type="button" className="x" onClick={() => setPanel(null)}>{Ico.x}</button>
                            </div>
                            <div className="ep-pbody">
                                <div className="ep-seg">
                                    {[['fit', 'Fit'], ['fill', 'Fill'], ['stretch', 'Stretch']].map(([k, l]) => (
                                        <button key={k} type="button" className={view.fit === k ? 'on' : ''} onClick={() => setView((v) => ({ ...v, fit: k }))}>{l}</button>
                                    ))}
                                </div>
                                <label className="ep-rng">
                                    <span>Zoom <b>{Math.round(view.zoom * 100)}%</b></span>
                                    <input type="range" min="1" max="2" step="0.05" value={view.zoom} onChange={(e) => setView((v) => ({ ...v, zoom: Number(e.target.value) }))} />
                                </label>
                                <div className="ep-seg">
                                    <button type="button" onClick={() => setView((v) => ({ ...v, rot: (v.rot + 270) % 360 }))}>{Ico.rotl} 90°</button>
                                    <button type="button" onClick={() => setView((v) => ({ ...v, rot: (v.rot + 90) % 360 }))}>{Ico.rotr} 90°</button>
                                    <button type="button" onClick={() => setView({ fit: 'fit', zoom: 1, rot: 0 })}>Reset</button>
                                </div>
                                <div className="ep-note">Fill crops the black bars. Stretch pulls the picture to the screen. Rotate helps when auto-rotate is off. Player controls move with the frame.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* right: party, fullscreen */}
                <div className="ep-right">
                    {prefs.party && (
                        <button type="button" className={`ep-ico ${room ? 'live' : ''}`} title="Watch Party" onClick={() => togglePanel('party')}>
                            {Ico.users}
                            {room && peers > 0 && <span className="ep-badge">{peers}</span>}
                        </button>
                    )}
                    {prefs.lock && (
                        <button
                            type="button"
                            className="ep-ico"
                            title="Lock screen"
                            onClick={() => { setLocked(true); setPanel(null); pokeLock(); say('Screen locked. Touch the screen to show the unlock button'); }}
                        >
                            {Ico.lock}
                        </button>
                    )}
                    {prefs.fullscreen && (
                        <button type="button" className="ep-ico" title="Fullscreen" onClick={toggleFullscreen}>{Ico.full}</button>
                    )}

                    {panel === 'party' && (
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
                                        <div className="ep-note">Create a room and share the code or link. Everyone must open this same video page.</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ep-code">
                                            <b>{room}</b>
                                            <button type="button" className="ep-mini" onClick={() => copy(roomLink(room), 'Room link copied')}>{Ico.copy} Link</button>
                                        </div>
                                        <div className="ep-live"><span className="ep-dot" /> {Math.max(peers, 1)} watching</div>
                                        <button type="button" className="ep-btn" onClick={startTogether}>{Ico.play} Start together (3-2-1)</button>
                                        <button type="button" className="ep-btn ghost" onClick={() => leaveRoom()}>Leave room</button>
                                        <div className="ep-note">Switching server changes it for everyone. Play / pause / seek are controlled by each host player, so press Play yourself after the countdown.</div>
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
