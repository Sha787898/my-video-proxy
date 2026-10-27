'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar'; // আপনার পাথ অনুযায়ী সাইডবার পাথ ঠিক করে নিতে পারেন
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function GDriveUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [folderUrl, setFolderUrl] = useState('');
    const [linksInput, setLinksInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoadingAuth(false);
        }
        checkAuth();
    }, [router]);

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
            </div>
        );
    }

    const handleExtractFolder = () => {
        if (!folderUrl.trim()) return;
        setLinksInput(prev => (prev ? prev + '\n' : '') + `${folderUrl}`);
        setFolderUrl('');
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!linksInput.trim()) {
            alert('Please enter at least one link.');
            return;
        }

        setIsLoading(true);
        setSuccessMsg('');
        setUploadedFiles([]);

        try {
            const payload = {
                links: linksInput,
                uploadType: 'gdrive',
                userId: user?.id || null
            };

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Upload API Response:', data); // ব্রাউজার কনসোলে রেসপন্স দেখতে পাবেন

            if (!response.ok) throw new Error(data.error || 'Failed to process links');

            setSuccessMsg(`Completed! Successfully processed and queued ${data.count} file(s). 🎉`);
            setUploadedFiles(data.files || []);
            setLinksInput('');
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! 📋');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 text-lg">📁</span>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Google Drive Link Uploader & Mirror</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start p-6 lg:p-10 space-y-6">
                    <div className="w-full max-w-4xl space-y-6">

                        {successMsg && (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold flex items-center gap-2 shadow-lg">
                                <span>✅</span> {successMsg}
                            </div>
                        )}

                        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                ☁️ Google Drive Bulk Link Mirror
                            </h3>

                            <form onSubmit={handleBulkUpload} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Google Drive Public Links (One per line)
                                    </label>
                                    <textarea 
                                        rows={6}
                                        value={linksInput}
                                        onChange={(e) => setLinksInput(e.target.value)}
                                        placeholder={`https://drive.google.com/file/d/1xxxxxxx/view\nhttps://drive.google.com/file/d/2xxxxxxx/view`}
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-2xl p-4 focus:outline-none focus:border-blue-500 font-mono leading-relaxed transition"
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold uppercase transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <span>⬆️</span> {isLoading ? 'Processing Links...' : 'Upload Links'}
                                </button>
                            </form>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-2">
                                    ✨ Successfully Queued Files ({uploadedFiles.length})
                                </h3>

                                {uploadedFiles.map((file) => (
                                    <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 text-sm">🎞️</span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-white">{file.name}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">Status: {file.status} | Size: {file.size}</p>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">Processing</span>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Download Link</label>
                                            <div className="flex items-center gap-2">
                                                <input type="text" readOnly value={file.url} className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3.5 py-2 font-mono" />
                                                <button onClick={() => copyToClipboard(file.url)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition">Copy</button>
                                            </div>
                                        </div>
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