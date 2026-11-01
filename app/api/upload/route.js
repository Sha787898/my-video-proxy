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

// প্রতিটি সার্ভারের লিংকের গঠন. {c} = Worker থেকে পাওয়া code/id
//   type 'stream'   => প্লেয়ার/embed হয় (embed লিংক বানানো হয়)
//   type 'download' => শুধু ডাউনলোড/স্টোরেজ লিংক
// ✅ = নিশ্চিত, ⚠️ = আন্দাজ (প্রতিটা সার্ভারের ড্যাশবোর্ডে নিজের embed লিংক দেখে মিলিয়ে নিন)
const SERVERS = {
    vidmoly:     { name: 'Vidmoly',      type: 'stream',   host: 'https://vidmoly.org',       view: '/w/{c}', embed: '/embed-{c}.html' },                                   // ✅
    abyss:       { name: 'Abyss',        type: 'stream',   host: 'https://player.abyssplayer.com',       view: '/{c}',   embedHost: 'https://abysscdn.com', embed: '/?v={c}' },      // ✅
    voe:         { name: 'VOE',          type: 'stream',   host: 'https://voe.sx',           view: '/{c}',   embed: '/e/{c}' },                                            // ✅
    mixdrop:     { name: 'MixDrop',      type: 'stream',   host: 'https://mixdrop.ag',       view: '/f/{c}', embed: '/e/{c}' },                                            // ✅
    streamhg:    { name: 'StreamHG',     type: 'stream',   host: 'https://streamhg.com',     view: '/{c}',   embed: '/embed-{c}.html' },                                   // ⚠️
    earnvids:    { name: 'EarnVids',     type: 'stream',   host: 'https://earnvids.com',     view: '/{c}',   embed: '/embed-{c}.html' },                                   // ⚠️
    dropload:    { name: 'DropLoad',     type: 'stream',   host: 'https://dropload.io',      view: '/{c}',   embed: '/embed-{c}.html' },                                   // ⚠️
    ruby:        { name: 'Ruby',         type: 'stream',   host: 'https://streamruby.com',   view: '/{c}',   embed: '/embed-{c}.html' },                                   // ⚠️
    byse:        { name: 'Byse',         type: 'stream',   host: 'https://byse.sx',          view: '/{c}',   embed: '/e/{c}' },                                            // ⚠️
    turboviplay: { name: 'TurboViPlay',  type: 'stream',   host: 'https://turboviplay.com',  view: '/{c}',   embed: '/embed/{c}' },                                        // ⚠️
    pixeldrain:  { name: 'Pixeldrain',   type: 'download', host: 'https://pixeldrain.com',   view: '/u/{c}' },                                                             // ✅
    gofile:      { name: 'GoFile',       type: 'download', host: 'https://gofile.io',        view: '/d/{c}' },                                                             // ✅
    vikingfile:  { name: 'VikingFile',   type: 'download', host: 'https://vikingfile.com',   view: '/f/{c}' },                                                             // ⚠️
    buzzheavier: { name: 'BuzzHeavier',  type: 'download', host: 'https://buzzheavier.com',  view: '/{c}' },                                                               // ⚠️
    sendnow:     { name: 'Send.now',     type: 'download', host: 'https://send.now',         view: '/{c}' },                                                               // ⚠️
    mega:        { name: 'MEGA',         type: 'download', host: '',                         view: '{c}' },
    gcloud:      { name: 'Google Cloud', type: 'download', host: '',                         view: '{c}' },
};

// Worker-এর result (code বা পুরো URL) থেকে mirror অবজেক্ট বানায়; ব্যর্থ হলে null
function buildMirror(serverId, rawCode, customDomain) {
    const cfg = SERVERS[serverId];
    if (!cfg) return null;
    if (rawCode === null || rawCode === undefined) return null;
    const code = String(rawCode).trim();
    if (!code || code.startsWith('Failed')) return null;

    const fill = (tpl) => tpl.replace('{c}', code);
    const isUrl = /^https?:\/\//i.test(code);
    const host = (customDomain || cfg.host || '').replace(/\/$/, '');
    const embedHost = (customDomain || cfg.embedHost || cfg.host || '').replace(/\/$/, '');

    return {
        id: serverId,
        name: cfg.name,
        type: cfg.type,
        code,
        url: isUrl ? code : `${host}${fill(cfg.view)}`,
        embed: cfg.type === 'stream' && cfg.embed && !isUrl ? `${embedHost}${fill(cfg.embed)}` : null,
    };
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
                const m = buildMirror(id, results[id], get(`${id}_domain`));
                if (m) {
                    mirrors.push(m);
                } else {
                    const raw = results[id];
                    const reason = typeof raw === 'string' && raw.startsWith('Failed')
                        ? raw
                        : (KEY_MAP[id] && !keys[KEY_MAP[id]] ? 'API key missing' : 'No result');
                    failed.push({ id, name: SERVERS[id]?.name || id, reason });
                }
            }

            // সেরা ডাউনলোড লিংক: আগে download-type, না থাকলে যেকোনো একটা
            const bestDownload = mirrors.find((m) => m.type === 'download') || mirrors[0] || null;
            const best = bestDownload?.url || null;

            const fileResult = {
                ok: true,
                id: info.id || Math.random().toString(36).substring(2, 10),
                name: info.title || 'GDrive_Video.mp4',
                size: formatSize(info.size),
                status: mirrors.length > 0 ? 'Active' : 'Processing',
                download_link: best || 'Processing Mirror Links...',
                url: best || 'Processing Mirror Links...',
                original_url: link,
                already_exists: !!resData.exists,
                mirrors,
                failed,
                results,
            };

            // ---------- Supabase-এ সেভ (সবসময়: ফাইল ম্যানেজার/embed/download এখান থেকেই পড়ে) ----------
            const row = {
                id: fileResult.id,
                name: fileResult.name,
                size: fileResult.size,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: fileResult.status,
                download_link: best,
                original_url: link,
                user_id: userId,
                mirrors,
            };
            let { error: dbErr } = await supabase.from('files').upsert([row], { onConflict: 'id' });
            if (dbErr && /mirrors/i.test(dbErr.message || '')) {
                // `mirrors` কলাম এখনো যোগ করা হয়নি => বাকি তথ্য অন্তত সেভ করি
                const { mirrors: _omit, ...rowNoMirrors } = row;
                const retry = await supabase.from('files').upsert([rowNoMirrors], { onConflict: 'id' });
                dbErr = retry.error
                    ? retry.error
                    : { message: "files টেবিলে 'mirrors' কলাম নেই। SQL চালিয়ে কলামটা যোগ করুন, নইলে embed/download কাজ করবে না।" };
            }
            if (dbErr) {
                console.error('Supabase save error:', dbErr.message);
                fileResult.db_error = dbErr.message;
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