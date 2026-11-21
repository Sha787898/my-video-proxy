'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles, PROFILES_KEY } from '../utils/profiles';
import { MAP_W, MAP_H, MAP_PATHS } from '../utils/worldMap';
import { IconChart, IconRefresh, IconInfo, IconDownload, IconSearch, IconX } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// =====================================================================================
// Traffic Analytics. Everything here is counted from the real `views` table (sql/6-analytics.sql):
// views, visitors (one-way hashed), countries, devices, referrers, hours. Nothing is invented.
// =====================================================================================

// ---------- helpers ----------
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const parseDay = (k) => new Date(`${k}T00:00:00`);
const diffDays = (a, b) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);

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
const fmtCompact = (n) => { n = Number(n || 0); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(0) + 'k'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'; return String(n); };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const delta = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? null : 0)); // null = "new" (nothing before)
const ago = (t, now) => {
    const s = Math.max(0, Math.round((now - t) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};

let regionNames = null;
function countryName(code) {
    if (!code || code === 'XX') return 'Unknown';
    try {
        if (!regionNames) regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames.of(code) || code;
    } catch (e) { return code; }
}
const flag = (code) => (/^[A-Z]{2}$/.test(code || '') && code !== 'XX' ? String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0))) : '🌐');

function downloadCsv(name, rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const text = rows.map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// smooth line (Catmull-Rom -> cubic bezier)
function smoothPath(pts) {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
        d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
}

// ---------- small visual pieces ----------
function Spark({ values, color = '#ff6b73' }) {
    const w = 100; const h = 28; const max = Math.max(1, ...values);
    if (values.length < 2) return <div style={{ height: h }} />;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (v / max) * (h - 6)]);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    return (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} opacity=".15" />
            <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function Delta({ cur, prev, compare }) {
    if (!compare) return null;
    const d = delta(cur, prev);
    if (d === null) return <span className="an-delta up">new</span>;
    if (Math.abs(d) < 0.5) return <span className="an-delta flat">0%</span>;
    return <span className={`an-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d) >= 100 ? Math.round(Math.abs(d)) : Math.abs(d).toFixed(0)}%</span>;
}

function Kpi({ label, value, sub, spark, color, cur, prev, compare }) {
    return (
        <div className="an-kpi">
            <div className="an-kpi-h"><p>{label}</p>{cur !== undefined && <Delta cur={cur} prev={prev} compare={compare} />}</div>
            <b>{value}</b>
            {spark && <Spark values={spark} color={color} />}
            {sub && <small>{sub}</small>}
        </div>
    );
}

function Bar({ value, max, tone = 'red' }) {
    return <div className="an-bar"><i className={tone} style={{ width: `${Math.max(2, max ? (value / max) * 100 : 0)}%` }} /></div>;
}

function Donut({ parts, size = 150, label }) {
    const total = parts.reduce((n, p) => n + p.value, 0);
    const r = 52; const c = 2 * Math.PI * r;
    let off = 0;
    return (
        <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={label} className="an-donut">
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="16" />
            {total > 0 && parts.map((p) => {
                const len = (p.value / total) * c;
                const el = <circle key={p.name} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" />;
                off += len;
                return el;
            })}
            <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">{fmtCompact(total)}</text>
            <text x="70" y="84" textAnchor="middle" fontSize="9" fontWeight="700" fill="#8e9bb0" letterSpacing=".1em">VIEWS</text>
        </svg>
    );
}

// ---------- main line chart: hover on desktop, touch / drag on phones; optional dashed previous period ----------
function LineChart({ labels, series, prev, height = 260, labelEvery = 1, area = true }) {
    const W = 1000; const H = height;
    const padL = 42; const padR = 12; const padT = 14; const padB = 28;
    const [hover, setHover] = useState(null);
    const ref = useRef(null);
    const max = Math.max(1, ...series.flatMap((s) => s.values), ...(prev ? prev.values : [0]));
    const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4;
    const n = labels.length;
    const x = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1));
    const y = (v) => padT + (1 - v / niceMax) * (H - padT - padB);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t * 100) / 100);
    const move = (e) => {
        const r = ref.current.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(((px - padL) / (W - padL - padR)) * (n - 1));
        setHover(Math.max(0, Math.min(n - 1, i)));
    };
    return (
        <div className="relative">
            <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none an-chart" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} role="img" aria-label="Views over time">
                <defs>
                    {series.map((s, i) => (
                        <linearGradient key={s.name} id={`anag${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={s.color} stopOpacity="0.35" /><stop offset="100%" stopColor={s.color} stopOpacity="0" />
                        </linearGradient>
                    ))}
                </defs>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
                        <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#6e7a8e">{fmtCompact(Number.isInteger(t) ? t : Math.round(t * 10) / 10)}</text>
                    </g>
                ))}
                {labels.map((l, i) => (i % labelEvery === 0 ? <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="#6e7a8e">{l}</text> : null))}
                {prev && <path d={smoothPath(prev.values.map((v, k) => [x(k), y(v)]))} fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="6 6" strokeLinecap="round" opacity=".7" />}
                {series.map((s, i) => {
                    const pts = s.values.map((v, k) => [x(k), y(v)]);
                    const line = smoothPath(pts);
                    return (
                        <g key={s.name}>
                            {area && i === 0 && pts.length > 1 && <path d={`${line} L${pts[pts.length - 1][0]},${H - padB} L${pts[0][0]},${H - padB} Z`} fill={`url(#anag${i})`} />}
                            <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" />
                            {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill={s.color} />}
                        </g>
                    );
                })}
                {hover !== null && (
                    <g>
                        <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 4" />
                        {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] || 0)} r="5" fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
                    </g>
                )}
            </svg>
            {hover !== null && (
                <div className="an-tip" style={{ left: `${Math.min(74, Math.max(2, (x(hover) / W) * 100 + 1))}%` }}>
                    <p>{labels[hover]}</p>
                    {series.map((s) => <p key={s.name} className="r"><i style={{ background: s.color }} />{s.name}: <b>{fmtNum(s.values[hover])}</b></p>)}
                    {prev && <p className="r"><i style={{ background: '#94a3b8' }} />{prev.name}: <b>{fmtNum(prev.values[hover] || 0)}</b></p>}
                </div>
            )}
        </div>
    );
}

