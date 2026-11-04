'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import { IconLayers, IconRefresh, IconCheckCircle, IconInfo, IconFile } from '../components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function statusBadge(status) {
    const s = String(status || 'Processing').toLowerCase();
    if (s.includes('fail') || s.includes('error')) return 'ms-badge-red';
    if (s.includes('partial') || s.includes('pending')) return 'ms-badge-amber';
    if (s.includes('complete')) return 'ms-badge-green';
    return 'ms-badge-blue';
}

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

    // Fetch the live queue: files whose status is Processing or Pending
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

    // Send a retry request for a stuck or failed file
    const handleRetryQueueItem = async (file) => {
        alert(`Retrying server upload request for: ${file.name}`);
        // The re-upload API call can be integrated here
    };

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" />
                    <span>Loading processing queue…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconLayers size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Live Processing Queue</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[220px]">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {/* Top Status Banner */}
                    <div className="ms-alert ms-alert-blue flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <IconInfo size={18} className="shrink-0" />
                            <p className="text-sm">Active tasks currently mirroring or pushing to remote servers.</p>
                        </div>
                        <span className="ms-badge ms-badge-blue shrink-0">
                            {processingFiles.length} Tasks in Queue
                        </span>
                    </div>

                    {/* Queue List */}
                    <div className="space-y-3">
                        {processingFiles.length === 0 ? (
                            <div className="ms-card p-8 sm:p-12 text-center space-y-2">
                                <span className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                    <IconCheckCircle size={22} />
                                </span>
                                <p className="text-sm font-semibold text-white">Queue is completely empty</p>
                                <p className="ms-muted text-xs">All uploaded or mirrored files have been successfully processed and moved to File Manager.</p>
                            </div>
                        ) : (
                            processingFiles.map((file) => (
                                <div key={file.id} className="ms-card ms-fade-up p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                            <IconFile size={18} />
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-white break-words">{file.name}</h4>
                                            <p className="ms-muted text-xs mt-0.5 break-words">Target: Multi-Server Mirror | Size: {file.size}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                        <span className={`ms-badge ${statusBadge(file.status)}`}>
                                            {file.status || 'Processing...'}
                                        </span>
                                        <button
                                            onClick={() => handleRetryQueueItem(file)}
                                            className="ms-btn ms-btn-primary ms-btn-sm"
                                        >
                                            <IconRefresh size={14} /> Force Sync
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
