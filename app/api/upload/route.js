import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel-এ অনেক লিংক একসাথে দিলে timeout এড়াতে (বিল্ড এরর দিলে এই লাইনটা মুছে দিন)
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Vercel Environment Variables-এ সেট করুন:
//   WORKER_URL   = https://multiserver-worker.shabidalhasan.workers.dev
//   SITE_SECRET  = (একটা লম্বা random লেখা; Worker-এও একই SITE_SECRET দিন)
const WORKER_URL = process.env.WORKER_URL || 'https://multiserver-worker.shabidalhasan.workers.dev';
const SITE_SECRET = process.env.SITE_SECRET;

// manage-sites এর server id  ->  Worker-এর key এর নাম
const KEY_MAP = {
    voe: 'voe_key',
    sendnow: 'sendnow_key',
    streamhg: 'streamhg_key',
    earnvids: 'earnvids_key',
    vidmoly: 'vidmoly_key',
    turboviplay: 'turboviplay_key',
    dropload: 'dropload_key',
    ruby: 'ruby_key',
    byse: 'byse_key',
    abyss: 'abyss_key',
    gcloud: 'gcloud_key',
    mixdrop: 'mixdrop_key',
};

// এই ৫টা সার্ভার Worker-এ PDLink দিয়ে যায় (আলাদা key লাগে না)
const PDLINK_SERVERS = ['gofile', 'pixeldrain', 'vikingfile', 'buzzheavier', 'mega'];

// settings-এ `${id}_active` সেভ না থাকলে এই ডিফল্ট
const DEFAULT_ACTIVE = {
    vidmoly: true, abyss: true, gcloud: true, pixeldrain: true,
    vikingfile: false, gofile: false, voe: false, sendnow: false, streamhg: false,
    earnvids: false, turboviplay: false, dropload: false, ruby: false, byse: false,
    mixdrop: false, buzzheavier: false, mega: false,
};

// সফল result code থেকে দেখার লিংক বানানো
const LINK_BUILDERS = {
    pixeldrain: (c) => `https://pixeldrain.com/u/${c}`,
    gofile: (c) => `https://gofile.io/d/${c}`,
    abyss: (c) => `https://hydrax.net/${c}`,
    vidmoly: (c) => `https://vidmoly.me/w/${c}`,
    mixdrop: (c) => `https://mixdrop.ag/f/${c}`,
    voe: (c) => `https://voe.sx/${c}`,
    vikingfile: (c) => `https://vikingfile.com/f/${c}`,
    buzzheavier: (c) => `https://buzzheavier.com/${c}`,
    sendnow: (c) => `https://send.now/${c}`,
    streamhg: (c) => `https://streamhg.com/${c}`,
    earnvids: (c) => `https://earnvids.com/${c}`,
    turboviplay: (c) => `https://turboviplay.com/${c}`,
    dropload: (c) => `https://dropload.io/${c}`,
    ruby: (c) => `https://streamruby.com/${c}`,
    byse: (c) => `https://byse.sx/${c}`,
    mega: (c) => c,
    gcloud: (c) => c,
};

const SERVER_LABELS = {
    vidmoly: 'Vidmoly', abyss: 'Abyss', gcloud: 'Google Cloud', pixeldrain: 'Pixeldrain',
    vikingfile: 'VikingFile', gofile: 'GoFile', voe: 'VOE', sendnow: 'Send.now',
    streamhg: 'StreamHG', earnvids: 'EarnVids', turboviplay: 'TurboViPlay', dropload: 'DropLoad',
    ruby: 'Ruby', byse: 'Byse', mixdrop: 'MixDrop', buzzheavier: 'BuzzHeavier', mega: 'MEGA',
};

