'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function WebUploadPage() {
    const [fileUrl, setFileUrl] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!fileUrl) return;

        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uploadType: 'url', fileUrl, fileName }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload file');
            }

            setSuccessMsg('File successfully mirrored via Abyss & saved to Supabase!');
            setFileUrl('');
            setFileName('');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase">Direct Web Upload</h1>
                </header>

                <main className="p-6 lg:p-10 max-w-2xl">
                    <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Push Direct URL to Abyss Storage</h2>
                        
                        {successMsg && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                                {successMsg}
                            </div>
                        )}

                        {errorMsg && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                                {errorMsg}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Custom File Name (Optional)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Movie_2026_1080p.mp4" 
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Direct Video / Stream URL</label>
                            <input 
                                type="url" 
                                placeholder="https://example.com/video.mp4" 
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                        >
                            {loading ? 'Processing via Abyss API...' : 'Start Remote Upload & Sync'}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
}