'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

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

    // ১. সিকিউরিটি গার্ড: লগইন করা আছে কিনা চেক করা
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
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
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
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Embed Generator</h1>
                    <span className="text-xs text-slate-400">{user?.email}</span>
                </header>

                {/* Centered Main Content Container */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10">
                    <div className="w-full max-w-3xl space-y-6">
                        
                        <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
                            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Remote Link & Embed Parser</h2>
                            <textarea 
                                rows="6"
                                placeholder="Paste links (one per line, e.g. Title | https://...)"
                                value={links}
                                onChange={(e) => setLinks(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                            />
                            <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25">
                                Generate MultiServer Embeds
                            </button>
                        </form>

                        {embeds && (
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-2">
                                <label className="text-[10px] text-slate-400 uppercase">Generated Embed Codes</label>
                                <textarea 
                                    rows="6"
                                    readOnly
                                    value={embeds}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-emerald-400 font-mono"
                                />
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}