function buildLink(serverId, code, customDomain) {
    if (!code || typeof code !== 'string') return null;
    if (code.startsWith('Failed')) return null;
    if (/^https?:\/\//i.test(code)) return code; // Worker/PDLink পুরো লিংক দিলে সেটাই
    if (customDomain) return `${customDomain.replace(/\/$/, '')}/${code}`;
    const b = LINK_BUILDERS[serverId];
    return b ? b(code) : code;
}

function formatSize(sizeVal) {
    const bytes = parseInt(sizeVal, 10);
    if (!bytes || Number.isNaN(bytes)) return 'Unknown Size';
    return bytes > 1024 * 1024 * 1024
        ? (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        : (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export async function POST(request) {
    try {
        // ---------- 1) লগইন যাচাই (Supabase JWT) ----------
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            return NextResponse.json({ error: 'Not logged in. Please login again.' }, { status: 401 });
        }

        // ইউজারের নিজের token দিয়ে client => RLS ঠিকভাবে কাজ করে
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userData?.user) {
            return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });
        }
        const userId = userData.user.id;

        if (!SITE_SECRET) {
            return NextResponse.json({ error: 'SITE_SECRET is not set in Vercel environment variables.' }, { status: 500 });
        }

        // ---------- 2) লিংক ----------
        const body = await request.json();
        const { links } = body;
        if (!links || typeof links !== 'string' || links.trim() === '') {
            return NextResponse.json({ error: 'No links provided' }, { status: 400 });
        }
        const linkArray = links
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.includes('1xxxxxxx') && !l.includes('2xxxxxxx'));
        if (linkArray.length === 0) {
            return NextResponse.json({ error: 'Please enter valid Google Drive links' }, { status: 400 });
        }

        // ---------- 3) ইউজারের সব সেটিং পড়ে Worker config বানানো ----------
        const { data: rows, error: setErr } = await supabase
            .from('settings')
            .select('key, value')
            .eq('user_id', userId);
        if (setErr) {
            return NextResponse.json({ error: 'Could not read settings: ' + setErr.message }, { status: 500 });
        }
        const get = (k) => rows?.find((r) => r.key === k)?.value || '';

        const activeServers = Object.keys(DEFAULT_ACTIVE).filter((id) => {
            const saved = get(`${id}_active`);
            return saved === '' ? DEFAULT_ACTIVE[id] : saved === 'true';
        });

        const keys = {};
        for (const [id, workerKey] of Object.entries(KEY_MAP)) {
            const v = get(`${id}_api_key`);
            if (v) keys[workerKey] = v;
        }
        const mixEmail = get('mixdrop_email');
        if (mixEmail) keys.mixdrop_email = mixEmail;

        if (activeServers.length === 0) {
            return NextResponse.json({ error: 'কোনো সার্ভার চালু নেই। Manage Sites থেকে অন্তত একটা সার্ভার ON করুন।' }, { status: 400 });
        }

        // কোন সার্ভার চালু আছে কিন্তু key নেই (ব্যবহারকারীকে জানানোর জন্য)
        const missingKeys = activeServers.filter(
            (id) => KEY_MAP[id] && !keys[KEY_MAP[id]] && !PDLINK_SERVERS.includes(id)
        );

        const config = { servers: activeServers, keys };

        // ---------- 4) প্রতিটি লিংক Worker-এ (সমান্তরালে) ----------
        const processLink = async (link) => {
            let workerRes;
            try {
                workerRes = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Site-Secret': SITE_SECRET,
                    },
                    body: JSON.stringify({ driveUrl: link, uid: userId, config }),
                    signal: AbortSignal.timeout(55000),
                });
            } catch (e) {
                return { ok: false, original_url: link, error: 'Worker unreachable: ' + e.message };
            }

            let resData = {};
            try {
                resData = await workerRes.json();
            } catch {
                return { ok: false, original_url: link, error: `Worker returned invalid response (HTTP ${workerRes.status})` };
            }

            if (!workerRes.ok || resData.status !== 'success') {
                return { ok: false, original_url: link, error: resData.message || `Worker error (HTTP ${workerRes.status})` };
            }

            const info = resData.data || {};
            const results = info.results || {};

            const mirrors = [];
            const failed = [];
            for (const id of activeServers) {
                const code = results[id];
                const customDomain = get(`${id}_domain`);
                const linkUrl = buildLink(id, code, customDomain);
                if (linkUrl) {
                    mirrors.push({ id, name: SERVER_LABELS[id] || id, code, url: linkUrl });
                } else {
                    const reason = typeof code === 'string' && code.startsWith('Failed')
                        ? code
                        : (KEY_MAP[id] && !keys[KEY_MAP[id]] ? 'API key missing' : 'No result');
                    failed.push({ id, name: SERVER_LABELS[id] || id, reason });
                }
            }

            const best = mirrors[0]?.url || null;
            const fileResult = {
                ok: true,
                id: info.id || Math.random().toString(36).substring(2, 10),
                name: info.title || 'GDrive_Video.mp4',
                size: formatSize(info.size),
                status: best ? 'Active' : 'error',
                download_link: best || 'Processing Mirror Links...',
                url: best || 'Processing Mirror Links...',
                original_url: link,
                already_exists: !!resData.exists,
                mirrors,
                failed,
                results,
            };

            // Supabase-এ হিস্টরি সেভ (শুধু সফল হলে, আর আগে থেকে না থাকলে)
            if (best && !resData.exists) {
                const { error: dbErr } = await supabase.from('files').insert([{
                    id: fileResult.id,
                    name: fileResult.name,
                    size: fileResult.size,
                    quality: '1080p WEB-DL',
                    date: new Date().toISOString().split('T')[0],
                    status: fileResult.status,
                    download_link: best,
                    original_url: link,
                    user_id: userId,
                }]);
                if (dbErr) console.error('Supabase insert warning:', dbErr.message);
            }

            return fileResult;
        };

        const all = await Promise.all(linkArray.map(processLink));
        const files = all.filter((r) => r.ok);
        const errors = all.filter((r) => !r.ok).map((r) => ({ link: r.original_url, error: r.error }));

        if (files.length === 0) {
            return NextResponse.json(
                { error: errors[0]?.error || 'Upload failed', errors },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            count: files.length,
            files,
            errors,
            missingKeys,
        });
    } catch (err) {
        console.error('Proxy Route Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}