// ---------- world map: countries shaded by views; zoom with + / -, drag to move (also on touch) ----------
function WorldMap({ data, picked, onPick }) {
    const [z, setZ] = useState(1);
    const [pan, setPan] = useState([0, 0]);
    const [tip, setTip] = useState(null);
    const drag = useRef(null);
    const box = useRef(null);
    const max = Math.max(1, ...Object.values(data).map((v) => v.views));
    const vw = MAP_W / z; const vh = MAP_H / z;
    const clamp = (px, py, zz) => [Math.max(0, Math.min(MAP_W - MAP_W / zz, px)), Math.max(0, Math.min(MAP_H - MAP_H / zz, py))];
    const zoom = (f) => {
        const nz = Math.max(1, Math.min(8, z * f));
        const cx = pan[0] + vw / 2; const cy = pan[1] + vh / 2;
        setZ(nz); setPan(clamp(cx - MAP_W / nz / 2, cy - MAP_H / nz / 2, nz));
    };
    const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, pan: [...pan], moved: false }; };
    const move = (e) => {
        const r = box.current.getBoundingClientRect();
        if (drag.current && z > 1) {
            const dx = ((e.clientX - drag.current.x) / r.width) * vw; const dy = ((e.clientY - drag.current.y) / r.height) * vh;
            if (Math.abs(dx) + Math.abs(dy) > 1) drag.current.moved = true;
            setPan(clamp(drag.current.pan[0] - dx, drag.current.pan[1] - dy, z));
        }
    };
    const up = () => { setTimeout(() => { drag.current = null; }, 0); };
    const fillOf = (cc) => {
        const v = data[cc];
        if (!v) return 'rgba(255,255,255,.07)';
        const t = 0.28 + 0.72 * Math.sqrt(v.views / max);
        return `rgba(229,56,59,${t.toFixed(2)})`;
    };
    const at = (e, cc) => { const r = box.current.getBoundingClientRect(); setTip({ cc, x: e.clientX - r.left, y: e.clientY - r.top }); };
    return (
        <div className="an-map" ref={box}>
            <svg viewBox={`${pan[0]} ${pan[1]} ${vw} ${vh}`} className="w-full h-auto select-none" style={{ touchAction: z > 1 ? 'none' : 'pan-y', cursor: z > 1 ? 'grab' : 'default' }}
                onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => { up(); setTip(null); }} role="img" aria-label="World map of views by country">
                <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="transparent" />
                {Object.entries(MAP_PATHS).map(([cc, d]) => (
                    <path key={cc} d={d} fill={fillOf(cc)} stroke={picked === cc ? '#fff' : 'rgba(255,255,255,.16)'} strokeWidth={(picked === cc ? 1.6 : 0.5) / Math.sqrt(z)} strokeLinejoin="round"
                        style={{ cursor: data[cc] ? 'pointer' : 'default', transition: 'fill .2s' }}
                        onPointerEnter={(e) => at(e, cc)} onPointerMove={(e) => at(e, cc)}
                        onClick={() => { if (!(drag.current && drag.current.moved) && data[cc]) onPick(picked === cc ? null : cc); }} />
                ))}
            </svg>
            <div className="an-map-zoom">
                <button type="button" onClick={() => zoom(1.6)} aria-label="Zoom in">+</button>
                <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Zoom out">−</button>
                <button type="button" onClick={() => { setZ(1); setPan([0, 0]); }} aria-label="Reset map">⟲</button>
            </div>
            {tip && (
                <div className="an-map-tip" style={{ left: Math.max(4, Math.min(tip.x + 12, (box.current ? box.current.clientWidth : 600) - 170)), top: Math.max(0, tip.y - 44) }}>
                    <b>{flag(tip.cc)} {countryName(tip.cc)}</b>
                    <span>{data[tip.cc] ? `${fmtNum(data[tip.cc].views)} views · ${fmtNum(data[tip.cc].uniq)} visitors` : 'No views'}</span>
                </div>
            )}
            <div className="an-map-leg"><span>Fewer</span><i /><span>More views</span></div>
        </div>
    );
}

// ---------- weekday x hour heatmap ----------
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function Heat({ grid }) {
    const max = Math.max(1, ...grid.flat());
    return (
        <div className="an-heat" role="img" aria-label="Views by weekday and hour">
            <div className="an-heat-h"><span />{Array.from({ length: 24 }, (_, h) => <em key={h}>{h % 6 === 0 ? pad(h) : ''}</em>)}</div>
            {grid.map((row, d) => (
                <div key={d} className="an-heat-r">
                    <span>{WD[d]}</span>
                    {row.map((v, h) => <i key={h} title={`${WD[d]} ${pad(h)}:00 · ${v} views`} style={{ background: v ? `rgba(229,56,59,${(0.18 + 0.82 * (v / max)).toFixed(2)})` : 'rgba(255,255,255,.05)' }} />)}
                </div>
            ))}
        </div>
    );
}

