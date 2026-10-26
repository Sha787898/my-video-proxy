'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getStoredFiles } from '../utils/fileStore';

export default function DashboardPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);
            const data = await getStoredFiles();
            setFiles(data);
            setLoading(false);
        }
        fetchDashboardData();
    }, []);

    // পরিসংখ্যান হিসাব করা
    const totalFiles = files.length;
    const activeFiles = files.filter(f => !f.status || f.status === 'Active').length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase">Cloud Dashboard</h1>
                    <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded">
                        Supabase Live Connected
                    </span>
                </header>

                <main className="p-6 lg:p-10 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs text-slate-400 uppercase tracking-wider">Total Files in Cloud</h3>
                            <p className="text-2xl font-bold text-white mt-2">
                                {loading ? '...' : totalFiles}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs text-slate-400 uppercase tracking-wider">Active Status Files</h3>
                            <p className="text-2xl font-bold text-emerald-400 mt-2">
                                {loading ? '...' : activeFiles}
                            </p>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-xs text-slate-400 uppercase tracking-wider">Database Status</h3>
                            <p className="text-2xl font-bold text-blue-400 mt-2">Online</p>
                        </div>
                    </div>

                    {/* Recent Files Section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Cloud Files</h2>
                        {loading ? (
                            <p className="text-xs text-slate-500">Loading data...</p>
                        ) : files.length === 0 ? (
                            <p className="text-xs text-slate-500">No files uploaded yet. Go to Web Upload to add files.</p>
                        ) : (
                            <div className="space-y-2">
                                {files.slice(0, 5).map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                                        <span className="font-medium text-white truncate max-w-md">{file.name}</span>
                                        <span className="text-slate-400">{file.quality || '1080p'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}