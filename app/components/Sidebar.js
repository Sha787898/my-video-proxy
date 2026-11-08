'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
    IconDashboard, IconFolder, IconUpload, IconGlobe, IconCloud, IconIdCard, IconLaptop,
    IconLayers, IconCode, IconChart, IconSliders, IconKey, IconPlay, IconChevronDown, IconMenu, IconX, IconSearch, IconChevronRight,
} from './Icons';
import QueueRunner from './QueueRunner';
import Mascot from './Mascot';

const NAV = [
    { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
    { href: '/file-manager', label: 'File Manager', Icon: IconFolder },
    {
        id: 'upload', label: 'Upload', Icon: IconUpload,
        items: [
            { href: '/remote-upload', label: 'Remote Upload', Icon: IconGlobe },
            { href: '/gdrive-upload', label: 'GDrive Mirror', Icon: IconCloud },
            { href: '/drive-upload', label: 'GDrive File ID', Icon: IconIdCard },
            { href: '/web-upload', label: 'Direct Web Upload', Icon: IconLaptop },
            { href: '/processing-files', label: 'Processing Queue', Icon: IconLayers },
        ],
    },
    { href: '/embed-generator', label: 'Link Generator', Icon: IconCode },
    { href: '/analytics', label: 'Analytics', Icon: IconChart },
    {
        id: 'settings', label: 'Settings', Icon: IconSliders,
        items: [
            { href: '/manage-sites', label: 'Manage Sites & Keys', Icon: IconKey },
            { href: '/player-settings', label: 'Player & Download Theme', Icon: IconPlay },
        ],
    },
];

// every page as one flat list (for quick search)
const ITEMS = [];
NAV.forEach((n) => {
    if (n.items) n.items.forEach((it) => ITEMS.push({ ...it, group: n.label }));
    else ITEMS.push({ ...n, group: '' });
});

function CommandPalette({ open, onClose }) {
    const router = useRouter();
    const [q, setQ] = useState('');
    const [idx, setIdx] = useState(0);
    const inputRef = useRef(null);

    const needle = q.trim().toLowerCase();
    const list = ITEMS.filter((i) => !needle || i.label.toLowerCase().includes(needle) || i.group.toLowerCase().includes(needle));

    useEffect(() => {
        if (!open) return undefined;
        setQ('');
        setIdx(0);
        const t = setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 30);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => { setIdx(0); }, [q]);

    if (!open) return null;

    const go = (it) => { onClose(); router.push(it.href); };
    const onKey = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, Math.max(list.length - 1, 0))); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter' && list[idx]) { e.preventDefault(); go(list[idx]); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Quick search" className="ms-card w-full max-w-md overflow-hidden ms-fade-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 px-4 border-b border-white/10">
                    <IconSearch size={16} className="text-slate-500 shrink-0" />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Go to a page"
                        aria-label="Search pages"
                        className="flex-1 min-w-0 h-12 bg-transparent text-[15px] text-white placeholder:text-slate-500 outline-none"
                    />
                    <kbd className="hidden sm:inline text-[10px] font-semibold text-slate-400 border border-white/10 rounded-md px-1.5 py-0.5">Esc</kbd>
                </div>
                <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
                    {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No page found</li>}
                    {list.map((it, i) => (
                        <li key={it.href} role="option" aria-selected={i === idx}>
                            <button
                                type="button"
                                ref={(el) => { if (el && i === idx) el.scrollIntoView({ block: 'nearest' }); }}
                                onClick={() => go(it)}
                                onMouseEnter={() => setIdx(i)}
                                className={`w-full flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-left text-[14px] transition ${i === idx ? 'bg-blue-500/15 text-white' : 'text-slate-300'}`}
                            >
                                <it.Icon size={16} className={i === idx ? 'text-blue-300' : 'text-slate-500'} />
                                <span className="flex-1 min-w-0 truncate">{it.label}</span>
                                {it.group && <span className="text-[11px] text-slate-500">{it.group}</span>}
                                <IconChevronRight size={14} className={i === idx ? 'text-blue-300' : 'text-transparent'} />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function Logo() {
    return (
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 shrink-0 rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-[11px] ring-1 ring-white/10">
                MS
            </span>
            <span className="font-bold text-[13px] text-white tracking-[0.14em]">MULTISERVER</span>
            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/25">PRO</span>
        </Link>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState({ upload: true, settings: true });
    const [palette, setPalette] = useState(false);

    // room for the fixed mobile top bar
    useEffect(() => {
        document.body.classList.add('has-shell');
        return () => document.body.classList.remove('has-shell');
    }, []);

    // close the drawer after navigating
    useEffect(() => { setOpen(false); setPalette(false); }, [pathname]);

    // Ctrl/Cmd + K opens quick search
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
                e.preventDefault();
                setPalette((p) => !p);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Esc closes, page does not scroll under the open drawer
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [open]);

    const isActive = (href) => pathname === href;
    const linkCls = (href) => `group relative flex items-center gap-3 px-3 min-h-[42px] rounded-xl text-[13px] font-medium transition ${
        isActive(href)
            ? 'bg-blue-500/12 text-white border border-blue-400/25'
            : 'text-slate-400 border border-transparent hover:text-white hover:bg-white/5'
    }`;

    return (
        <>
            <QueueRunner />
            <Mascot fetchConfig />
            {/* mobile top bar */}
            <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 px-4 flex items-center justify-between bg-slate-950/85 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top)]">
                <Logo />
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                    className="w-11 h-11 -mr-2 flex items-center justify-center rounded-xl text-slate-200 hover:bg-white/10 active:scale-95 transition"
                >
                    <IconMenu size={22} />
                </button>
            </div>

            {open && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-dvh w-[272px] max-w-[86vw] shrink-0 flex flex-col justify-between bg-slate-950/95 lg:bg-slate-950/80 backdrop-blur-xl border-r border-white/10 select-none transition-transform duration-300 ease-out ${
                    open ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
                aria-label="Main navigation"
            >
                <div className="p-4 space-y-5 overflow-y-auto">
                    <div className="flex items-center justify-between px-1 pt-1">
                        <Logo />
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Close menu"
                            className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 transition"
                        >
                            <IconX size={20} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => { setOpen(false); setPalette(true); }}
                        className="w-full flex items-center gap-2.5 px-3 min-h-[42px] rounded-xl border border-white/10 bg-white/[0.04] text-[13px] text-slate-400 hover:text-white hover:bg-white/[0.07] transition"
                    >
                        <IconSearch size={15} />
                        <span className="flex-1 text-left">Quick search</span>
                        <kbd className="hidden lg:inline text-[10px] font-semibold text-slate-500 border border-white/10 rounded-md px-1.5 py-0.5">Ctrl K</kbd>
                    </button>

                    <nav className="space-y-1">
                        {NAV.map((n) => {
                            if (!n.items) {
                                return (
                                    <Link key={n.href} href={n.href} className={linkCls(n.href)}>
                                        <n.Icon size={17} className={isActive(n.href) ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'} />
                                        {n.label}
                                    </Link>
                                );
                            }
                            const expanded = groups[n.id];
                            return (
                                <div key={n.id} className="pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setGroups((g) => ({ ...g, [n.id]: !g[n.id] }))}
                                        aria-expanded={expanded}
                                        className="w-full flex items-center justify-between px-3 min-h-[38px] text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] hover:text-slate-300 transition"
                                    >
                                        <span className="flex items-center gap-2"><n.Icon size={14} /> {n.label}</span>
                                        <IconChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expanded && (
                                        <div className="mt-1 ml-3 pl-2.5 space-y-1 border-l border-white/10">
                                            {n.items.map((it) => (
                                                <Link key={it.href} href={it.href} className={linkCls(it.href)}>
                                                    <it.Icon size={16} className={isActive(it.href) ? 'text-blue-300' : 'text-slate-500 group-hover:text-slate-300'} />
                                                    {it.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/10 pb-[max(16px,env(safe-area-inset-bottom))]">
                    <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                        <span className="ms-pulse-dot" />
                        <span className="text-[11px] text-slate-300 font-semibold tracking-wide">All nodes active</span>
                    </div>
                </div>
            </aside>

            <CommandPalette open={palette} onClose={() => setPalette(false)} />
        </>
    );
}
