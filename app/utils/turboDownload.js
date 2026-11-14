// Turbo downloader: many parallel Range requests to the fast-download worker.
//  - Chrome / Edge (desktop): chunks are written straight to the file you pick (any size, low memory)
//  - other browsers: chunks are kept in memory (limited size) and saved when finished
//  - pause / resume, automatic retry with back-off, live speed + ETA
// Resume after closing the page is handled by the browser's own download manager (Instant mode).

// '/dl' (recommended: same-origin, the worker address never appears) or a full custom-domain URL
export const DL_BASE = (process.env.NEXT_PUBLIC_DL_BASE || process.env.NEXT_PUBLIC_DL_WORKER || '').replace(/\/+$/, '');

export const fmtBytes = (b) => {
    if (!b || b < 0) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
    return `${(b / 1024 ** i).toFixed(i > 1 ? 2 : i ? 1 : 0)} ${u[i]}`;
};
export const fmtTime = (s) => {
    if (!isFinite(s) || s < 0) return '--';
    if (s < 60) return `${Math.ceil(s)}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${Math.ceil(s % 60)}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

export async function getInfo(id) {
    if (!DL_BASE) return null;
    try {
        const r = await fetch(`${DL_BASE}/info/${encodeURIComponent(id)}`, { cache: 'no-store', credentials: 'omit' });
        if (!r.ok) return null;
        const j = await r.json();
        return j && j.ok ? j : null;
    } catch (e) { return null; }
}

// asks the worker for a short-lived link made for this visitor (kind: 'nav' = browser download, 'turbo' = in-page downloader)
// the plain public link: works when you right-click > Copy link address, in FDM / IDM / aria2 (Range supported)
export const publicPath = (id, name) => `${DL_BASE}/d/${encodeURIComponent(id)}/${encodeURIComponent(name || 'download')}`;
export const absolute = (path) => { try { return new URL(path, window.location.href).href; } catch (e) { return path; } };

export async function getLink(id, kind = 'nav') {
    try {
        const r = await fetch(`${DL_BASE}/token/${encodeURIComponent(id)}?kind=${kind}`, { cache: 'no-store', credentials: 'omit' });
        const j = await r.json().catch(() => null);
        if (r.ok && j && j.ok && j.url) return { ok: true, url: /^https?:/i.test(j.url) ? j.url : `${DL_BASE}${j.url}` };
        return { ok: false, error: (j && j.error) || `The download server answered ${r.status}` };
    } catch (e) { return { ok: false, error: 'Could not reach the download server. Check your connection and try again.' }; }
}

export const canWriteToDisk = () => typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
const MEM_LIMIT = (typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || '')) ? 600 * 1024 ** 2 : 1500 * 1024 ** 2;
export const memoryLimit = () => MEM_LIMIT;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// returns a controller: { start(), pause(), resume(), cancel() }
export function createTurbo({ id, info, url, connections = 8, onUpdate }) {
    const size = info.size;
    const CHUNK = size > 4 * 1024 ** 3 ? 32 * 1024 ** 2 : size > 512 * 1024 ** 2 ? 16 * 1024 ** 2 : 8 * 1024 ** 2;
    const total = Math.ceil(size / CHUNK);
    const done = new Uint8Array(total);   // 1 = chunk finished
    const live = new Array(total).fill(0); // bytes of in-flight chunk
    const mem = [];                        // memory mode: chunk blobs
    let writable = null; let handle = null;
    let state = 'idle'; let error = ''; let writeChain = Promise.resolve();
    let queue = []; let active = 0; let epoch = 0; const busy = new Set(); let paused = false; let cancelled = false;
    const aborts = new Set();
    let completed = 0; let t0 = 0; let lastT = 0; let lastB = 0; let speed = 0; let bytesBefore = 0;
    const bytesNow = () => { let b = 0; for (let i = 0; i < total; i++) b += done[i] ? Math.min(CHUNK, size - i * CHUNK) : live[i]; return b; };

    const emit = () => {
        const b = bytesNow(); const now = performance.now();
        if (now - lastT > 400) { const inst = ((b - lastB) / ((now - lastT) / 1000)); speed = speed ? speed * 0.6 + inst * 0.4 : inst; lastT = now; lastB = b; }
        onUpdate && onUpdate({ state, error, bytes: b, size, pct: size ? (b / size) * 100 : 0, speed: state === 'running' ? Math.max(0, speed) : 0, eta: speed > 1 ? (size - b) / speed : Infinity, connections: active, chunk: CHUNK, done: completed, total });
    };

    async function fetchChunk(i, signal) {
        const s = i * CHUNK; const e = Math.min(size - 1, s + CHUNK - 1);
        const r = await fetch(url, { headers: { Range: `bytes=${s}-${e}` }, signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' });
        if (r.status !== 206 && !(r.status === 200 && s === 0 && e === size - 1)) {
            let msg = 'Server answered ' + r.status;
            try { const j = await r.json(); if (j && j.error) msg = j.error; } catch (x) { /* ignore */ }
            const err = new Error(msg); err.fatal = r.status === 404 || r.status === 429 || r.status === 403; throw err;
        }
        const reader = r.body.getReader(); const parts = []; let got = 0;
        for (;;) {
            const { done: d, value } = await reader.read();
            if (d) break;
            parts.push(value); got += value.length; live[i] = got; emit();
        }
        if (got !== e - s + 1) throw new Error('Short chunk, retrying');
        const buf = new Blob(parts);
        return buf;
    }

    async function worker(ep) {
        while (!cancelled && !paused && ep === epoch) {
            const i = queue.shift();
            if (i === undefined) return;
            if (done[i] || busy.has(i)) continue;
            busy.add(i);
            let tries = 0;
            for (;;) {
                if (cancelled || paused || ep !== epoch) { busy.delete(i); return; }
                const ctl = new AbortController(); aborts.add(ctl);
                try {
                    active += 1; emit();
                    const blob = await fetchChunk(i, ctl.signal);
                    if (writable) {
                        const pos = i * CHUNK;
                        const data = await blob.arrayBuffer();
                        writeChain = writeChain.then(() => writable.write({ type: 'write', position: pos, data }));
                        await writeChain;
                    } else mem[i] = blob;
                    if (!done[i]) { done[i] = 1; completed += 1; } live[i] = 0; busy.delete(i); break;
                } catch (e) {
                    live[i] = 0;
                    if (cancelled || paused || ep !== epoch) { busy.delete(i); return; }
                    if (e && e.fatal) { busy.delete(i); error = e.message; state = 'error'; paused = true; emit(); return; }
                    tries += 1;
                    if (tries > 6) { busy.delete(i); error = e.message || 'Network error'; state = 'error'; paused = true; emit(); return; }
                    await sleep(Math.min(8000, 400 * 2 ** tries));
                } finally { active -= 1; aborts.delete(ctl); emit(); }
            }
        }
    }

    async function pump() {
        epoch += 1; const ep = epoch;
        const n = Math.min(connections, queue.length);
        await Promise.all(Array.from({ length: n }, () => worker(ep)));
        if (ep !== epoch || cancelled || state === 'error' || paused) return;
        if (completed >= total) await finish();
    }

    async function finish() {
        state = 'saving'; emit();
        try {
            if (writable) { await writeChain; await writable.close(); writable = null; }
            else {
                const blob = new Blob(mem, { type: info.mime || 'application/octet-stream' });
                const a = document.createElement('a'); const u = URL.createObjectURL(blob);
                a.href = u; a.download = info.name || 'download'; document.body.appendChild(a); a.click(); a.remove();
                setTimeout(() => URL.revokeObjectURL(u), 60000);
            }
            state = 'done'; emit();
        } catch (e) { error = e.message || 'Could not save the file'; state = 'error'; emit(); }
    }

    return {
        async start() {
            if (state === 'running') return;
            if (!size || !info.ranges) { error = 'This file does not support multi-connection download. Use Instant download.'; state = 'error'; emit(); return; }
            if (canWriteToDisk()) {
                try {
                    handle = await window.showSaveFilePicker({ suggestedName: info.name || 'download' });
                    writable = await handle.createWritable();
                } catch (e) { if (e && e.name === 'AbortError') { state = 'idle'; emit(); return; } writable = null; }
            }
            if (!writable && size > MEM_LIMIT) {
                error = `Your browser keeps downloads in memory (limit ${fmtBytes(MEM_LIMIT)}). Use Instant download for this file.`; state = 'error'; emit(); return;
            }
            queue = Array.from({ length: total }, (_, i) => i);
            state = 'running'; t0 = performance.now(); lastT = t0; lastB = 0; emit();
            pump();
        },
        pause() { if (state !== 'running') return; paused = true; aborts.forEach((c) => c.abort()); state = 'paused'; speed = 0; emit(); },
        resume() {
            if (state !== 'paused' && state !== 'error') return;
            paused = false; error = ''; state = 'running';
            queue = []; for (let i = 0; i < total; i++) if (!done[i]) queue.push(i);
            lastT = performance.now(); lastB = bytesNow(); emit();
            // wait for old workers to settle, then start fresh
            busy.clear(); pump();
        },
        async cancel() {
            cancelled = true; aborts.forEach((c) => c.abort());
            try { if (writable) await writable.abort(); } catch (e) { /* ignore */ }
            writable = null; state = 'cancelled'; emit();
        },
        chunkSize: CHUNK, total,
    };
}
