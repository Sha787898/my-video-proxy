'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LandingPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            }
            setLoading(false);
        }
        checkUser();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-mono selection:bg-blue-600 selection:text-white flex flex-col justify-between">
            
            {/* Top Navigation Bar */}
            <header className="h-20 border-b border-slate-900 px-6 lg:px-16 flex items-center justify-between backdrop-blur-md bg-slate-950/50 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/30">
                        MS
                    </div>
                    <span className="text-sm font-black tracking-widest text-white uppercase">
                        MULTISERVER
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {loading ? (
                        <span className="text-xs text-slate-500 animate-pulse">Loading...</span>
                    ) : user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 hidden sm:inline">{user.email}</span>
                            <Link 
                                href="/dashboard" 
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
                            >
                                <span>📊</span> Dashboard
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link 
                                href="/login" 
                                className="px-4 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 font-bold text-xs transition"
                            >
                                Sign In
                            </Link>
                            <Link 
                                href="/login" 
                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/25"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto space-y-8">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold">
                    <span>⚡</span> Next-Gen Cloud Video Proxy & Mirroring System
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight uppercase">
                    Scale Your Media Vault With <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">MultiServer</span>
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                    Secure, isolated cloud infrastructure designed for automated batch processing, multi-node stream management, remote mirror uploading, and lightning-fast embed generation.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                    <Link 
                        href={user ? "/dashboard" : "/login"}
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2"
                    >
                        <span>🚀</span> Get Started Free
                    </Link>
                    <Link 
                        href="/embed-generator"
                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                        <span>⚡</span> Explore Features
                    </Link>
                </div>

                {/* Feature Grid Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-lg">🛡️</div>
                        <h3 className="text-xs font-bold text-white uppercase">User Data Isolation</h3>
                        <p className="text-[11px] text-slate-400">Strict Row Level Security (RLS) ensures your uploaded media assets remain completely private.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-lg">🌐</div>
                        <h3 className="text-xs font-bold text-white uppercase">Multi-Node Routing</h3>
                        <p className="text-[11px] text-slate-400">Seamlessly toggle active stream nodes, attach custom domains, and manage API keys effortlessly.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-lg">⚡</div>
                        <h3 className="text-xs font-bold text-white uppercase">Instant Embed Engine</h3>
                        <p className="text-[11px] text-slate-400">Parse remote links or raw batches into professional MultiServer iFrame embed tags in seconds.</p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="h-16 border-t border-slate-900 px-6 lg:px-16 flex items-center justify-between text-[10px] text-slate-500">
                <p>© 2026 MultiServer Cloud Platform. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                </div>
            </footer>
        </div>
    );
}