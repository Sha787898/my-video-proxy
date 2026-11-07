import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function deviceOf(ua) {
    if (/bot|crawler|spider|preview|headless|curl|wget|facebookexternalhit/i.test(ua)) return 'bot';
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    if (/mobi|android|iphone/i.test(ua)) return 'mobile';
    return 'desktop';
}

// Public endpoint: records one view. Country comes from the hosting platform's headers; the IP is stored only as a one-way hash.
export async function POST(request) {
    try {
        const text = await request.text();
        let body = {};
        try { body = JSON.parse(text); } catch (e) { return NextResponse.json({ ok: false }, { status: 400 }); }
        const id = String(body.id || '').slice(0, 40);
        const kind = body.kind === 'page' ? 'page' : 'embed';
        if (!/^[\w-]{4,40}$/.test(id)) return NextResponse.json({ ok: false }, { status: 400 });

        const h = request.headers;
        const ua = h.get('user-agent') || '';
        const device = deviceOf(ua);
        if (device === 'bot') return NextResponse.json({ ok: true, skipped: 'bot' });

        const country = (h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || '').toUpperCase().slice(0, 2) || 'XX';
        let city = h.get('x-vercel-ip-city') || '';
        try { city = decodeURIComponent(city); } catch (e) { /* keep raw */ }
        const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || '';
        const ipHash = ip ? createHash('sha256').update(`ms|${ip}|${ua.slice(0, 60)}`).digest('hex').slice(0, 16) : null;
        const ref = String(body.ref || '').replace(/^www\./, '').slice(0, 80);

        const { error } = await supabase.rpc('track_view', {
            p_file: id, p_kind: kind, p_country: country, p_city: city.slice(0, 60), p_device: device, p_ref: ref, p_ip: ipHash,
        });
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ ok: false }, { status: 200 });
    }
}
