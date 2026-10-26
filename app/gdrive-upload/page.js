'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function GDriveUploadPage() {
    const [links, setLinks] = useState('');
    const [folderUrl, setFolderUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleDriveUpload = async (e) => {
        e.preventDefault();
        if (!links) return;
        setLoading(true);
        setMessage('Processing GDrive mirror queue...');

        try {
            const urls = links.split('\n').filter(l => l.trim());
            for (const url of urls) {
                await supabase.from('files').insert([
                    { title: `GDrive Video - ${url.slice(0, 30)}`, size: 'Unknown', status: 'Processing', type: 'GDrive' }
                ]);
            }
            setMessage('All Google Drive links successfully added to queue!');
            setTimeout(() => window.location.href = '/processing-files', 1500);
        } catch (err) {
            setMessage(`Error: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Google Drive Uploader</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-bold">
                        ℹ️ Google Drive Integration: Extract links from shared folders directly into the queue or paste individual file links.
                    </div>

                    <form onSubmit={handleDriveUpload} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Google Drive Link Uploader</h2>
                        
                        {message && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">{message}</div>}

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Google Drive Public Links (One per line)</label>
                            <textarea 
                                rows="5"
                                placeholder="https://drive.google.com/file/d/1xxxxxxx/view"
                                value={links}
                                onChange={(e) => setLinks(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white font-mono focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25">
                            {loading ? 'Adding to Queue...' : 'Upload Links'}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
}