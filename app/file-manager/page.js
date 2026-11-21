'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { mascotSayAuto } from '../utils/mascotSay';
import { embedBase } from '../utils/embedOrigin';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    IconFolder, IconUpload, IconSearch, IconFilm, IconChevronDown, IconChevronLeft, IconChevronRight, IconLink, IconCode,
    IconPencil, IconWrench, IconTrash, IconCopy, IconExternal, IconAlert, IconInfo, IconActivity, IconInbox, IconCheck, IconX, IconPlay,
} from '../components/Icons';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { parseProfiles, PROFILES_KEY } from '../utils/profiles';
import { buildCopy, copyToClipboard, COPY_KINDS, COPY_MORE } from '../utils/copyFormat';
import RepairCenter from '../components/RepairCenter';
import { resolveMirrors, domainsFromSettings, PDLINK_SERVERS, DEFAULT_ACTIVE, SERVERS } from '../utils/mirrors';

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
    const [repairList, setRepairList] = useState(null); // files shown in Check & repair
    const [menu, setMenu] = useState(null); // 'copy' | 'move' | null (selection bar)
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

    const dotsOf = (f) => {
        const ms = Array.isArray(f.mirrors) ? f.mirrors : [];
        const present = new Set(ms.filter((m) => m && m.code).map((m) => m.id));
        const prof = profiles.find((p) => p.id === f.profile);
        const expected = prof ? prof.servers : activeIds;
        const out = [];
        let pd = false;
        expected.forEach((id) => {
            if (PDLINK_SERVERS.includes(id)) { if (!pd) { pd = true; out.push({ name: 'PDLink', ok: present.has('pdlink') }); } return; }
            out.push({ name: id === 'vidshared' ? 'VidShared' : (SERVERS[id] ? SERVERS[id].name : id), ok: present.has(id) });
        });
        return out;
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

    // Esc: close the menu, then clear the selection
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (repairList) return;
            if (menu) setMenu(null); else setSelected((s) => (s.size ? new Set() : s));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [menu, repairList]);

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
    const copyKind = async (kind, list, label) => {
        if (!list.length) return;
        const ok = await copyToClipboard(buildCopy(kind, list, (f) => ({ page: pageLink(f), embed: embedLink(f), servers: mirrorsOf(f).filter((m) => m.url).map((m) => ({ name: m.name, url: m.url })) })));
        flash(ok ? `${label} copied` : 'Copy failed: the browser blocked the clipboard');
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

    const counts = { All: files.length, Completed: 0, Partial: 0, Processing: 0, Failed: 0 };
    files.forEach((f) => { counts[statusOf(f)] += 1; });
    const partialCount = counts.Partial;

    return (
        <div className="ms-app flex">
            <Sidebar />

            <style>{`
.fm-tabs { display: flex; gap: 4px; flex-wrap: wrap; padding: 3px; border-radius: 12px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); }
.fm-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 9px; border: 0; background: transparent; color: #9aa6b8; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.fm-tab em { font-style: normal; font-size: 10.5px; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,.07); color: #c9d1de; }
.fm-tab:hover { color: #fff; }
.fm-tab.on { background: rgba(59,130,246,.2); color: #fff; box-shadow: inset 0 0 0 1px rgba(96,165,250,.4); }
.fm-tab.warn em { background: rgba(245,158,11,.2); color: #fcd34d; }
.fm-tab.bad em { background: rgba(239,68,68,.2); color: #fca5a5; }
.fm-link { background: none; border: 0; color: #60a5fa; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-family: inherit; padding: 0; }
.fm-link.warn { color: #fcd34d; }
.fm-link:hover { text-decoration: underline; }
.fm-row { border-radius: 14px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02)); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s, background .15s; }
.fm-row:hover { border-color: rgba(255,255,255,.16); }
.fm-row.is-sel { border-color: rgba(96,165,250,.55); background: rgba(59,130,246,.07); }
.fm-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.fm-top .ms-check { margin-top: 9px; }
.fm-ico { position: relative; width: 36px; height: 36px; flex-shrink: 0; border-radius: 11px; background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.25); color: #60a5fa; display: flex; align-items: center; justify-content: center; }
.fm-ico i { position: absolute; right: -5px; bottom: -6px; font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: .02em; padding: 1px 4px; border-radius: 5px; background: #0b1220; border: 1px solid rgba(255,255,255,.16); color: #c9d1de; }
.fm-body { min-width: 0; flex: 1; }
.fm-name { margin: 0; font-size: 13.5px; font-weight: 600; color: #fff; line-height: 1.35; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.fm-meta { margin-top: 5px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; font-size: 11px; color: #8e9bb0; }
.fm-st { font-weight: 700; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; background: rgba(255,255,255,.07); color: #c9d1de; }
.fm-st.Completed { background: rgba(34,197,94,.15); color: #86efac; }
.fm-st.Partial { background: rgba(245,158,11,.16); color: #fcd34d; }
.fm-st.Processing { background: rgba(59,130,246,.18); color: #93c5fd; }
.fm-st.Failed { background: rgba(239,68,68,.16); color: #fca5a5; }
.fm-dots { display: inline-flex; align-items: center; gap: 3px; }
.fm-dots i { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
.fm-dots i.no { background: transparent; box-shadow: inset 0 0 0 1.5px #f59e0b; }
.fm-dots b { margin-left: 4px; font-weight: 600; color: #aab4c5; font-size: 10.5px; }
.fm-fold { display: inline-flex; align-items: center; gap: 4px; }
.fm-acts { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 46px; }
.fm-ib { width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; border-radius: 9px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.03); color: #aab4c5; cursor: pointer; text-decoration: none; padding: 0; font-family: inherit; transition: background .15s, color .15s, border-color .15s; flex-shrink: 0; }
.fm-ib:hover { background: rgba(255,255,255,.1); color: #fff; }
.fm-ib:disabled { opacity: .35; cursor: not-allowed; }
.fm-ib.sm { width: 26px; height: 26px; border-radius: 8px; }
.fm-ib.warn { color: #fcd34d; border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.1); }
.fm-ib.bad:hover { color: #fca5a5; border-color: rgba(239,68,68,.45); background: rgba(239,68,68,.12); }
@media (min-width: 900px) {
  .fm-row { flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  .fm-top { flex: 1; }
  .fm-acts { padding-left: 0; flex-wrap: nowrap; }
  .fm-more { flex-basis: 100%; }
}
.fm-more { display: flex; flex-direction: column; gap: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.07); width: 100%; }
.fm-chip { height: 26px; padding: 0 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #c9d1de; font-size: 11.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.fm-chip:hover { background: rgba(255,255,255,.1); color: #fff; }
.fm-chip.static { cursor: default; background: transparent; }
.fm-sel { height: 26px; padding: 0 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: #0b1220; color: #c9d1de; font-size: 11.5px; font-family: inherit; }
.fm-field { display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,.09); background: rgba(0,0,0,.25); border-radius: 10px; padding: 3px 4px 3px 10px; min-width: 0; }
.fm-field span { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #67748a; white-space: nowrap; }
.fm-field input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: #e6e9ef; font-size: 12px; font-family: ui-monospace, monospace; height: 28px; }
.fm-srv { display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.03); border-radius: 10px; padding: 5px 6px 5px 10px; }
.fm-srv .n { margin: 0; font-size: 12.5px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm-srv .h { margin: 0; font-size: 10.5px; color: #7d8aa0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fm-kind { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: rgba(245,158,11,.14); color: #fcd34d; }
.fm-kind.s { background: rgba(59,130,246,.16); color: #93c5fd; }
.fm-bar { position: sticky; bottom: 12px; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px 6px 14px; border-radius: 14px; border: 1px solid rgba(96,165,250,.4); background: rgba(10,15,26,.92); backdrop-filter: blur(14px); box-shadow: 0 14px 40px rgba(0,0,0,.55); }
.fm-bar-n { font-size: 12px; color: #aab4c5; }
.fm-bar-n b { color: #fff; font-size: 13px; }
.fm-bar-acts { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
.fm-pop { position: relative; }
.fm-bb { height: 30px; padding: 0 11px; display: inline-flex; align-items: center; gap: 6px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.05); color: #d5dbe6; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.fm-bb:hover { background: rgba(255,255,255,.12); color: #fff; }
.fm-bb:disabled { opacity: .4; cursor: not-allowed; }
.fm-bb.pri { background: rgba(59,130,246,.22); border-color: rgba(96,165,250,.5); color: #fff; }
.fm-bb.bad { color: #fca5a5; border-color: rgba(239,68,68,.35); }
.fm-bb.bad:hover { background: rgba(239,68,68,.16); }
.fm-bb.ico { width: 30px; padding: 0; justify-content: center; }
.fm-menu { position: absolute; bottom: calc(100% + 6px); right: 0; min-width: 190px; max-height: 50vh; overflow: auto; padding: 4px; border-radius: 12px; background: #0e1626; border: 1px solid rgba(255,255,255,.14); box-shadow: 0 16px 40px rgba(0,0,0,.6); display: flex; flex-direction: column; z-index: 30; }
.fm-menu button { text-align: left; padding: 7px 10px; border-radius: 8px; border: 0; background: transparent; color: #d5dbe6; font-size: 12.5px; cursor: pointer; font-family: inherit; }
.fm-menu button:hover { background: rgba(255,255,255,.09); color: #fff; }
@media (max-width: 560px) { .fm-bar { padding: 6px; } .fm-bar-n { width: 100%; padding-left: 6px; } .fm-bb { padding: 0 9px; } }
            `}</style>

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

                    {/* Status tabs + selection helpers */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-0.5">
                        <div className="fm-tabs" role="tablist" aria-label="Filter by status">
                            {['All', 'Completed', 'Partial', 'Processing', 'Failed'].map((s) => (
                                <button key={s} type="button" role="tab" aria-selected={statusFilter === s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`fm-tab ${statusFilter === s ? 'on' : ''} ${s === 'Partial' && counts.Partial ? 'warn' : ''} ${s === 'Failed' && counts.Failed ? 'bad' : ''}`}>
                                    {s}<em>{counts[s]}</em>
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs ms-muted">
                            <label className="flex items-center gap-2 cursor-pointer select-none min-h-[28px]">
                                <input type="checkbox" className="ms-check !w-4 !h-4" checked={allVisibleSelected} onChange={toggleSelectAll} />
                                <span>Select page</span>
                            </label>
                            {allVisibleSelected && filtered.length > visible.length && selected.size < filtered.length && (
                                <button type="button" onClick={() => setSelected(new Set(filtered.map((f) => f.id)))} className="fm-link">Select all {filtered.length}</button>
                            )}
                            {partialCount > 0 && (
                                <button type="button" onClick={() => setRepairList(files.filter((f) => statusOf(f) === 'Partial' && f.original_url))} className="fm-link warn"><IconWrench size={12} /> Check {partialCount} partial</button>
                            )}
                            <span className="tabular-nums">{filtered.length} file{filtered.length === 1 ? '' : 's'} · page {currentPage}/{totalPages}</span>
                        </div>
                    </div>
                    {/* List */}
                    <div className="space-y-2">
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
                                const dots = dotsOf(file);
                                const isOpen = expanded.has(file.id);
                                return (
                                    <div key={file.id} className={`fm-row ${selected.has(file.id) ? 'is-sel' : ''}`}>
                                        <div className="fm-top">
                                            <input type="checkbox" className="ms-check" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)} aria-label={`Select ${file.name}`} />
                                            <span className="fm-ico"><IconFilm size={17} />{file.quality ? <i>{String(file.quality).split(/[ ,/]/)[0].slice(0, 6)}</i> : null}</span>
                                            <div className="fm-body">
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
                                                    <h3 className="fm-name" title={file.name}>{file.name}</h3>
                                                )}
                                                <div className="fm-meta">
                                                    <span className={`fm-st ${st}`} title={missing.length ? `Missing: ${missing.join(', ')}` : ''}>{st}</span>
                                                    {file.size && <span>{file.size}</span>}
                                                    {file.date && <span>{file.date}</span>}
                                                    <span className="fm-dots" title={dots.map((d) => `${d.name}: ${d.ok ? 'ok' : 'missing'}`).join('\n')} aria-label={`${dots.filter((d) => d.ok).length} of ${dots.length} servers`}>
                                                        {dots.slice(0, 16).map((d, i) => <i key={i} className={d.ok ? 'ok' : 'no'} />)}
                                                        <b>{dots.filter((d) => d.ok).length}/{dots.length}</b>
                                                    </span>
                                                    {fm.map[file.id] && <span className="fm-fold"><IconFolder size={11} /> {fm.folders.find((x) => x.id === fm.map[file.id])?.name}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="fm-acts">
                                            <button type="button" onClick={() => toggleExpand(file.id)} title="Server links" aria-expanded={isOpen} className="fm-ib"><IconChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
                                            <button type="button" onClick={() => copyText(pageLink(file), 'Download page link copied')} title="Copy download page link" className="fm-ib"><IconLink size={15} /></button>
                                            <button type="button" onClick={() => copyText(embedLink(file), 'Embed link copied')} title="Copy embed link" className="fm-ib"><IconPlay size={15} /></button>
                                            <button type="button" onClick={() => copyText(iframeCode(file), 'Embed code copied')} title="Copy iframe code" className="fm-ib"><IconCode size={15} /></button>
                                            <a href={pageLink(file)} target="_blank" rel="noopener noreferrer" title="Open download page" aria-label="Open download page" className="fm-ib"><IconExternal size={15} /></a>
                                            <button type="button" onClick={() => { setEditingFileId(file.id); setNewFileName(file.name || ''); }} title="Rename" className="fm-ib"><IconPencil size={15} /></button>
                                            <button type="button" disabled={!file.original_url} onClick={() => setRepairList([file])} title={missing.length ? `Check & repair (${missing.length} missing)` : 'Check & repair'} className={`fm-ib ${missing.length ? 'warn' : ''}`}><IconWrench size={15} /></button>
                                            <button type="button" onClick={() => deleteFiles([file.id])} title="Delete" className="fm-ib bad"><IconTrash size={15} /></button>
                                        </div>

                                        {isOpen && (
                                            <div className="fm-more ms-fade-up">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="ms-label !mb-0">Copy</span>
                                                    {COPY_KINDS.map(([k, label]) => (
                                                        <button key={k} type="button" onClick={() => copyKind(k, [file], label)} className="fm-chip">{label}</button>
                                                    ))}
                                                    <select value="" onChange={(e) => { const k = e.target.value; if (k) copyKind(k, [file], COPY_MORE.find((x) => x[0] === k)[1]); }} aria-label="More copy formats" className="fm-sel">
                                                        <option value="">More...</option>
                                                        {COPY_MORE.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                                    </select>
                                                    <span className="fm-chip static ml-auto">Profile: {profileName(file.profile)}</span>
                                                    <select value={fm.map[file.id] || ''} onChange={(e) => moveFiles([file.id], e.target.value)} aria-label="Folder" className="fm-sel">
                                                        <option value="">No folder</option>
                                                        {fm.folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div className="fm-field">
                                                        <span>Download page</span>
                                                        <input readOnly value={pageLink(file)} onFocus={(e) => e.target.select()} />
                                                        <button type="button" onClick={() => copyText(pageLink(file), 'Download page link copied')} title="Copy" className="fm-ib"><IconCopy size={14} /></button>
                                                    </div>
                                                    <div className="fm-field">
                                                        <span>Embed player</span>
                                                        <input readOnly value={embedLink(file)} onFocus={(e) => e.target.select()} />
                                                        <button type="button" onClick={() => copyText(embedLink(file), 'Embed link copied')} title="Copy embed link" className="fm-ib"><IconCopy size={14} /></button>
                                                    </div>
                                                </div>

                                                {ms.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                                        {ms.map((m) => (
                                                            <div key={m.id} className="fm-srv">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="n">{m.name}</p>
                                                                    <p className="h">{hostOf(m.url) || m.type}</p>
                                                                </div>
                                                                <span className={`fm-kind ${m.embed ? 's' : ''}`}>{m.embed ? 'Stream' : 'Download'}</span>
                                                                {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" title="Open" aria-label={`Open ${m.name}`} className="fm-ib sm"><IconExternal size={13} /></a>}
                                                                {m.url && <button type="button" onClick={() => copyText(m.url, `${m.name} link copied`)} title="Copy link" className="fm-ib sm"><IconCopy size={13} /></button>}
                                                                {m.embed && <button type="button" onClick={() => copyText(m.embed, `${m.name} embed link copied`)} title="Copy host embed link" className="fm-ib sm"><IconCode size={13} /></button>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="ms-alert ms-alert-amber">
                                                        <IconAlert size={16} className="mt-0.5 shrink-0" />
                                                        <span>No server links are saved for this file yet. Use Check &amp; repair.</span>
                                                    </div>
                                                )}

                                                {missing.length > 0 && (
                                                    <div className="ms-alert ms-alert-amber">
                                                        <IconAlert size={16} className="mt-0.5 shrink-0" />
                                                        <span className="min-w-0 break-words">Missing: {missing.join(', ')}. Check &amp; repair uploads only these.</span>
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

                    {/* Selection bar: slim, stays at the bottom while files are selected */}
                    {selected.size > 0 && (
                        <div className="fm-bar" role="toolbar" aria-label="Selected files">
                            <span className="fm-bar-n"><b>{selected.size}</b> selected</span>
                            <div className="fm-bar-acts">
                                <div className="fm-pop">
                                    <button type="button" className="fm-bb" aria-haspopup="menu" aria-expanded={menu === 'copy'} onClick={() => setMenu(menu === 'copy' ? null : 'copy')}><IconCopy size={14} /> Copy <IconChevronDown size={12} /></button>
                                    {menu === 'copy' && (
                                        <div className="fm-menu" role="menu">
                                            {[...COPY_KINDS, ...COPY_MORE].map(([k, label]) => (
                                                <button key={k} type="button" role="menuitem" onClick={() => { setMenu(null); copyKind(k, selectedFiles, label); }}>{label}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="fm-pop">
                                    <button type="button" className="fm-bb" aria-haspopup="menu" aria-expanded={menu === 'move'} onClick={() => setMenu(menu === 'move' ? null : 'move')}><IconFolder size={14} /> Move <IconChevronDown size={12} /></button>
                                    {menu === 'move' && (
                                        <div className="fm-menu" role="menu">
                                            <button type="button" role="menuitem" onClick={() => { setMenu(null); moveFiles(selectedFiles.map((f) => f.id), ''); }}>No folder</button>
                                            {fm.folders.map((x) => <button key={x.id} type="button" role="menuitem" onClick={() => { setMenu(null); moveFiles(selectedFiles.map((f) => f.id), x.id); }}>{x.name}</button>)}
                                        </div>
                                    )}
                                </div>
                                <button type="button" className="fm-bb pri" onClick={() => { setMenu(null); setRepairList(selectedFiles.filter((f) => f.original_url)); }} disabled={!selectedFiles.some((f) => f.original_url)}><IconWrench size={14} /> Check &amp; repair</button>
                                <button type="button" className="fm-bb bad" onClick={() => deleteFiles(selectedFiles.map((f) => f.id))}><IconTrash size={14} /> Delete</button>
                                <button type="button" className="fm-bb ico" onClick={() => { setSelected(new Set()); setMenu(null); }} title="Clear selection (Esc)" aria-label="Clear selection"><IconX size={14} /></button>
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

            {repairList && (
                <RepairCenter
                    files={repairList}
                    supabase={supabase}
                    profiles={profiles}
                    onClose={() => setRepairList(null)}
                    onDone={() => { if (user) loadAll(user.id); }}
                />
            )}
        </div>
    );
}
