import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';

// Gives the player the real host URL of ONE server, on demand, so the page source (view-source)
// no longer contains any host / embed links. Only same-origin requests from the player are answered.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const reply = (status, body) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

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
    return reply(200, { url: m.embed });
}
