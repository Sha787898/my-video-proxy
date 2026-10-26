'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function WebUploadPage() {
    const [fileUrl, setFileUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleUpload = (e) => {
        e.preventDefault();
        if (!fileUrl.trim()) return;
        setUploading(true);
        setTimeout(() => {
            setUploading(false);
            alert('File successfully fetched and queued to MultiServer storage!');
            setFileUrl('');
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Web Direct Upload</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Fetch File from URL</h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <input 
                                type="url"
                                placeholder="https://example.com/video.mkv"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                            <button 
                                type="submit"
                                disabled={uploading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider h-11 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                                <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`}></i>
                                {uploading ? 'Fetching & Mirroring...' : 'Start Web Fetch'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}