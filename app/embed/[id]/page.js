import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';
import { parseConfig } from '../../utils/playerConfig';
import EmbedPlayer from './EmbedPlayer';

// Our own fast servers (need the Worker address in Vercel: NEXT_PUBLIC_DL_BASE)
const DL_BASE = (process.env.NEXT_PUBLIC_DL_BASE || process.env.NEXT_PUBLIC_DL_WORKER || '').replace(/\/+$/, '');

// is there an HLS package for this file? (made by the transcode job, stored in R2 as <file id>/master.m3u8)
async function hasHls(id) {
    if (!DL_BASE) return false;
    try {
        const r = await fetch(`${DL_BASE}/hls/${encodeURIComponent(id)}/master.m3u8`, { method: 'HEAD', signal: AbortSignal.timeout(2500), next: { revalidate: 300 } });
        return r.ok;
    } catch (e) { return false; }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function Message({ title, lines }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#05070d', color: '#f8fafc', padding: 24, fontFamily: 'monospace', fontSize: 13, zIndex: 99999 }}>
            <p style={{ color: '#f87171', fontWeight: 700 }}>{title}</p>
            {lines.map((l, i) => (
                <p key={i} style={{ marginTop: 8, color: '#fbbf24' }}>{l}</p>
            ))}
        </div>
    );
}

async function EmbedContent({ params }) {
    const { id } = await params;

    // পাবলিক ভিউয়ারও দেখতে পাবে: public_file() ফাংশন দিয়ে (শুধু নিরাপদ কলাম)
    const { data: file, error } = await supabase.rpc('public_file', { p_id: id });

    if (error) {
        return <Message title="Player unavailable" lines={[`File ID: ${id}`, `Database error: ${error.message}`]} />;
    }
    if (!file) {
        return <Message title="Player unavailable" lines={[`File ID: ${id}`, 'No file with this ID was found in the database.']} />;
    }

    // ডোমেইন বদলালে এখানেই নতুন ডোমেইন দিয়ে লিংক বানানো হয়; শুধু যেসব সার্ভারে প্লেয়ার (embed) আছে
    const servers = resolveMirrors(file.mirrors, file.domains)
        .filter((m) => m.embed)
        .map((m) => ({ key: m.id, name: m.name })); // no host URLs in the page source: the player asks /api/embed-src for the active one

    if (DL_BASE) {
        // adaptive stream first (when it exists), then the Drive file straight from the Worker; the normal servers stay as the backup
        if (await hasHls(file.id)) servers.unshift({ key: 'hls', name: 'HLS (Adaptive)' });
        servers.splice(servers.length && servers[0].key === 'hls' ? 1 : 0, 0, { key: 'direct', name: 'Direct (Fast)' });
    }

    if (servers.length === 0) {
        return <Message title="No player server" lines={[`File: ${file.name}`, 'This file has no streaming-server links (mirrors are empty or download-only).']} />;
    }

    return <EmbedPlayer servers={servers} title={file.name} downloadHref={`/file/${file.id}`} fileId={file.id} config={parseConfig(file.config)} />;
}

export default function EmbedPage({ params }) {
    return (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#05070d', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>Loading Player...</div>}>
            <EmbedContent params={params} />
        </Suspense>
    );
}
