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
    const [processingFiles, setProcessingFiles] = useState([]);

    useEffect(() => {
        async function checkAuthAndFetchQueue() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            fetchQueue(session.user.id);
            setLoadingAuth(false);
        }
        checkAuthAndFetchQueue();
    }, [router]);

    // ডাটাবেজ থেকে যে ফাইলগুলোর স্ট্যাটাস প্রসেসিং বা পেন্ডিং আছে সেগুলোর রিয়েল-টাইম কিউ ফেচ করা
    const fetchQueue = async (userId) => {
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .or('status.eq.Processing,status.eq.Pending');

        if (!error && data) {
            setProcessingFiles(data);
        }
    };

    // স্টাক বা ফেইল হওয়া ফাইল পুনরায় প্রসেস করার রিকোয়েস্ট পাঠানো
    const handleRetryQueueItem = async (file) => {
        alert(`Retrying server upload request for: ${file.name}`);
        // এখানে রি-আপলোড API কল ইন্টিগ্রেট করা যাবে
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Loading Processing Queue...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-500 text-lg">⚙️</span>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Live Processing Queue</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                </header>

                <main className="flex-1 p-6 lg:p-10 space-y-6">
                    {/* Top Status Banner */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                            <p>Active tasks currently mirroring or pushing to remote servers.</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                            {processingFiles.length} Tasks in Queue
                        </span>
                    </div>

                    {/* Queue List */}
                    <div className="space-y-4">
                        {processingFiles.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-2">
                                <span className="text-2xl">✨</span>
                                <p className="text-xs text-slate-400 font-bold">Queue is completely empty!</p>
                                <p className="text-[11px] text-slate-600">All uploaded or mirrored files have been successfully processed and moved to File Manager.</p>
                            </div>
                        ) : (
                            processingFiles.map((file) => (
                                <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 text-base animate-spin">
                                            ⏳
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-white">{file.name}</h4>
                                            <p className="text-[10px] text-slate-400 mt-0.5">Target: Multi-Server Mirror | Size: {file.size}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20 uppercase">
                                            {file.status || 'Processing...'}
                                        </span>
                                        <button 
                                            onClick={() => handleRetryQueueItem(file)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition cursor-pointer shadow-lg shadow-blue-600/20"
                                        >
                                            Force Sync
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}