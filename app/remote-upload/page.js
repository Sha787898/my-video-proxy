'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { embedBase } from '../utils/embedOrigin';
import { IconLink, IconInfo, IconCopy, IconRefresh, IconCode, IconTrash, IconInbox, IconBolt } from '../components/Icons';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function RemoteUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [inputLinks, setInputLinks] = useState('');
    const [processedResults, setProcessedResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Auth guard: redirect to login if there is no session
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

    // লোডিং অবস্থায় ব্লকিং স্ক্রিন
    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" /> Checking authorization...
                </div>
            </div>
        );
    }

    // Parse LoadMyFile or any embed link and convert it into a MultiServer player link
    const handleGenerateEmbeds = () => {
        if (!inputLinks.trim()) return;
        setIsLoading(true);

        setTimeout(() => {
            const lines = inputLinks.split('\n').filter(line => line.trim() !== '');
            const results = lines.map((line, index) => {
                let cleanLink = line.trim();
                let title = `MultiServer Video Stream #${index + 1}`;
                
                // If the line contains a title, split it from the link
                if (line.includes('|')) {
                    const parts = line.split('|');
                    title = parts[0].trim();
                    cleanLink = parts[1].trim();
                }

                // Extract the ID
                const matchId = cleanLink.match(/\/([a-zA-Z0-9-_]{8,})\/?$/);
                const fileId = matchId ? matchId[1] : 'ms_' + Math.random().toString(36).substring(2, 10);

                const embedUrl = `${embedBase(window.location.origin)}/embed/${fileId}`;
                const watchUrl = `${window.location.origin}/file/${fileId}`;

                return {
                    id: fileId,
                    title: title,
                    original: cleanLink,
                    embed: embedUrl,
                    watch: watchUrl,
                    iframeCode: `<iframe src="${embedUrl}" width="100%" height="400px" frameborder="0" allowfullscreen></iframe>`
                };
            });

            setProcessedResults(results);
            setIsLoading(false);
        }, 600);
    };

    const copyToClipboard = (text, btnId) => {
        navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalHTML = btn.innerHTML;
            const originalClass = btn.className;
            btn.innerHTML = 'Copied';
            btn.className = 'ms-btn ms-btn-success ms-btn-block sm:w-auto!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.className = originalClass;
            }, 2000);
        }
    };

    const copyBtnClass = 'ms-btn ms-btn-ghost ms-btn-block sm:w-auto!';

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconLink size={18} /></span>
                        <h1 className="ms-h1 truncate">Remote Upload & Parser</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-alert ms-alert-blue">
                        <IconInfo size={18} className="shrink-0" />
                        <p className="min-w-0">MultiServer Embed Generator: paste LoadMyFile or external player links below to instantly generate your MultiServer embed codes.</p>
                    </div>

                    <div className="ms-card p-4 sm:p-6 space-y-4">
                        <h2 className="ms-h2 flex items-center gap-2"><IconLink size={16} /> Remote Link & Embed Parser</h2>

                        <div className="space-y-2">
                            <label className="ms-label">Paste links (one per line)</label>
                            <textarea
                                rows="5"
                                value={inputLinks}
                                onChange={(e) => setInputLinks(e.target.value)}
                                placeholder="Naruto Shippuden E365 | https://loadmyfile.com/file/xyz123&#10;https://loadmyfile.com/embed/abc789"
                                required
                                className="ms-input ms-code leading-relaxed"
                            ></textarea>
                            <p className="ms-muted text-xs break-words">Use <span className="ms-code text-slate-300">Title | https://...</span> to set a title, or paste just the URL.</p>
                        </div>

                        <button
                            onClick={handleGenerateEmbeds}
                            disabled={isLoading}
                            className="ms-btn ms-btn-primary ms-btn-block"
                        >
                            {isLoading ? <IconRefresh size={16} className="ms-spin" /> : <IconBolt size={16} />}
                            {isLoading ? 'Processing...' : 'Generate MultiServer Embeds'}
                        </button>
                    </div>

                    {processedResults.length > 0 ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                                <h2 className="ms-h2">Generated links ({processedResults.length})</h2>
                                <button
                                    onClick={() => setProcessedResults([])}
                                    className="ms-btn ms-btn-ghost ms-btn-sm"
                                >
                                    <IconTrash size={14} /> Clear results
                                </button>
                            </div>

                            <div className="space-y-3">
                                {processedResults.map((res, idx) => (
                                    <div key={res.id} className="ms-card p-4 sm:p-5 space-y-4 ms-fade-up">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                            <span className="text-sm font-bold text-white break-words min-w-0"><span className="text-blue-400 mr-1.5">#{idx + 1}</span>{res.title}</span>
                                            <span className="ms-badge ms-badge-blue self-start sm:self-auto shrink-0">MultiServer node</span>
                                        </div>

                                        <div className="space-y-1.5 min-w-0">
                                            <label className="ms-label flex items-center gap-1.5"><IconLink size={14} /> Embed link</label>
                                            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                                                <input type="text" value={res.embed} readOnly className="ms-input ms-code min-w-0 flex-1" />
                                                <button id={`btn-emb-${idx}`} onClick={() => copyToClipboard(res.embed, `btn-emb-${idx}`)} className={copyBtnClass} aria-label="Copy embed link">
                                                    <IconCopy size={16} /> <span>Copy</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 min-w-0">
                                            <label className="ms-label flex items-center gap-1.5"><IconCode size={14} /> Iframe HTML code</label>
                                            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                                                <input type="text" value={res.iframeCode} readOnly className="ms-input ms-code min-w-0 flex-1" />
                                                <button id={`btn-ifr-${idx}`} onClick={() => copyToClipboard(res.iframeCode, `btn-ifr-${idx}`)} className={copyBtnClass} aria-label="Copy iframe code">
                                                    <IconCopy size={16} /> <span>Copy</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="ms-card p-8 text-center">
                            <IconInbox size={28} className="mx-auto text-slate-600" />
                            <p className="ms-muted text-sm mt-2">Generated embed links will appear here.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
