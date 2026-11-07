'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parseBytes(size) {
    const m = String(size || '').match(/([\d.]+)\s*(TB|GB|MB|KB)/i);
    if (!m) return 0;
    return parseFloat(m[1]) * { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[m[2].toUpperCase()];
}
const fmtBytes = (b) => (!b ? '0 MB' : b >= 1024 ** 4 ? (b / 1024 ** 4).toFixed(2) + ' TB' : b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(2) + ' GB' : (b / 1024 ** 2).toFixed(1) + ' MB');
const flag = (c) => (/^[A-Z]{2}$/.test(c || '') && c !== 'XX' ? String.fromCodePoint(...[...c].map((x) => 127397 + x.charCodeAt(0))) : '🌐');
let names = null;
const cname = (c) => { if (!c || c === 'XX') return 'Unknown'; try { names = names || new Intl.DisplayNames(['en'], { type: 'region' }); return names.of(c) || c; } catch (e) { return c; } };

// real numbers for the dashboard: last 7 days of views, visitors, top countries and top files
export default function DashboardTraffic({ supabase, userId }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            const since = new Date(); since.setDate(since.getDate() - 29); since.setHours(0, 0, 0, 0);
            const rows = [];
            for (let p = 0; p < 20; p++) {
                const { data: d, error } = await supabase.from('views').select('ts, file_id, country, ip_hash').eq('owner', userId).gte('ts', since.toISOString()).range(p * 1000, p * 1000 + 999);
                if (error) { if (alive) setData({ error: true }); return; }
                rows.push(...(d || []));
                if (!d || d.length < 1000) break;
            }
            const { data: files } = await supabase.from('files').select('id, name, size').eq('user_id', userId).limit(5000);
            if (alive) setData({ rows, files: files || [] });
        })();
        return () => { alive = false; };
    }, [supabase, userId]);

    if (!data) return <div className="ms-card p-6 text-sm ms-muted">Loading traffic…</div>;
    if (data.error) return <div className="ms-card p-4 text-sm ms-muted">Traffic numbers need <b>sql/6-analytics.sql</b> (run it once in Supabase).</div>;

    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return dayKey(d); });
    const per = {}; days.forEach((k) => { per[k] = 0; });
    const uniq7 = new Set(); const uniq30 = new Set(); const country = {}; const byFile = {};
    const t7 = new Date(); t7.setDate(t7.getDate() - 6); t7.setHours(0, 0, 0, 0);
    let today = 0; let v7 = 0;
    data.rows.forEach((v) => {
        const d = new Date(v.ts);
        if (v.ip_hash) uniq30.add(v.ip_hash);
        if (d >= t7) {
            v7 += 1;
            if (v.ip_hash) uniq7.add(v.ip_hash);
            const k = dayKey(d);
            if (k in per) per[k] += 1;
            if (k === dayKey(now)) today += 1;
            country[v.country || 'XX'] = (country[v.country || 'XX'] || 0) + 1;
            byFile[v.file_id] = (byFile[v.file_id] || 0) + 1;
        }
    });
    const vals = days.map((k) => per[k]);
    const max = Math.max(1, ...vals);
    const W = 300; const H = 70;
    const pts = vals.map((v, i) => `${(i / 6) * W},${H - 6 - (v / max) * (H - 14)}`);
    const topC = Object.entries(country).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topF = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ id, n, f: data.files.find((x) => x.id === id) }));
    const total = data.files.reduce((n, f) => n + parseBytes(f.size), 0);

    const Card = ({ label, value, sub }) => (
        <div className="ms-card p-4"><p className="ms-h2">{label}</p><p className="text-2xl font-bold text-white mt-2">{value}</p><p className="ms-muted text-xs mt-1">{sub}</p></div>
    );

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="ms-h2">Real traffic</h2><Link href="/analytics" className="text-xs font-semibold text-blue-400 hover:underline">Full analytics →</Link></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card label="Views today" value={today} sub="Player + download page" />
                <Card label="Views, 7 days" value={v7} sub={`${uniq7.size} visitors`} />
                <Card label="Monthly users" value={uniq30.size} sub="Unique, last 30 days" />
                <Card label="Uploaded total" value={fmtBytes(total)} sub={`${data.files.length} files`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="ms-card p-4 lg:col-span-1">
                    <p className="ms-h2 mb-2">Views, last 7 days</p>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Views in the last 7 days">
                        <defs><linearGradient id="dtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e5383b" stopOpacity=".4" /><stop offset="100%" stopColor="#e5383b" stopOpacity="0" /></linearGradient></defs>
                        <polygon points={`0,${H} ${pts.join(' ')} ${W},${H}`} fill="url(#dtg)" />
                        <polyline points={pts.join(' ')} fill="none" stroke="#e5383b" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">{days.map((k) => <span key={k}>{k.slice(8)}</span>)}</div>
                </div>
                <div className="ms-card p-4">
                    <p className="ms-h2 mb-2">Top countries</p>
                    {topC.length === 0 && <p className="text-sm ms-muted">No views yet.</p>}
                    {topC.map(([c, n]) => <div key={c} className="flex justify-between py-1.5 text-sm"><span className="text-slate-200 truncate">{flag(c)} {cname(c)}</span><b className="text-white">{n}</b></div>)}
                </div>
                <div className="ms-card p-4">
                    <p className="ms-h2 mb-2">Top files</p>
                    {topF.length === 0 && <p className="text-sm ms-muted">No views yet.</p>}
                    {topF.map(({ id, n, f }) => <div key={id} className="flex justify-between gap-3 py-1.5 text-sm"><span className="text-slate-200 truncate">{f ? f.name : id}</span><b className="text-white shrink-0">{n}</b></div>)}
                </div>
            </div>
        </section>
    );
}
