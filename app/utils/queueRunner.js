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
const S = g.__msQueue || (g.__msQueue = { running: new Set(), listeners: new Set(), busy: false });

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

async function runJob(supabase, session, file) {
    const id = file.id;
    S.running.add(id);
    lsSet(`ms_lock_${id}`, Date.now());
    const st = queueState(id);
    lsSet(`ms_q_${id}`, { n: st.n + 1, at: Date.now(), err: '' });
    emit();
    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ links: file.original_url, uploadType: 'gdrive', profile: file.profile || 'default', fileId: id }),
        });
        let data = {};
        try { data = await res.json(); } catch (e) { /* not JSON */ }
        if (!res.ok) throw new Error(data.error || `Server answered ${res.status}`);
        if (data.errors && data.errors.length && !(data.files || []).length) throw new Error(data.errors[0].error);
        const done = (data.files || [])[0];
        if (done && done.status === 'Active') { lsDel(`ms_q_${id}`); mascotSay('cheer', `${String(file.title || file.original_url || 'A file').slice(0, 40)} is on all servers! ✅`, { force: true }); }
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

// look for waiting files and start them; safe to call as often as you like
export async function kick(supabase) {
    if (S.busy) return;
    S.busy = true;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
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
