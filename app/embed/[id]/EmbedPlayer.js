'use client';

import { useState, useEffect } from 'react';

// servers: [{ key, name, url }]
export default function EmbedPlayer({ servers }) {
    const [active, setActive] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const current = servers[active] || servers[0];

    // সার্ভার বদলালে লোডিং আবার শুরু; কিছু হোস্ট onLoad দেয় না, তাই ১২ সেকেন্ড পরে স্পিনার সরিয়ে দিই
    useEffect(() => {
        setLoaded(false);
        const t = setTimeout(() => setLoaded(true), 12000);
        return () => clearTimeout(t);
    }, [active]);

    return (
        <div className="ep-root" onClick={() => setMenuOpen(false)}>
            <style>{`
                .ep-root { position: fixed; inset: 0; z-index: 99990; background: #05070d; color: #f8fafc; overflow: hidden; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
                .ep-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
                .ep-spinner-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 5; transition: opacity .3s; }
                .ep-spinner { width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(239,68,68,.12); border-top-color: #ef4444; border-right-color: rgba(239,68,68,.4); animation: ep-spin .75s linear infinite; }
                @keyframes ep-spin { to { transform: rotate(360deg); } }
                .ep-trigger { position: absolute; top: 10px; left: 10px; z-index: 99998; height: 32px; padding: 0 12px; display: flex; align-items: center; gap: 7px; background: rgba(15,23,42,.85); border: 1px solid rgba(255,255,255,.14); color: #f1f5f9; border-radius: 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; cursor: pointer; backdrop-filter: blur(18px); }
                .ep-trigger:hover { border-color: rgba(239,68,68,.45); color: #ef4444; }
                .ep-menu { position: absolute; top: 48px; left: 10px; z-index: 99999; width: 220px; max-height: 70vh; overflow-y: auto; padding: 7px; display: flex; flex-direction: column; gap: 4px; background: rgba(10,15,29,.96); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; box-shadow: 0 16px 40px rgba(0,0,0,.85); }
                .ep-menu-head { font-size: 9.5px; color: #64748b; text-transform: uppercase; font-weight: 700; padding: 3px 5px 6px; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 4px; }
                .ep-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.05); color: #94a3b8; border-radius: 8px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; cursor: pointer; text-align: left; }
                .ep-item:hover { background: rgba(255,255,255,.08); color: #f8fafc; }
                .ep-item.on { color: #f8fafc; border-color: rgba(16,185,129,.5); background: rgba(16,185,129,.12); }
                .ep-newtab { display: block; margin-top: 4px; padding: 7px 10px; font-size: 10px; color: #60a5fa; text-decoration: none; text-align: center; border-top: 1px solid rgba(255,255,255,.08); }
            `}</style>

            <iframe
                key={current.url}
                className="ep-frame"
                src={current.url}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="no-referrer"
                onLoad={() => setLoaded(true)}
            />

            {!loaded && (
                <div className="ep-spinner-wrap">
                    <div className="ep-spinner" />
                </div>
            )}

            <button
                type="button"
                className="ep-trigger"
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            >
                ☰ {current.name}
            </button>

            {menuOpen && (
                <div className="ep-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="ep-menu-head">Select streaming server ({servers.length})</div>
                    {servers.map((s, i) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`ep-item ${i === active ? 'on' : ''}`}
                            onClick={() => { setActive(i); setMenuOpen(false); }}
                        >
                            <span>{s.name}</span>
                            {i === active && <span>●</span>}
                        </button>
                    ))}
                    <a className="ep-newtab" href={current.url} target="_blank" rel="noopener noreferrer">
                        ↗ Open {current.name} in new tab
                    </a>
                </div>
            )}
        </div>
    );
}