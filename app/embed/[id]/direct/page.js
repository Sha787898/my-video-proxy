import { Suspense } from 'react';
import DirectPlayer from './DirectPlayer';
import { createClient } from '@supabase/supabase-js';
import { extrasOf } from '../../../utils/playerConfig';

// /embed/<id>/direct?m=direct|hls  -> our own player. It lives under /embed/ so it is also served on the separate player host (proxy.js).
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const BASE = (process.env.NEXT_PUBLIC_DL_BASE || process.env.NEXT_PUBLIC_DL_WORKER || '').replace(/\/+$/, '');

async function Content({ params, searchParams }) {
    const { id } = await params;
    const sp = await searchParams;
    const mode = sp && sp.m === 'hls' ? 'hls' : 'direct';
    const { data: file } = await supabase.rpc('public_file', { p_id: id });
    if (!BASE || !file) {
        return <div style={{ position: 'fixed', inset: 0, background: '#05070d', color: '#f87171', padding: 24, fontFamily: 'monospace', fontSize: 13 }}>Player unavailable</div>;
    }
    return <DirectPlayer id={String(id)} name={file.name} mode={mode} base={BASE} vlc={extrasOf(file.config).vlcPlayer} />;
}

export default function Page({ params, searchParams }) {
    return (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#000' }} />}>
            <Content params={params} searchParams={searchParams} />
        </Suspense>
    );
}
