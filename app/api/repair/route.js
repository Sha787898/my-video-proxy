import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles } from '../../utils/profiles';
import { SERVERS, DEFAULT_ACTIVE, PDLINK_SERVERS, KEY_MAP, resolveMirrors, domainsFromSettings } from '../../utils/mirrors';

// "Check & repair": looks at ONE file of the logged-in owner and says, server by server, whether its copy is really there.
// It only READS (the repair itself reuses /api/upload and /api/vidshared, restricted to the servers that need it, so nothing is uploaded twice).
// Answers contain only friendly words: no API keys, no host task ids, no raw error text.
//
// A new server needs no change here: it is picked up from utils/mirrors.js (SERVERS / DEFAULT_ACTIVE / KEY_MAP).
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const GONE = /(file|video|page|link)\s+(was\s+|has\s+been\s+|is\s+)?(not\s+found|deleted|removed|unavailable|expired|doesn'?t\s+exist|does\s+not\s+exist)|no\s+longer\s+(available|exists)|404\s*(-|:)?\s*not\s+found|copyright\s+(claim|takedown)/i;

const driveIdOf = (s) => {
    const m = String(s || '').match(/\/d\/([\w-]{15,})|[?&]id=([\w-]{15,})/);
    return m ? (m[1] || m[2]) : null;
};

async function get(url, ms = 6000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, cache: 'no-store', headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en' } });
        return res;
    } finally { clearTimeout(t); }
}

// Is the Google Drive source still there?
async function checkSource(driveId) {
    if (!driveId) return { state: 'unknown', note: 'No Google Drive link saved for this file' };
    try {
        const res = await get(`https://drive.google.com/file/d/${driveId}/view`, 6000);
        if (res.status === 404) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return { state: 'deleted', note: 'The Google Drive file was deleted or the link is wrong' }; }
        const html = (await res.text()).slice(0, 150000);
        if (/accounts\.google\.com\/(ServiceLogin|v3\/signin)|<title>\s*Sign in/i.test(html) && !/<title>[^<]+- Google Drive/i.test(html)) return { state: 'private', note: 'The Google Drive file is private. Share it with "Anyone with the link"' };
        if (/<title>\s*Google Drive\s*-?\s*(Page Not Found|Error)/i.test(html) || /file you have requested does not exist/i.test(html)) return { state: 'deleted', note: 'The Google Drive file was deleted' };
        return { state: 'ok', note: 'Google Drive file is available' };
    } catch (e) {
        return { state: 'unknown', note: 'Could not reach Google Drive just now' };
    }
}

// Does a copy on a host still open? Only a clear "gone" answer counts as dead (bot walls prove nothing).
async function checkLink(url, isPage) {
    if (!url || !/^https?:\/\//i.test(url)) return 'unknown';
    try {
        const res = await get(url, 6000);
        if (res.status === 404 || res.status === 410) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return 'dead'; }
        if (!res.ok) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return 'unknown'; }
        const type = (res.headers.get('content-type') || '').toLowerCase();
        if (!type.includes('text/html')) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return 'ok'; }
        const html = (await res.text()).slice(0, 120000);
        return isPage && GONE.test(html) ? 'dead' : 'ok';
    } catch (e) {
        if (e && e.name === 'AbortError') return 'unknown';
        return 'dead'; // the host does not answer at all
    }
}

