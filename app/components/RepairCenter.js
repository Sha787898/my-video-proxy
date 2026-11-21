'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { IconWrench, IconCheck, IconX, IconAlert, IconRefresh, IconChevronDown } from './Icons';

// Check & repair for one or many files.
//  1. every file is CHECKED first (read only, /api/repair): which server really has it, which link is dead, is the Drive source alive
//  2. REPAIR uploads only what is missing or dead (the servers that are fine are never touched, so nothing is uploaded twice)
// Files are checked / repaired a few at a time; Vidara and VidShared run one by one (they refuse many requests at once).
// New servers need no change here: they come from /api/repair, which reads utils/mirrors.js.

const LABEL = { ok: 'Working', dead: 'Needs repair', missing: 'Missing', pending: 'In progress', nokey: 'Setup needed', fixing: 'Uploading', fixed: 'Fixed', failed: 'Try again' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, size, fn) {
    let i = 0;
    const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } };
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
}

let SERIAL = Promise.resolve(); // Vidara / VidShared: one at a time, across all files
const serial = (fn) => { const p = SERIAL.catch(() => {}).then(fn); SERIAL = p.catch(() => {}); return p; };

export default function RepairCenter({ files, supabase, profiles = [], onClose, onDone }) {
    const [phase, setPhase] = useState('checking'); // checking | ready | fixing | done | error
    const [res, setRes] = useState({}); // fileId -> { source, rows, profile, err }
    const [open, setOpen] = useState(new Set());
    const [profile, setProfile] = useState('file'); // 'file' = the profile each file was uploaded with
    const [prog, setProg] = useState({ done: 0, total: 0, label: '' });
    const [msg, setMsg] = useState('');
    const sess = useRef(null);
    const alive = useRef(true);
    useEffect(() => () => { alive.current = false; }, []);
    const busy = phase === 'checking' || phase === 'fixing';

    useEffect(() => {
        const k = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [busy, onClose]);

    const hdr = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${sess.current.access_token}` });
    const post = async (url, body) => {
        const r = await fetch(url, { method: 'POST', headers: hdr(), body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        return { ok: r.ok, d };
    };
    const checkOne = async (f) => {
        try {
            const { ok, d } = await post('/api/repair', { fileId: f.id, profile });
            if (!ok || !d.rows) return { err: d.error || 'The check could not finish' };
            return { source: d.source, rows: d.rows, profile: d.profile || 'default' };
        } catch (e) { return { err: 'The check could not finish' }; }
    };

    const runCheck = async () => {
        setPhase('checking'); setMsg(''); setProg({ done: 0, total: files.length, label: 'Checking' });
        try {
            const { data } = await supabase.auth.getSession();
            if (!data || !data.session) { setPhase('error'); setMsg('Please log in again.'); return; }
            sess.current = data.session;
            const out = {};
            await pool(files, 3, async (f) => {
                out[f.id] = await checkOne(f);
                if (alive.current) { setRes((cur) => ({ ...cur, [f.id]: out[f.id] })); setProg((p) => ({ ...p, done: p.done + 1 })); }
            });
            if (alive.current) setPhase('ready');
        } catch (e) { setPhase('error'); setMsg('The check could not finish. Try again.'); }
    };
    useEffect(() => { runCheck(); /* eslint-disable-next-line */ }, []);

    const todoOf = (id) => {
        const r = res[id];
        if (!r || r.err || !r.rows) return [];
        if (r.source && (r.source.state === 'deleted' || r.source.state === 'private')) return [];
        return r.rows.filter((x) => x.fix && (x.state === 'missing' || x.state === 'dead'));
    };
    const stats = useMemo(() => {
        let fine = 0, work = 0, blocked = 0, servers = 0;
        files.forEach((f) => {
            const r = res[f.id];
            if (!r || r.err) return;
            const t = todoOf(f.id);
            const bad = r.source && (r.source.state === 'deleted' || r.source.state === 'private');
            if (bad) blocked++; else if (t.length) { work++; servers += t.length; } else fine++;
        });
        return { fine, work, blocked, servers };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [res, files]);

    const repairOne = async (f) => {
        const r = res[f.id];
        const todo = todoOf(f.id);
        if (!todo.length) return;
        const setRow = (rid, state, note) => setRes((cur) => ({ ...cur, [f.id]: { ...cur[f.id], rows: cur[f.id].rows.map((x) => (x.id === rid ? { ...x, state, note: note ?? x.note } : x)) } }));
        todo.forEach((x) => setRow(x.id, 'fixing', 'Uploading...'));
        const pr = r.profile || 'default';
        const main = todo.filter((x) => x.id !== 'vidara' && x.id !== 'vidshared');
        const only = []; const force = [];
        main.forEach((x) => { (x.id === 'pdlink' ? (x.group || []) : [x.id]).forEach((s) => { only.push(s); if (x.state === 'dead') force.push(s); }); });
        const link = f.original_url;
        if (only.length) await post('/api/upload', { links: link, uploadType: 'gdrive', fileId: f.id, phase: 'main', profile: pr, only, force });
        const va = todo.find((x) => x.id === 'vidara');
        if (va) await serial(() => post('/api/upload', { links: link, uploadType: 'gdrive', fileId: f.id, phase: 'serial', profile: pr, only: ['vidara'], force: va.state === 'dead' ? ['vidara'] : [] }));
        const vs = todo.find((x) => x.id === 'vidshared');
        if (vs) await serial(() => post('/api/vidshared', { fileId: f.id, profile: pr, force: vs.state === 'dead' }));
    };

    const repairAll = async () => {
        const list = files.filter((f) => todoOf(f.id).length && f.original_url);
        if (!list.length) return;
        setPhase('fixing'); setMsg(''); setProg({ done: 0, total: list.length, label: 'Repairing' });
        const before = {};
        list.forEach((f) => { before[f.id] = new Set(todoOf(f.id).map((x) => x.id)); });
        try {
            await pool(list, 2, async (f) => {
                try { await repairOne(f); } catch (e) { /* the re-check below shows what is still wrong */ }
                if (alive.current) setProg((p) => ({ ...p, done: p.done + 1 }));
            });
            if (alive.current) setProg({ done: 0, total: list.length, label: 'Checking again' });
            await sleep(4000);
            await pool(list, 3, async (f) => {
                const n = await checkOne(f);
                if (n.rows) n.rows = n.rows.map((x) => (before[f.id].has(x.id) ? (x.state === 'ok' ? { ...x, state: 'fixed' } : x.state === 'pending' ? x : { ...x, state: 'failed', note: 'Still not ready. Try again in a minute' }) : x));
                if (alive.current) { setRes((cur) => ({ ...cur, [f.id]: n })); setProg((p) => ({ ...p, done: p.done + 1 })); }
            });
            if (alive.current) { setPhase('done'); if (onDone) onDone(); }
        } catch (e) { setPhase('error'); setMsg('Repair stopped. Nothing was lost; you can try again.'); }
    };

    const toggle = (id) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const summary = (f) => {
        const r = res[f.id];
        if (!r) return { tone: 'wait', text: 'Waiting...' };
        if (r.err) return { tone: 'bad', text: r.err };
        if (r.source && r.source.state === 'deleted') return { tone: 'bad', text: 'Google Drive file deleted' };
        if (r.source && r.source.state === 'private') return { tone: 'bad', text: 'Google Drive file is private' };
        const rows = r.rows || [];
        const bad = rows.filter((x) => x.state === 'dead' || x.state === 'failed').length;
        const miss = rows.filter((x) => x.state === 'missing').length;
        const fix = rows.filter((x) => x.state === 'fixing').length;
        if (fix) return { tone: 'wait', text: 'Uploading...' };
        if (bad || miss) return { tone: 'warn', text: [miss ? `${miss} missing` : '', bad ? `${bad} need repair` : ''].filter(Boolean).join(' · ') };
        return { tone: 'ok', text: `All ${rows.filter((x) => x.state === 'ok' || x.state === 'fixed').length} servers fine` };
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Check and repair files" onClick={() => { if (!busy) onClose(); }}>
            <div className="ms-card w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden ms-fade-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-4 border-b border-white/10">
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center"><IconWrench size={17} /></span>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white">Check &amp; repair</h3>
                        <p className="text-xs ms-muted truncate">
                            {phase === 'checking' ? `Checking ${prog.done} / ${prog.total} files...` : phase === 'fixing' ? `${prog.label} ${prog.done} / ${prog.total}. Please keep this window open` : `${files.length} file${files.length === 1 ? '' : 's'} · ${stats.fine} fine · ${stats.work} to repair${stats.blocked ? ` · ${stats.blocked} no source` : ''}`}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="ms-btn ms-btn-ghost ms-btn-icon"><IconX size={16} /></button>
                </div>

                {busy && <div className="h-1 bg-white/5"><div className="h-full bg-blue-500 transition-all" style={{ width: `${prog.total ? Math.round((prog.done / prog.total) * 100) : 0}%` }} /></div>}

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                    {phase === 'error' && <div className="ms-alert ms-alert-red"><IconAlert size={16} className="mt-0.5 shrink-0" /><span>{msg}</span></div>}
                    {phase === 'done' && <div className="ms-alert ms-alert-green"><IconCheck size={16} className="mt-0.5 shrink-0" /><span>Finished. Servers that were already fine were not touched, so nothing was uploaded twice. Some hosts need a few minutes; check again later if a server still shows &quot;In progress&quot;.</span></div>}
                    {files.map((f) => {
                        const s = summary(f);
                        const r = res[f.id];
                        const isOpen = open.has(f.id);
                        return (
                            <div key={f.id} className="rounded-xl border border-white/10 bg-white/[0.03]">
                                <button type="button" onClick={() => toggle(f.id)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] ${s.tone === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : s.tone === 'bad' ? 'bg-red-500/15 text-red-300' : s.tone === 'warn' ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-slate-400'}`}>
                                        {s.tone === 'ok' ? <IconCheck size={13} /> : s.tone === 'wait' ? <IconRefresh size={13} className="ms-spin" /> : '!'}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <b className="block text-[13px] text-white truncate" title={f.name}>{f.name}</b>
                                        <small className={`block text-[11px] ${s.tone === 'bad' ? 'text-red-300' : s.tone === 'warn' ? 'text-amber-300' : 'ms-muted'}`}>{s.text}</small>
                                    </span>
                                    <IconChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isOpen && r && (
                                    <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2.5">
                                        {r.source && <p className={`text-[11px] ${r.source.state === 'ok' ? 'text-emerald-300' : r.source.state === 'unknown' ? 'text-amber-300' : 'text-red-300'}`}>Google Drive: {r.source.note}</p>}
                                        {r.source && r.source.state === 'deleted' && <p className="text-[11px] ms-muted">Old copies on the servers may still play, but new uploads cannot run. Add a new Drive link to restore this file.</p>}
                                        {(r.rows || []).map((x) => (
                                            <div key={x.id} className="flex items-center gap-2 text-xs">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${x.state === 'ok' || x.state === 'fixed' ? 'bg-emerald-400' : x.state === 'pending' || x.state === 'fixing' ? 'bg-blue-400' : x.state === 'missing' || x.state === 'nokey' ? 'bg-amber-400' : 'bg-red-400'}`} />
                                                <span className="min-w-0 flex-1 truncate text-slate-200">{x.name} <span className="ms-muted">· {x.note}</span></span>
                                                <span className="shrink-0 text-[10.5px] font-bold text-slate-300">{LABEL[x.state] || x.state}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2 p-3 border-t border-white/10">
                    <select value={profile} onChange={(e) => setProfile(e.target.value)} disabled={busy} aria-label="Servers to check" className="ms-input !w-auto !min-h-[34px] !text-xs">
                        <option value="file">Each file&apos;s own profile</option>
                        <option value="default">Default (all switched-on servers)</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button type="button" onClick={runCheck} disabled={busy} className="ms-btn ms-btn-ghost ms-btn-sm"><IconRefresh size={14} /> Check again</button>
                    <button type="button" onClick={repairAll} disabled={busy || !stats.work} className="ms-btn ms-btn-primary ms-btn-sm ml-auto">
                        <IconWrench size={14} /> {stats.work ? `Repair ${stats.work} file${stats.work === 1 ? '' : 's'} (${stats.servers} server${stats.servers === 1 ? '' : 's'})` : 'Nothing to repair'}
                    </button>
                </div>
            </div>
        </div>
    );
}
