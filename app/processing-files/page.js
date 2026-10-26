'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ProcessingFilesPage() {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('files').select('*').order('created_at', { ascending: false });
        if (data) setQueue(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Processing Queue</h1>
                    <button onClick={fetchQueue} className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-bold">
                        🔄 Refresh
                    </button>
                </header>
                <main className="p-6 lg:p-10 max-w-5xl space-y-6">
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Active In Queue: {queue.length} Files</h2>
                        
                        <div className="space-y-3">
                            {queue.length > 0 ? (
                                queue.map((file) => (
                                    <div key={file.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
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
                </main>
            </div>
        </div>
    );
}