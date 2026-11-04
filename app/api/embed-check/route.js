import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';

// Used by the player's "Auto-switch server" option. It looks at ONE server's page from our side and says whether it
// clearly shows an error (not found / deleted / host down). It can NOT see inside the video itself, so when in doubt it answers ok.
// Same-origin POST only. The URL always comes from our own database, never from the request.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const reply = (status, body) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const GONE = /(file|video|page|link)\s+(was\s+|has\s+been\s+|is\s+)?(not\s+found|deleted|removed|unavailable|expired|doesn'?t\s+exist|does\s+not\s+exist)|no\s+longer\s+(available|exists)|404\s*(-|:)?\s*not\s+found|copyright\s+(claim|takedown)/i;

export async function POST(request) {
    let sameHost = false;
    try {
        const origin = request.headers.get('origin');
        sameHost = !!origin && new URL(origin).host === request.headers.get('host');
    } catch (e) { /* invalid origin */ }
    const site = request.headers.get('sec-fetch-site');
    if (!sameHost || (site && site !== 'same-origin')) return reply(403, { error: 'Forbidden' });

    let body;
    try { body = await request.json(); } catch (e) { return reply(400, { error: 'Bad request' }); }
    const id = String(body?.id || '').slice(0, 64);
    const key = String(body?.key || '').slice(0, 40);
    if (!id || !key) return reply(400, { error: 'Bad request' });

    const { data: file, error } = await supabase.rpc('public_file', { p_id: id });
    if (error || !file) return reply(404, { error: 'Not found' });
    const m = resolveMirrors(file.mirrors, file.domains).find((x) => x.id === key && x.embed);
    if (!m) return reply(404, { error: 'Not found' });

    let res;
    try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 6000);
        res = await fetch(m.embed, {
            method: 'GET',
            redirect: 'follow',
            signal: ctl.signal,
            cache: 'no-store',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', Accept: 'text/html,*/*' },
        });
        clearTimeout(t);
    } catch (e) {
        // a timeout says nothing (the host may just block our datacenter); any other network error means the host is not answering
        if (e && e.name === 'AbortError') return reply(200, { ok: true, unknown: true });
        return reply(200, { ok: false, reason: 'is not reachable' });
    }

    if (res.status === 404 || res.status === 410) return reply(200, { ok: false, reason: 'says the video is gone' });
    // 403 / 429 / 5xx are usually bot protection on the host, so they prove nothing
    if (!res.ok) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return reply(200, { ok: true, unknown: true }); }

    const type = (res.headers.get('content-type') || '').toLowerCase();
    if (!type.includes('text/html')) { try { res.body && res.body.cancel(); } catch (e) { /* ignore */ } return reply(200, { ok: true }); }

    let html = '';
    try { html = (await res.text()).slice(0, 200000); } catch (e) { return reply(200, { ok: true, unknown: true }); }
    // only the visible text of a SMALL page counts: a real player page is big and its scripts contain these words by accident
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 1500 && GONE.test(text)) return reply(200, { ok: false, reason: 'says the video was removed' });
    return reply(200, { ok: true });
}