'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles, PROFILES_KEY } from '../utils/profiles';
import { IconChart, IconRefresh, IconInfo } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

function parseBytes(size) {
    const m = String(size || '').match(/([\d.]+)\s*(TB|GB|MB|KB)/i);
    if (!m) return 0;
    const mult = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[m[2].toUpperCase()];
    return parseFloat(m[1]) * mult;
}
function fmtBytes(b) {
    if (!b) return '0 MB';
    if (b >= 1024 ** 4) return (b / 1024 ** 4).toFixed(2) + ' TB';
    if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(2) + ' GB';
    return (b / 1024 ** 2).toFixed(1) + ' MB';
}
const fmtNum = (n) => Number(n || 0).toLocaleString('en-US');

let regionNames = null;
function countryName(code) {
    if (!code || code === 'XX') return 'Unknown';
    try {
        if (!regionNames) regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames.of(code) || code;
    } catch (e) { return code; }
}
const flag = (code) => (/^[A-Z]{2}$/.test(code || '') && code !== 'XX' ? String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0))) : '🌐');

// smooth line through points (simple Catmull-Rom -> cubic bezier)
function smoothPath(pts) {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
}

// ---------- chart ----------
// series: [{ name, color, values[] }], labels[] -- hover shows a tooltip with every series
function LineChart({ labels, series, height = 260, area = true, labelEvery = 1 }) {
    const W = 1000;
    const H = height;
    const padL = 40; const padR = 12; const padT = 14; const padB = 28;
    const [hover, setHover] = useState(null);
    const ref = useRef(null);
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4;
    const n = labels.length;
    const x = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
    const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t * 100) / 100);

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
        setHover(Math.max(0, Math.min(n - 1, i)));
    };

    return (
        <div className="relative">
            <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Views chart">
                <defs>
                    {series.map((s, i) => (
                        <linearGradient key={s.name} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                        </linearGradient>
                    ))}
                </defs>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
                        <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6e6e7a">{Number.isInteger(t) ? t : t.toFixed(1)}</text>
                    </g>
                ))}
                {labels.map((l, i) => (i % labelEvery === 0 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6e6e7a">{l}</text> : null))}
                {series.map((s, i) => {
                    const pts = s.values.map((v, k) => [x(k), y(v)]);
                    const line = smoothPath(pts);
                    return (
                        <g key={s.name}>
                            {area && i === 0 && pts.length > 1 && <path d={`${line} L${pts[pts.length - 1][0]},${H - padB} L${pts[0][0]},${H - padB} Z`} fill={`url(#ag${i})`} />}
                            <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
                        </g>
                    );
                })}
                {hover !== null && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 4" />
                        {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r="5" fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
                    </g>
                )}
            </svg>
            {hover !== null && (
                <div className="pointer-events-none absolute top-2 rounded-xl border border-white/15 bg-black/85 px-3 py-2 text-xs shadow-xl" style={{ left: `${Math.min(80, Math.max(2, (x(hover) / W) * 100 + 1))}%` }}>
                    <p className="font-bold text-slate-300 mb-1">{labels[hover]}</p>
                    {series.map((s) => (
                        <p key={s.name} className="flex items-center gap-2 text-white"><span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.name}: <b>{fmtNum(s.values[hover])}</b></p>
                    ))}
                </div>
            )}
        </div>
    );
}

const TABS = [['date', 'Date'], ['country', 'Country'], ['files', 'Files'], ['profiles', 'Profiles'], ['sources', 'Devices & sources']];
const PRESETS = [['Today', 0], ['7 days', 6], ['30 days', 29], ['90 days', 89]];

function Stat({ label, value, sub, tone = 'red' }) {
    const c = tone === 'green' ? 'text-emerald-400' : tone === 'white' ? 'text-white' : 'text-white';
    return (
        <div className="ms-card ms-fade-up p-4">
            <p className="ms-h2">{label}</p>
            <p className={`text-2xl font-bold mt-2 ${c}`}>{value}</p>
            {sub && <p className="ms-muted text-xs mt-1">{sub}</p>}
        </div>
    );
}

