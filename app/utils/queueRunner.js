import { mascotSay } from './mascotSay';
// The background mirror queue.
// A new upload only makes the file record (with its MultiServer links) at once; the real work -- sending the file to the
// mirror servers -- is picked up here, one file per request, 3 at a time. The runner lives in the sidebar, which is on every
// page, so it keeps going while you move between pages. If the tab is closed the work simply waits (status "Processing")
// and starts again the next time any page of the site is opened.
const CONCURRENCY = 3;
const MAX_TRIES = 4;
const RETRY_AFTER_MS = 75 * 1000;
const LOCK_MS = 100 * 1000;

const g = typeof globalThis !== 'undefined' ? globalThis : {};
const S = g.__msQueue || (g.__msQueue = { running: new Set(), listeners: new Set(), busy: false, bg: new Set() });
if (!S.bg) S.bg = new Set();

const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

export const queueState = (id) => lsGet(`ms_q_${id}`) || { n: 0, at: 0, err: '' };
export const isRunning = (id) => S.running.has(id);
export const runningCount = () => S.running.size;
export function subscribe(fn) { S.listeners.add(fn); return () => S.listeners.delete(fn); }
const emit = () => S.listeners.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });

// make a file eligible again (the "Force Sync" button)
export function resetJob(id) { lsDel(`ms_q_${id}`); lsDel(`ms_lock_${id}`); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const authHeaders = (session) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` });

// ---- slow / rate-limited servers (Vidara, VidShared) run ONE file at a time each, in the background, with retries ----
// (many files at once made them answer "too many requests"; one by one always worked)
const LANES = {};
function lane(name, fn) {
    const prev = LANES[name] || Promise.resolve();
    const run = prev.catch(() => {}).then(fn);
    LANES[name] = run.catch(() => {});
    return run;
}
const serKey = (id) => `ms_ser_${id}`;
const serGet = (id) => lsGet(serKey(id)) || {};
function serDone(id, name) {
    const cur = serGet(id);
    delete cur[name];
    if (Object.keys(cur).length) lsSet(serKey(id), cur); else lsDel(serKey(id));
}

async function vidaraTask(session, id, original) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch('/api/upload', { method: 'POST', headers: authHeaders(session), body: JSON.stringify({ links: original, uploadType: 'gdrive', phase: 'serial', fileId: id }) });
            let d = {};
            try { d = await res.json(); } catch (e) { /* not JSON */ }
            if (res.ok && d.skipped) return true;
            const f = res.ok ? (d.files || [])[0] : null;
            if (f && (f.mirrors || []).some((m) => m.id === 'vidara')) return true;
        } catch (e) { /* retry */ }
        await wait(attempt === 0 ? 20000 : 45000);
    }
    return false;
}

async function vidsharedTask(session, id) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch('/api/vidshared', { method: 'POST', headers: authHeaders(session), body: JSON.stringify({ fileId: id }) });
            let d = {};
            try { d = await res.json(); } catch (e) { /* not JSON */ }
            if (res.ok && (d.skipped || d.ok)) return true;
            if (res.status === 401 || res.status === 404) return true; // nothing a retry can fix
        } catch (e) { /* retry */ }
        await wait(attempt === 0 ? 15000 : 40000);
    }
    return false;
}

function scheduleSerial(session, id, original, only) {
    const want = only || { vidara: 1, vidshared: 1 };
    lsSet(serKey(id), { ...serGet(id), ...want });
    const go = (name, fn) => {
        if (!want[name] || S.bg.has(`${name}:${id}`)) return;
        S.bg.add(`${name}:${id}`);
        lane(name, async () => {
            let ok = false;
            try { ok = await fn(); } finally { S.bg.delete(`${name}:${id}`); }
            if (ok) serDone(id, name);
            await wait(3000); // small gap between files
            emit();
        });
    };
    go('vidara', () => vidaraTask(session, id, original));
    go('vidshared', () => vidsharedTask(session, id));
}

async function runJob(supabase, session, file) {
    const id = file.id;
    S.running.add(id);
    lsSet(`ms_lock_${id}`, Date.now());
    const st = queueState(id);
    lsSet(`ms_q_${id}`, { n: st.n + 1, at: Date.now(), err: '' });
    emit();
    try {
        // main servers (everything except the one-at-a-time ones)
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: authHeaders(session),
            body: JSON.stringify({ links: file.original_url, uploadType: 'gdrive', profile: file.profile || 'default', fileId: id, phase: 'main' }),
        });
        let data = {};
        try { data = await res.json(); } catch (e) { /* not JSON */ }
        if (!res.ok) throw new Error(data.error || `Server answered ${res.status}`);
        if (data.errors && data.errors.length && !(data.files || []).length) throw new Error(data.errors[0].error);
        const done = (data.files || [])[0];
        // Vidara + VidShared continue in the background, one file at a time (the queue slot is free for the next file right away)
        scheduleSerial(session, id, file.original_url);
        if (data.skipped) await supabase.from('files').update({ status: 'Active' }).eq('id', id); // only the one-at-a-time servers are on: nothing else to wait for
        if (data.skipped || (done && done.status === 'Active')) { lsDel(`ms_q_${id}`); mascotSay('cheer', `${String(file.title || file.original_url || 'A file').slice(0, 40)} is on all servers! ✅`, { force: true }); }
        else lsSet(`ms_q_${id}`, { n: queueState(id).n, at: Date.now(), err: done && done.failed && done.failed[0] ? done.failed[0].reason : '' });
    } catch (e) {
        const cur = queueState(id);
        lsSet(`ms_q_${id}`, { n: cur.n, at: Date.now(), err: e.message });
        if (cur.n >= MAX_TRIES) { await supabase.from('files').update({ status: 'Failed' }).eq('id', id); mascotSay('shy', 'One file failed after 4 tries 😢 Check the Processing Queue', { force: true }); }
    } finally {
        lsDel(`ms_lock_${id}`);
        S.running.delete(id);
        emit();
    }
}

// pick up Vidara / VidShared work that was left when a tab was closed
async function resumeSerial(supabase, session) {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith('ms_ser_')) continue;
            const id = k.slice(7);
            const want = serGet(id);
            const names = Object.keys(want).filter((n) => !S.bg.has(`${n}:${id}`));
            if (!names.length) continue;
            const { data } = await supabase.from('files').select('id, original_url').eq('id', id).eq('user_id', session.user.id).maybeSingle();
            if (!data) { lsDel(k); continue; }
            scheduleSerial(session, id, data.original_url, Object.fromEntries(names.map((n) => [n, 1])));
        }
    } catch (e) { /* ignore */ }
}

// look for waiting files and start them; safe to call as often as you like
export async function kick(supabase) {
    if (S.busy) return;
    S.busy = true;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        resumeSerial(supabase, session);
        const { data } = await supabase.from('files').select('id, original_url, profile, status').eq('user_id', session.user.id).eq('status', 'Processing').not('original_url', 'is', null).limit(100);
        const now = Date.now();
        const todo = (data || []).filter((f) => {
            if (S.running.has(f.id)) return false;
            const lock = lsGet(`ms_lock_${f.id}`);
            if (lock && now - lock < LOCK_MS) return false;
            const st = queueState(f.id);
            if (st.n >= MAX_TRIES) return false;
            return st.n === 0 || now - st.at > RETRY_AFTER_MS;
        });
        const lanes = Math.max(0, CONCURRENCY - S.running.size);
        const batch = todo.slice(0, lanes);
        batch.forEach((f) => { runJob(supabase, session, f).then(() => kick(supabase)); });
    } finally {
        S.busy = false;
    }
}
