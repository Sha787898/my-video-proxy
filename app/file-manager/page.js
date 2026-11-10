'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { mascotSayAuto } from '../utils/mascotSay';
import { embedBase } from '../utils/embedOrigin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    IconFolder, IconUpload, IconSearch, IconFilm, IconChevronDown, IconChevronLeft, IconChevronRight, IconLink, IconCode,
    IconPencil, IconWrench, IconTrash, IconCopy, IconExternal, IconAlert, IconInfo, IconActivity, IconInbox, IconCheck, IconX, IconRefresh, IconPlay,
} from '../components/Icons';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles, PROFILES_KEY } from '../utils/profiles';
import { buildCopy, copyToClipboard, COPY_KINDS } from '../utils/copyFormat';
import { resolveMirrors, domainsFromSettings, PDLINK_SERVERS, DEFAULT_ACTIVE } from '../utils/mirrors';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FOLDERS_KEY = 'fm_folders';

const STATUS_BADGE = {
    Completed: 'ms-badge-green',
    Partial: 'ms-badge-amber',
    Processing: 'ms-badge-blue',
    Failed: 'ms-badge-red',
};

const hostOf = (url) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
};

export default function FileManagerPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [files, setFiles] = useState([]);
    const [domains, setDomains] = useState({});
    const [activeIds, setActiveIds] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [repairAsk, setRepairAsk] = useState(null); // { list, profile }
    // folders: { folders:[{id,name}], map:{ fileId: folderId } } saved in settings (no SQL needed)
    const [fm, setFm] = useState({ folders: [], map: {} });
    const [folder, setFolder] = useState(null); // null = all files, 'none' = not in a folder, or a folder id
    const [folderAsk, setFolderAsk] = useState(null); // { mode:'new'|'rename', name }

    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [pageSize, setPageSize] = useState(24);
    const [sortBy, setSortBy] = useState('new');
    const searchRef = useRef(null);
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
        try {
            const raw = JSON.parse(rows.find((r) => r.key === FOLDERS_KEY)?.value || 'null');
            if (raw && Array.isArray(raw.folders)) setFm({ folders: raw.folders.filter((x) => x && x.id && x.name).slice(0, 100), map: raw.map && typeof raw.map === 'object' ? raw.map : {} });
        } catch (e) { /* ignore */ }
        setProfiles(parseProfiles(rows.find((r) => r.key === PROFILES_KEY)?.value));
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
        const prof = profiles.find((p) => p.id === f.profile);
        const expected = prof ? prof.servers : activeIds;
        return expected.filter((id) => (PDLINK_SERVERS.includes(id) ? !hasPd : !present.has(id)));
    };

    const statusOf = (f) => {
        const ms = Array.isArray(f.mirrors) ? f.mirrors : [];
        if (ms.length === 0) return f.status === 'Processing' ? 'Processing' : 'Failed';
        return missingOf(f).length > 0 ? 'Partial' : 'Completed';
    };

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const list = files.filter((f) => {
            if (q && !(f.name || '').toLowerCase().includes(q)) return false;
            if (folder === 'none' && fm.map[f.id]) return false;
            if (folder && folder !== 'none' && fm.map[f.id] !== folder) return false;
            if (statusFilter !== 'All' && statusOf(f) !== statusFilter) return false;
            return true;
        });
        if (sortBy === 'old') return [...list].reverse();
        if (sortBy === 'name') return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files, searchQuery, statusFilter, activeIds, profiles, sortBy, folder, fm]);

    // "/" jumps to the search box
    useEffect(() => {
        const onKey = (e) => {
            const t = e.target;
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            if (searchRef.current) { e.preventDefault(); searchRef.current.focus(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const allVisibleSelected = visible.length > 0 && visible.every((f) => selected.has(f.id));

    // ---------- কাজ ----------
    const flash = (msg) => {
        mascotSayAuto(msg);
        setNotice(msg);
        setTimeout(() => setNotice(''), 6000);
    };

    const copyText = async (text, okMsg = 'Copied') => {
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
        if (!confirm(`Delete ${ids.length} file record(s)? Files already uploaded to the servers are not removed.`)) return;
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
    const saveFm = async (next) => {
        const live = new Set(files.map((f) => f.id));
        const map = {};
        Object.keys(next.map).forEach((id) => { if (live.has(id) && next.folders.some((x) => x.id === next.map[id])) map[id] = next.map[id]; });
        const clean = { folders: next.folders, map };
        setFm(clean);
        const { error } = await supabase.from('settings').upsert({ user_id: user.id, key: FOLDERS_KEY, value: JSON.stringify(clean) }, { onConflict: 'user_id,key' });
        if (error) flash('Folder save failed: ' + error.message);
    };
    const folderCount = (id) => (id === 'none' ? files.filter((f) => !fm.map[f.id]).length : files.filter((f) => fm.map[f.id] === id).length);
    const submitFolder = async () => {
        const name = (folderAsk?.name || '').trim().slice(0, 40);
        if (!name) return;
        if (folderAsk.mode === 'new') {
            const id = 'f' + Date.now().toString(36);
            await saveFm({ ...fm, folders: [...fm.folders, { id, name }] });
            setFolder(id);
        } else {
            await saveFm({ ...fm, folders: fm.folders.map((x) => (x.id === folder ? { ...x, name } : x)) });
        }
        setFolderAsk(null);
        setPage(1);
    };
    const deleteFolder = async () => {
        const cur = fm.folders.find((x) => x.id === folder);
        if (!cur || !confirm(`Delete the folder "${cur.name}"? The files inside are kept and go back to "No folder".`)) return;
        await saveFm({ folders: fm.folders.filter((x) => x.id !== folder), map: fm.map });
        setFolder(null);
    };
    const moveFiles = async (ids, folderId) => {
        const map = { ...fm.map };
        ids.forEach((id) => { if (folderId) map[id] = folderId; else delete map[id]; });
        await saveFm({ ...fm, map });
        flash(folderId ? `Moved ${ids.length} file(s) to "${fm.folders.find((x) => x.id === folderId)?.name}"` : `${ids.length} file(s) removed from their folder`);
    };
    const profileName = (id) => (id === 'default' || !id ? 'Default' : (profiles.find((p) => p.id === id)?.name || 'Default'));
    const askRepair = (list) => {
        const first = list[0] && list[0].profile;
        setRepairAsk({ list, profile: profiles.some((p) => p.id === first) ? first : 'default' });
    };
    const copyKind = async (kind, list, label) => {
        if (!list.length) return;
        const ok = await copyToClipboard(buildCopy(kind, list, (f) => ({ page: pageLink(f), embed: embedLink(f) })));
        flash(ok ? `${label} copied` : 'Copy failed: the browser blocked the clipboard');
    };
    const repairFiles = async (list, profile = 'default') => {
        const withLink = list.filter((f) => f.original_url);
        if (withLink.length === 0) {
            flash('These files have no saved original Drive link, so they cannot be repaired.');
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
                body: JSON.stringify({ links: withLink.map((f) => f.original_url).join('\n'), profile }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Repair failed');

            const stillFailed = (data.files || []).reduce((n, f) => n + (f.failed?.length || 0), 0);
            flash(
                `Repair finished: ${data.count} file(s) checked` +
                (stillFailed ? `, ${stillFailed} server(s) still failing or pending (see the upload page for reasons)` : ', all servers OK') +
                (data.errors?.length ? ` | Error: ${data.errors[0].error}` : '')
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
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400">
                    <IconActivity size={18} className="ms-spin" />
                    <span>Loading file manager…</span>
                </div>
            </div>
        );
    }

    const partialCount = files.filter((f) => statusOf(f) === 'Partial').length;

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center">
                            <IconFolder size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">File Manager</h1>
                        <span className="ms-badge hidden sm:inline-flex">{files.length} files</span>
                    </div>
                    <Link href="/gdrive-upload" className="ms-btn ms-btn-primary ms-btn-sm shrink-0">
                        <IconUpload size={15} />
                        <span className="hidden sm:inline">Upload new file</span>
                        <span className="sm:hidden">Upload</span>
                    </Link>
                </header>

                <main className="ms-main flex-1 w-full max-w-6xl mx-auto space-y-4">
                    {notice && (
                        <div className="ms-alert ms-alert-blue ms-fade-up" role="status">
                            <IconInfo size={16} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">{notice}</span>
                        </div>
                    )}

                    {/* Folders */}
                    <div className="ms-card p-3 sm:p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => { setFolder(null); setPage(1); }} className={`ms-btn ms-btn-sm ${folder === null ? 'ms-btn-primary' : 'ms-btn-ghost'}`}><IconFolder size={14} /> All files <span className="opacity-70">{files.length}</span></button>
                            {fm.folders.map((x) => (
                                <button key={x.id} type="button" onClick={() => { setFolder(x.id); setPage(1); }} className={`ms-btn ms-btn-sm max-w-[220px] ${folder === x.id ? 'ms-btn-primary' : 'ms-btn-ghost'}`}><IconFolder size={14} className="shrink-0" /> <span className="truncate">{x.name}</span> <span className="opacity-70">{folderCount(x.id)}</span></button>
                            ))}
                            {fm.folders.length > 0 && <button type="button" onClick={() => { setFolder('none'); setPage(1); }} className={`ms-btn ms-btn-sm ${folder === 'none' ? 'ms-btn-primary' : 'ms-btn-ghost'}`}>No folder <span className="opacity-70">{folderCount('none')}</span></button>}
                            <button type="button" onClick={() => setFolderAsk({ mode: 'new', name: '' })} className="ms-btn ms-btn-soft ms-btn-sm sm:ml-auto">+ New folder</button>
                        </div>
                        {folder && folder !== 'none' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                                <p className="text-sm text-slate-300 min-w-0 truncate">File Manager <span className="text-slate-500">›</span> <b className="text-white">{fm.folders.find((x) => x.id === folder)?.name}</b></p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setFolderAsk({ mode: 'rename', name: fm.folders.find((x) => x.id === folder)?.name || '' })} className="ms-btn ms-btn-ghost ms-btn-sm"><IconPencil size={13} /> Rename</button>
                                    <button type="button" onClick={deleteFolder} className="ms-btn ms-btn-danger ms-btn-sm"><IconTrash size={13} /> Delete folder</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search + filters */}
                    <div className="ms-card p-3 sm:p-4 space-y-3">
                        <form
                            className="flex gap-2"
                            onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); setPage(1); }}
                        >
                            <div className="relative flex-1 min-w-0">
                                <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                <input
                                    ref={searchRef}
                                    type="search"
                                    placeholder="Search by name"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="ms-input"
                                    style={{ paddingLeft: 40 }}
                                    aria-label="Search files by name"
                                />
                            </div>
                            <button type="submit" className="ms-btn ms-btn-primary">Search</button>
                        </form>
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="ms-input sm:w-44"
                                aria-label="Filter by status"
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
                                className="ms-input sm:w-40"
                                aria-label="Items per page"
                            >
                                {[12, 24, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n} per page</option>
                                ))}
                            </select>
                            <select
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                                className="ms-input col-span-2 sm:col-span-1 sm:w-44"
                                aria-label="Sort files"
                            >
                                <option value="new">Newest first</option>
                                <option value="old">Oldest first</option>
                                <option value="name">Name A-Z</option>
                            </select>
                        </div>
                    </div>

                    {/* Summary row */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-xs ms-muted">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[32px]">
                            <input type="checkbox" className="ms-check" checked={allVisibleSelected} onChange={toggleSelectAll} />
                            <span>Select all on this page</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                            <span><b className="text-white">{filtered.length}</b> file{filtered.length === 1 ? '' : 's'}</span>
                            {partialCount > 0 && statusFilter !== 'Partial' && (
                                <button
                                    type="button"
                                    onClick={() => { setStatusFilter('Partial'); setPage(1); }}
                                    className="ms-badge ms-badge-amber cursor-pointer"
                                >
                                    <IconAlert size={12} /> {partialCount} partial
                                </button>
                            )}
                            <span>Page {currentPage} / {totalPages}</span>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {visible.length === 0 ? (
                            <div className="ms-card py-16 px-4 text-center">
                                <IconInbox size={34} className="mx-auto text-slate-600" />
                                <p className="mt-3 text-sm text-slate-400">No files found.</p>
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
                                        className={`ms-card p-3 sm:p-4 transition-colors ${selected.has(file.id) ? '!border-blue-400/50' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                className="ms-check mt-2.5"
                                                checked={selected.has(file.id)}
                                                onChange={() => toggleSelect(file.id)}
                                                aria-label={`Select ${file.name}`}
                                            />
                                            <span className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center">
                                                <IconFilm size={18} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                {editingFileId === file.id ? (
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <input
                                                            type="text"
                                                            value={newFileName}
                                                            onChange={(e) => setNewFileName(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(file.id); if (e.key === 'Escape') setEditingFileId(null); }}
                                                            className="ms-input"
                                                            autoFocus
                                                            aria-label="New file name"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button type="button" onClick={() => handleRename(file.id)} className="ms-btn ms-btn-primary ms-btn-sm"><IconCheck size={14} /> Save</button>
                                                            <button type="button" onClick={() => setEditingFileId(null)} className="ms-btn ms-btn-ghost ms-btn-sm"><IconX size={14} /> Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <h3 className="text-sm font-semibold text-white leading-snug break-words" title={file.name}>{file.name}</h3>
                                                )}
                                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <span className={`ms-badge ${STATUS_BADGE[st]}`} title={missing.length ? `Missing: ${missing.join(', ')}` : ''}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> {st}
                                                    </span>
                                                    {file.size && <span className="ms-badge">{file.size}</span>}
                                                    {file.date && <span className="ms-badge">{file.date}</span>}
                                                    <span className="ms-badge">{ms.length} server{ms.length === 1 ? '' : 's'}</span>
                                                    <span className="ms-badge ms-code">ID {file.id}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <button type="button" onClick={() => toggleExpand(file.id)} title="Server links" aria-expanded={isOpen} className="ms-btn ms-btn-ghost ms-btn-icon">
                                                <IconChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            <button type="button" onClick={() => copyText(pageLink(file), 'Download page link copied')} title="Copy file (download page) link" className="ms-btn ms-btn-ghost ms-btn-icon">
                                                <IconLink size={16} />
                                            </button>
                                            <button type="button" onClick={() => copyText(embedLink(file), 'Embed link copied')} title="Copy embed link" className="ms-btn ms-btn-ghost ms-btn-icon">
                                                <IconPlay size={16} />
                                            </button>
                                            <button type="button" onClick={() => copyText(iframeCode(file), 'Embed code copied')} title="Copy embed iframe code" className="ms-btn ms-btn-ghost ms-btn-icon">
                                                <IconCode size={16} />
                                            </button>
                                            <button type="button" onClick={() => { setEditingFileId(file.id); setNewFileName(file.name || ''); }} title="Rename" className="ms-btn ms-btn-ghost ms-btn-icon">
                                                <IconPencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => askRepair([file])}
                                                title={missing.length ? `Repair: ${missing.join(', ')}` : 'Re-check servers'}
                                                className={`ms-btn ms-btn-icon ${missing.length ? 'ms-btn-primary' : 'ms-btn-ghost'}`}
                                            >
                                                <IconWrench size={16} />
                                            </button>
                                            <button type="button" onClick={() => deleteFiles([file.id])} title="Delete" className="ms-btn ms-btn-danger ms-btn-icon">
                                                <IconTrash size={16} />
                                            </button>
                                        </div>

                                        {isOpen && (
                                            <div className="mt-4 pt-4 border-t border-white/10 space-y-3 ms-fade-up">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="ms-label !mb-0">Copy</span>
                                                    {COPY_KINDS.map(([k, label]) => (
                                                        <button key={k} type="button" onClick={() => copyKind(k, [file], label)} className={`ms-btn ms-btn-sm ${k === 'all' ? 'ms-btn-primary' : 'ms-btn-ghost'}`}>
                                                            <IconCopy size={13} /> {label}
                                                        </button>
                                                    ))}
                                                    <span className="ms-badge ml-auto">Profile: {profileName(file.profile)}</span>
                                                    <select value={fm.map[file.id] || ''} onChange={(e) => moveFiles([file.id], e.target.value)} aria-label="Folder" className="ms-input !w-auto !min-h-[34px] !text-xs">
                                                        <option value="">No folder</option>
                                                        {fm.folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="ms-label">Download page</span>
                                                        <div className="flex gap-2">
                                                            <input readOnly value={pageLink(file)} className="ms-input ms-code" onFocus={(e) => e.target.select()} />
                                                            <button type="button" onClick={() => copyText(pageLink(file), 'Download page link copied')} className="ms-btn ms-btn-primary ms-btn-icon shrink-0" title="Copy">
                                                                <IconCopy size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="ms-label">Embed player</span>
                                                        <div className="flex gap-2">
                                                            <input readOnly value={embedLink(file)} className="ms-input ms-code" onFocus={(e) => e.target.select()} />
                                                            <button type="button" onClick={() => copyText(iframeCode(file), 'Embed code copied')} className="ms-btn ms-btn-primary ms-btn-icon shrink-0" title="Copy iframe code">
                                                                <IconCode size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {ms.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {ms.map((m) => (
                                                            <div key={m.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[13px] font-semibold text-white truncate">{m.name}</p>
                                                                    <p className="text-[11px] ms-muted truncate">{hostOf(m.url) || m.type}</p>
                                                                </div>
                                                                <span className={`ms-badge ${m.embed ? 'ms-badge-blue' : ''}`}>{m.embed ? 'Stream' : 'Download'}</span>
                                                                <a href={m.url} target="_blank" rel="noopener noreferrer" title="Open" aria-label={`Open ${m.name}`} className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon">
                                                                    <IconExternal size={14} />
                                                                </a>
                                                                <button type="button" onClick={() => copyText(m.url, `${m.name} link copied`)} title="Copy link" className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon">
                                                                    <IconCopy size={14} />
                                                                </button>
                                                                {m.embed && (
                                                                    <button type="button" onClick={() => copyText(m.embed, `${m.name} embed link copied`)} title="Copy host embed link" className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon">
                                                                        <IconCode size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="ms-alert ms-alert-amber">
                                                        <IconAlert size={16} className="mt-0.5 shrink-0" />
                                                        <span>No server links are saved for this file yet. Press the repair button to try again.</span>
                                                    </div>
                                                )}

                                                {missing.length > 0 && (
                                                    <div className="ms-alert ms-alert-amber">
                                                        <IconAlert size={16} className="mt-0.5 shrink-0" />
                                                        <span className="min-w-0 break-words">Missing links: {missing.join(', ')}. Repair will retry only these servers.</span>
                                                    </div>
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
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="ms-btn ms-btn-ghost">
                                <IconChevronLeft size={16} /> Prev
                            </button>
                            <span className="text-xs ms-muted tabular-nums">{currentPage} / {totalPages}</span>
                            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="ms-btn ms-btn-ghost">
                                Next <IconChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Selection bar: stays at the bottom of the screen while files are selected */}
                    {selected.size > 0 && (
                        <div className="sticky bottom-3 z-20 ms-card p-3 flex flex-wrap items-center justify-between gap-2 !border-blue-400/40 shadow-2xl shadow-black/50 backdrop-blur-xl">
                            <span className="text-xs font-semibold text-white px-1">{selected.size} selected</span>
                            <div className="flex flex-wrap gap-2">
                                <select value="" onChange={(e) => { if (e.target.value !== '__') moveFiles(selectedFiles.map((f) => f.id), e.target.value === '__none' ? '' : e.target.value); }} aria-label="Move to folder" className="ms-input !w-auto !min-h-[34px] !text-xs">
                                    <option value="">Move to…</option>
                                    <option value="__none">No folder</option>
                                    {fm.folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                </select>
                                {COPY_KINDS.map(([k, label]) => (
                                    <button key={k} type="button" onClick={() => copyKind(k, selectedFiles, label)} className="ms-btn ms-btn-ghost ms-btn-sm">
                                        <IconCopy size={14} /> {label}
                                    </button>
                                ))}
                                <button type="button" disabled={busy} onClick={() => askRepair(selectedFiles)} className="ms-btn ms-btn-primary ms-btn-sm">
                                    {busy ? <IconRefresh size={14} className="ms-spin" /> : <IconWrench size={14} />} {busy ? 'Repairing' : 'Repair'}
                                </button>
                                <button type="button" onClick={() => deleteFiles(selectedFiles.map((f) => f.id))} className="ms-btn ms-btn-danger ms-btn-sm">
                                    <IconTrash size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {folderAsk && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
                    <form onSubmit={(e) => { e.preventDefault(); submitFolder(); }} className="ms-card w-full max-w-sm p-5 space-y-4 ms-fade-up">
                        <h3 className="text-sm font-bold text-white">{folderAsk.mode === 'new' ? 'New folder' : 'Rename folder'}</h3>
                        <input autoFocus maxLength={40} value={folderAsk.name} onChange={(e) => setFolderAsk({ ...folderAsk, name: e.target.value })} placeholder="Folder name" className="ms-input" aria-label="Folder name" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setFolderAsk(null)} className="ms-btn ms-btn-ghost flex-1">Cancel</button>
                            <button type="submit" className="ms-btn ms-btn-primary flex-1">{folderAsk.mode === 'new' ? 'Create' : 'Save'}</button>
                        </div>
                    </form>
                </div>
            )}

            {repairAsk && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
                    <div className="ms-card w-full max-w-md p-5 space-y-4 ms-fade-up">
                        <div>
                            <h3 className="text-sm font-bold text-white">Repair with which profile?</h3>
                            <p className="text-xs ms-muted mt-1">{repairAsk.list.length} file(s). Only the servers of the chosen profile are retried.</p>
                        </div>
                        <div className="space-y-2" role="radiogroup">
                            {[{ id: 'default', name: 'Default', servers: activeIds }, ...profiles].map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={repairAsk.profile === p.id}
                                    onClick={() => setRepairAsk({ ...repairAsk, profile: p.id })}
                                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${repairAsk.profile === p.id ? 'border-blue-400/70 bg-blue-500/15' : 'border-white/10 bg-black/30 hover:bg-white/[0.05]'}`}
                                >
                                    <span className="block text-sm font-bold text-white">{p.name} <span className="font-normal ms-muted">· {p.servers.length} server(s)</span></span>
                                    <span className="block text-[11px] ms-muted truncate">{p.servers.join(', ') || 'none'}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setRepairAsk(null)} className="ms-btn ms-btn-ghost flex-1">Cancel</button>
                            <button type="button" onClick={() => { const a = repairAsk; setRepairAsk(null); repairFiles(a.list, a.profile); }} className="ms-btn ms-btn-primary flex-1"><IconWrench size={15} /> Repair</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
