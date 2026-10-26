'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [fileCount, setFileCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);

            const { count } = await supabase
                .from('files')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id);

            setFileCount(count || 0);
            setLoading(false);
        }
        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Loading MultiServer dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Cloud Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                        <button 
                            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold hover:bg-red-500/20 transition"
                        >
                            Sign Out
                        </button>
                    </div>
                </header>

                <main className="p-6 lg:p-10 max-w-6xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Your Mirrored Files</p>
                            <p className="text-3xl font-black text-white mt-2">{fileCount}</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Node Status</p>
                            <p className="text-3xl font-black text-emerald-400 mt-2">Active</p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Security Model</p>
                            <p className="text-3xl font-black text-blue-400 mt-2">RLS Locked</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}