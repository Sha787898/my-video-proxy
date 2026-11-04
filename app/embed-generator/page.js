'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { IconCode, IconCopy, IconCheck, IconInfo, IconRefresh } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EmbedGeneratorPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [links, setLinks] = useState('');
    const [embeds, setEmbeds] = useState('');
    const [copied, setCopied] = useState(false);

    // Security guard: make sure the user is signed in
    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setUser(session.user);
                setLoadingAuth(false);
            }
        }
        checkAuth();
    }, [router]);

    // Blocking screen while loading
    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" />
                    <span>Checking authorization…</span>
                </div>
            </div>
        );
    }

    const handleGenerate = (e) => {
        e.preventDefault();
        const lines = links.split('\n').filter(l => l.trim());
        let generated = lines.map(line => {
            return `<iframe src="https://multishows.top/embed/${btoa(line.trim())}" width="100%" height="400px" frameborder="0" allowfullscreen></iframe>`;
        }).join('\n\n');
        setEmbeds(generated);
        setCopied(false);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(embeds);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            setCopied(false);
        }
    };

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconCode size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Embed Generator</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[220px]">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-3xl mx-auto space-y-5">
                    <form onSubmit={handleGenerate} className="ms-card ms-fade-up p-4 sm:p-6 space-y-4">
                        <div>
                            <h2 className="ms-h2">Remote Link &amp; Embed Parser</h2>
                            <p className="ms-muted text-xs mt-1">Paste your links below and generate ready-to-use iframe embed codes.</p>
                        </div>
                        <div>
                            <label className="ms-label" htmlFor="embed-links">Links</label>
                            <textarea
                                id="embed-links"
                                rows="6"
                                placeholder="Paste links (one per line, e.g. Title | https://...)"
                                value={links}
                                onChange={(e) => setLinks(e.target.value)}
                                required
                                className="ms-input ms-code"
                            />
                        </div>
                        <div className="ms-alert ms-alert-blue">
                            <IconInfo size={16} className="shrink-0" />
                            <p className="text-xs">One link per line. Each line produces its own embed code.</p>
                        </div>
                        <button type="submit" className="ms-btn ms-btn-primary ms-btn-block">
                            <IconCode size={16} /> Generate MultiServer Embeds
                        </button>
                    </form>

                    {embeds && (
                        <div className="ms-card ms-fade-up p-4 sm:p-6 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="ms-h2" htmlFor="embed-output">Generated Embed Codes</label>
                                <button type="button" onClick={handleCopy} className="ms-btn ms-btn-ghost ms-btn-sm" aria-label="Copy embed codes">
                                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                            </div>
                            <textarea
                                id="embed-output"
                                rows="6"
                                readOnly
                                value={embeds}
                                className="ms-input ms-code text-emerald-400"
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
