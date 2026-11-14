'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import DashboardTraffic from '../components/DashboardTraffic';
import { createClient } from '@supabase/supabase-js';
import {
    IconDashboard, IconFolder, IconShieldCheck, IconActivity, IconLogout,
    IconCloud, IconUpload, IconGlobe, IconLink, IconLaptop, IconChevronRight,
} from '../components/Icons';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const DL_BASE = (process.env.NEXT_PUBLIC_DL_WORKER || '').replace(/\/+$/, '');

const QUICK_ACTIONS = [
    { href: '/gdrive-upload', label: 'Google Drive Upload', desc: 'Mirror Drive files to every server', Icon: IconCloud, hot: true },
    { href: '/remote-upload', label: 'Remote Upload', desc: 'Mirror a file from a direct link', Icon: IconLink },
    { href: '/web-upload', label: 'Web Upload', desc: 'Upload from your browser', Icon: IconLaptop },
    { href: '/drive-upload', label: 'Drive Upload', desc: 'Send files from your drive storage', Icon: IconUpload },
    { href: '/file-manager', label: 'File Manager', desc: 'Browse, copy and manage files', Icon: IconFolder },
    { href: '/manage-sites', label: 'Manage Sites', desc: 'Add servers and API keys', Icon: IconGlobe },
];

