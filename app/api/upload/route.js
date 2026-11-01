import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SERVERS, PDLINK_SERVERS, buildMirror, resolveMirrors, domainsFromSettings } from '../../utils/mirrors';

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
    vidara: 'vidara_key',
    filepress: 'filepress_key',
    streamp2p: 'p2p_key',
    player4me: 'p4me_key',
    upnshare: 'upnshare_key',
    rpmshare: 'rpmshare_key',
    streamtape: 'streamtape_key',
};

// Worker-এর result-এ কিছু সার্ভারের নাম আলাদা
const RESULT_KEY = {
    filepress: 'fp_id',
    streamp2p: 'p2p_task',
    player4me: 'p4me_task',
    upnshare: 'upn_task',
    rpmshare: 'rpmshare_task',
    streamtape: 'streamtape_task',
};
const STATUS_KEY = {
    streamp2p: 'p2p_status',
    player4me: 'p4me_status',
    upnshare: 'upn_status',
    rpmshare: 'rpmshare_status',
    streamtape: 'streamtape_status',
};

// settings-এ `${id}_active` সেভ না থাকলে এই ডিফল্ট
const DEFAULT_ACTIVE = {
    vidmoly: true, abyss: true, gcloud: true, pixeldrain: true,
    vikingfile: false, gofile: false, voe: false, sendnow: false, streamhg: false,
    earnvids: false, turboviplay: false, dropload: false, ruby: false, byse: false,
    mixdrop: false, buzzheavier: false, mega: false,
    vidara: false, filepress: false, streamp2p: false, player4me: false,
    upnshare: false, rpmshare: false, streamtape: false,
};

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
        const stLogin = get('streamtape_login');
        if (stLogin) keys.streamtape_login = stLogin;

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
                const m = buildMirror(id, results[RESULT_KEY[id] || id]);
                if (m) {
                    mirrors.push(m);
                } else {
                    const raw = results[RESULT_KEY[id] || id];
                    const stat = STATUS_KEY[id] ? results[STATUS_KEY[id]] : null;
                    const reason = typeof raw === 'string' && raw.startsWith('Failed')
                        ? raw
                        : (stat && String(stat).startsWith('Failed')
                            ? String(stat)
                            : (KEY_MAP[id] && !keys[KEY_MAP[id]]
                                ? 'API key missing'
                                : (SERVERS[id]?.type === 'stream' || SERVERS[id]?.type === 'task'
                                    ? 'No result (Worker-এ PROXY_WORKERS সেট আছে কি?)'
                                    : 'No result')));
                    failed.push({ id, name: SERVERS[id]?.name || id, reason });
                }
            }

            // PDLink-এর ৫টা সার্ভার একই share id দেয় (আলাদা আলাদা হোস্টের id নয়)।
            // তাই pixeldrain.com/u/<share id> এর মতো লিংক ভুল। সবগুলোকে একটা PDLink লিংকে একত্র করি।
            const pdMirrors = mirrors.filter((m) => PDLINK_SERVERS.includes(m.id));
            if (pdMirrors.length > 0) {
                const code = pdMirrors[0].code;
                for (const m of pdMirrors) {
                    mirrors.splice(mirrors.indexOf(m), 1);
                }
                mirrors.push({
                    id: 'pdlink',
                    name: 'PDLink (' + pdMirrors.map((m) => m.name).join(' / ') + ')',
                    type: 'download',
                    code,
                });
            }

            // আগে সফল হওয়া কিন্তু এবার Worker-এ না আসা লিংক (যেমন Vidara) মুছে না ফেলে রেখে দিই
            try {
                const fileId = info.id;
                if (fileId) {
                    const { data: prev } = await supabase.from('files').select('mirrors').eq('id', fileId).maybeSingle();
                    if (prev && Array.isArray(prev.mirrors)) {
                        for (const pm of prev.mirrors) {
                            if (pm && pm.id && pm.code && !mirrors.some((m) => m.id === pm.id)) {
                                mirrors.push({ id: pm.id, name: pm.name, type: pm.type, code: pm.code });
                                const fi = failed.findIndex((f) => f.id === pm.id);
                                if (fi >= 0) failed.splice(fi, 1);
                            }
                        }
                    }
                }
            } catch (e) { /* ignore */ }

            if (info.pending || info.status === 'Processing') {
                failed.push({
                    id: 'pending',
                    name: 'কিছু সার্ভার',
                    reason: 'এখনো চলছে (বড় ফাইল) — ১-২ মিনিট পরে একই Drive লিংক আবার দিন, বাকি লিংক যোগ হবে',
                });
            }

            // দেখানোর জন্য বর্তমান ডোমেইন দিয়ে লিংক বানাই (ডাটাবেজে শুধু code যায়)
            const domains = domainsFromSettings(rows);
            const resolved = resolveMirrors(mirrors, domains);

            // সেরা ডাউনলোড লিংক: আগে download-type, না থাকলে যেকোনো একটা
            const bestDownload = resolved.find((m) => m.type === 'download') || resolved.find((m) => m.type === 'stream') || null;
            const best = bestDownload?.url || null;

            const fileResult = {
                ok: true,
                id: info.id || Math.random().toString(36).substring(2, 10),
                name: info.title || 'GDrive_Video.mp4',
                size: formatSize(info.size),
                status: resolved.some((m) => m.type !== 'task') ? 'Active' : 'Processing',
                download_link: best || 'Processing Mirror Links...',
                url: best || 'Processing Mirror Links...',
                original_url: link,
                already_exists: !!resData.exists,
                mirrors: resolved,
                failed,
                results,
            };

            // ---------- Supabase-এ সেভ (সবসময়: ফাইল ম্যানেজার/embed/download এখান থেকেই পড়ে) ----------
            const siteOrigin = new URL(request.url).origin;
            const row = {
                id: fileResult.id,
                name: fileResult.name,
                size: fileResult.size,
                quality: '1080p WEB-DL',
                date: new Date().toISOString().split('T')[0],
                status: fileResult.status,
                download_link: best,
                // পুরনো টেবিলে `url` NOT NULL কলাম আছে, তাই সবসময় একটা মান দিই
                url: best || `${siteOrigin}/file/${fileResult.id}`,
                embed_url: `${siteOrigin}/embed/${fileResult.id}`,
                original_url: link,
                user_id: userId,
                mirrors, // শুধু {id,name,type,code}
            };
            // কোনো কলাম টেবিলে না থাকলে সেটা বাদ দিয়ে আবার চেষ্টা (বাকি তথ্য অন্তত সেভ হোক)
            const missingCols = [];
            let dbErr = null;
            for (let attempt = 0; attempt < 8; attempt++) {
                const res = await supabase.from('files').upsert([row], { onConflict: 'id' });
                dbErr = res.error;
                if (!dbErr) break;
                const m = (dbErr.message || '').match(/'([A-Za-z0-9_]+)' column/);
                if (m && m[1] in row && m[1] !== 'id') {
                    missingCols.push(m[1]);
                    delete row[m[1]];
                    continue;
                }
                break;
            }
            if (missingCols.length > 0 && !dbErr) {
                dbErr = { message: `files টেবিলে এই কলামগুলো নেই: ${missingCols.join(', ')}। SQL চালিয়ে যোগ করুন (embed/download এর জন্য 'mirrors' জরুরি)।` };
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