async function checkVidShared(key, code) {
    try {
        const res = await fetch(`https://api.vidshared.com/v1/files/${encodeURIComponent(code)}`, { headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(8000) });
        if (res.status === 404) return 'dead';
        if (!res.ok) return 'unknown';
        const d = await res.json();
        if (d.core_state === 'ready' || d.core_state === 'ready_tiktok') return 'ok';
        if (d.core_state === 'failed') return 'dead';
        return 'pending';
    } catch (e) { return 'unknown'; }
}

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 });
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: u, error: ue } = await supabase.auth.getUser(token);
        if (ue || !u?.user) return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });

        const body = await request.json();
        const fileId = typeof body.fileId === 'string' && /^[a-z0-9]{6,12}$/.test(body.fileId) ? body.fileId : null;
        if (!fileId) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

        let { data: file, error: fe } = await supabase.from('files').select('id, name, original_url, mirrors, profile').eq('id', fileId).eq('user_id', u.user.id).maybeSingle();
        if (fe) ({ data: file } = await supabase.from('files').select('id, name, original_url, mirrors').eq('id', fileId).eq('user_id', u.user.id).maybeSingle()); // older table without the profile column
        if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

        const { data: rows } = await supabase.from('settings').select('key, value').eq('user_id', u.user.id);
        const get1 = (k) => ((rows || []).find((r) => r.key === k) || {}).value || '';
        const domains = domainsFromSettings(rows);
        const mirrors = (Array.isArray(file.mirrors) ? file.mirrors : []).filter((m) => m && m.id);
        const resolved = resolveMirrors(mirrors, domains);

        // a file uploaded with a profile is only expected on that profile's servers
        const wantProf = typeof body.profile === 'string' && body.profile !== 'file' ? body.profile.slice(0, 12) : file.profile; // 'file' = the profile the file was uploaded with
        const profId = wantProf && wantProf !== 'default' ? String(wantProf) : '';
        const prof = profId ? parseProfiles(get1('upload_profiles')).find((p) => p.id === profId) : null;
        // which servers are switched on (same rule as the upload)
        const isOn = (id) => { if (prof) return prof.servers.includes(id); const sv = get1(`${id}_active`); return sv === '' ? !!DEFAULT_ACTIVE[id] : sv === 'true'; };
        const hasKey = (id) => !KEY_MAP[id] || !!get1(`${id}_api_key`) || PDLINK_SERVERS.includes(id);
        const vsKey = get1('vidshared_api_key') || process.env.VIDSHARED_API_KEY || '';
        let vsOn = !!vsKey && get1('vidshared_active') !== 'false';

        // a file uploaded with a profile is only expected on that profile's servers
        let wanted = Object.keys(DEFAULT_ACTIVE).filter(isOn);
        if (prof) { wanted = prof.servers.filter((id) => id in DEFAULT_ACTIVE); vsOn = !!vsKey && prof.servers.includes('vidshared'); }
        const pdOn = wanted.filter((id) => PDLINK_SERVERS.includes(id));
        const single = wanted.filter((id) => !PDLINK_SERVERS.includes(id));

        const out = [];
        const tasks = [];
        const add = (row, work) => { const r = { ...row }; out.push(r); if (work) tasks.push(work(r)); };

        // one row per normal server
        const ids = [...single];
        if (vsOn && !ids.includes('vidshared')) ids.push('vidshared');
        // copies that exist on servers that are now switched off are still checked (a deleted link should still show)
        for (const m of mirrors) { if (m.id !== 'pdlink' && !ids.includes(m.id) && (SERVERS[m.id] || m.id === 'vidshared')) ids.push(m.id); }

        for (const id of ids) {
            const name = id === 'vidshared' ? 'VidShared' : (SERVERS[id] ? SERVERS[id].name : id);
            const type = id === 'vidshared' ? 'stream' : (SERVERS[id] ? SERVERS[id].type : 'stream');
            const have = mirrors.find((m) => m.id === id && m.code && !String(m.code).startsWith('Failed'));
            const on = id === 'vidshared' ? vsOn : isOn(id);
            if (!have) {
                if (!on) continue;
                if (id !== 'vidshared' && !hasKey(id)) { add({ id, name, type, state: 'nokey', note: 'Add the API key in Manage Sites', fix: false }); continue; }
                add({ id, name, type, state: 'missing', note: 'Not uploaded yet', fix: true });
                continue;
            }
            if (id === 'vidshared') { add({ id, name, type, state: 'checking', note: '', fix: true }, async (r) => { const s = await checkVidShared(vsKey, have.code); r.state = s === 'unknown' ? 'ok' : s; r.note = s === 'dead' ? 'VidShared could not prepare this video' : s === 'pending' ? 'VidShared is still preparing it' : 'Ready'; r.fix = s === 'dead'; }); continue; }
            if (type === 'task') { add({ id, name, type, state: 'pending', note: 'Upload is running on the host (can take a few minutes)', fix: false }); continue; }
            const rm = resolved.find((x) => x.id === id);
            const url = rm && (rm.embed || rm.url);
            if (!url) { add({ id, name, type, state: 'ok', note: 'Link saved', fix: false }); continue; }
            add({ id, name, type, state: 'checking', note: '', fix: true }, async (r) => {
                const s = await checkLink(url, !!(rm && rm.embed));
                r.state = s === 'unknown' ? 'ok' : s;
                r.note = s === 'dead' ? 'The host no longer has this video' : (s === 'unknown' ? 'Link saved (host did not answer the check)' : 'Working');
                r.fix = s === 'dead';
            });
        }

        // the 5 PDLink hosts share one link
        if (pdOn.length || mirrors.some((m) => m.id === 'pdlink')) {
            const pm = mirrors.find((m) => m.id === 'pdlink' && m.code);
            const label = 'PDLink (' + (pdOn.length ? pdOn : PDLINK_SERVERS).map((id) => SERVERS[id].name).join(' / ') + ')';
            if (!pm) { if (pdOn.length) add({ id: 'pdlink', name: label, type: 'download', state: 'missing', note: 'Not uploaded yet', fix: true, group: pdOn }); }
            else {
                const rm = resolved.find((x) => x.id === 'pdlink');
                add({ id: 'pdlink', name: label, type: 'download', state: 'checking', note: '', fix: true, group: pdOn }, async (r) => {
                    const s = await checkLink(rm && rm.url, false);
                    r.state = s === 'unknown' ? 'ok' : s;
                    r.note = s === 'dead' ? 'The share link no longer opens' : (s === 'unknown' ? 'Link saved (host did not answer the check)' : 'Working');
                    r.fix = s === 'dead';
                });
            }
        }

        const [source] = await Promise.all([checkSource(driveIdOf(file.original_url)), Promise.all(tasks)]);
        const rank = { dead: 0, missing: 1, nokey: 2, pending: 3, ok: 4 };
        out.sort((a, b) => (rank[a.state] ?? 5) - (rank[b.state] ?? 5));
        const counts = { ok: 0, dead: 0, missing: 0, pending: 0, nokey: 0 };
        out.forEach((r) => { counts[r.state] = (counts[r.state] || 0) + 1; });
        return NextResponse.json({ ok: true, source, rows: out, counts, profile: prof ? prof.id : 'default' });
    } catch (e) {
        return NextResponse.json({ error: 'The check could not finish. Try again.' }, { status: 500 });
    }
}
