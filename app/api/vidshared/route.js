import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles } from '../../utils/profiles';

// VidShared mirror: VidShared downloads the video itself from a link we give it (POST /files/fetch), so nothing passes through Vercel.
//   1st choice: your fast Worker link  (DL_BASE/d/<file id>/<name>   - Server B, no Drive quota)
//   backup    : the direct Google Drive link
// Settings (Manage Sites > VidShared): API key (+ player link, used when the page is shown). Optional Vercel env fallback: VIDSHARED_API_KEY
export const maxDuration = 60;

const API = 'https://api.vidshared.com/v1';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DL_BASE = (process.env.NEXT_PUBLIC_DL_BASE || process.env.NEXT_PUBLIC_DL_WORKER || '').replace(/\/+$/, '');

const driveIdOf = (s) => {
    const m = String(s || '').match(/\/d\/([\w-]{15,})|[?&]id=([\w-]{15,})/);
    return m ? (m[1] || m[2]) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function vs(path, key, init = {}) {
    const res = await fetch(API + path, { ...init, headers: { 'X-Api-Key': key, 'Content-Type': 'application/json', ...(init.headers || {}) }, signal: AbortSignal.timeout(20000) });
    let data = {};
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    return { ok: res.ok, status: res.status, data };
}

// asks VidShared to fetch `url`, then waits (up to `waitMs`) for ready / failed
async function fetchAndWait(key, url, title, waitMs) {
    const made = await vs('/files/fetch', key, { method: 'POST', body: JSON.stringify({ url, title: String(title || '').slice(0, 200) || undefined }) });
    if (!made.ok || !made.data.code) return { state: 'failed', error: (made.data.error && made.data.error.message) || `VidShared answered ${made.status}`, retryable: made.status === 401 ? false : true };
    const code = made.data.code;
    const end = Date.now() + waitMs;
    let st = 'pending';
    while (Date.now() < end) {
        await sleep(3000);
        const r = await vs('/files/' + encodeURIComponent(code), key);
        st = r.ok ? r.data.core_state : 'pending';
        if (st === 'ready' || st === 'ready_tiktok') return { state: 'ready', code };
        if (st === 'failed') return { state: 'failed', code, error: 'VidShared could not download this link' };
    }
    return { state: 'pending', code };
}

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: u, error: ue } = await supabase.auth.getUser(token);
        if (ue || !u?.user) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });

        const body = await request.json();
        const fileId = typeof body.fileId === 'string' && /^[a-z0-9]{6,12}$/.test(body.fileId) ? body.fileId : null;
        if (!fileId) return NextResponse.json({ error: 'fileId missing' }, { status: 400 });

        const { data: rows } = await supabase.from('settings').select('key, value').eq('user_id', u.user.id).in('key', ['vidshared_api_key', 'vidshared_active', 'upload_profiles']);
        const get = (k) => ((rows || []).find((r) => r.key === k) || {}).value || '';
        const key = get('vidshared_api_key') || process.env.VIDSHARED_API_KEY || '';
        if (!key) return NextResponse.json({ skipped: true, reason: 'No VidShared API key (Manage Sites > VidShared > Add API key)' });
        // an upload profile decides the servers: when it does not include VidShared, nothing is sent there
        const profileId = typeof body.profile === 'string' ? body.profile.slice(0, 12) : '';
        if (profileId && profileId !== 'default') {
            const prof = parseProfiles(get('upload_profiles')).find((p) => p.id === profileId);
            if (prof && !prof.servers.includes('vidshared')) return NextResponse.json({ skipped: true, reason: 'VidShared is not in this upload profile' });
        } else if (get('vidshared_active') === 'false') return NextResponse.json({ skipped: true, reason: 'VidShared is switched off' });

        const { data: file } = await supabase.from('files').select('id, name, original_url, mirrors').eq('id', fileId).eq('user_id', u.user.id).maybeSingle();
        if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
        const mirrors = Array.isArray(file.mirrors) ? file.mirrors.filter(Boolean) : [];
        const cur = mirrors.find((m) => m.id === 'vidshared' && m.code);
        // the VidShared Play ID is kept like every other server's code (the player link is added when the page is shown)
        const save = async (code) => {
            const next = mirrors.filter((m) => m.id !== 'vidshared');
            next.push({ id: 'vidshared', name: 'VidShared', type: 'stream', code });
            return supabase.from('files').update({ mirrors: next }).eq('id', file.id);
        };

        // already there: just refresh its state
        if (cur && !body.force) {
            const r = await vs('/files/' + encodeURIComponent(cur.code), key);
            const st = r.ok ? r.data.core_state : null;
            if (st === 'ready' || st === 'ready_tiktok') return NextResponse.json({ ok: true, state: 'ready', code: cur.code });
            if (st === 'pending') return NextResponse.json({ ok: true, state: 'pending', code: cur.code });
            // failed / gone -> make a fresh copy below
        }

        const did = driveIdOf(file.original_url);
        const title = String(file.name || '').trim() || (did ? `Drive file ${did.slice(0, 8)}` : 'Untitled');
        const attempts = [];
        if (DL_BASE) attempts.push({ via: 'worker', url: `${DL_BASE}/d/${encodeURIComponent(file.id)}/${encodeURIComponent(title)}` });
        if (did) attempts.push({ via: 'drive', url: `https://drive.usercontent.google.com/download?id=${did}&export=download&confirm=t` });
        if (!attempts.length) return NextResponse.json({ error: 'No source link for this file' }, { status: 400 });

        let result = null, usedVia = '';
        for (let i = 0; i < attempts.length; i++) {
            // first try gets most of the time; the backup gets the rest
            result = await fetchAndWait(key, attempts[i].url, title, i === 0 && attempts.length > 1 ? 22000 : 30000);
            usedVia = attempts[i].via;
            if (result.state !== 'failed') break;
            if (result.retryable === false) break;
        }

        if (result && result.code && result.state !== 'failed') {
            const { error: se } = await save(result.code);
            if (se) return NextResponse.json({ ok: false, error: 'Could not save: ' + se.message }, { status: 500 });
            return NextResponse.json({ ok: true, state: result.state, code: result.code, via: usedVia });
        }
        return NextResponse.json({ ok: false, state: 'failed', error: (result && result.error) || 'VidShared failed' }, { status: 502 });
    } catch (e) {
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