function parseBytes(size) {
    const m = String(size || '').match(/([\d.]+)\s*(TB|GB|MB|KB)/i);
    if (!m) return 0;
    return parseFloat(m[1]) * { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[m[2].toUpperCase()];
}
const fmtBytes = (b) => (!b ? '0 MB' : b >= 1024 ** 4 ? (b / 1024 ** 4).toFixed(2) + ' TB' : b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(2) + ' GB' : (b / 1024 ** 2).toFixed(1) + ' MB');
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nameOf = (email) => { const n = String(email || '').split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim(); return n ? n.replace(/\b\w/g, (c) => c.toUpperCase()) : 'there'; };

function Spark({ values, color = '#ff6b73' }) {
    const w = 120; const h = 34; const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - 3 - (v / max) * (h - 8)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} opacity=".14" />
            <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function Ring({ pct, label }) {
    const r = 26; const c = 2 * Math.PI * r;
    return (
        <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={`${label} ${pct}%`}>
            <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
            <circle cx="34" cy="34" r={r} fill="none" stroke="#ff6b73" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 34 34)" />
            <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{pct}%</text>
        </svg>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);
    const [total, setTotal] = useState(0);
    const [servers, setServers] = useState(0);
    const [health, setHealth] = useState(DL_BASE ? 'checking' : 'off');
    const [hello, setHello] = useState('Welcome back');
    const [q, setQ] = useState('');
    const [copied, setCopied] = useState('');
    const [origin, setOrigin] = useState('');
    const [nowMs, setNowMs] = useState(0); // set after mount: the build must not read the clock
    const search = useRef(null);

    useEffect(() => {
        let dead = false;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            if (dead) return;
            setUser(session.user);
            const uid = session.user.id;

            const { count } = await supabase.from('files').select('*', { count: 'exact', head: true }).eq('user_id', uid);
            // created_at exists after sql/7-file-info.sql; fall back to 'date' when it is not there yet
            let rows = [];
            const withTs = await supabase.from('files').select('id, name, size, status, date, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(2000);
            if (!withTs.error) rows = withTs.data || [];
            else {
                const plain = await supabase.from('files').select('id, name, size, status, date').eq('user_id', uid).limit(2000);
                rows = plain.data || [];
            }
            const { data: st } = await supabase.from('settings').select('key, value').eq('user_id', uid).like('key', '%api_key');
            if (dead) return;
            setTotal(count || rows.length);
            setFiles(rows);
            setServers((st || []).filter((r) => String(r.value || '').trim()).length);
            const h = new Date().getHours();
            setHello(h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night');
            setOrigin(window.location.origin);
            setNowMs(Date.now());
            setLoading(false);
        })();
        return () => { dead = true; };
    }, [router]);

    // is the fast-download worker alive?
    useEffect(() => {
        if (!DL_BASE) return;
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 5000);
        fetch(`${DL_BASE}/`, { signal: ctl.signal, cache: 'no-store' }).then((r) => setHealth(r.ok ? 'on' : 'down')).catch(() => setHealth('down')).finally(() => clearTimeout(t));
        return () => { clearTimeout(t); ctl.abort(); };
    }, []);

    // Ctrl/Cmd + K jumps to search
    useEffect(() => {
        const on = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.current && search.current.focus(); } };
        window.addEventListener('keydown', on);
        return () => window.removeEventListener('keydown', on);
    }, []);

    const stats = useMemo(() => {
        if (!nowMs) return { bytes: 0, processing: 0, series: Array(14).fill(0), week: 0, ready: 100 };
        const bytes = files.reduce((a, f) => a + parseBytes(f.size), 0);
        const processing = files.filter((f) => /process|pending|queue/i.test(f.status || '')).length;
        const now = new Date(nowMs || 0);
        const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (13 - i)); return dayKey(d); });
        const per = Object.fromEntries(days.map((k) => [k, 0]));
        files.forEach((f) => { const raw = f.created_at || f.date; if (!raw) return; const d = new Date(raw); if (isNaN(d)) return; const k = dayKey(d); if (k in per) per[k] += 1; });
        const series = days.map((k) => per[k]);
        const week = series.slice(7).reduce((a, b) => a + b, 0);
        const ready = files.length ? Math.round(((files.length - processing) / files.length) * 100) : 100;
        return { bytes, processing, series, week, ready };
    }, [files, nowMs]);

    const shown = useMemo(() => {
        const s = q.trim().toLowerCase();
        const list = s ? files.filter((f) => String(f.name || '').toLowerCase().includes(s) || String(f.id).toLowerCase().includes(s)) : files;
        return list.slice(0, s ? 12 : 6);
    }, [files, q]);

    const copy = async (text, key) => {
        try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 1600); } catch (e) { /* ignore */ }
    };

    const setup = [
        { ok: servers > 0, t: 'Add at least one server API key', href: '/manage-sites' },
        { ok: total > 0, t: 'Upload your first file', href: '/gdrive-upload' },
        { ok: health === 'on', t: 'Connect the fast-download worker (NEXT_PUBLIC_DL_WORKER)', href: '/more-settings' },
        { ok: files.some((f) => f.created_at), t: 'Run sql/7-file-info.sql for file dates', href: '/more-settings' },
    ];
    const setupDone = setup.filter((s) => s.ok).length;

    if (loading) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400">
                    <IconActivity size={18} className="ms-spin" />
                    <span>Loading dashboard…</span>
                </div>
            </div>
        );
    }

    const hl = { on: ['Fast download online', '#34d399'], down: ['Worker unreachable', '#f87171'], off: ['Worker not set', '#f5b94a'], checking: ['Checking worker…', '#94a3b8'] }[health];

    return (
        <div className="ms-app flex">
            <style>{CSS}</style>
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconDashboard size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Cloud Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="xd-health" style={{ '--c': hl[1] }}><i />{hl[0]}</span>
                        <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="ms-btn ms-btn-danger ms-btn-sm">
                            <IconLogout size={14} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {/* Hero */}
                    <section className="xd-hero ms-fade-up">
                        <div className="xd-hero-t">
                            <p className="xd-eyebrow">{hello}</p>
                            <h2>{nameOf(user?.email)}, your media vault is <span>live</span>.</h2>
                            <p className="xd-lead">{total ? `${total} file${total === 1 ? '' : 's'} mirrored across ${servers || 'your'} server${servers === 1 ? '' : 's'}${stats.week ? ` · ${stats.week} added this week` : ''}.` : 'Upload your first file and MultiServer links are created instantly.'}</p>
                            <div className="xd-cta">
                                <Link href="/gdrive-upload" className="xd-btn xd-btn-main"><IconCloud size={16} /> Upload from Drive</Link>
                                <Link href="/file-manager" className="xd-btn"><IconFolder size={16} /> Open files</Link>
                                <Link href="/embed-generator" className="xd-btn"><IconLink size={16} /> Link generator</Link>
                            </div>
                        </div>
                        <div className="xd-hero-r">
                            <Ring pct={stats.ready} label="Ready" />
                            <div><b>{stats.ready}%</b><span>files ready</span></div>
                        </div>
                    </section>

                    {/* Stat tiles */}
                    <div className="xd-grid4">
                        <div className="xd-tile ms-fade-up"><p>Mirrored files</p><b>{total}</b><Spark values={stats.series} /><small>Last 14 days · {stats.week} this week</small></div>
                        <div className="xd-tile ms-fade-up"><p>Storage used</p><b>{fmtBytes(stats.bytes)}</b><div className="xd-meter"><i style={{ width: `${Math.min(100, (stats.bytes / 1024 ** 4) * 100).toFixed(1)}%` }} /></div><small>of 1 TB tracked across servers</small></div>
                        <div className="xd-tile ms-fade-up"><p>Servers connected</p><b>{servers}</b><div className="xd-dots">{Array.from({ length: 24 }, (_, i) => <i key={i} className={i < servers ? 'on' : ''} />)}</div><small>{servers >= 24 ? 'All servers connected' : `${Math.max(0, 24 - servers)} more available`}</small></div>
                        <div className="xd-tile ms-fade-up"><p>In processing</p><b>{stats.processing}</b><div className="xd-meter"><i className="amber" style={{ width: `${files.length ? (stats.processing / files.length) * 100 : 0}%` }} /></div><small>{stats.processing ? <Link href="/processing-files">View queue →</Link> : 'Nothing waiting'}</small></div>
                    </div>

                    <DashboardTraffic supabase={supabase} userId={user?.id} />

                    <div className="xd-cols">
                        {/* Recent / search */}
                        <section className="xd-panel ms-fade-up">
                            <div className="xd-panel-h">
                                <h3>{q ? 'Search results' : 'Recent files'}</h3>
                                <label className="xd-search">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                                    <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" aria-label="Search files" />
                                    <kbd>Ctrl K</kbd>
                                </label>
                            </div>
                            {shown.length === 0 ? (
                                <p className="xd-empty">{q ? 'No file matches your search.' : 'No files yet. Your uploads will show here.'}</p>
                            ) : (
                                <ul className="xd-list">
                                    {shown.map((f) => (
                                        <li key={f.id}>
                                            <div className="xd-f">
                                                <b title={f.name}>{f.name || f.id}</b>
                                                <span>{f.size || '—'} · <em className={/process|pending|queue/i.test(f.status || '') ? 'am' : 'gr'}>{f.status || 'Active'}</em></span>
                                            </div>
                                            <div className="xd-fa">
                                                <button type="button" onClick={() => copy(`${origin}/file/${f.id}`, `d${f.id}`)}>{copied === `d${f.id}` ? 'Copied' : 'Download link'}</button>
                                                <button type="button" onClick={() => copy(`${origin}/embed/${f.id}`, `e${f.id}`)}>{copied === `e${f.id}` ? 'Copied' : 'Embed link'}</button>
                                                <a href={`/file/${f.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open download page">Open</a>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Setup + health */}
                        <section className="xd-panel ms-fade-up">
                            <div className="xd-panel-h"><h3>Setup checklist</h3><span className="xd-pill">{setupDone}/{setup.length}</span></div>
                            <div className="xd-meter big"><i style={{ width: `${(setupDone / setup.length) * 100}%` }} /></div>
                            <ul className="xd-check">
                                {setup.map((s) => (
                                    <li key={s.t} className={s.ok ? 'ok' : ''}>
                                        <span>{s.ok ? '✓' : ''}</span>
                                        {s.ok ? <em>{s.t}</em> : <Link href={s.href}>{s.t}</Link>}
                                    </li>
                                ))}
                            </ul>
                            <div className="xd-sec"><IconShieldCheck size={16} /><span>Row-level security protects your data. Links keep working after a domain change.</span></div>
                        </section>
                    </div>

                    {/* Quick actions */}
                    <section className="space-y-3">
                        <h2 className="ms-h2">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {QUICK_ACTIONS.map(({ href, label, desc, Icon, hot }) => (
                                <Link key={href} href={href} className={`xd-act ${hot ? 'hot' : ''}`}>
                                    <span className="xd-act-i"><Icon size={18} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-white truncate">{label}</span>
                                        <span className="block ms-muted text-xs truncate">{desc}</span>
                                    </span>
                                    <IconChevronRight size={16} className="xd-act-c shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

const CSS = `
.xd-health { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; color: var(--c); padding: 6px 11px; border-radius: 99px; border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); white-space: nowrap; }
.xd-health i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 0 var(--c); animation: xd-ping 1.8s infinite; }
@keyframes xd-ping { 70% { box-shadow: 0 0 0 7px transparent; } }
@media (max-width: 640px) { .xd-health { display: none; } }
.xd-hero { display: flex; justify-content: space-between; gap: 18px; padding: 22px; border-radius: 20px; border: 1px solid rgba(255,107,115,.22); background: radial-gradient(900px 260px at 0% 0%, rgba(229,56,59,.2), transparent 60%), linear-gradient(180deg, rgba(20,24,34,.9), rgba(11,14,22,.95)); position: relative; overflow: hidden; }
.xd-hero::after { content: ''; position: absolute; top: 0; left: 24px; right: 24px; height: 2px; background: linear-gradient(90deg, transparent, #ff6b73, transparent); }
.xd-eyebrow { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #ff8a8f; }
.xd-hero h2 { margin: 6px 0 0; font-size: clamp(20px, 3.4vw, 30px); line-height: 1.2; font-weight: 800; color: #fff; letter-spacing: -.02em; }
.xd-hero h2 span { background: linear-gradient(90deg, #ff8a8f, #e5383b); -webkit-background-clip: text; background-clip: text; color: transparent; }
.xd-lead { margin: 8px 0 0; font-size: 13.5px; color: #a3aec2; max-width: 52ch; }
.xd-cta { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 16px; }
.xd-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 15px; border-radius: 12px; font-size: 13px; font-weight: 800; color: #e8ecf4; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); text-decoration: none; transition: transform .15s, background .2s, border-color .2s; }
.xd-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,.1); border-color: rgba(255,107,115,.45); }
.xd-btn-main { color: #fff; border-color: transparent; background: linear-gradient(135deg, #e5383b, #c92a2e); box-shadow: 0 8px 22px rgba(229,56,59,.35); }
.xd-btn-main:hover { background: linear-gradient(135deg, #f04447, #d5302f); }
.xd-hero-r { display: flex; align-items: center; gap: 10px; align-self: center; padding: 12px 16px; border-radius: 16px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); flex-shrink: 0; }
.xd-hero-r b { display: block; font-size: 20px; color: #fff; } .xd-hero-r span { font-size: 11px; color: #8e9bb0; font-weight: 700; }
@media (max-width: 720px) { .xd-hero { flex-direction: column; padding: 16px; } .xd-hero-r { align-self: flex-start; } }
.xd-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 1000px) { .xd-grid4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 460px) { .xd-grid4 { gap: 10px; } }
.xd-tile { padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); display: flex; flex-direction: column; gap: 6px; min-width: 0; transition: border-color .2s, transform .2s; }
.xd-tile:hover { border-color: rgba(255,107,115,.35); transform: translateY(-2px); }
.xd-tile p { margin: 0; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #7f8ba0; }
.xd-tile b { font-size: 26px; line-height: 1.1; font-weight: 800; color: #fff; letter-spacing: -.02em; }
.xd-tile small { font-size: 11px; color: #7f8ba0; font-weight: 600; } .xd-tile small a { color: #ff8a8f; }
.xd-meter { height: 7px; border-radius: 7px; background: rgba(255,255,255,.08); overflow: hidden; margin: 4px 0; } .xd-meter.big { height: 9px; margin: 8px 0 12px; }
.xd-meter i { display: block; height: 100%; min-width: 3px; border-radius: 7px; background: linear-gradient(90deg, #e5383b, #ff8a8f); transition: width .6s ease; } .xd-meter i.amber { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.xd-dots { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin: 6px 0; }
.xd-dots i { aspect-ratio: 1; border-radius: 4px; background: rgba(255,255,255,.08); } .xd-dots i.on { background: #34d399; box-shadow: 0 0 8px rgba(52,211,153,.5); }
.xd-cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px; }
@media (max-width: 900px) { .xd-cols { grid-template-columns: 1fr; } }
.xd-panel { padding: 16px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); min-width: 0; }
.xd-panel-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.xd-panel-h h3 { margin: 0; font-size: 14px; font-weight: 800; color: #fff; }
.xd-pill { font-size: 11px; font-weight: 800; color: #ff8a8f; padding: 3px 10px; border-radius: 99px; background: rgba(229,56,59,.12); border: 1px solid rgba(229,56,59,.3); }
.xd-search { display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 11px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #8e9bb0; min-width: 0; flex: 1 1 170px; max-width: 280px; }
.xd-search:focus-within { border-color: rgba(255,107,115,.5); }
.xd-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #fff; font: inherit; font-size: 12.5px; }
.xd-search kbd { font: inherit; font-size: 9.5px; font-weight: 800; padding: 2px 5px; border-radius: 5px; border: 1px solid rgba(255,255,255,.14); color: #8e9bb0; }
@media (max-width: 640px) { .xd-search kbd { display: none; } }
.xd-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.xd-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 11px; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.03); flex-wrap: wrap; transition: border-color .2s; }
.xd-list li:hover { border-color: rgba(255,107,115,.3); }
.xd-f { min-width: 0; flex: 1 1 180px; } .xd-f b { display: block; font-size: 13px; color: #f4f6fa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.xd-f span { font-size: 11px; color: #7f8ba0; font-weight: 600; } .xd-f em { font-style: normal; font-weight: 800; } .xd-f em.gr { color: #34d399; } .xd-f em.am { color: #fbbf24; }
.xd-fa { display: flex; gap: 6px; flex-wrap: wrap; }
.xd-fa button, .xd-fa a { font: inherit; font-size: 11px; font-weight: 800; padding: 6px 10px; border-radius: 9px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #d6dce8; cursor: pointer; text-decoration: none; transition: background .2s, border-color .2s; }
.xd-fa button:hover, .xd-fa a:hover { background: rgba(229,56,59,.16); border-color: rgba(255,107,115,.45); color: #fff; }
.xd-empty { margin: 8px 0; font-size: 12.5px; color: #7f8ba0; }
.xd-check { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.xd-check li { display: flex; align-items: center; gap: 9px; font-size: 12.5px; }
.xd-check li span { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.2); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: #fff; flex-shrink: 0; }
.xd-check li.ok span { background: #22c55e; border-color: #22c55e; } .xd-check li.ok em { color: #7f8ba0; font-style: normal; text-decoration: line-through; }
.xd-check a { color: #ffb3b6; font-weight: 700; text-decoration: none; } .xd-check a:hover { text-decoration: underline; }
.xd-sec { display: flex; gap: 9px; align-items: flex-start; padding: 10px; border-radius: 11px; background: rgba(52,211,153,.07); border: 1px solid rgba(52,211,153,.2); color: #8fe0c0; font-size: 11.5px; line-height: 1.45; }
.xd-sec svg { flex-shrink: 0; margin-top: 1px; }
.xd-act { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 15px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); text-decoration: none; min-width: 0; transition: transform .18s, border-color .2s, box-shadow .2s; }
.xd-act:hover { transform: translateY(-3px); border-color: rgba(255,107,115,.5); box-shadow: 0 12px 28px rgba(0,0,0,.4); }
.xd-act.hot { border-color: rgba(229,56,59,.4); background: linear-gradient(135deg, rgba(229,56,59,.16), rgba(12,15,23,.92)); }
.xd-act-i { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #ff8a8f; background: rgba(229,56,59,.12); border: 1px solid rgba(229,56,59,.3); flex-shrink: 0; transition: transform .2s; }
.xd-act:hover .xd-act-i { transform: rotate(-6deg) scale(1.08); }
.xd-act-c { color: #5b667a; transition: transform .2s, color .2s; } .xd-act:hover .xd-act-c { transform: translateX(3px); color: #ff8a8f; }
@media (prefers-reduced-motion: reduce) { .xd-health i, .xd-tile, .xd-act, .xd-btn { animation: none; transition: none; } }
`;