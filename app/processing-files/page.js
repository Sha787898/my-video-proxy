'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ProcessingFilesPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    // ১. সিকিউরিটি গার্ড ও ইউজার সেশন চেক
    useEffect(() => {
        async function checkAuthAndFetch() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoadingAuth(false);
            fetchQueue(session.user.id);
        }
        checkAuthAndFetch();
    }, [router]);

    const fetchQueue = async (userId) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', userId) // শুধু বর্তমান ইউজারের কিউ ফাইলগুলো ফেচ করবে
            .order('created_at', { ascending: false });
            
        if (data) setQueue(data);
        setLoading(false);
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Processing Queue</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                        <button 
                            onClick={() => user && fetchQueue(user.id)} 
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-bold transition cursor-pointer shadow-sm"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start p-6 lg:p-10">
                    <div className="w-full max-w-5xl space-y-6">
                        
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Active In Queue: {queue.length} Files</h2>
                            
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="text-center py-12 text-slate-500 text-xs animate-pulse">
                                        Loading queue items from Supabase...
                                    </div>
                                ) : queue.length > 0 ? (
                                    queue.map((file) => (
                                        <div key={file.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{file.title}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Type: {file.type || 'Direct'} | Size: {file.size || 'N/A'}</p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                ● {file.status || 'Processing'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-500 text-xs">
                                        ✅ All Queue Cleared! There are no files currently processing or repairing.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}