function Bar({ pct }) {
    return <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-300" style={{ width: `${Math.max(2, pct)}%` }} /></div>;
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [views, setViews] = useState([]);
    const [files, setFiles] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [tab, setTab] = useState('date');
    const today = startOfDay(new Date());
    const [from, setFrom] = useState(dayKey(addDays(today, -6)));
    const [to, setTo] = useState(dayKey(today));
    const [refreshing, setRefreshing] = useState(false);

    const load = async (uid) => {
        setRefreshing(true);
        const since = new Date(Math.min(new Date(from + 'T00:00:00').getTime(), addDays(startOfDay(new Date()), -30).getTime()));
        const rows = [];
        for (let page = 0; page < 60; page++) {
            const { data, error } = await supabase.from('views').select('ts, file_id, kind, country, device, ref, ip_hash').eq('owner', uid).gte('ts', since.toISOString()).order('ts', { ascending: false }).range(page * 1000, page * 1000 + 999);
            if (error) {
                setErr(/relation .*views.* does not exist|views.*schema cache/i.test(error.message) ? 'The analytics table is missing. Run sql/6-analytics.sql once in Supabase > SQL Editor.' : error.message);
                break;
            }
            rows.push(...(data || []));
            if (!data || data.length < 1000) break;
        }
        setViews(rows);
        const [f, st] = await Promise.all([
            supabase.from('files').select('id, name, size, profile, date').eq('user_id', uid).limit(5000),
            supabase.from('settings').select('value').eq('user_id', uid).eq('key', PROFILES_KEY).maybeSingle(),
        ]);
        setFiles(f.data || []);
        setProfiles(parseProfiles(st.data && st.data.value));
        setRefreshing(false);
    };

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setUser(session.user);
            await load(session.user.id);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    useEffect(() => { if (user && !loading) load(user.id); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from]);

    const fileMap = useMemo(() => { const m = {}; files.forEach((f) => { m[f.id] = f; }); return m; }, [files]);

    const A = useMemo(() => {
        const fromT = new Date(from + 'T00:00:00').getTime();
        const toT = new Date(to + 'T23:59:59').getTime();
        const inRange = views.filter((v) => { const t = new Date(v.ts).getTime(); return t >= fromT && t <= toT; });

        // days in range
        const days = [];
        for (let d = new Date(from + 'T00:00:00'); d.getTime() <= toT && days.length < 400; d = addDays(d, 1)) days.push(dayKey(d));
        const byDay = {};
        days.forEach((k) => { byDay[k] = { views: 0, players: 0, pages: 0, uniq: new Set(), mobile: 0, bytes: 0 }; });
        const country = {}; const byFile = {}; const byProfile = {}; const dev = {}; const refs = {};
        const uniqAll = new Set();
        inRange.forEach((v) => {
            const k = dayKey(new Date(v.ts));
            const row = byDay[k];
            const f = fileMap[v.file_id];
            const bytes = v.kind === 'embed' && f ? parseBytes(f.size) : 0;
            if (row) {
                row.views += 1;
                if (v.kind === 'embed') row.players += 1; else row.pages += 1;
                if (v.ip_hash) row.uniq.add(v.ip_hash);
                if (v.device === 'mobile' || v.device === 'tablet') row.mobile += 1;
                row.bytes += bytes;
            }
            if (v.ip_hash) uniqAll.add(v.ip_hash);
            const c = (country[v.country || 'XX'] = country[v.country || 'XX'] || { views: 0, uniq: new Set() });
            c.views += 1; if (v.ip_hash) c.uniq.add(v.ip_hash);
            const fe = (byFile[v.file_id] = byFile[v.file_id] || { views: 0, uniq: new Set(), bytes: 0 });
            fe.views += 1; fe.bytes += bytes; if (v.ip_hash) fe.uniq.add(v.ip_hash);
            const pid = (f && f.profile) || 'default';
            const pe = (byProfile[pid] = byProfile[pid] || { views: 0, uniq: new Set(), bytes: 0 });
            pe.views += 1; pe.bytes += bytes; if (v.ip_hash) pe.uniq.add(v.ip_hash);
            dev[v.device || 'desktop'] = (dev[v.device || 'desktop'] || 0) + 1;
            const r = v.ref || 'Direct';
            refs[r] = (refs[r] || 0) + 1;
        });

        // today by hour
        const hours = Array.from({ length: 24 }, () => 0);
        const tk = dayKey(new Date());
        views.forEach((v) => { const d = new Date(v.ts); if (dayKey(d) === tk) hours[d.getHours()] += 1; });

        // last 30 days visitors
        const m30 = new Set(); const t30 = addDays(startOfDay(new Date()), -29).getTime();
        let views30 = 0;
        views.forEach((v) => { if (new Date(v.ts).getTime() >= t30) { views30 += 1; if (v.ip_hash) m30.add(v.ip_hash); } });

        // uploads
        const filesInRange = files.filter((f) => f.date && f.date >= from && f.date <= to);
        const uploadedBytes = filesInRange.reduce((n, f) => n + parseBytes(f.size), 0);
        const allBytes = files.reduce((n, f) => n + parseBytes(f.size), 0);
        const estBytes = Object.values(byDay).reduce((n, r) => n + r.bytes, 0);

        return { inRange, days, byDay, country, byFile, byProfile, dev, refs, hours, visitors30: m30.size, views30, uniqAll, filesInRange, uploadedBytes, allBytes, estBytes };
    }, [views, files, fileMap, from, to]);

    if (loading) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400"><IconRefresh size={18} className="ms-spin" /><span>Loading analytics…</span></div>
            </div>
        );
    }

    const todayViews = A.hours.reduce((a, b) => a + b, 0);
    const dayLabels = A.days.map((k) => { const d = new Date(k + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); });
    const labelEvery = Math.max(1, Math.ceil(A.days.length / 10));
    const profName = (id) => (id === 'default' ? 'Default' : (profiles.find((p) => p.id === id)?.name || id));
    const countryRows = Object.entries(A.country).map(([c, v]) => ({ c, views: v.views, uniq: v.uniq.size })).sort((a, b) => b.views - a.views);
    const fileRows = Object.entries(A.byFile).map(([id, v]) => ({ id, name: fileMap[id]?.name || id, size: fileMap[id]?.size || '', profile: fileMap[id]?.profile || 'default', views: v.views, uniq: v.uniq.size, bytes: v.bytes })).sort((a, b) => b.views - a.views);
    const profileIds = ['default', ...profiles.map((p) => p.id)];
    Object.keys(A.byProfile).forEach((id) => { if (!profileIds.includes(id)) profileIds.push(id); });
    const profileRows = profileIds.map((id) => {
        const fs = files.filter((f) => (f.profile || 'default') === id);
        const v = A.byProfile[id] || { views: 0, uniq: new Set(), bytes: 0 };
        return { id, name: profName(id), files: fs.length, uploaded: fs.reduce((n, f) => n + parseBytes(f.size), 0), views: v.views, uniq: v.uniq.size, bytes: v.bytes };
    });
    const maxC = countryRows[0]?.views || 1;
    const maxF = fileRows[0]?.views || 1;
    const totalViews = A.inRange.length;
    const devRows = Object.entries(A.dev).sort((a, b) => b[1] - a[1]);
    const refRows = Object.entries(A.refs).sort((a, b) => b[1] - a[1]).slice(0, 15);

    const setPreset = (n) => { setFrom(dayKey(addDays(startOfDay(new Date()), -n))); setTo(dayKey(startOfDay(new Date()))); };

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><IconChart size={18} /></span>
                        <h1 className="ms-h1 truncate">Traffic Analytics</h1>
                    </div>
                    <button type="button" onClick={() => load(user.id)} disabled={refreshing} className="ms-btn ms-btn-ghost ms-btn-sm shrink-0">
                        <IconRefresh size={14} className={refreshing ? 'ms-spin' : ''} /> Refresh
                    </button>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {err && (
                        <div className="ms-alert ms-alert-amber"><IconInfo size={16} className="shrink-0 mt-0.5" /><span className="min-w-0 break-words">{err}</span></div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        <Stat label="Views (range)" value={fmtNum(totalViews)} sub={`${fmtNum(A.byDay && Object.values(A.byDay).reduce((n, r) => n + r.players, 0))} player · ${fmtNum(Object.values(A.byDay).reduce((n, r) => n + r.pages, 0))} page`} />
                        <Stat label="Visitors (range)" value={fmtNum(A.uniqAll.size)} sub="Unique people" />
                        <Stat label="Views today" value={fmtNum(todayViews)} sub="Since midnight" />
                        <Stat label="Monthly users" value={fmtNum(A.visitors30)} sub={`${fmtNum(A.views30)} views, last 30 days`} />
                        <Stat label="Uploaded" value={fmtBytes(A.uploadedBytes)} sub={`${A.filesInRange.length} file(s) in range · ${fmtBytes(A.allBytes)} total`} />
                        <Stat label="Est. delivered" value={fmtBytes(A.estBytes)} sub="Player views × file size" />
                    </div>

                    <div className="ms-card p-4 sm:p-5">
                        <h2 className="font-bold text-white text-sm">Hourly views today</h2>
                        <p className="ms-muted text-xs mb-3">Your local time. Hover the line for each hour.</p>
                        <LineChart labels={A.hours.map((_, h) => `${pad(h)}:00`)} series={[{ name: 'Views', color: '#e5383b', values: A.hours }]} height={200} labelEvery={3} area />
                    </div>

                    <div className="ms-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
                        <span className="ms-label !mb-0">Date range</span>
                        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="ms-input !w-auto !min-h-[38px]" aria-label="From" />
                        <span className="ms-muted text-xs">to</span>
                        <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="ms-input !w-auto !min-h-[38px]" aria-label="To" />
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                            {PRESETS.map(([l, n]) => <button key={l} type="button" onClick={() => setPreset(n)} className="ms-btn ms-btn-ghost ms-btn-sm">{l}</button>)}
                        </div>
                    </div>

                    <div className="flex gap-1 border-b border-white/10 overflow-x-auto" role="tablist">
                        {TABS.map(([k, l]) => (
                            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${tab === k ? 'text-white border-red-500' : 'text-slate-400 border-transparent hover:text-white'}`}>{l}</button>
                        ))}
                    </div>

                    {tab === 'date' && (
                        <>
                            <div className="ms-card p-4 sm:p-5">
                                <div className="flex flex-wrap gap-4 text-xs mb-3 justify-center">
                                    <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-[#e5383b]" />Views</span>
                                    <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />Visitors</span>
                                    <span className="flex items-center gap-1.5 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Mobile</span>
                                </div>
                                <LineChart
                                    labels={dayLabels}
                                    labelEvery={labelEvery}
                                    series={[
                                        { name: 'Views', color: '#e5383b', values: A.days.map((k) => A.byDay[k].views) },
                                        { name: 'Visitors', color: '#22c55e', values: A.days.map((k) => A.byDay[k].uniq.size) },
                                        { name: 'Mobile', color: '#f59e0b', values: A.days.map((k) => A.byDay[k].mobile) },
                                    ]}
                                />
                            </div>
                            <div className="ms-card overflow-hidden">
                                <h2 className="px-4 py-3 font-bold text-white text-sm border-b border-white/10">Views by date</h2>
                                <div className="ms-scroll-x">
                                    <table className="w-full text-sm min-w-[640px]">
                                        <thead><tr className="text-left text-xs text-slate-500">
                                            <th className="px-4 py-2.5 font-semibold">Date</th><th className="px-4 py-2.5 text-right font-semibold">Views</th><th className="px-4 py-2.5 text-right font-semibold">Player</th><th className="px-4 py-2.5 text-right font-semibold">Page</th><th className="px-4 py-2.5 text-right font-semibold">Visitors</th><th className="px-4 py-2.5 text-right font-semibold">Mobile</th><th className="px-4 py-2.5 text-right font-semibold">Est. data</th>
                                        </tr></thead>
                                        <tbody>
                                            {[...A.days].reverse().map((k) => { const r = A.byDay[k]; return (
                                                <tr key={k} className="border-t border-white/5 hover:bg-white/[0.03]">
                                                    <td className="px-4 py-2.5 text-slate-200">{k}</td>
                                                    <td className="px-4 py-2.5 text-right font-semibold text-white">{fmtNum(r.views)}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.players)}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.pages)}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.uniq.size)}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.mobile)}</td>
                                                    <td className="px-4 py-2.5 text-right text-slate-400">{fmtBytes(r.bytes)}</td>
                                                </tr>
                                            ); })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'country' && (
                        <div className="ms-card overflow-hidden">
                            <h2 className="px-4 py-3 font-bold text-white text-sm border-b border-white/10">Where your viewers are ({countryRows.length} countries)</h2>
                            {countryRows.length === 0 ? <p className="p-6 text-sm ms-muted">No views in this range yet.</p> : (
                                <div className="divide-y divide-white/5">
                                    {countryRows.map((r) => (
                                        <div key={r.c} className="px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 items-center">
                                            <span className="text-sm text-slate-100 flex items-center gap-2 min-w-0"><span className="text-lg">{flag(r.c)}</span><span className="truncate">{countryName(r.c)}</span></span>
                                            <span className="text-sm text-right"><b className="text-white">{fmtNum(r.views)}</b> <span className="ms-muted text-xs">views · {fmtNum(r.uniq)} visitors · {totalViews ? Math.round((r.views / totalViews) * 100) : 0}%</span></span>
                                            <div className="col-span-2"><Bar pct={(r.views / maxC) * 100} /></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'files' && (
                        <div className="ms-card overflow-hidden">
                            <h2 className="px-4 py-3 font-bold text-white text-sm border-b border-white/10">Traffic per link</h2>
                            {fileRows.length === 0 ? <p className="p-6 text-sm ms-muted">No views in this range yet.</p> : (
                                <div className="ms-scroll-x"><table className="w-full text-sm min-w-[700px]">
                                    <thead><tr className="text-left text-xs text-slate-500"><th className="px-4 py-2.5 font-semibold">File</th><th className="px-4 py-2.5 font-semibold">Profile</th><th className="px-4 py-2.5 text-right font-semibold">Size</th><th className="px-4 py-2.5 text-right font-semibold">Views</th><th className="px-4 py-2.5 text-right font-semibold">Visitors</th><th className="px-4 py-2.5 text-right font-semibold">Est. data</th></tr></thead>
                                    <tbody>{fileRows.slice(0, 200).map((r) => (
                                        <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                                            <td className="px-4 py-2.5 max-w-[320px]"><p className="truncate text-slate-100" title={r.name}>{r.name}</p><div className="mt-1.5"><Bar pct={(r.views / maxF) * 100} /></div></td>
                                            <td className="px-4 py-2.5 text-slate-300">{profName(r.profile)}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-400">{r.size}</td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-white">{fmtNum(r.views)}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.uniq)}</td>
                                            <td className="px-4 py-2.5 text-right text-slate-400">{fmtBytes(r.bytes)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table></div>
                            )}
                        </div>
                    )}

                    {tab === 'profiles' && (
                        <div className="ms-card overflow-hidden">
                            <h2 className="px-4 py-3 font-bold text-white text-sm border-b border-white/10">Per upload profile</h2>
                            <div className="ms-scroll-x"><table className="w-full text-sm min-w-[640px]">
                                <thead><tr className="text-left text-xs text-slate-500"><th className="px-4 py-2.5 font-semibold">Profile</th><th className="px-4 py-2.5 text-right font-semibold">Files</th><th className="px-4 py-2.5 text-right font-semibold">Uploaded</th><th className="px-4 py-2.5 text-right font-semibold">Views (range)</th><th className="px-4 py-2.5 text-right font-semibold">Visitors</th><th className="px-4 py-2.5 text-right font-semibold">Est. data</th></tr></thead>
                                <tbody>{profileRows.map((r) => (
                                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                                        <td className="px-4 py-2.5 font-semibold text-white">{r.name}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.files)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-300">{fmtBytes(r.uploaded)}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-white">{fmtNum(r.views)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-300">{fmtNum(r.uniq)}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-400">{fmtBytes(r.bytes)}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        </div>
                    )}

                    {tab === 'sources' && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="ms-card p-4 space-y-3">
                                <h2 className="font-bold text-white text-sm">Devices</h2>
                                {devRows.length === 0 && <p className="text-sm ms-muted">No data yet.</p>}
                                {devRows.map(([d, n]) => (
                                    <div key={d} className="space-y-1.5"><div className="flex justify-between text-sm"><span className="capitalize text-slate-200">{d}</span><span className="text-slate-300"><b className="text-white">{fmtNum(n)}</b> · {Math.round((n / totalViews) * 100)}%</span></div><Bar pct={(n / totalViews) * 100} /></div>
                                ))}
                            </div>
                            <div className="ms-card p-4 space-y-3">
                                <h2 className="font-bold text-white text-sm">Where visitors came from</h2>
                                {refRows.length === 0 && <p className="text-sm ms-muted">No data yet.</p>}
                                {refRows.map(([d, n]) => (
                                    <div key={d} className="space-y-1.5"><div className="flex justify-between text-sm gap-3"><span className="truncate text-slate-200">{d}</span><span className="text-slate-300 shrink-0"><b className="text-white">{fmtNum(n)}</b> · {Math.round((n / totalViews) * 100)}%</span></div><Bar pct={(n / totalViews) * 100} /></div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="ms-muted text-xs flex items-start gap-2"><IconInfo size={14} className="shrink-0 mt-0.5" />
                        Views, countries, devices and visitors are counted for real, from the moment sql/6-analytics.sql is installed. &quot;Uploaded&quot; is the real total size of your files. &quot;Est. delivered&quot; is player views × file size: the video itself is served by the mirror hosts, so the exact bytes they send cannot be measured here.</p>
                </main>
            </div>
        </div>
    );
}
