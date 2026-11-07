'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { embedBase } from '../utils/embedOrigin';
import { buildCopy, copyToClipboard, COPY_KINDS } from '../utils/copyFormat';
import { IconCode, IconCopy, IconCheck, IconSearch, IconRefresh } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FORMATS = [
    ['embed', 'Embed links'],
    ['page', 'Download links'],
    ['iframe', 'Iframe codes'],
    ['all', 'Title + size + links'],
];

export default function LinkGeneratorPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [files, setFiles] = useState([]);
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState(new Set());
    const [pasted, setPasted] = useState('');
    const [format, setFormat] = useState('embed');
    const [toast, setToast] = useState('');

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setUser(session.user);
            const { data } = await supabase.from('files').select('id, name, size').eq('user_id', session.user.id).order('date', { ascending: false }).limit(2000);
            setFiles(data || []);
            setLoadingAuth(false);
        })();
    }, [router]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const links = (f) => ({ page: `${origin}/file/${f.id}`, embed: `${embedBase(origin)}/embed/${f.id}` });

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? files.filter((f) => (f.name || '').toLowerCase().includes(q)) : files;
    }, [files, query]);

    // ids typed or pasted: full /file/<id> or /embed/<id> links, or bare ids, one per line / separated by spaces or commas
    const pastedFiles = useMemo(() => {
        const out = [];
        pasted.split(/[\s,]+/).filter(Boolean).forEach((t) => {
            const m = t.match(/\/(?:file|embed)\/([^/?#]+)/);
            const id = m ? m[1] : t;
            if (/^[\w-]{6,}$/.test(id) && !out.some((o) => o.id === id)) out.push({ id, name: files.find((f) => f.id === id)?.name || id, size: files.find((f) => f.id === id)?.size });
        });
        return out;
    }, [pasted, files]);

    const chosen = useMemo(() => {
        const list = files.filter((f) => picked.has(f.id));
        pastedFiles.forEach((p) => { if (!list.some((f) => f.id === p.id)) list.push(p); });
        return list;
    }, [files, picked, pastedFiles]);

    const output = useMemo(() => {
        if (!chosen.length) return '';
        if (format === 'iframe') {
            return chosen.map((f) => `<iframe src="${links(f).embed}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`).join('\n');
        }
        return buildCopy(format, chosen, links);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chosen, format, origin]);

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400"><IconRefresh size={18} className="ms-spin" /><span>Checking authorization…</span></div>
            </div>
        );
    }

    const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2000); };
    const copy = async (text, label) => say((await copyToClipboard(text)) ? `${label} copied` : 'Copy failed');
    const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const allShownPicked = shown.length > 0 && shown.every((f) => picked.has(f.id));
    const toggleAll = () => setPicked((p) => { const n = new Set(p); shown.forEach((f) => (allShownPicked ? n.delete(f.id) : n.add(f.id))); return n; });

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><IconCode size={18} /></span>
                        <h1 className="ms-h1 truncate">Link Generator</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[220px]">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto grid gap-5 lg:grid-cols-2">
                    <section className="ms-card p-4 sm:p-5 space-y-3 min-w-0">
                        <h2 className="ms-h2">1. Pick files ({picked.size} selected)</h2>
                        <div className="relative">
                            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your files…" className="ms-input !pl-10" />
                        </div>
                        <button type="button" onClick={toggleAll} className="ms-btn ms-btn-ghost ms-btn-sm">{allShownPicked ? 'Unselect' : 'Select'} all {shown.length} shown</button>
                        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                            {shown.length === 0 && <p className="p-4 text-sm ms-muted">No files.</p>}
                            {shown.map((f) => (
                                <label key={f.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/[0.04] min-w-0">
                                    <input type="checkbox" checked={picked.has(f.id)} onChange={() => toggle(f.id)} className="accent-red-500 w-4 h-4 shrink-0" />
                                    <span className="text-sm text-slate-200 truncate flex-1">{f.name || f.id}</span>
                                    {f.size && <span className="ms-badge shrink-0">{f.size}</span>}
                                </label>
                            ))}
                        </div>
                        <div>
                            <label className="ms-label" htmlFor="lg-paste">Or paste file IDs / links (many at once)</label>
                            <textarea id="lg-paste" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="One per line: a file ID, a /file/… link or an /embed/… link" className="ms-input ms-code" />
                            <p className="ms-muted text-xs mt-1">{pastedFiles.length} ID(s) found.</p>
                        </div>
                    </section>

                    <section className="ms-card p-4 sm:p-5 space-y-3 min-w-0">
                        <h2 className="ms-h2">2. Result ({chosen.length} file{chosen.length === 1 ? '' : 's'})</h2>
                        <div className="flex flex-wrap gap-2" role="radiogroup">
                            {FORMATS.map(([k, label]) => (
                                <button key={k} type="button" role="radio" aria-checked={format === k} onClick={() => setFormat(k)} className={`ms-btn ms-btn-sm ${format === k ? 'ms-btn-primary' : 'ms-btn-ghost'}`}>{label}</button>
                            ))}
                        </div>
                        <textarea readOnly rows={14} value={output} placeholder="Select files to see the links here" className="ms-input ms-code text-emerald-400" onFocus={(e) => e.target.select()} />
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={!output} onClick={() => copy(output, 'Result')} className="ms-btn ms-btn-primary ms-btn-sm"><IconCopy size={14} /> Copy result</button>
                            {COPY_KINDS.map(([k, label]) => (
                                <button key={k} type="button" disabled={!chosen.length} onClick={async () => say((await copyToClipboard(buildCopy(k, chosen, links))) ? `All ${label.toLowerCase()} copied` : 'Copy failed')} className="ms-btn ms-btn-ghost ms-btn-sm">
                                    <IconCopy size={14} /> {label}
                                </button>
                            ))}
                        </div>
                    </section>
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
