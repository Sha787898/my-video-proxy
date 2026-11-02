'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// servers: [{ key, name, url }]   title: ফাইলের নাম   downloadHref: ডাউনলোড পেজের লিংক
export default function EmbedPlayer({ servers, title, downloadHref }) {
    const storageKey = 'ms_player_server';

    const [active, setActive] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [slow, setSlow] = useState(false);
    const [uiVisible, setUiVisible] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);

    const hideTimer = useRef(null);
    const rootRef = useRef(null);

    const current = servers[active] || servers[0];

    // শেষবার যে সার্ভারে দেখেছেন সেটা মনে রাখি
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            const idx = servers.findIndex((s) => s.key === saved);
            if (idx > 0) setActive(idx);
        } catch (e) { /* ignore */ }
    }, [servers]);

    // সার্ভার বদলালে লোডিং আবার শুরু। ১২ সেকেন্ডেও না খুললে "অন্য সার্ভার চেষ্টা করুন" দেখাই
    useEffect(() => {
        setLoaded(false);
        setSlow(false);
        const t1 = setTimeout(() => setSlow(true), 12000);
        return () => clearTimeout(t1);
    }, [active, reloadKey]);

    // কিছুক্ষণ মাউস না নাড়ালে বাটনগুলো লুকিয়ে যায়
    const wake = useCallback(() => {
        setUiVisible(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            setMenuOpen((open) => {
                if (!open) setUiVisible(false);
                return open;
            });
        }, 3500);
    }, []);

    useEffect(() => {
        wake();
        return () => clearTimeout(hideTimer.current);
    }, [wake]);

    const choose = (i) => {
        setActive(i);
        setMenuOpen(false);
        try { localStorage.setItem(storageKey, servers[i].key); } catch (e) { /* ignore */ }
        wake();
    };

    const next = () => choose((active + 1) % servers.length);

    const toggleFullscreen = () => {
        const el = rootRef.current;
        if (!el) return;
        try {
            if (!document.fullscreenElement) el.requestFullscreen && el.requestFullscreen();
            else document.exitFullscreen && document.exitFullscreen();
        } catch (e) { /* ignore */ }
    };

    return (
        <div
            ref={rootRef}
            className="ep-root"
            onMouseMove={wake}
            onTouchStart={wake}
            onClick={() => setMenuOpen(false)}
        >
            <style>{`
                .ep-root { position: fixed; inset: 0; z-index: 99990; background: #000; color: #f1f5f9; overflow: hidden; font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
                .ep-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
                .ep-top { position: absolute; top: 0; left: 0; right: 0; z-index: 20; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; padding: 12px; background: linear-gradient(180deg, rgba(0,0,0,.8), transparent); transition: opacity .35s; pointer-events: none; }
                .ep-top > * { pointer-events: auto; }
                .ep-hidden { opacity: 0; pointer-events: none !important; }
                .ep-hidden > * { pointer-events: none !important; }
                .ep-btn { display: inline-flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; background: rgba(8,10,20,.75); border: 1px solid rgba(255,255,255,.18); color: #fff; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; backdrop-filter: blur(14px); transition: .2s; font-family: inherit; }
                .ep-btn:hover { background: rgba(99,102,241,.35); border-color: #6366f1; }
                .ep-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; flex-shrink: 0; }
                .ep-left { position: relative; }
                .ep-menu { position: absolute; top: 42px; left: 0; width: 240px; max-height: 65vh; overflow-y: auto; padding: 8px; background: rgba(10,13,26,.97); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; box-shadow: 0 14px 40px rgba(0,0,0,.7); }
                .ep-menu-head { font-size: 10px; letter-spacing: .09em; color: #94a3b8; text-transform: uppercase; font-weight: 700; padding: 4px 8px 8px; }
                .ep-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 0; background: transparent; color: #94a3b8; border-radius: 8px; font-size: 13px; cursor: pointer; text-align: left; font-family: inherit; }
                .ep-item:hover { background: rgba(255,255,255,.08); color: #fff; }
                .ep-item.on { background: rgba(99,102,241,.16); color: #a5b4fc; font-weight: 600; }
                .ep-item .d { width: 6px; height: 6px; border-radius: 50%; background: #64748b; }
                .ep-item.on .d { background: #818cf8; }
                .ep-item .tag { margin-left: auto; font-size: 10px; color: #818cf8; }
                .ep-bottom { position: absolute; left: 0; right: 0; bottom: 0; z-index: 20; padding: 28px 16px 14px; background: linear-gradient(0deg, rgba(0,0,0,.75), transparent); pointer-events: none; transition: opacity .35s; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
                .ep-bottom > * { pointer-events: auto; }
                .ep-title { font-size: 15px; font-weight: 700; text-shadow: 0 2px 8px rgba(0,0,0,.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70vw; pointer-events: none; }
                .ep-badge { display: inline-block; margin-bottom: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #fca5a5; border: 1px solid rgba(239,68,68,.45); background: rgba(239,68,68,.12); border-radius: 5px; }
                .ep-center { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; pointer-events: none; }
                .ep-spinner { width: 46px; height: 46px; border-radius: 50%; border: 3px solid rgba(255,255,255,.1); border-top-color: #ef4444; border-right-color: rgba(239,68,68,.4); animation: ep-spin .8s linear infinite; }
                @keyframes ep-spin { to { transform: rotate(360deg); } }
                .ep-slow { pointer-events: auto; text-align: center; background: rgba(8,10,20,.85); border: 1px solid rgba(255,255,255,.14); border-radius: 12px; padding: 12px 16px; font-size: 12.5px; color: #cbd5e1; max-width: 80%; }
                .ep-slow button { margin: 8px 4px 0; }
            `}</style>

            <iframe
                key={`${current.url}-${reloadKey}`}
                className="ep-frame"
                src={current.url}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
                allowFullScreen
                onLoad={() => { setLoaded(true); setSlow(false); }}
            />

            {!loaded && (
                <div className="ep-center">
                    <div className="ep-spinner" />
                    {slow && (
                        <div className="ep-slow" onClick={(e) => e.stopPropagation()}>
                            {current.name} লোড হতে দেরি হচ্ছে।
                            <div>
                                {servers.length > 1 && (
                                    <button type="button" className="ep-btn" onClick={next}>▶ পরের সার্ভার</button>
                                )}
                                <button type="button" className="ep-btn" onClick={() => setReloadKey((k) => k + 1)}>↻ আবার চেষ্টা</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={`ep-top ${uiVisible || menuOpen ? '' : 'ep-hidden'}`}>
                <div className="ep-left">
                    <button
                        type="button"
                        className="ep-btn"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                    >
                        <span className="ep-dot" />
                        {current.name}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8z" /></svg>
                    </button>

                    {menuOpen && (
                        <div className="ep-menu" onClick={(e) => e.stopPropagation()}>
                            <div className="ep-menu-head">Select Server ({servers.length})</div>
                            {servers.map((s, i) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className={`ep-item ${i === active ? 'on' : ''}`}
                                    onClick={() => choose(i)}
                                >
                                    <span className="d" />
                                    {s.name}
                                    {i === active && <span className="tag">Active</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="ep-btn" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} title="Fullscreen">⛶</button>
                    {downloadHref && (
                        <a className="ep-btn" href={downloadHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            ⬇ Download
                        </a>
                    )}
                </div>
            </div>

            <div className={`ep-bottom ${uiVisible || menuOpen ? '' : 'ep-hidden'}`}>
                <div style={{ minWidth: 0 }}>
                    <span className="ep-badge">▶ Now playing on {current.name}</span>
                    {title && <div className="ep-title">{title}</div>}
                </div>
                <a className="ep-btn" href={current.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>↗ New tab</a>
            </div>
        </div>
    );
}