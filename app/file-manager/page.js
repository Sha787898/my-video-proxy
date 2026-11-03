'use client';

import { useState, useEffect, useMemo } from 'react';
import { embedBase } from '../utils/embedOrigin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { resolveMirrors, domainsFromSettings, PDLINK_SERVERS, DEFAULT_ACTIVE } from '../utils/mirrors';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_STYLE = {
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    Processing: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    Failed: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
};

export default function FileManagerPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [files, setFiles] = useState([]);
    const [domains, setDomains] = useState({});
    const [activeIds, setActiveIds] = useState([]);

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [pageSize, setPageSize] = useState(24);
    const [page, setPage] = useState(1);

    const [selected, setSelected] = useState(new Set());
    const [expanded, setExpanded] = useState(new Set());
    const [editingFileId, setEditingFileId] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    useEffect(() => {
        async function init() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            await loadAll(session.user.id);
            setLoadingAuth(false);
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    const loadAll = async (userId) => {
        const [filesRes, settingsRes] = await Promise.all([
            supabase.from('files').select('*').eq('user_id', userId).order('date', { ascending: false }),
            supabase.from('settings').select('key, value').eq('user_id', userId),
        ]);

        if (!filesRes.error && filesRes.data) setFiles(filesRes.data);

        const rows = settingsRes.data || [];
        setDomains(domainsFromSettings(rows));
        const get = (k) => rows.find((r) => r.key === k)?.value || '';
        setActiveIds(
            Object.keys(DEFAULT_ACTIVE).filter((id) => {
                const saved = get(`${id}_active`);
                return saved === '' ? DEFAULT_ACTIVE[id] : saved === 'true';
            })
        );
    };

    // ---------- হিসাব ----------
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pageLink = (f) => `${origin}/file/${f.id}`;
    const embedLink = (f) => `${embedBase(origin)}/embed/${f.id}`;
    const iframeCode = (f) => `<iframe src="${embedLink(f)}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;

    const mirrorsOf = (f) => resolveMirrors(f.mirrors, domains);

    // চালু আছে কিন্তু লিংক নেই এমন সার্ভার
    const missingOf = (f) => {
        const ms = Array.isArray(f.mirrors) ? f.mirrors : [];
        const present = new Set(ms.map((m) => m.id));
        const hasPd = present.has('pdlink');
        return activeIds.filter((id) => (PDLINK_SERVERS.includes(id) ? !hasPd : !present.has(id)));
    };

    const statusOf = (f) => {
        const ms = Array.isArray(f.mirrors) ? f.mirrors : [];
        if (ms.length === 0) return f.status === 'Processing' ? 'Processing' : 'Failed';
        return missingOf(f).length > 0 ? 'Partial' : 'Completed';
    };

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return files.filter((f) => {
            if (q && !(f.name || '').toLowerCase().includes(q)) return false;
            if (statusFilter !== 'All' && statusOf(f) !== statusFilter) return false;
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files, searchQuery, statusFilter, activeIds]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const allVisibleSelected = visible.length > 0 && visible.every((f) => selected.has(f.id));

    // ---------- কাজ ----------
    const flash = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(''), 6000);
    };

    const copyText = async (text, okMsg = 'Copied! 📋') => {
        try {
            await navigator.clipboard.writeText(text);
            flash(okMsg);
        } catch {
            flash('Copy failed — browser blocked clipboard.');
        }
    };

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (allVisibleSelected) visible.forEach((f) => n.delete(f.id));
            else visible.forEach((f) => n.add(f.id));
            return n;
        });
    };

    const toggleExpand = (id) => {
        setExpanded((prev) => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const handleRename = async (fileId) => {
        if (!newFileName.trim()) return;
        const { error } = await supabase.from('files').update({ name: newFileName }).eq('id', fileId);
        if (error) {
            alert('Failed to rename file: ' + error.message);
        } else {
            setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, name: newFileName } : f)));
            setEditingFileId(null);
            setNewFileName('');
        }
    };

    const deleteFiles = async (ids) => {
        if (ids.length === 0) return;
        if (!confirm(`${ids.length} টি ফাইল রেকর্ড ডিলিট করবেন? (সার্ভারে আপলোড করা ফাইল মুছবে না)`)) return;
        const { error } = await supabase.from('files').delete().in('id', ids);
        if (error) {
            alert('Failed to delete: ' + error.message);
            return;
        }
        setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
        setSelected((prev) => {
            const n = new Set(prev);
            ids.forEach((i) => n.delete(i));
            return n;
        });
    };

    // Repair: একই Drive লিংক আবার পাঠাই; Worker শুধু ব্যর্থ/ফাঁকা সার্ভারগুলো নতুন করে চেষ্টা করে
    const repairFiles = async (list) => {
        const withLink = list.filter((f) => f.original_url);
        if (withLink.length === 0) {
            flash('এই ফাইলগুলোর original Drive লিংক সেভ নেই, Repair করা যাবে না।');
            return;
        }
        setBusy(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ links: withLink.map((f) => f.original_url).join('\n') }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Repair failed');

            const stillFailed = (data.files || []).reduce((n, f) => n + (f.failed?.length || 0), 0);
            flash(
                `Repair শেষ: ${data.count} ফাইল চেক হয়েছে` +
                (stillFailed ? `, ${stillFailed}টি সার্ভার এখনো ব্যর্থ/চলছে (আপলোড পেজে কারণ দেখুন)` : ', সব সার্ভার ঠিক ✅') +
                (data.errors?.length ? ` | ত্রুটি: ${data.errors[0].error}` : '')
            );
            await loadAll(user.id);
        } catch (e) {
            flash('Repair error: ' + e.message);
        } finally {
            setBusy(false);
        }
    };

    const selectedFiles = files.filter((f) => selected.has(f.id));

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Loading File Manager...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 text-lg">📁</span>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Cloud File Manager</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                        <Link
                            href="/gdrive-upload"
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20"
                        >
                            ⬆️ Upload New File
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-4 lg:p-8 space-y-4 max-w-6xl w-full mx-auto">
                    {notice && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200">{notice}</div>
                    )}

                    {/* Toolbar */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
                        <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 accent-blue-600 cursor-pointer self-center"
                            title="Select all on this page"
                        />
                        <form
                            className="flex flex-1 gap-2"
                            onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); setPage(1); }}
                        >
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                            />
                            <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                                Search
                            </button>
                        </form>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-slate-200"
                            >
                                <option>All</option>
                                <option>Completed</option>
                                <option>Partial</option>
                                <option>Processing</option>
                                <option>Failed</option>
                            </select>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2.5 text-slate-200"
                            >
                                {[12, 24, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n} Items</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Selection bar */}
                    {selected.size > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-600 rounded-2xl px-4 py-3">
                            <span className="text-xs font-bold text-white">{selected.size} file(s) selected</span>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => copyText(selectedFiles.map(pageLink).join('\n'), 'Download page links copied! 📋')}
                                    className="px-3 py-1.5 rounded-lg bg-blue-400/40 hover:bg-blue-400/60 text-white text-xs font-bold cursor-pointer"
                                >
                                    🔗 Links
                                </button>
                                <button
                                    onClick={() => copyText(selectedFiles.map(embedLink).join('\n'), 'Embed links copied! 📋')}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold cursor-pointer"
                                >
                                    ▶ Embeds
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() => repairFiles(selectedFiles)}
                                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    {busy ? '⏳ Repairing...' : '🛠 Repair'}
                                </button>
                                <button
                                    onClick={() => deleteFiles(selectedFiles.map((f) => f.id))}
                                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                                >
                                    🗑 Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span>
                            Total: <span className="text-blue-400 font-bold">{filtered.length}</span> file(s)
                            {filtered.some((f) => statusOf(f) === 'Partial') && (
                                <button
                                    onClick={() => { setStatusFilter('Partial'); setPage(1); }}
                                    className="ml-3 text-amber-400 hover:underline cursor-pointer"
                                >
                                    ⚠ {files.filter((f) => statusOf(f) === 'Partial').length} partial — show
                                </button>
                            )}
                        </span>
                        <span>Page {currentPage} / {totalPages}</span>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {visible.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl">
                                <p className="text-xs text-slate-500">No files found.</p>
                            </div>
                        ) : (
                            visible.map((file) => {
                                const st = statusOf(file);
                                const missing = missingOf(file);
                                const ms = mirrorsOf(file);
                                const isOpen = expanded.has(file.id);
                                return (
                                    <div
                                        key={file.id}
                                        className={`bg-slate-900 border rounded-2xl p-4 transition ${
                                            selected.has(file.id) ? 'border-blue-500/60' : 'border-slate-800 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(file.id)}
                                                    onChange={() => toggleSelect(file.id)}
                                                    className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                                                />
                                                <span className="p-2.5 rounded-xl bg-purple-600/15 text-purple-300 text-sm shrink-0">🎞️</span>
                                                <div className="min-w-0 flex-1">
                                                    {editingFileId === file.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={newFileName}
                                                                onChange={(e) => setNewFileName(e.target.value)}
                                                                className="flex-1 min-w-0 bg-slate-950 border border-blue-500 text-white text-xs px-2.5 py-1 rounded-lg"
                                                            />
                                                            <button onClick={() => handleRename(file.id)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">Save</button>
                                                            <button onClick={() => setEditingFileId(null)} className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <h4 className="text-xs font-bold text-white truncate" title={file.name}>{file.name}</h4>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {file.size} • {file.date} • {ms.length} server{ms.length === 1 ? '' : 's'} • ID: {file.id}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                <span
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${STATUS_STYLE[st]}`}
                                                    title={missing.length ? `লিংক নেই: ${missing.join(', ')}` : ''}
                                                >
                                                    ● {st}
                                                </span>
                                                <button onClick={() => toggleExpand(file.id)} title="Server links" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">
                                                    {isOpen ? '▲' : '▼'}
                                                </button>
                                                <button onClick={() => copyText(pageLink(file), 'Download page link copied! 📋')} title="Copy download page link" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">🔗</button>
                                                <button onClick={() => copyText(iframeCode(file), 'Embed iframe code copied! 📋')} title="Copy embed iframe code" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">▶</button>
                                                <button onClick={() => { setEditingFileId(file.id); setNewFileName(file.name || ''); }} title="Rename" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer">✏️</button>
                                                <button
                                                    disabled={busy}
                                                    onClick={() => repairFiles([file])}
                                                    title={missing.length ? `Repair: ${missing.join(', ')}` : 'Repair / re-check servers'}
                                                    className={`w-8 h-8 rounded-lg text-xs cursor-pointer disabled:opacity-50 ${
                                                        missing.length ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-800 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    🛠
                                                </button>
                                                <button onClick={() => deleteFiles([file.id])} title="Delete" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-500/30 text-xs cursor-pointer">🗑</button>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <input readOnly value={pageLink(file)} className="flex-1 min-w-0 bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-xl px-3 py-2" />
                                                        <button onClick={() => copyText(pageLink(file), 'Download page link copied! 📋')} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl cursor-pointer">Copy</button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input readOnly value={embedLink(file)} className="flex-1 min-w-0 bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-xl px-3 py-2" />
                                                        <button onClick={() => copyText(iframeCode(file), 'Embed iframe code copied! 📋')} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl cursor-pointer">Embed</button>
                                                    </div>
                                                </div>

                                                {ms.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {ms.map((m) => (
                                                            <div key={m.id} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                                                                <span className="text-[10px] font-bold text-white w-28 shrink-0 truncate">{m.name}</span>
                                                                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 truncate flex-1 hover:underline">{m.url}</a>
                                                                <button onClick={() => copyText(m.url)} className="text-[10px] text-slate-300 hover:text-white cursor-pointer">Copy</button>
                                                                {m.embed && (
                                                                    <button onClick={() => copyText(m.embed)} className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer">Embed</button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-amber-400">কোনো সার্ভার লিংক সেভ হয়নি। 🛠 Repair চাপুন।</p>
                                                )}

                                                {missing.length > 0 && (
                                                    <p className="text-[11px] text-amber-400">
                                                        ⚠ লিংক নেই: {missing.join(', ')} — 🛠 Repair চাপলে শুধু এগুলো আবার চেষ্টা হবে।
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setPage(currentPage - 1)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs disabled:opacity-40 cursor-pointer"
                            >
                                ← Prev
                            </button>
                            <span className="text-xs text-slate-400">{currentPage} / {totalPages}</span>
                            <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage(currentPage + 1)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs disabled:opacity-40 cursor-pointer"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}