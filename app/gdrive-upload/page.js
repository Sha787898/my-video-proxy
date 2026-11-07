'use client';

import { useState, useEffect, useRef } from 'react';
import { embedBase } from '../utils/embedOrigin';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ProfilePicker from '../components/ProfilePicker';
import { buildCopy, copyToClipboard, COPY_KINDS } from '../utils/copyFormat';
import { IconFolder, IconCloud, IconUpload, IconInfo, IconCheckCircle, IconAlert, IconCopy, IconRefresh, IconFilm, IconServer, IconX, IconCheck } from '../components/Icons';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CONCURRENCY = 3; // links processed at the same time; each one is shown the moment it is done

function statusBadge(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete') || s === 'done' || s === 'success' || s === 'active') return 'ms-badge-green';
    if (s.includes('process') || s.includes('queue') || s.includes('pending')) return 'ms-badge-blue';
    if (s.includes('fail') || s.includes('error')) return 'ms-badge-red';
    return 'ms-badge-amber';
}

export default function GDriveUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [folderUrl, setFolderUrl] = useState('');
    const [linksInput, setLinksInput] = useState('');
    const [profile, setProfile] = useState('default');
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [results, setResults] = useState([]);
    const [errors, setErrors] = useState([]);
    const [missingKeys, setMissingKeys] = useState([]);
    const [toast, setToast] = useState('');
    const cancelRef = useRef(false);
    const toastTimer = useRef(null);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoadingAuth(false);
        }
        checkAuth();
    }, [router]);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" /> Checking authorization...
                </div>
            </div>
        );
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const links = (f) => ({ page: `${origin}/file/${f.id}`, embed: `${embedBase(origin)}/embed/${f.id}` });

    const say = (msg) => {
        setToast(msg);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 2200);
    };

    const copy = async (kind, files, label) => {
        if (!files.length) return;
        const ok = await copyToClipboard(buildCopy(kind, files, links));
        say(ok ? `${label} copied` : 'Copy failed: the browser blocked the clipboard');
    };

    const copyOne = async (text, label) => {
        const ok = await copyToClipboard(text);
        say(ok ? `${label} copied` : 'Copy failed: the browser blocked the clipboard');
    };

    // Append the folder link to the link queue
    const handleExtractFolder = () => {
        if (!folderUrl.trim()) return;
        setLinksInput((prev) => (prev ? prev + '\n' : '') + folderUrl.trim());
        setFolderUrl('');
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (running) return;

        const clean = [...new Set(linksInput.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.includes('1xxxxxxx') && !l.includes('2xxxxxxx')))];
        if (clean.length === 0) {
            say('Add at least one Google Drive link');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) { router.push('/login'); return; }

        cancelRef.current = false;
        setRunning(true);
        setResults([]);
        setErrors([]);
        setMissingKeys([]);
        setProgress({ done: 0, total: clean.length });

        const queue = [...clean];
        const failedLinks = [];
        let done = 0;

        const worker = async () => {
            while (queue.length > 0 && !cancelRef.current) {
                const link = queue.shift();
                try {
                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ links: link, uploadType: 'gdrive', profile }),
                    });
                    let data = {};
                    try { data = await res.json(); } catch (err) { /* not JSON */ }
                    if (!res.ok) throw new Error(data.error || `Server answered ${res.status}`);
                    const got = data.files || [];
                    if (got.length) setResults((prev) => [...prev.filter((x) => !got.some((g) => g.id === x.id)), ...got]);
                    if (data.errors && data.errors.length) {
                        failedLinks.push(link);
                        setErrors((prev) => [...prev, ...data.errors.map((er) => ({ link: er.link || link, error: er.error }))]);
                    }
                    if (data.missingKeys && data.missingKeys.length) setMissingKeys((prev) => [...new Set([...prev, ...data.missingKeys])]);
                } catch (err) {
                    failedLinks.push(link);
                    setErrors((prev) => [...prev, { link, error: err.message }]);
                }
                done += 1;
                setProgress({ done, total: clean.length });
            }
        };

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, clean.length) }, worker));

        // links that did not work stay in the box so they can be sent again with one click
        const notTried = cancelRef.current ? queue : [];
        setLinksInput([...failedLinks, ...notTried].join('\n'));
        setRunning(false);
    };

    const stop = () => { cancelRef.current = true; };
    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconFolder size={18} /></span>
                        <h1 className="ms-h1 truncate">Google Drive Link Uploader</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <ProfilePicker supabase={supabase} userId={user?.id} onChange={setProfile} />

                    <div className="ms-card p-4 sm:p-6 space-y-5">
                        <h2 className="ms-h2 flex items-center gap-2"><IconCloud size={16} /> Google Drive bulk link mirror</h2>

                        <form onSubmit={handleBulkUpload} className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                    <label className="ms-label" htmlFor="gd-folder">Add a shared folder link</label>
                                    <span className="text-[11px] text-blue-400 font-semibold">Adds it to the list below</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        id="gd-folder"
                                        type="url"
                                        value={folderUrl}
                                        onChange={(e) => setFolderUrl(e.target.value)}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        className="ms-input min-w-0 flex-1"
                                    />
                                    <button type="button" onClick={handleExtractFolder} className="ms-btn ms-btn-ghost ms-btn-block sm:w-auto!">
                                        <IconFolder size={16} /> Add
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 border-t border-slate-800"></div>
                                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Or multiple links</span>
                                <div className="flex-1 border-t border-slate-800"></div>
                            </div>

                            <div className="space-y-2">
                                <label className="ms-label" htmlFor="gd-links">Google Drive public links (one per line)</label>
                                <textarea
                                    id="gd-links"
                                    rows={6}
                                    value={linksInput}
                                    onChange={(e) => setLinksInput(e.target.value)}
                                    placeholder={`https://drive.google.com/file/d/1xxxxxxx/view\nhttps://drive.google.com/file/d/2xxxxxxx/view`}
                                    className="ms-input ms-code leading-relaxed"
                                    disabled={running}
                                />
                                <p className="ms-muted text-xs">
                                    Links must be publicly shared. {linksInput.split('\n').filter((l) => l.trim()).length} line(s). Each link shows up below as soon as it is ready.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <button type="submit" disabled={running} className="ms-btn ms-btn-primary ms-btn-block">
                                    {running ? <IconRefresh size={16} className="ms-spin" /> : <IconUpload size={16} />}
                                    {running ? `Working ${progress.done}/${progress.total}` : 'Upload links'}
                                </button>
                                {running && (
                                    <button type="button" onClick={stop} className="ms-btn ms-btn-ghost sm:w-auto!"><IconX size={16} /> Stop after current</button>
                                )}
                            </div>

                            {(running || progress.total > 0) && (
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                            )}
                        </form>
                    </div>

                    {!running && progress.total > 0 && (
                        <div className={`ms-alert ${errors.length ? 'ms-alert-amber' : 'ms-alert-green'} ms-fade-up`}>
                            {errors.length ? <IconAlert size={18} className="shrink-0" /> : <IconCheckCircle size={18} className="shrink-0" />}
                            <p className="min-w-0 break-words">
                                {results.length} of {progress.total} link(s) done{errors.length ? `, ${errors.length} failed` : ''}.
                                {errors.length > 0 && ' The failed links are back in the box above, so you can send them again.'}
                                {missingKeys.length > 0 && ` Missing API keys: ${missingKeys.join(', ')}.`}
                            </p>
                        </div>
                    )}

                    {errors.length > 0 && (
                        <div className="ms-card p-4 space-y-2">
                            <h2 className="ms-h2">Failed links</h2>
                            {errors.map((er, i) => (
                                <div key={`${er.link}-${i}`} className="rounded-xl border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-xs min-w-0">
                                    <p className="ms-code text-slate-300 break-all">{er.link}</p>
                                    <p className="text-red-300 mt-0.5 break-words">{er.error}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {results.length > 0 && (
                        <section className="space-y-4" aria-label="Generated links">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <h2 className="ms-h2 px-1">Generated links ({results.length})</h2>
                                <div className="flex flex-wrap gap-2" role="group" aria-label="Copy all files">
                                    {COPY_KINDS.map(([k, label]) => (
                                        <button
                                            key={k}
                                            type="button"
                                            onClick={() => copy(k, results, k === 'all' ? 'Everything' : `All ${label.toLowerCase()}s`)}
                                            className={`ms-btn ms-btn-sm ${k === 'all' ? 'ms-btn-primary' : 'ms-btn-ghost'}`}
                                        >
                                            <IconCopy size={14} /> {k === 'all' ? 'Copy all details' : `Copy all ${label.toLowerCase()}s`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {results.map((file) => {
                                const l = links(file);
                                return (
                                    <article key={file.id} className="ms-card p-4 sm:p-5 space-y-4 ms-fade-up">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconFilm size={18} /></span>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-white break-words">{file.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        <span className="ms-badge">{file.size}</span>
                                                        <span className={`ms-badge ${statusBadge(file.status)}`}>{file.status}</span>
                                                        {file.profile_name && file.profile_name !== 'Default' && <span className="ms-badge">{file.profile_name}</span>}
                                                        {file.already_exists && <span className="ms-badge ms-badge-amber">Already existed</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 shrink-0" role="group" aria-label={`Copy ${file.name}`}>
                                                {COPY_KINDS.map(([k, label]) => (
                                                    <button
                                                        key={k}
                                                        type="button"
                                                        onClick={() => copy(k, [file], label)}
                                                        className={`ms-btn ms-btn-sm ${k === 'all' ? 'ms-btn-primary' : 'ms-btn-ghost'}`}
                                                    >
                                                        <IconCopy size={13} /> {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {file.db_error && (
                                            <div className="ms-alert ms-alert-red">
                                                <IconAlert size={16} className="shrink-0" />
                                                <p className="min-w-0 break-words">Database: {file.db_error}</p>
                                            </div>
                                        )}

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <button type="button" onClick={() => copyOne(l.page, 'Download page')} className="text-left rounded-xl border border-white/10 bg-black/30 hover:bg-white/[0.06] px-3 py-2.5 min-w-0 transition">
                                                <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">Download page · click to copy</span>
                                                <span className="block ms-code text-xs text-slate-200 truncate">{l.page}</span>
                                            </button>
                                            <button type="button" onClick={() => copyOne(l.embed, 'Embed player')} className="text-left rounded-xl border border-white/10 bg-black/30 hover:bg-white/[0.06] px-3 py-2.5 min-w-0 transition">
                                                <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">Embed player · click to copy</span>
                                                <span className="block ms-code text-xs text-slate-200 truncate">{l.embed}</span>
                                            </button>
                                        </div>

                                        {file.mirrors && file.mirrors.length > 0 && (
                                            <details className="group" open>
                                                <summary className="ms-label flex items-center gap-1.5 cursor-pointer select-none"><IconServer size={14} /> Server links ({file.mirrors.length})</summary>
                                                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                    {file.mirrors.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => copyOne(m.url, m.name)}
                                                            title={m.url}
                                                            className="text-left rounded-xl border border-white/10 bg-black/30 hover:border-blue-400/50 hover:bg-white/[0.05] px-3 py-2 min-w-0 transition"
                                                        >
                                                            <span className="flex items-center justify-between gap-2">
                                                                <span className="text-xs font-bold text-white truncate">{m.name}</span>
                                                                <IconCopy size={12} className="text-slate-500 shrink-0" />
                                                            </span>
                                                            <span className="block ms-code text-[11px] text-blue-300 truncate">{m.url}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                        {file.failed && file.failed.length > 0 && (
                                            <div className="space-y-1.5">
                                                <label className="ms-label">Failed / skipped servers</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {file.failed.map((f, i) => (
                                                        <span key={`${f.name}-${i}`} className="ms-badge ms-badge-amber max-w-full whitespace-normal break-words text-left">
                                                            {f.name} ({f.reason})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </section>
                    )}
                </main>
            </div>

            {toast && (
                <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-5 z-[80] flex items-center gap-2 px-4 h-10 rounded-xl bg-slate-900 border border-white/15 text-sm text-white shadow-xl ms-fade-up">
                    <IconCheck size={14} className="text-emerald-400" /> {toast}
                </div>
            )}
        </div>
    );
}