const TABS = [['overview', 'Overview'], ['map', 'Map'], ['files', 'Files'], ['time', 'Time'], ['sources', 'Sources'], ['profiles', 'Profiles'], ['live', 'Live']];
const PRESETS = [['today', 'Today'], ['yday', 'Yesterday'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month']];
const KINDS = [['all', 'All views'], ['embed', 'Player'], ['page', 'Download page']];
const DEVICES = [['all', 'All devices'], ['desktop', 'Desktop'], ['mobile', 'Mobile'], ['tablet', 'Tablet']];
const DEV_COLOR = { desktop: '#ff6b73', mobile: '#f59e0b', tablet: '#a78bfa', bot: '#64748b' };
const LS = 'ms_an_prefs_v1';

function presetRange(id) {
    const t = startOfDay(new Date());
    if (id === 'today') return [dayKey(t), dayKey(t)];
    if (id === 'yday') return [dayKey(addDays(t, -1)), dayKey(addDays(t, -1))];
    if (id === 'month') return [dayKey(new Date(t.getFullYear(), t.getMonth(), 1)), dayKey(t)];
    return [dayKey(addDays(t, -(Number(id) - 1))), dayKey(t)];
}

function AnalyticsInner() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [views, setViews] = useState([]);
    const [files, setFiles] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [tab, setTab] = useState('overview');
    const [[from, to], setRange] = useState(() => presetRange('7'));
    const [kind, setKind] = useState('all');
    const [device, setDevice] = useState('all');
    const [compare, setCompare] = useState(true);
    const [live, setLive] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [show, setShow] = useState({ Views: true, Visitors: true, Player: false, Page: false, Mobile: false });
    const [pickedC, setPickedC] = useState(null);
    const [fq, setFq] = useState('');
    const [fsort, setFsort] = useState('views');
    const [menu, setMenu] = useState(false);
    const [hasCity, setHasCity] = useState(true);
    const loaded = useRef('');

    useEffect(() => {
        try { const p = JSON.parse(localStorage.getItem(LS) || 'null'); if (p) { if (typeof p.compare === 'boolean') setCompare(p.compare); if (typeof p.live === 'boolean') setLive(p.live); } } catch (e) { /* ignore */ }
    }, []);
    useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ compare, live })); } catch (e) { /* ignore */ } }, [compare, live]);

    const load = useCallback(async (uid, fromKey) => {
        setRefreshing(true);
        const len = diffDays(parseDay(fromKey), new Date()) + 1;
        const since = new Date(Math.min(addDays(parseDay(fromKey), -Math.max(1, len)).getTime(), addDays(startOfDay(new Date()), -35).getTime())); // room for "previous period" and the 30-day numbers
        const rows = [];
        let cols = 'ts, file_id, kind, country, city, device, ref, ip_hash';
        let city = true;
        for (let page = 0; page < 80; page++) {
            let res = await supabase.from('views').select(cols).eq('owner', uid).gte('ts', since.toISOString()).order('ts', { ascending: false }).range(page * 1000, page * 1000 + 999);
            if (res.error && /city/i.test(res.error.message || '') && city) {
                city = false; cols = 'ts, file_id, kind, country, device, ref, ip_hash';
                res = await supabase.from('views').select(cols).eq('owner', uid).gte('ts', since.toISOString()).order('ts', { ascending: false }).range(page * 1000, page * 1000 + 999);
            }
            if (res.error) {
                setErr(/relation .*views.* does not exist|views.*schema cache/i.test(res.error.message) ? 'The analytics table is missing. Run sql/6-analytics.sql once in Supabase > SQL Editor.' : res.error.message);
                break;
            }
            setErr('');
            rows.push(...(res.data || []));
            if (!res.data || res.data.length < 1000) break;
        }
        setHasCity(city);
        setViews(rows);
        const [f, st] = await Promise.all([
            supabase.from('files').select('id, name, size, profile, date').eq('user_id', uid).limit(5000),
            supabase.from('settings').select('value').eq('user_id', uid).eq('key', PROFILES_KEY).maybeSingle(),
        ]);
        setFiles(f.data || []);
        setProfiles(parseProfiles(st.data && st.data.value));
        loaded.current = fromKey;
        setNow(Date.now());
        setRefreshing(false);
    }, []);

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setUser(session.user);
            await load(session.user.id, from);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // a wider range than what is loaded: fetch again
    useEffect(() => { if (user && !loading && from < loaded.current) load(user.id, from); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from]);

    // Live: refresh every 30 s while the tab is visible
    useEffect(() => {
        if (!live || !user) return undefined;
        const t = setInterval(() => { if (!document.hidden) load(user.id, from); }, 30000);
        return () => clearInterval(t);
    }, [live, user, from, load]);

    const fileMap = useMemo(() => { const m = {}; files.forEach((f) => { m[f.id] = f; }); return m; }, [files]);

    const A = useMemo(() => {
        const fromD = parseDay(from); const toD = parseDay(to);
        const nDays = Math.max(1, Math.min(400, diffDays(fromD, toD) + 1));
        const hourly = nDays === 1;
        const fromT = fromD.getTime(); const toT = addDays(toD, 1).getTime() - 1;
        const prevFromD = addDays(fromD, -nDays); const prevToT = fromT - 1;
        const keep = (v) => (kind === 'all' || v.kind === kind) && (device === 'all' || v.device === device);

        const days = Array.from({ length: hourly ? 24 : nDays }, (_, i) => (hourly ? pad(i) + ':00' : dayKey(addDays(fromD, i))));
        const mk = () => ({ views: 0, players: 0, pages: 0, uniq: new Set(), mobile: 0, bytes: 0 });
        const cur = days.map(mk); const prev = days.map(mk);
        const idxOf = (t, base) => (hourly ? new Date(t).getHours() : Math.floor((startOfDay(new Date(t)).getTime() - base.getTime() + 12 * 3600000) / DAY));

        const total = mk(); const prevTotal = mk();
        const country = {}; const city = {}; const byFile = {}; const byProfile = {}; const dev = {}; const refs = {}; const kinds = { embed: 0, page: 0 };
        const hours = Array.from({ length: 24 }, () => 0);
        const wd = Array.from({ length: 7 }, () => 0);
        const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
        const seenDays = {}; // visitor -> set of days (returning visitors)
        const fileDay = {}; const countryFile = {};

        const add = (o, v, f) => {
            o.views += 1;
            if (v.kind === 'embed') { o.players += 1; if (f) o.bytes += parseBytes(f.size); } else o.pages += 1;
            if (v.ip_hash) o.uniq.add(v.ip_hash);
            if (v.device === 'mobile' || v.device === 'tablet') o.mobile += 1;
        };
        const recent = [];
        views.forEach((v) => {
            const t = new Date(v.ts).getTime();
            if (recent.length < 40 && (kind === 'all' || v.kind === kind)) recent.push(v);
            if (!keep(v)) return;
            const f = fileMap[v.file_id];
            if (t >= fromT && t <= toT) {
                const i = idxOf(t, fromD);
                add(total, v, f);
                if (cur[i]) add(cur[i], v, f);
                const cc = v.country || 'XX';
                const c = (country[cc] = country[cc] || { views: 0, uniq: new Set() });
                c.views += 1; if (v.ip_hash) c.uniq.add(v.ip_hash);
                if (v.city) { const ck = `${v.city}|${cc}`; const ce = (city[ck] = city[ck] || { name: v.city, cc, views: 0 }); ce.views += 1; }
                const fe = (byFile[v.file_id] = byFile[v.file_id] || { views: 0, uniq: new Set(), bytes: 0, players: 0 });
                fe.views += 1; if (v.ip_hash) fe.uniq.add(v.ip_hash); if (v.kind === 'embed') { fe.players += 1; if (f) fe.bytes += parseBytes(f.size); }
                const fd = (fileDay[v.file_id] = fileDay[v.file_id] || days.map(() => 0)); if (fd[i] !== undefined) fd[i] += 1;
                const cf = (countryFile[cc] = countryFile[cc] || {}); cf[v.file_id] = (cf[v.file_id] || 0) + 1;
                const pid = (f && f.profile) || 'default';
                const pe = (byProfile[pid] = byProfile[pid] || { views: 0, uniq: new Set(), bytes: 0 });
                pe.views += 1; if (v.ip_hash) pe.uniq.add(v.ip_hash); if (v.kind === 'embed' && f) pe.bytes += parseBytes(f.size);
                const dn = v.device || 'desktop'; dev[dn] = (dev[dn] || 0) + 1;
                let r = v.ref || 'Direct'; r = r.replace(/^https?:\/\//, '').split('/')[0] || 'Direct';
                refs[r] = (refs[r] || 0) + 1;
                kinds[v.kind === 'embed' ? 'embed' : 'page'] += 1;
                const d = new Date(t);
                hours[d.getHours()] += 1; const wi = (d.getDay() + 6) % 7; wd[wi] += 1; grid[wi][d.getHours()] += 1;
                if (v.ip_hash) { const s = (seenDays[v.ip_hash] = seenDays[v.ip_hash] || new Set()); s.add(dayKey(d)); }
            } else if (t >= prevFromD.getTime() && t <= prevToT) {
                const i = idxOf(t, prevFromD);
                add(prevTotal, v, f);
                if (prev[i]) add(prev[i], v, f);
            }
        });

        // 30 / today numbers always use all kinds + devices
        const t30 = addDays(startOfDay(new Date()), -29).getTime();
        const m30 = new Set(); let v30 = 0; let today = 0; const tk = dayKey(new Date()); const todayVisitors = new Set();
        views.forEach((v) => {
            const t = new Date(v.ts).getTime();
            if (t >= t30) { v30 += 1; if (v.ip_hash) m30.add(v.ip_hash); }
            if (dayKey(new Date(t)) === tk) { today += 1; if (v.ip_hash) todayVisitors.add(v.ip_hash); }
        });

        const filesInRange = files.filter((f) => f.date && f.date >= from && f.date <= to);
        const returning = Object.values(seenDays).filter((s) => s.size > 1).length;
        return { days, hourly, cur, prev, total, prevTotal, country, city, byFile, byProfile, dev, refs, kinds, hours, wd, grid, fileDay, countryFile, recent, m30: m30.size, v30, today, todayVisitors: todayVisitors.size, filesInRange, uploadedBytes: filesInRange.reduce((n, f) => n + parseBytes(f.size), 0), allBytes: files.reduce((n, f) => n + parseBytes(f.size), 0), returning, nDays };
    }, [views, files, fileMap, from, to, kind, device]);

    const tv = A.total; const pv = A.prevTotal;
    const pulse = useMemo(() => {
        const n = now; let m30 = 0; let h24 = 0; let hPrev = 0; const online = new Set();
        views.forEach((v) => { const t = new Date(v.ts).getTime(); const age = n - t; if (age < 0) return; if (age <= 30 * 60000) { m30 += 1; if (v.ip_hash) online.add(v.ip_hash); } if (age <= DAY) h24 += 1; else if (age <= 2 * DAY) hPrev += 1; });
        return { m30, h24, hPrev, online: online.size };
    }, [views, now]);
    const labels = A.hourly ? A.days : A.days.map((k) => parseDay(k).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));
    const labelEvery = Math.max(1, Math.ceil(A.days.length / (A.hourly ? 8 : 9)));
    const profName = (id) => (id === 'default' ? 'Default' : (profiles.find((p) => p.id === id)?.name || id));

    const countryRows = useMemo(() => Object.entries(A.country).map(([c, v]) => ({ c, views: v.views, uniq: v.uniq.size })).sort((a, b) => b.views - a.views), [A.country]);
    const mapData = useMemo(() => { const o = {}; countryRows.forEach((r) => { o[r.c] = r; }); return o; }, [countryRows]);
    const cityRows = useMemo(() => Object.values(A.city).sort((a, b) => b.views - a.views).slice(0, 12), [A.city]);
    const fileRows = useMemo(() => {
        const q = fq.trim().toLowerCase();
        const rows = Object.entries(A.byFile).map(([id, v]) => ({ id, name: fileMap[id]?.name || id, size: fileMap[id]?.size || '', profile: fileMap[id]?.profile || 'default', views: v.views, uniq: v.uniq.size, bytes: v.bytes, players: v.players, series: A.fileDay[id] || [] }))
            .filter((r) => !q || r.name.toLowerCase().includes(q));
        const key = { views: (r) => r.views, uniq: (r) => r.uniq, bytes: (r) => r.bytes };
        if (fsort === 'name') rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        else rows.sort((a, b) => key[fsort](b) - key[fsort](a) || b.views - a.views);
        return rows;
    }, [A.byFile, A.fileDay, fileMap, fq, fsort]);
    const profileIds = ['default', ...profiles.map((p) => p.id)];
    Object.keys(A.byProfile).forEach((id) => { if (!profileIds.includes(id)) profileIds.push(id); });
    const profileRows = profileIds.map((id) => {
        const fs = files.filter((f) => (f.profile || 'default') === id);
        const v = A.byProfile[id] || { views: 0, uniq: new Set(), bytes: 0 };
        return { id, name: profName(id), files: fs.length, uploaded: fs.reduce((n, f) => n + parseBytes(f.size), 0), views: v.views, uniq: v.uniq.size, bytes: v.bytes };
    });
    const devRows = Object.entries(A.dev).sort((a, b) => b[1] - a[1]);
    const refRows = Object.entries(A.refs).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const peakHour = A.hours.indexOf(Math.max(...A.hours));
    const peakDayIdx = A.wd.indexOf(Math.max(...A.wd));
    const busiest = A.days.map((k, i) => ({ k, v: A.cur[i].views })).sort((a, b) => b.v - a.v)[0];
    const mobileShare = pct(tv.mobile, tv.views);

    const insights = [];
    if (tv.views > 0) {
        const d = delta(tv.views, pv.views);
        if (compare && d !== null && Math.abs(d) >= 1) insights.push({ t: d > 0 ? 'up' : 'down', h: `Views ${d > 0 ? 'up' : 'down'} ${Math.abs(d).toFixed(0)}%`, p: `${fmtNum(tv.views)} now vs ${fmtNum(pv.views)} in the ${A.hourly ? 'previous day' : `previous ${A.nDays} days`}.` });
        if (countryRows[0]) insights.push({ t: 'map', h: `${flag(countryRows[0].c)} ${countryName(countryRows[0].c)} leads`, p: `${pct(countryRows[0].views, tv.views)}% of views (${fmtNum(countryRows[0].views)}).` });
        if (A.hours[peakHour] > 0) insights.push({ t: 'time', h: `Peak hour ${pad(peakHour)}:00`, p: `${WD[peakDayIdx]} is your busiest weekday in this range.` });
        if (!A.hourly && busiest && busiest.v > 0) insights.push({ t: 'day', h: `Best day ${parseDay(busiest.k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, p: `${fmtNum(busiest.v)} views.` });
        const top = fileRows[0]; if (top) insights.push({ t: 'file', h: 'Top file', p: `${top.name.length > 46 ? top.name.slice(0, 46) + '…' : top.name} · ${fmtNum(top.views)} views.` });
        if (tv.uniq.size > 0) insights.push({ t: 'people', h: `${pct(A.returning, tv.uniq.size)}% came back`, p: `${fmtNum(A.returning)} of ${fmtNum(tv.uniq.size)} visitors viewed on more than one day.` });
    }

    const setPreset = (id) => setRange(presetRange(id));
    const activePreset = PRESETS.find(([id]) => { const [a, b] = presetRange(id); return a === from && b === to; });

    const exportCsv = (what) => {
        setMenu(false);
        const stamp = `${from}_${to}`;
        if (what === 'daily') downloadCsv(`views-by-${A.hourly ? 'hour' : 'day'}-${stamp}.csv`, [[A.hourly ? 'Hour' : 'Date', 'Views', 'Player', 'Download page', 'Visitors', 'Mobile', 'Est. delivered'], ...A.days.map((k, i) => [k, A.cur[i].views, A.cur[i].players, A.cur[i].pages, A.cur[i].uniq.size, A.cur[i].mobile, fmtBytes(A.cur[i].bytes)])]);
        if (what === 'countries') downloadCsv(`countries-${stamp}.csv`, [['Country', 'Code', 'Views', 'Visitors', 'Share %'], ...countryRows.map((r) => [countryName(r.c), r.c, r.views, r.uniq, pct(r.views, tv.views)])]);
        if (what === 'files') downloadCsv(`files-${stamp}.csv`, [['File', 'ID', 'Profile', 'Size', 'Views', 'Player views', 'Visitors', 'Est. delivered'], ...fileRows.map((r) => [r.name, r.id, profName(r.profile), r.size, r.views, r.players, r.uniq, fmtBytes(r.bytes)])]);
        if (what === 'sources') downloadCsv(`sources-${stamp}.csv`, [['Source', 'Views'], ...refRows.map(([d, n]) => [d, n])]);
    };

    if (loading) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-red-400"><IconRefresh size={18} className="ms-spin" /><span>Loading analytics…</span></div>
            </div>
        );
    }

    const SERIES = [
        { name: 'Views', color: '#ff6b73', values: A.cur.map((r) => r.views) },
        { name: 'Visitors', color: '#22c55e', values: A.cur.map((r) => r.uniq.size) },
        { name: 'Player', color: '#f59e0b', values: A.cur.map((r) => r.players) },
        { name: 'Page', color: '#a78bfa', values: A.cur.map((r) => r.pages) },
        { name: 'Mobile', color: '#38bdf8', values: A.cur.map((r) => r.mobile) },
    ];
    const shownSeries = SERIES.filter((s) => show[s.name]);
    const prevLine = compare && show.Views ? { name: A.hourly ? 'Previous day' : 'Previous period', values: A.prev.map((r) => r.views) } : null;
    const emptyAll = views.length === 0;
    const maxC = countryRows[0]?.views || 1;
    const maxF = fileRows[0]?.views || 1;
    const pickedRow = pickedC ? mapData[pickedC] : null;

    return (
        <div className="ms-app flex">
            <style>{CSS}</style>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0"><IconChart size={18} /></span>
                        <h1 className="ms-h1 truncate">Traffic Analytics</h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => setLive((v) => !v)} aria-pressed={live} className={`an-live ${live ? 'on' : ''}`} title="Refresh every 30 seconds"><i />Live</button>
                        <div className="relative">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} aria-haspopup="menu" aria-expanded={menu} className="ms-btn ms-btn-ghost ms-btn-sm"><IconDownload size={14} /><span className="hidden sm:inline">Export</span></button>
                            {menu && (
                                <div className="an-menu" role="menu">
                                    <button type="button" role="menuitem" onClick={() => exportCsv('daily')}>Views by {A.hourly ? 'hour' : 'date'}</button>
                                    <button type="button" role="menuitem" onClick={() => exportCsv('countries')}>Countries</button>
                                    <button type="button" role="menuitem" onClick={() => exportCsv('files')}>Files</button>
                                    <button type="button" role="menuitem" onClick={() => exportCsv('sources')}>Sources</button>
                                </div>
                            )}
                        </div>
                        <button type="button" onClick={() => load(user.id, from)} disabled={refreshing} className="ms-btn ms-btn-ghost ms-btn-sm" aria-label="Refresh">
                            <IconRefresh size={14} className={refreshing ? 'ms-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-4" onClick={() => menu && setMenu(false)}>
                    {err && <div className="ms-alert ms-alert-amber"><IconInfo size={16} className="shrink-0 mt-0.5" /><span className="min-w-0 break-words">{err}</span></div>}

                    <section className="an-hero">
                        <div className="an-hero-t">
                            <p className="an-eyebrow"><i />{live ? 'Live now' : 'Last 30 minutes'}</p>
                            <h2><b>{fmtNum(pulse.online)}</b> {pulse.online === 1 ? 'visitor' : 'visitors'} · <b>{fmtNum(pulse.m30)}</b> {pulse.m30 === 1 ? 'view' : 'views'}</h2>
                            <p className="an-hero-s">{fmtNum(pulse.h24)} views in the last 24 hours{pulse.hPrev > 0 ? ` (${pulse.h24 >= pulse.hPrev ? '▲' : '▼'} ${Math.abs(Math.round(((pulse.h24 - pulse.hPrev) / pulse.hPrev) * 100))}% vs the day before)` : ''}{countryRows[0] ? ` · top country ${flag(countryRows[0].c)} ${countryName(countryRows[0].c)}` : ''}.</p>
                        </div>
                        <button type="button" className="an-hero-b" onClick={() => { setLive(true); setTab('live'); }}>Open live feed →</button>
                    </section>

                    {/* filters */}
                    <div className="an-bar-f">
                        <div className="an-chips" role="group" aria-label="Date range">
                            {PRESETS.map(([id, l]) => <button key={id} type="button" className={activePreset && activePreset[0] === id ? 'on' : ''} onClick={() => setPreset(id)}>{l}</button>)}
                        </div>
                        <div className="an-dates">
                            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setRange([e.target.value, to])} aria-label="From" />
                            <span>→</span>
                            <input type="date" value={to} min={from} max={dayKey(new Date())} onChange={(e) => e.target.value && setRange([from, e.target.value])} aria-label="To" />
                        </div>
                        <div className="an-sels">
                            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="View type">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                            <select value={device} onChange={(e) => setDevice(e.target.value)} aria-label="Device">{DEVICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                            <label className="an-chk"><input type="checkbox" className="ms-check !w-4 !h-4" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare</label>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="an-kpis">
                        <Kpi label="Views" value={fmtNum(tv.views)} cur={tv.views} prev={pv.views} compare={compare} spark={A.cur.map((r) => r.views)} color="#ff6b73" sub={`${fmtNum(tv.players)} player · ${fmtNum(tv.pages)} page`} />
                        <Kpi label="Visitors" value={fmtNum(tv.uniq.size)} cur={tv.uniq.size} prev={pv.uniq.size} compare={compare} spark={A.cur.map((r) => r.uniq.size)} color="#22c55e" sub={`${tv.uniq.size ? (tv.views / tv.uniq.size).toFixed(1) : '0'} views each`} />
                        <Kpi label="Player plays" value={fmtNum(tv.players)} cur={tv.players} prev={pv.players} compare={compare} spark={A.cur.map((r) => r.players)} color="#f59e0b" sub={`${pct(tv.players, tv.views)}% of views`} />
                        <Kpi label="Mobile share" value={`${mobileShare}%`} cur={tv.mobile} prev={pv.mobile} compare={compare} spark={A.cur.map((r) => r.mobile)} color="#38bdf8" sub={`${fmtNum(tv.mobile)} mobile + tablet`} />
                        <Kpi label="Est. delivered" value={fmtBytes(tv.bytes)} cur={tv.bytes} prev={pv.bytes} compare={compare} sub="Player views × file size" />
                        <Kpi label="Today" value={fmtNum(A.today)} sub={`${fmtNum(A.todayVisitors)} visitors`} />
                        <Kpi label="Monthly users" value={fmtNum(A.m30)} sub={`${fmtNum(A.v30)} views · 30 days`} />
                        <Kpi label="Uploaded" value={fmtBytes(A.uploadedBytes)} sub={`${A.filesInRange.length} file(s) · ${fmtBytes(A.allBytes)} total`} />
                    </div>

                    {emptyAll && !err && (
                        <div className="ms-card p-6 text-center"><p className="text-sm text-slate-300 font-semibold">No views recorded yet.</p><p className="text-xs ms-muted mt-1">Open one of your download or player pages; it shows up here within a minute.</p></div>
                    )}

                    <div className="an-tabs" role="tablist">
                        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={tab === k ? 'on' : ''}>{l}</button>)}
                    </div>

                    {tab === 'overview' && (
                        <>
                            {insights.length > 0 && (
                                <div className="an-ins">
                                    {insights.map((x, i) => <div key={i} className={`an-in ${x.t}`}><b>{x.h}</b><span>{x.p}</span></div>)}
                                </div>
                            )}
                            <section className="an-panel">
                                <div className="an-ph">
                                    <h2>{A.hourly ? 'Views by hour' : 'Views over time'}</h2>
                                    <div className="an-legend">
                                        {SERIES.map((s) => (
                                            <button key={s.name} type="button" aria-pressed={!!show[s.name]} className={show[s.name] ? 'on' : ''} onClick={() => setShow((o) => ({ ...o, [s.name]: !o[s.name] }))}><i style={{ background: s.color }} />{s.name}</button>
                                        ))}
                                    </div>
                                </div>
                                {shownSeries.length === 0 ? <p className="ms-muted text-sm py-10 text-center">Pick at least one line above.</p> : <LineChart labels={labels} labelEvery={labelEvery} series={shownSeries} prev={prevLine} height={260} />}
                                {prevLine && <p className="an-note"><i /> Dashed line = {prevLine.name.toLowerCase()} (Views)</p>}
                            </section>
                            <div className="an-two">
                                <section className="an-panel">
                                    <div className="an-ph"><h2>Devices</h2></div>
                                    <div className="an-dn">
                                        <Donut parts={devRows.map(([d, n]) => ({ name: d, value: n, color: DEV_COLOR[d] || '#94a3b8' }))} label="Devices" />
                                        <ul>{devRows.length === 0 && <li className="ms-muted text-sm">No data yet.</li>}{devRows.map(([d, n]) => <li key={d}><i style={{ background: DEV_COLOR[d] || '#94a3b8' }} /><span className="capitalize">{d}</span><b>{pct(n, tv.views)}%</b><em>{fmtNum(n)}</em></li>)}</ul>
                                    </div>
                                </section>
                                <section className="an-panel">
                                    <div className="an-ph"><h2>Top countries</h2><button type="button" className="an-link" onClick={() => setTab('map')}>Open map →</button></div>
                                    {countryRows.length === 0 ? <p className="ms-muted text-sm">No views in this range yet.</p> : countryRows.slice(0, 6).map((r) => (
                                        <div key={r.c} className="an-row"><span>{flag(r.c)} {countryName(r.c)}</span><b>{fmtNum(r.views)}</b><em>{pct(r.views, tv.views)}%</em><Bar value={r.views} max={maxC} /></div>
                                    ))}
                                </section>
                            </div>
                            <section className="an-panel">
                                <div className="an-ph"><h2>Top files</h2><button type="button" className="an-link" onClick={() => setTab('files')}>All files →</button></div>
                                {fileRows.length === 0 ? <p className="ms-muted text-sm">No views in this range yet.</p> : fileRows.slice(0, 5).map((r) => (
                                    <div key={r.id} className="an-row"><span className="trunc" title={r.name}>{r.name}</span><b>{fmtNum(r.views)}</b><em>{fmtNum(r.uniq)} visitors</em><Bar value={r.views} max={maxF} /></div>
                                ))}
                            </section>
                            <section className="an-panel !p-0 overflow-hidden">
                                <div className="an-ph !m-0 px-4 py-3 border-b border-white/10"><h2>{A.hourly ? 'Hour table' : 'Views by date'}</h2></div>
                                <div className="ms-scroll-x">
                                    <table className="an-table">
                                        <thead><tr><th>{A.hourly ? 'Hour' : 'Date'}</th><th>Views</th><th>Player</th><th>Page</th><th>Visitors</th><th>Mobile</th><th>Delivered</th></tr></thead>
                                        <tbody>
                                            {[...A.days.keys()].reverse().map((i) => { const r = A.cur[i]; return (
                                                <tr key={A.days[i]}><td>{A.days[i]}</td><td><b>{fmtNum(r.views)}</b></td><td>{fmtNum(r.players)}</td><td>{fmtNum(r.pages)}</td><td>{fmtNum(r.uniq.size)}</td><td>{fmtNum(r.mobile)}</td><td className="dim">{fmtBytes(r.bytes)}</td></tr>
                                            ); })}
                                            <tr className="tot"><td>Total</td><td>{fmtNum(tv.views)}</td><td>{fmtNum(tv.players)}</td><td>{fmtNum(tv.pages)}</td><td>{fmtNum(tv.uniq.size)}</td><td>{fmtNum(tv.mobile)}</td><td>{fmtBytes(tv.bytes)}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}

                    {tab === 'map' && (
                        <div className="an-mapgrid">
                            <section className="an-panel">
                                <div className="an-ph"><h2>Viewers around the world</h2><span className="an-pill">{countryRows.filter((r) => r.c !== 'XX').length} countries</span></div>
                                <WorldMap data={mapData} picked={pickedC} onPick={setPickedC} />
                                <p className="an-note">Tap or click a country for details. Zoom with + / −, drag to move.</p>
                            </section>
                            <section className="an-panel">
                                {pickedRow ? (
                                    <>
                                        <div className="an-ph"><h2>{flag(pickedC)} {countryName(pickedC)}</h2><button type="button" className="an-x" onClick={() => setPickedC(null)} aria-label="Clear country"><IconX size={14} /></button></div>
                                        <div className="an-mini"><div><b>{fmtNum(pickedRow.views)}</b><span>views</span></div><div><b>{fmtNum(pickedRow.uniq)}</b><span>visitors</span></div><div><b>{pct(pickedRow.views, tv.views)}%</b><span>of total</span></div></div>
                                        <p className="an-sub">Top files here</p>
                                        {Object.entries(A.countryFile[pickedC] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => (
                                            <div key={id} className="an-row"><span className="trunc" title={fileMap[id]?.name || id}>{fileMap[id]?.name || id}</span><b>{fmtNum(n)}</b><Bar value={n} max={pickedRow.views} /></div>
                                        ))}
                                        {hasCity && cityRows.filter((c) => c.cc === pickedC).length > 0 && (<><p className="an-sub">Cities</p>{cityRows.filter((c) => c.cc === pickedC).map((c) => <div key={c.name} className="an-row"><span>{c.name}</span><b>{fmtNum(c.views)}</b></div>)}</>)}
                                    </>
                                ) : (
                                    <>
                                        <div className="an-ph"><h2>Countries</h2></div>
                                        {countryRows.length === 0 ? <p className="ms-muted text-sm">No views in this range yet.</p> : (
                                            <div className="an-clist">
                                                {countryRows.slice(0, 40).map((r) => (
                                                    <button key={r.c} type="button" className="an-row btn" onClick={() => r.c !== 'XX' && setPickedC(r.c)}><span>{flag(r.c)} {countryName(r.c)}</span><b>{fmtNum(r.views)}</b><em>{pct(r.views, tv.views)}%</em><Bar value={r.views} max={maxC} /></button>
                                                ))}
                                            </div>
                                        )}
                                        {hasCity && cityRows.length > 0 && (<><p className="an-sub">Top cities</p>{cityRows.slice(0, 8).map((c) => <div key={c.name + c.cc} className="an-row"><span>{flag(c.cc)} {c.name}</span><b>{fmtNum(c.views)}</b></div>)}</>)}
                                    </>
                                )}
                            </section>
                        </div>
                    )}

                    {tab === 'files' && (
                        <section className="an-panel">
                            <div className="an-ph">
                                <h2>Traffic per file <span className="an-pill">{fileRows.length}</span></h2>
                                <div className="an-fbar">
                                    <label className="an-search"><IconSearch size={14} /><input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Search files" aria-label="Search files" /></label>
                                    <select value={fsort} onChange={(e) => setFsort(e.target.value)} aria-label="Sort files"><option value="views">Most views</option><option value="uniq">Most visitors</option><option value="bytes">Most delivered</option><option value="name">Name A-Z</option></select>
                                </div>
                            </div>
                            {fileRows.length === 0 ? <p className="ms-muted text-sm py-6 text-center">No views in this range yet.</p> : (
                                <ul className="an-files">
                                    {fileRows.slice(0, 150).map((r, i) => (
                                        <li key={r.id}>
                                            <span className="rk">{i + 1}</span>
                                            <div className="nm"><b title={r.name}>{r.name}</b><small>{r.size || '—'} · {profName(r.profile)} · {fmtBytes(r.bytes)} delivered</small><Bar value={r.views} max={maxF} /></div>
                                            <div className="sp"><Spark values={r.series.length > 1 ? r.series : [0, r.views]} color="#ff6b73" /></div>
                                            <div className="st"><b>{fmtNum(r.views)}</b><small>{fmtNum(r.uniq)} visitors</small></div>
                                            <a href={`/file/${r.id}`} target="_blank" rel="noopener noreferrer" className="op" aria-label={`Open ${r.name}`}>↗</a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    {tab === 'time' && (
                        <>
                            <section className="an-panel">
                                <div className="an-ph"><h2>When people watch</h2><span className="an-pill">Weekday × hour</span></div>
                                <Heat grid={A.grid} />
                                <p className="an-note">Your local time. Darker = more views.</p>
                            </section>
                            <div className="an-two">
                                <section className="an-panel">
                                    <div className="an-ph"><h2>By hour of day</h2></div>
                                    <div className="an-cols">{A.hours.map((v, h) => <div key={h} title={`${pad(h)}:00 · ${v} views`}><i style={{ height: `${Math.max(3, (v / Math.max(1, ...A.hours)) * 100)}%` }} className={h === peakHour && v > 0 ? 'pk' : ''} /><span>{h % 6 === 0 ? pad(h) : ''}</span></div>)}</div>
                                </section>
                                <section className="an-panel">
                                    <div className="an-ph"><h2>By weekday</h2></div>
                                    {A.wd.map((v, d) => <div key={d} className="an-row"><span>{WD[d]}</span><b>{fmtNum(v)}</b><em>{pct(v, tv.views)}%</em><Bar value={v} max={Math.max(1, ...A.wd)} tone={d === peakDayIdx && v > 0 ? 'hot' : 'red'} /></div>)}
                                </section>
                            </div>
                        </>
                    )}

                    {tab === 'sources' && (
                        <div className="an-two">
                            <section className="an-panel">
                                <div className="an-ph"><h2>Where visitors came from</h2></div>
                                {refRows.length === 0 ? <p className="ms-muted text-sm">No data yet.</p> : refRows.map(([d, n]) => <div key={d} className="an-row"><span className="trunc" title={d}>{d}</span><b>{fmtNum(n)}</b><em>{pct(n, tv.views)}%</em><Bar value={n} max={refRows[0][1]} /></div>)}
                            </section>
                            <section className="an-panel">
                                <div className="an-ph"><h2>Player vs download page</h2></div>
                                <div className="an-dn">
                                    <Donut parts={[{ name: 'Player', value: A.kinds.embed, color: '#ff6b73' }, { name: 'Page', value: A.kinds.page, color: '#f59e0b' }]} label="Player vs page" />
                                    <ul><li><i style={{ background: '#ff6b73' }} /><span>Player</span><b>{pct(A.kinds.embed, tv.views)}%</b><em>{fmtNum(A.kinds.embed)}</em></li><li><i style={{ background: '#f59e0b' }} /><span>Download page</span><b>{pct(A.kinds.page, tv.views)}%</b><em>{fmtNum(A.kinds.page)}</em></li></ul>
                                </div>
                                <p className="an-sub">Devices</p>
                                {devRows.map(([d, n]) => <div key={d} className="an-row"><span className="capitalize">{d}</span><b>{fmtNum(n)}</b><em>{pct(n, tv.views)}%</em><Bar value={n} max={devRows[0][1]} /></div>)}
                            </section>
                        </div>
                    )}

                    {tab === 'profiles' && (
                        <section className="an-panel !p-0 overflow-hidden">
                            <div className="an-ph !m-0 px-4 py-3 border-b border-white/10"><h2>Per upload profile</h2></div>
                            <div className="ms-scroll-x">
                                <table className="an-table">
                                    <thead><tr><th>Profile</th><th>Files</th><th>Uploaded</th><th>Views</th><th>Visitors</th><th>Delivered</th></tr></thead>
                                    <tbody>{profileRows.map((r) => <tr key={r.id}><td><b>{r.name}</b></td><td>{fmtNum(r.files)}</td><td>{fmtBytes(r.uploaded)}</td><td><b>{fmtNum(r.views)}</b></td><td>{fmtNum(r.uniq)}</td><td className="dim">{fmtBytes(r.bytes)}</td></tr>)}</tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {tab === 'live' && (
                        <section className="an-panel">
                            <div className="an-ph"><h2>Latest views</h2><button type="button" onClick={() => setLive((v) => !v)} className={`an-live ${live ? 'on' : ''}`}><i />{live ? 'Live · every 30s' : 'Turn on live'}</button></div>
                            {A.recent.length === 0 ? <p className="ms-muted text-sm py-6 text-center">No views yet.</p> : (
                                <ul className="an-feed">
                                    {A.recent.map((v, i) => (
                                        <li key={i}>
                                            <span className="fl">{flag(v.country)}</span>
                                            <div className="tx"><b>{fileMap[v.file_id]?.name || v.file_id}</b><small>{countryName(v.country)}{v.city ? `, ${v.city}` : ''} · {v.device || 'desktop'} · {v.kind === 'embed' ? 'Player' : 'Download page'}{v.ref ? ` · ${String(v.ref).replace(/^https?:\/\//, '').split('/')[0]}` : ''}</small></div>
                                            <time>{ago(new Date(v.ts).getTime(), now)}</time>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )}

                    <p className="ms-muted text-xs flex items-start gap-2"><IconInfo size={14} className="shrink-0 mt-0.5" />
                        <span>Views, countries, devices and visitors are counted for real, from the moment sql/6-analytics.sql is installed. Visitors are anonymous (a one-way hash, never an IP address). &quot;Est. delivered&quot; is player views × file size: the video is streamed by the hosts, so this is an estimate.{!hasCity ? ' City names appear after the views table gets a city column (sql/6-analytics.sql).' : ''}</span>
                    </p>
                </main>
            </div>
        </div>
    );
}

// the page reads the current time, so it is only drawn in the browser (never during the build's prerender)
export default function AnalyticsPage() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-red-400"><IconRefresh size={18} className="ms-spin" /><span>Loading analytics…</span></div>
            </div>
        );
    }
    return <AnalyticsInner />;
}

