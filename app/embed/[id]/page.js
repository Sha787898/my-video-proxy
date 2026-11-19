import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors } from '../../utils/mirrors';
import { parseConfig } from '../../utils/playerConfig';
import EmbedPlayer from './EmbedPlayer';

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
