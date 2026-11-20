'use client';

import { useEffect } from 'react';
import { DIRECT_CSS, DIRECT_JS } from './playerCode';

// Our own player (used inside the embed page as the "Direct (Fast)" and "HLS" servers).
//   mode 'direct' : plays the Drive file straight from the fast Worker with HTTP Range (instant seek, source link hidden)
//   mode 'hls'    : plays the adaptive stream made by the transcode job (quality / audio / subtitle menus, seek thumbnails)
// When the video cannot play (codec, Drive busy) it tells the parent player, which then switches to the next server.
const HLS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js';

function loadHls() {
    return new Promise((resolve) => {
        if (window.Hls) return resolve(true);
        const s = document.createElement('script');
        s.src = HLS_SRC;
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

export default function DirectPlayer({ id, name, mode, base }) {
    useEffect(() => {
        let dead = false;
        const tellParent = () => { try { window.parent.postMessage({ msPlayer: 'fail', mode }, '*'); } catch (e) { /* ignore */ } };
        (async () => {
            if (mode === 'hls' && !(await loadHls())) { tellParent(); return; }
            if (dead) return;
            // the behaviour script wires up the markup below and creates window.msDirect
            // eslint-disable-next-line no-new-func
            new Function(DIRECT_JS)();
            const url = mode === 'hls'
                ? `${base}/hls/${encodeURIComponent(id)}/master.m3u8`
                : `${base}/d/${encodeURIComponent(id)}/${encodeURIComponent(name || 'video.mp4')}?inline=1`;
            window.msDirect.load(url, tellParent);
        })();
        return () => { dead = true; try { window.msDirect && window.msDirect.stop(); } catch (e) { /* ignore */ } };
    }, [id, name, mode, base]);

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', ['--accent-color']: '#ef4444', ['--accent-rgb']: '239,68,68', fontFamily: 'system-ui, sans-serif' }}>
            <style dangerouslySetInnerHTML={{ __html: DIRECT_CSS }} />
            <div className="dp" id="directPlayer" data-id={id}>
                <video playsInline preload="metadata" crossOrigin="anonymous"></video>
                <div className="dp-load"></div>
                <button className="dp-big" aria-label="Play">&#9654;</button>
                <div className="dp-flash l"></div><div className="dp-flash r"></div>
                <div className="dp-toast"></div>
                <div className="dp-stats"></div>
                <div className="dp-menu"></div>
                <div className="dp-shade"></div>
                <div className="dp-bar">
                    <div className="dp-seek"><div className="dp-track"><div className="dp-buf"></div><div className="dp-fill"></div><div className="dp-knob"></div></div><div className="dp-tip"><div className="dp-th"></div><span>0:00</span></div></div>
                    <div className="dp-row">
                        <button className="dp-b dp-pp" aria-label="Play/Pause">&#9654;</button>
                        <button className="dp-b dp-back" aria-label="Back 10s">&#8634;</button>
                        <button className="dp-b dp-fwd" aria-label="Forward 10s">&#8635;</button>
                        <span className="dp-vwrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
                            <button className="dp-b dp-mute" aria-label="Mute">&#128266;</button>
                            <input className="dp-vol" type="range" min="0" max="1" step="0.05" defaultValue="1" />
                        </span>
                        <span className="dp-time"><span className="dp-cur">0:00</span> / <span className="dp-dur">0:00</span></span>
                        <span className="dp-sp"></span>
                        <button className="dp-b dp-cog" aria-label="Settings">&#9881;</button>
                        <button className="dp-b dp-pip" aria-label="Picture in picture">&#10064;</button>
                        <button className="dp-b dp-fs" aria-label="Fullscreen">&#9974;</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
