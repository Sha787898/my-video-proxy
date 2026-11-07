import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

const MAX_FILES = 500;
const MAX_FOLDERS = 40;

const folderIdOf = (s) => {
    const m = String(s).match(/\/folders\/([\w-]{15,})|[?&]id=([\w-]{15,})/);
    return m ? (m[1] || m[2]) : (/^[\w-]{20,}$/.test(String(s).trim()) ? String(s).trim() : null);
};
const decode = (t) => t.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

// reads one public folder through Drive's own embedded list view (no API key needed)
async function listFolder(id) {
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, { signal: AbortSignal.timeout(12000), headers: { 'Accept-Language': 'en', 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Google answered ${res.status}. Is the folder shared as "Anyone with the link"?`);
    const html = await res.text();
    const files = [];
    const folders = [];
    const re = /<div class="flip-entry"[^>]*id="entry-([\w-]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]*)<\/div>/g;
    let m;
    while ((m = re.exec(html))) {
        const [, eid, href, title] = m;
        if (/\/drive\/folders\//.test(href) || /folderview\?id=/.test(href)) folders.push({ id: eid, name: decode(title) });
        else files.push({ id: eid, name: decode(title) });
    }
    return { files, folders };
}

export async function POST(request) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        const { data: u } = await sb.auth.getUser(token);
        if (!u?.user) return NextResponse.json({ error: 'Session expired.' }, { status: 401 });

        const { url, deep } = await request.json();
        const root = folderIdOf(url);
        if (!root) return NextResponse.json({ error: 'This is not a Google Drive folder link.' }, { status: 400 });

        const out = [];
        const queue = [{ id: root, path: '' }];
        const seen = new Set([root]);
        let visited = 0;
        let firstErr = null;
        while (queue.length && out.length < MAX_FILES && visited < MAX_FOLDERS) {
            const cur = queue.shift();
            visited++;
            let r;
            try { r = await listFolder(cur.id); } catch (e) { if (!firstErr) firstErr = e.message; continue; }
            r.files.forEach((f) => { if (out.length < MAX_FILES) out.push({ id: f.id, name: f.name, path: cur.path, url: `https://drive.google.com/file/d/${f.id}/view` }); });
            if (deep !== false) r.folders.forEach((f) => { if (!seen.has(f.id)) { seen.add(f.id); queue.push({ id: f.id, path: `${cur.path}${f.name}/` }); } });
        }

        if (out.length === 0) {
            return NextResponse.json({ error: firstErr || 'No files found. Make sure the folder is shared as "Anyone with the link" and is not empty.' }, { status: 404 });
        }
        return NextResponse.json({ success: true, count: out.length, folders: visited, capped: out.length >= MAX_FILES, files: out });
    } catch (e) {
        return NextResponse.json({ error: e.message || 'Folder read failed' }, { status: 500 });
    }
}