const CSS = `
.ms-app > div { min-width: 0; max-width: 100%; }
.ms-main { min-width: 0; max-width: 100%; }
.an-panel:has(> .ms-scroll-x) { overflow: hidden; }
.an-panel .ms-scroll-x { max-width: 100%; }
.an-hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 20px; border-radius: 18px; border: 1px solid rgba(255,107,115,.25); background: radial-gradient(800px 220px at 0% 0%, rgba(229,56,59,.22), transparent 60%), linear-gradient(180deg, rgba(20,24,34,.9), rgba(11,14,22,.95)); position: relative; overflow: hidden; }
.an-hero::after { content: ''; position: absolute; top: 0; left: 24px; right: 24px; height: 2px; background: linear-gradient(90deg, transparent, #ff6b73, transparent); }
.an-eyebrow { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #ff8a8f; }
.an-eyebrow i { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: an-ping 1.6s infinite; }
.an-hero h2 { margin: 6px 0 0; font-size: clamp(20px, 3.2vw, 28px); font-weight: 600; color: #cbd5e1; letter-spacing: -.02em; }
.an-hero h2 b { color: #fff; font-weight: 800; }
.an-hero-s { margin: 6px 0 0; font-size: 12.5px; color: #9aa6b8; max-width: 70ch; }
.an-hero-b { min-height: 42px; padding: 0 16px; border-radius: 12px; border: 0; color: #fff; font-weight: 800; font-size: 13px; cursor: pointer; font-family: inherit; background: linear-gradient(135deg, #e5383b, #c92a2e); box-shadow: 0 8px 22px rgba(229,56,59,.35); }
.an-hero-b:hover { background: linear-gradient(135deg, #f04447, #d5302f); }
@media (max-width: 640px) { .an-hero { padding: 15px; } .an-hero-b { width: 100%; } }
.an-live { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04); color: #aab4c5; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.an-live i { width: 7px; height: 7px; border-radius: 50%; background: #64748b; }
.an-live.on { color: #86efac; border-color: rgba(34,197,94,.45); background: rgba(34,197,94,.1); }
.an-live.on i { background: #22c55e; animation: an-ping 1.6s infinite; }
@keyframes an-ping { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); } 70% { box-shadow: 0 0 0 7px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
.an-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; min-width: 190px; padding: 4px; border-radius: 12px; background: #140c10; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 16px 40px rgba(0,0,0,.6); display: flex; flex-direction: column; }
.an-menu button { text-align: left; padding: 9px 11px; border-radius: 8px; border: 0; background: transparent; color: #d5dbe6; font-size: 13px; cursor: pointer; font-family: inherit; }
.an-menu button:hover { background: rgba(255,255,255,.09); color: #fff; }
.an-bar-f { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); }
@media (min-width: 1000px) { .an-bar-f { flex-direction: row; flex-wrap: wrap; align-items: center; } .an-sels { margin-left: auto; } }
.an-chips { display: flex; gap: 4px; overflow-x: auto; padding: 3px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.an-chips::-webkit-scrollbar { display: none; }
.an-chips button { flex: 0 0 auto; height: 32px; padding: 0 12px; border-radius: 9px; border: 0; background: transparent; color: #9aa6b8; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; white-space: nowrap; }
.an-chips button:hover { color: #fff; }
.an-chips button.on { background: rgba(229,56,59,.22); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,107,115,.45); }
.an-dates { display: flex; align-items: center; gap: 8px; }
.an-dates span { color: #67748a; }
.an-dates input, .an-sels select, .an-fbar select { height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: #120b0f; color: #e6e9ef; font-size: 13px; font-family: inherit; min-width: 0; color-scheme: dark; }
.an-dates input { flex: 1; }
.an-sels { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.an-sels select { flex: 1 1 130px; }
.an-chk { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: #c9d1de; cursor: pointer; padding: 0 4px; height: 38px; }
.an-kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 700px) { .an-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; } }
.an-kpi { padding: 13px 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); display: flex; flex-direction: column; gap: 5px; min-width: 0; transition: border-color .2s, transform .2s; }
.an-kpi:hover { border-color: rgba(255,107,115,.35); transform: translateY(-2px); }
.an-kpi-h { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.an-kpi-h p { margin: 0; font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #7f8ba0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.an-kpi b { font-size: 24px; line-height: 1.1; font-weight: 800; color: #fff; letter-spacing: -.02em; overflow-wrap: anywhere; }
.an-kpi small { font-size: 11px; color: #7f8ba0; font-weight: 600; }
.an-delta { font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
.an-delta.up { background: rgba(34,197,94,.15); color: #86efac; }
.an-delta.down { background: rgba(239,68,68,.15); color: #fca5a5; }
.an-delta.flat { background: rgba(255,255,255,.07); color: #aab4c5; }
.an-tabs { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid rgba(255,255,255,.1); scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.an-tabs::-webkit-scrollbar { display: none; }
.an-tabs button { flex: 0 0 auto; height: 44px; padding: 0 16px; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px; background: transparent; color: #8e9bb0; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap; }
.an-tabs button:hover { color: #fff; }
.an-tabs button.on { color: #fff; border-bottom-color: #e5383b; }
.an-panel::before { content: ''; position: absolute; top: 0; left: 18px; right: 18px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,107,115,.5), transparent); }
.an-panel { position: relative; padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(20,24,34,.85), rgba(12,15,23,.9)); min-width: 0; }
@media (min-width: 700px) { .an-panel { padding: 18px; } }
.an-ph { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.an-ph h2 { margin: 0; font-size: 14px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
.an-pill { font-size: 11px; font-weight: 800; color: #ffb3b6; padding: 3px 10px; border-radius: 99px; background: rgba(229,56,59,.14); border: 1px solid rgba(229,56,59,.3); }
.an-link { background: none; border: 0; color: #ff6b73; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.an-link:hover { text-decoration: underline; }
.an-x { width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #c9d1de; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.an-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.an-legend button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.1); background: transparent; color: #7f8ba0; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.an-legend button.on { color: #fff; background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.2); }
.an-legend i { width: 9px; height: 9px; border-radius: 50%; }
.an-legend button:not(.on) i { opacity: .35; }
.an-note { margin: 8px 0 0; font-size: 11px; color: #7f8ba0; display: flex; align-items: center; gap: 7px; }
.an-note i { display: inline-block; width: 18px; border-top: 2px dashed #94a3b8; }
.an-chart { touch-action: pan-y; }
.an-tip { position: absolute; top: 6px; pointer-events: none; border-radius: 12px; border: 1px solid rgba(255,255,255,.16); background: rgba(10,5,7,.92); padding: 8px 11px; font-size: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.5); z-index: 5; }
.an-tip p { margin: 0 0 3px; font-weight: 800; color: #cbd5e1; }
.an-tip p.r { display: flex; align-items: center; gap: 7px; color: #fff; font-weight: 500; margin: 2px 0 0; }
.an-tip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.an-two { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .an-two { grid-template-columns: 1fr 1fr; } }
.an-ins { display: grid; gap: 10px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .an-ins { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .an-ins { grid-template-columns: repeat(3, 1fr); } }
.an-in { padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); display: flex; flex-direction: column; gap: 3px; border-left: 3px solid #e5383b; min-width: 0; }
.an-in.up { border-left-color: #22c55e; } .an-in.down { border-left-color: #f59e0b; } .an-in.time { border-left-color: #f59e0b; } .an-in.people { border-left-color: #a78bfa; }
.an-in b { font-size: 13px; color: #fff; } .an-in span { font-size: 12px; color: #9aa6b8; overflow-wrap: anywhere; }
.an-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 4px 10px; align-items: center; padding: 7px 0; font-size: 13px; color: #e2e8f0; }
.an-row.btn { width: 100%; text-align: left; background: transparent; border: 0; border-radius: 8px; padding: 7px 6px; cursor: pointer; font-family: inherit; }
.an-row.btn:hover { background: rgba(255,255,255,.05); }
.an-row > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-row > b { color: #fff; } .an-row > em { font-style: normal; color: #7f8ba0; font-size: 11.5px; min-width: 38px; text-align: right; }
.an-row > .an-bar { grid-column: 1 / -1; }
.an-bar { height: 5px; border-radius: 5px; background: rgba(255,255,255,.08); overflow: hidden; }
.an-bar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(90deg, #e5383b, #ffb3b6); transition: width .5s ease; }
.an-bar i.hot { background: linear-gradient(90deg, #f59e0b, #fcd34d); }
.an-sub { margin: 14px 0 4px; font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #67748a; }
.an-dn { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 16px; }
.an-dn ul { list-style: none; margin: 0; padding: 0; flex: 1 1 160px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.an-dn li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto auto; gap: 8px; align-items: center; font-size: 13px; color: #e2e8f0; }
.an-dn li i { width: 10px; height: 10px; border-radius: 3px; } .an-dn li b { color: #fff; } .an-dn li em { font-style: normal; color: #7f8ba0; font-size: 11.5px; }
.an-table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 13px; }
.an-table th { text-align: right; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #7f8ba0; text-transform: uppercase; letter-spacing: .06em; white-space: nowrap; }
.an-table th:first-child, .an-table td:first-child { text-align: left; }
.an-table td { text-align: right; padding: 10px 14px; border-top: 1px solid rgba(255,255,255,.05); color: #cbd5e1; white-space: nowrap; }
.an-table td b { color: #fff; } .an-table td.dim { color: #7f8ba0; }
.an-table tbody tr:hover { background: rgba(255,255,255,.03); }
.an-table tr.tot td { background: rgba(255,255,255,.04); color: #fff; font-weight: 800; }
.trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-mapgrid { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 1000px) { .an-mapgrid { grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); } }
.an-map { position: relative; border-radius: 12px; background: radial-gradient(600px 220px at 50% 0%, rgba(229,56,59,.08), transparent 70%), rgba(10,5,7,.5); border: 1px solid rgba(255,255,255,.06); overflow: hidden; }
.an-map-zoom { position: absolute; right: 8px; top: 8px; display: flex; flex-direction: column; gap: 4px; }
.an-map-zoom button { width: 34px; height: 34px; border-radius: 9px; border: 1px solid rgba(255,255,255,.14); background: rgba(20,9,12,.85); color: #e6e9ef; font-size: 17px; line-height: 1; cursor: pointer; font-family: inherit; }
.an-map-zoom button:hover { background: rgba(229,56,59,.3); }
.an-map-tip { position: absolute; pointer-events: none; padding: 7px 10px; border-radius: 10px; background: rgba(10,5,7,.94); border: 1px solid rgba(255,255,255,.16); display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #cbd5e1; z-index: 5; white-space: nowrap; }
.an-map-tip b { color: #fff; }
.an-map-leg { position: absolute; left: 10px; bottom: 8px; display: flex; align-items: center; gap: 7px; font-size: 10px; color: #7f8ba0; }
.an-map-leg i { width: 70px; height: 6px; border-radius: 6px; background: linear-gradient(90deg, rgba(229,56,59,.25), rgba(229,56,59,1)); }
.an-mini { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.an-mini div { padding: 10px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); display: flex; flex-direction: column; gap: 2px; }
.an-mini b { font-size: 18px; color: #fff; } .an-mini span { font-size: 10.5px; color: #7f8ba0; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.an-clist { max-height: 460px; overflow-y: auto; margin: 0 -6px; padding: 0 2px; }
.an-fbar { display: flex; flex-wrap: wrap; gap: 8px; flex: 1 1 260px; justify-content: flex-end; }
.an-search { display: flex; align-items: center; gap: 7px; height: 38px; padding: 0 11px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: #120b0f; color: #7f8ba0; flex: 1 1 160px; min-width: 0; }
.an-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #fff; font: inherit; font-size: 13px; }
.an-files { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.an-files li { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto 34px; grid-template-areas: "rk nm st op"; gap: 4px 12px; align-items: center; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.025); }
@media (min-width: 760px) { .an-files li { grid-template-columns: 26px minmax(0, 1fr) 120px 90px 34px; grid-template-areas: "rk nm sp st op"; } }
.an-files .rk { grid-area: rk; font-size: 12px; font-weight: 800; color: #67748a; text-align: center; }
.an-files .nm { grid-area: nm; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.an-files .nm b { font-size: 13px; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-files small { font-size: 11px; color: #7f8ba0; }
.an-files .sp { grid-area: sp; display: none; } @media (min-width: 760px) { .an-files .sp { display: block; } }
.an-files .st { grid-area: st; text-align: right; display: flex; flex-direction: column; } .an-files .st b { font-size: 15px; color: #fff; }
.an-files .op { grid-area: op; width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); color: #aab4c5; text-decoration: none; }
.an-files .op:hover { background: rgba(255,255,255,.1); color: #fff; }
.an-heat { overflow-x: auto; padding-bottom: 4px; }
.an-heat-h, .an-heat-r { display: grid; grid-template-columns: 34px repeat(24, minmax(11px, 1fr)); gap: 3px; align-items: center; min-width: 440px; }
.an-heat-r { margin-top: 3px; }
.an-heat-r span { font-size: 10.5px; color: #7f8ba0; font-weight: 700; }
.an-heat-r i { display: block; aspect-ratio: 1; border-radius: 4px; }
.an-heat-h em { font-style: normal; font-size: 9.5px; color: #67748a; text-align: left; }
.an-cols { display: grid; grid-template-columns: repeat(24, 1fr); gap: 3px; align-items: end; height: 150px; }
.an-cols div { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; }
.an-cols i { width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #ff6b73, #c92a2e); }
.an-cols i.pk { background: linear-gradient(180deg, #fcd34d, #f59e0b); }
.an-cols span { font-size: 9px; color: #67748a; height: 11px; }
.an-feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.an-feed li { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 2px; border-top: 1px solid rgba(255,255,255,.06); }
.an-feed li:first-child { border-top: 0; }
.an-feed .fl { font-size: 22px; text-align: center; }
.an-feed .tx { min-width: 0; display: flex; flex-direction: column; gap: 2px; } .an-feed .tx b { font-size: 13px; color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .an-feed small { font-size: 11px; color: #7f8ba0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.an-feed time { font-size: 11px; color: #67748a; font-weight: 700; white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .an-live.on i, .an-kpi { animation: none; transition: none; } }
`;
