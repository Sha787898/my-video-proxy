'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { embedBase } from '../utils/embedOrigin';
import { resolveMirrors, domainsFromSettings } from '../utils/mirrors';
import { buildCopy, copyToClipboard, COPY_KINDS } from '../utils/copyFormat';
import { IconCode, IconCopy, IconCheck, IconSearch, IconRefresh } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SIMPLE_FORMATS = [
    ['embed', 'Embed links'],
    ['page', 'File links'],
    ['iframe', 'Iframe codes'],
    ['titleEmbed', 'Title [size] + embed'],
    ['all', 'Title + size + links'],
];
const LAYOUTS = [
    ['blocks', 'Block per file'],
    ['plain', 'Links only'],
    ['iframe', 'Iframe codes'],
    ['csv', 'CSV'],
    ['json', 'JSON'],
];

export default function LinkGeneratorPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [files, setFiles] = useState([]);
    const [domains, setDomains] = useState({});
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState(new Set());
    const [pasted, setPasted] = useState('');
    const [mode, setMode] = useState('simple');
    const [format, setFormat] = useState('titleEmbed');
    const [toast, setToast] = useState('');

    // advanced options
    const [useMs, setUseMs] = useState({ embed: true, page: true });
    const [hostEmbeds, setHostEmbeds] = useState(new Set()); // host ids whose player link is included
    const [hostLinks, setHostLinks] = useState(new Set()); // host ids whose normal/download link is included
    const [layout, setLayout] = useState('blocks');
    const [showTitle, setShowTitle] = useState(true);
    const [showSize, setShowSize] = useState(true);
    const [labelled, setLabelled] = useState(true);
    const [gap, setGap] = useState(true);

    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            setUser(session.user);
            const [f, st] = await Promise.all([
                supabase.from('files').select('id, name, size, mirrors').eq('user_id', session.user.id).order('date', { ascending: false }).limit(2000),
                supabase.from('settings').select('key, value').eq('user_id', session.user.id),
            ]);
            setFiles(f.data || []);
            setDomains(domainsFromSettings(st.data || []));
            setLoadingAuth(false);
        })();
    }, [router]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const links = (f) => ({ page: `${origin}/file/${f.id}`, embed: `${embedBase(origin)}/embed/${f.id}` });

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? files.filter((f) => (f.name || '').toLowerCase().includes(q)) : files;
    }, [files, query]);

    // ids typed or pasted: bare ids, /file/<id> or /embed/<id> links
    const pastedFiles = useMemo(() => {
        const out = [];
        pasted.split(/[\s,]+/).filter(Boolean).forEach((t) => {
            const m = t.match(/\/(?:file|embed)\/([^/?#]+)/);
            const id = m ? m[1] : t;
            if (/^[\w-]{6,}$/.test(id) && !out.some((o) => o.id === id)) {
                const known = files.find((f) => f.id === id);
                out.push(known || { id, name: id, size: '', mirrors: [] });
            }
        });
        return out;
    }, [pasted, files]);

    const chosen = useMemo(() => {
        const list = files.filter((f) => picked.has(f.id));
        pastedFiles.forEach((p) => { if (!list.some((f) => f.id === p.id)) list.push(p); });
        return list;
    }, [files, picked, pastedFiles]);

    // every host that has a link in the chosen files
    const hostsAvailable = useMemo(() => {
        const m = new Map();
        chosen.forEach((f) => resolveMirrors(f.mirrors, domains).forEach((x) => {
            const e = m.get(x.id) || { id: x.id, name: x.name, n: 0, embedN: 0 };
            e.n += 1; if (x.embed) e.embedN += 1;
            m.set(x.id, e);
        }));
        return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [chosen, domains]);

    const iframeOf = (u) => `<iframe src="${u}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;

    // the list of {label, url, kind} for one file in advanced mode
    const linkItems = (f) => {
        const out = [];
        const l = links(f);
        if (useMs.embed) out.push({ label: 'MultiServer embed', url: l.embed, kind: 'embed' });
        if (useMs.page) out.push({ label: 'MultiServer file', url: l.page, kind: 'page' });
        resolveMirrors(f.mirrors, domains).forEach((x) => {
            if (hostEmbeds.has(x.id) && x.embed) out.push({ label: `${x.name} embed`, url: x.embed, kind: 'embed' });
            if (hostLinks.has(x.id) && x.url) out.push({ label: `${x.name} link`, url: x.url, kind: 'page' });
        });
        return out;
    };

    const output = useMemo(() => {
        if (!chosen.length) return '';
        if (mode === 'simple') {
            if (format === 'iframe') return chosen.map((f) => iframeOf(links(f).embed)).join('\n');
            return buildCopy(format, chosen, links);
        }
        const rows = chosen.map((f) => ({ f, items: linkItems(f) }));
        const head = (f) => [showTitle ? (f.name || f.id) : '', showSize && f.size ? `[${f.size}]` : ''].filter(Boolean).join(' ');
        if (layout === 'json') {
            return JSON.stringify(rows.map(({ f, items }) => ({ id: f.id, title: f.name, size: f.size, links: items.map((i) => ({ label: i.label, url: i.url })) })), null, 2);
        }
        if (layout === 'csv') {
            const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            return ['title,size,label,url', ...rows.flatMap(({ f, items }) => items.map((i) => [q(f.name), q(f.size), q(i.label), q(i.url)].join(',')))].join('\n');
        }
        if (layout === 'plain') return rows.flatMap(({ items }) => items.map((i) => i.url)).join('\n');
        if (layout === 'iframe') return rows.flatMap(({ items }) => items.filter((i) => i.kind === 'embed').map((i) => iframeOf(i.url))).join('\n');
        return rows.map(({ f, items }) => [head(f), ...items.map((i) => (labelled ? `${i.label}: ${i.url}` : i.url))].filter(Boolean).join('\n')).join(gap ? '\n\n' : '\n');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chosen, mode, format, useMs, hostEmbeds, hostLinks, layout, showTitle, showSize, labelled, gap, domains, origin]);

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
    const flip = (setter, id) => setter((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const allShownPicked = shown.length > 0 && shown.every((f) => picked.has(f.id));
    const toggleAll = () => setPicked((p) => { const n = new Set(p); shown.forEach((f) => (allShownPicked ? n.delete(f.id) : n.add(f.id))); return n; });
    const chip = (on) => `ms-btn ms-btn-sm ${on ? 'ms-btn-primary' : 'ms-btn-ghost'}`;
    const lines = output ? output.split('\n').length : 0;

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0"><IconCode size={18} /></span>
                        <h1 className="ms-h1 truncate">Link Generator</h1>
                    </div>
                    <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10" role="tablist">
                        {[['simple', 'Simple'], ['advanced', 'Advanced']].map(([k, l]) => (
                            <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`px-3.5 h-8 rounded-lg text-xs font-bold transition ${mode === k ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>{l}</button>
                        ))}
                    </div>
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

                    <section className="ms-card p-4 sm:p-5 space-y-4 min-w-0">
                        <h2 className="ms-h2">2. {mode === 'simple' ? 'Result' : 'Build your list'} ({chosen.length} file{chosen.length === 1 ? '' : 's'})</h2>

                        {mode === 'simple' ? (
                            <div className="flex flex-wrap gap-2" role="radiogroup">
                                {SIMPLE_FORMATS.map(([k, label]) => (
                                    <button key={k} type="button" role="radio" aria-checked={format === k} onClick={() => setFormat(k)} className={chip(format === k)}>{label}</button>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <p className="ms-label">MultiServer links</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" aria-pressed={useMs.embed} onClick={() => setUseMs((u) => ({ ...u, embed: !u.embed }))} className={chip(useMs.embed)}>Embed player</button>
                                        <button type="button" aria-pressed={useMs.page} onClick={() => setUseMs((u) => ({ ...u, page: !u.page }))} className={chip(useMs.page)}>File page</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="ms-label">Other sites&apos; embed links {chosen.length === 0 && <span className="normal-case font-normal text-slate-500">(pick files first)</span>}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {hostsAvailable.filter((h) => h.embedN > 0).map((h) => (
                                            <button key={h.id} type="button" aria-pressed={hostEmbeds.has(h.id)} onClick={() => flip(setHostEmbeds, h.id)} className={chip(hostEmbeds.has(h.id))}>{h.name} <span className="opacity-60">{h.embedN}</span></button>
                                        ))}
                                        {hostsAvailable.filter((h) => h.embedN > 0).length > 0 && (
                                            <button type="button" onClick={() => setHostEmbeds(new Set(hostsAvailable.filter((h) => h.embedN > 0).map((h) => h.id)))} className="ms-btn ms-btn-soft ms-btn-sm">All</button>
                                        )}
                                        {hostEmbeds.size > 0 && <button type="button" onClick={() => setHostEmbeds(new Set())} className="ms-btn ms-btn-ghost ms-btn-sm">Clear</button>}
                                    </div>
                                    {chosen.length > 0 && hostsAvailable.every((h) => h.embedN === 0) && <p className="ms-muted text-xs mt-1">These files have no host with a player link yet.</p>}
                                </div>
                                <div>
                                    <p className="ms-label">Other sites&apos; normal links</p>
                                    <div className="flex flex-wrap gap-2">
                                        {hostsAvailable.map((h) => (
                                            <button key={h.id} type="button" aria-pressed={hostLinks.has(h.id)} onClick={() => flip(setHostLinks, h.id)} className={chip(hostLinks.has(h.id))}>{h.name}</button>
                                        ))}
                                        {hostLinks.size > 0 && <button type="button" onClick={() => setHostLinks(new Set())} className="ms-btn ms-btn-ghost ms-btn-sm">Clear</button>}
                                    </div>
                                </div>
                                <div>
                                    <p className="ms-label">Layout</p>
                                    <div className="flex flex-wrap gap-2" role="radiogroup">
                                        {LAYOUTS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={layout === k} onClick={() => setLayout(k)} className={chip(layout === k)}>{l}</button>)}
                                    </div>
                                </div>
                                {layout === 'blocks' && (
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" aria-pressed={showTitle} onClick={() => setShowTitle((v) => !v)} className={chip(showTitle)}>Title</button>
                                        <button type="button" aria-pressed={showSize} onClick={() => setShowSize((v) => !v)} className={chip(showSize)}>Size</button>
                                        <button type="button" aria-pressed={labelled} onClick={() => setLabelled((v) => !v)} className={chip(labelled)}>Site labels</button>
                                        <button type="button" aria-pressed={gap} onClick={() => setGap((v) => !v)} className={chip(gap)}>Blank line between files</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <textarea readOnly rows={14} value={output} placeholder="Select files to see the links here" className="ms-input ms-code text-emerald-400" onFocus={(e) => e.target.select()} />
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" disabled={!output} onClick={() => copy(output, 'Result')} className="ms-btn ms-btn-primary ms-btn-sm"><IconCopy size={14} /> Copy result</button>
                            {mode === 'simple' && COPY_KINDS.map(([k, label]) => (
                                <button key={k} type="button" disabled={!chosen.length} onClick={async () => say((await copyToClipboard(buildCopy(k, chosen, links))) ? `All ${label.toLowerCase()} copied` : 'Copy failed')} className="ms-btn ms-btn-ghost ms-btn-sm">
                                    <IconCopy size={14} /> {label}
                                </button>
                            ))}
                            {output && <span className="ms-muted text-xs ml-auto">{lines} line(s)</span>}
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
