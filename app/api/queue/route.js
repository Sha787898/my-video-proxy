import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { embedBase } from '../../utils/embedOrigin';
import { parseProfiles, PROFILES_KEY } from '../../utils/profiles';
import { parseQuality } from '../../utils/quality';

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const driveIdOf = (s) => {
    const m = String(s).match(/\/d\/([\w-]{15,})|[?&]id=([\w-]{15,})/);
    return m ? (m[1] || m[2]) : null;
};
const newId = () => {
    const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < 8; i++) r += c[Math.floor(Math.random() * c.length)];
    return r;
};

// the file name from the public Drive page (a few seconds at most); the real name is saved again when the mirror finishes
async function titleOf(driveId) {
    try {
        const res = await fetch(`https://drive.google.com/file/d/${driveId}/view`, { signal: AbortSignal.timeout(4000), headers: { 'Accept-Language': 'en' } });
        const html = await res.text();
        const m = html.match(/<title>([^<]+)<\/title>/i);
        if (!m) return null;
        const t = m[1].replace(/\s*-\s*Google Drive\s*$/i, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
        return t && !/^Google Drive/i.test(t) && !/^Sign in/i.test(t) ? t : null;
    } catch (e) {
        return null;
    }
}

// Step 1 of an upload: makes the file record + its MultiServer links at once (no waiting for the mirror servers).
// The mirroring itself then runs from the Processing Queue (see utils/queueRunner.js).
export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return NextResponse.json({ error: 'Not logged in. Please login again.' }, { status: 401 });

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData?.user) return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
        const userId = userData.user.id;

        const body = await request.json();
        const lines = String(body.links || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200);
        const profile = typeof body.profile === 'string' ? body.profile.slice(0, 12) : 'default';
        if (lines.length === 0) return NextResponse.json({ error: 'No links provided' }, { status: 400 });

        if (profile !== 'default') {
            const { data: row } = await supabase.from('settings').select('value').eq('user_id', userId).eq('key', PROFILES_KEY).maybeSingle();
            const prof = parseProfiles(row && row.value).find((p) => p.id === profile);
            if (!prof) return NextResponse.json({ error: 'Upload profile not found. Open Manage Sites and check your profiles.' }, { status: 400 });
            if (prof.servers.length === 0) return NextResponse.json({ error: `Profile "${prof.name}" has no servers.` }, { status: 400 });
        }

        const items = [];
        const errors = [];
        const seen = new Set();
        for (const link of lines) {
            const did = driveIdOf(link);
            if (!did) { errors.push({ link, error: 'Not a Google Drive file link (use the file link, not a folder link)' }); continue; }
            if (seen.has(did)) continue;
            seen.add(did);
            items.push({ link: `https://drive.google.com/file/d/${did}/view`, did });
        }

        const { data: existing } = items.length
            ? await supabase.from('files').select('id, name, size, status, mirrors, original_url').eq('user_id', userId).or(items.map((i) => `original_url.ilike.%${i.did}%`).join(','))
            : { data: [] };

        const siteOrigin = new URL(request.url).origin;
        const titles = await Promise.all(items.map((i) => (existing || []).some((e) => (e.original_url || '').includes(i.did)) ? null : titleOf(i.did)));

        const files = [];
        const rows = [];
        items.forEach((it, idx) => {
            const old = (existing || []).find((e) => (e.original_url || '').includes(it.did));
            if (old) {
                files.push({ id: old.id, name: old.name, size: old.size, status: old.status || 'Active', existed: true, original_url: it.link, mirrors: Array.isArray(old.mirrors) ? old.mirrors.length : 0 });
                return;
            }
            const id = newId();
            const name = titles[idx] || `Drive file ${it.did.slice(0, 8)}`;
            rows.push({
                id, name, size: 'Pending', quality: parseQuality(name).label || '', date: new Date().toISOString().split('T')[0], status: 'Processing',
                download_link: null, url: `${siteOrigin}/file/${id}`, embed_url: `${embedBase(siteOrigin)}/embed/${id}`,
                original_url: it.link, user_id: userId, profile, mirrors: [],
            });
            files.push({ id, name, size: 'Pending', status: 'Processing', existed: false, original_url: it.link, mirrors: 0, profile });
        });

        if (rows.length) {
            let batch = rows;
            let dbErr = null;
            for (let attempt = 0; attempt < 8; attempt++) {
                const res = await supabase.from('files').insert(batch);
                dbErr = res.error;
                if (!dbErr) break;
                const m = (dbErr.message || '').match(/'([A-Za-z0-9_]+)' column/);
                if (m && m[1] in batch[0] && m[1] !== 'id') {
                    batch = batch.map((r) => { const c = { ...r }; delete c[m[1]]; return c; });
                    continue;
                }
                break;
            }
            if (dbErr) return NextResponse.json({ error: 'Could not save the files: ' + dbErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, files, errors });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
