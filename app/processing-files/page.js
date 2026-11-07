'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { embedBase } from '../utils/embedOrigin';
import { copyToClipboard } from '../utils/copyFormat';
import { subscribe, isRunning, queueState, resetJob, kick } from '../utils/queueRunner';
import { IconLayers, IconRefresh, IconCheckCircle, IconInfo, IconFile, IconCopy, IconAlert, IconCheck } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ProcessingFilesPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [rows, setRows] = useState([]);
    const [recent, setRecent] = useState([]);
    const [, tick] = useState(0);
    const [toast, setToast] = useState('');

    const load = useCallback(async (userId) => {
        const { data } = await supabase.from('files').select('*').eq('user_id', userId).in('status', ['Processing', 'Pending', 'Failed']).not('original_url', 'is', null).order('date', { ascending: false }).limit(200);
        setRows(data || []);
        const { data: done } = await supabase.from('files').select('id, name, size, status, date').eq('user_id', userId).eq('status', 'Active').order('date', { ascending: false }).limit(5);
        setRecent(done || []);
    }, []);

    useEffect(() => {
        let t;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setUser(session.user);
            await load(session.user.id);
            setLoadingAuth(false);
            t = setInterval(() => load(session.user.id), 4000);
        })();
        const un = subscribe(() => tick((n) => n + 1));
        return () => { clearInterval(t); un(); };
    }, [router, load]);

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400"><IconRefresh size={18} className="ms-spin" /><span>Loading processing queue…</span></div>
            </div>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const say = (m) => { setToast(m); setTimeout(() => setToast(''), 1800); };
    const copy = async (t, label) => say((await copyToClipboard(t)) ? `${label} copied` : 'Copy failed');

    const stateOf = (f) => {
        if (isRunning(f.id)) return { label: 'Mirroring now…', cls: 'ms-badge-blue', spin: true };
        const st = queueState(f.id);
        if (f.status === 'Failed') return { label: 'Failed', cls: 'ms-badge-red' };
        if (st.n === 0) return { label: 'Waiting', cls: 'ms-badge-amber' };
        return { label: `Retry ${st.n}/4 soon`, cls: 'ms-badge-amber' };
    };

    const force = async (f) => {
        resetJob(f.id);
        if (f.status === 'Failed') await supabase.from('files').update({ status: 'Processing' }).eq('id', f.id);
        await load(user.id);
        kick(supabase);
        say('Started');
    };
    const forceAll = async () => {
        for (const f of rows) {
            resetJob(f.id);
            if (f.status === 'Failed') await supabase.from('files').update({ status: 'Processing' }).eq('id', f.id);
        }
        await load(user.id);
        kick(supabase);
        say('Started');
    };

    const running = rows.filter((f) => isRunning(f.id)).length;

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><IconLayers size={18} /></span>
                        <h1 className="ms-h1 truncate">Processing Queue</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[220px]">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-alert ms-alert-blue flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <IconInfo size={18} className="shrink-0 mt-0.5" />
                            <p className="text-sm">Your MultiServer links work from the moment you upload. This page shows the files that are still being sent to the mirror servers in the background. Keep any page of the site open; if you close everything, the work simply continues the next time you open it.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="ms-badge ms-badge-blue">{rows.length} in queue</span>
                            {running > 0 && <span className="ms-badge ms-badge-green"><span className="ms-pulse-dot" /> {running} running</span>}
                            {rows.length > 0 && <button type="button" onClick={forceAll} className="ms-btn ms-btn-primary ms-btn-sm"><IconRefresh size={14} /> Start all</button>}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {rows.length === 0 ? (
                            <div className="ms-card p-8 sm:p-12 text-center space-y-2">
                                <span className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><IconCheckCircle size={22} /></span>
                                <p className="text-sm font-semibold text-white">Queue is empty</p>
                                <p className="ms-muted text-xs">Everything has been sent to the servers. Finished files are in the File Manager.</p>
                            </div>
                        ) : rows.map((file) => {
                            const s = stateOf(file);
                            const st = queueState(file.id);
                            const embed = `${embedBase(origin)}/embed/${file.id}`;
                            return (
                                <div key={file.id} className="ms-card ms-fade-up p-4 sm:p-5 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><IconFile size={18} /></span>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-semibold text-white break-words">{file.name}</h4>
                                                <p className="ms-muted text-xs mt-0.5 break-words">Size: {file.size} · Profile: {file.profile && file.profile !== 'default' ? file.profile : 'Default'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            <span className={`ms-badge ${s.cls}`}>{s.spin && <IconRefresh size={11} className="ms-spin" />}{s.label}</span>
                                            <button type="button" onClick={() => copy(`${file.name}${file.size && file.size !== 'Pending' ? ` [${file.size}]` : ''}\n${embed}`, 'Title + embed')} className="ms-btn ms-btn-ghost ms-btn-sm"><IconCopy size={13} /> Title + Embed</button>
                                            <button type="button" onClick={() => copy(`${origin}/file/${file.id}`, 'File link')} className="ms-btn ms-btn-ghost ms-btn-sm"><IconCopy size={13} /> File</button>
                                            <button type="button" disabled={isRunning(file.id)} onClick={() => force(file)} className="ms-btn ms-btn-primary ms-btn-sm"><IconRefresh size={14} /> Force sync</button>
                                        </div>
                                    </div>
                                    {st.err && (
                                        <div className="ms-alert ms-alert-amber !py-2 !text-xs"><IconAlert size={14} className="shrink-0 mt-0.5" /><span className="min-w-0 break-words">{st.err}</span></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {recent.length > 0 && (
                        <div className="ms-card p-4 space-y-2">
                            <h2 className="ms-h2">Recently finished</h2>
                            {recent.map((f) => (
                                <div key={f.id} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="truncate text-slate-200">{f.name}</span>
                                    <span className="ms-badge ms-badge-green shrink-0">{f.size}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
            {toast && (
                <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-5 z-[80] flex items-center gap-2 px-4 h-10 rounded-xl bg-slate-900 border border-white/15 text-sm text-white shadow-xl">
                    <IconCheck size={14} className="text-emerald-400" /> {toast}
                </div>
            )}
        </div>
    );
}
