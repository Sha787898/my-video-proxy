'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
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
        alert('Folder link extraction feature simulation: Folder parsed successfully! (You can paste links below as well)');
        // ফোল্ডার থেকে লিংক ফেচ করার লজিক এখানে যুক্ত করা যাবে
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!linksInput.trim()) return;

        setIsLoading(true);
        setSuccessMsg('');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    links: linksInput,
                    uploadType: 'gdrive',
                    userId: user?.id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to process links');

            setSuccessMsg(`Successfully synced ${data.count} file(s) with MultiServer queue! ✅`);
            setLinksInput('');
            setFolderUrl('');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold text-white uppercase tracking-wider">Google Cloud Drive Uploader</h1>
                    <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start p-6 lg:p-10">
                    <div className="w-full max-w-4xl space-y-6">

                        {/* Top Info Banner */}
                        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3 shadow-lg">
                            <span className="text-base">ℹ️</span>
                            <p className="leading-relaxed">
                                Google Drive Integration: Extract links from shared folders directly into the queue or paste individual file links one per line.
                            </p>
                        </div>

                        {successMsg && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
                                {successMsg}
                            </div>
                        )}

                        {/* Main Uploader Card */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                ☁️ Google Drive Link Uploader
                            </h3>

                            <form onSubmit={handleBulkUpload} className="space-y-6">
                                {/* Extract from GDrive Folder */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Extract From GDrive Folder
                                        </label>
                                        <span className="text-[10px] text-slate-500">Auto-fills link queue</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3.5 top-3.5 text-slate-500 text-xs">📁</span>
                                            <input 
                                                type="url" 
                                                value={folderUrl}
                                                onChange={(e) => setFolderUrl(e.target.value)}
                                                placeholder="Paste folder URL: https://drive.google.com/drive/folders/..."
                                                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-blue-600 font-mono"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleExtractFolder}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                        >
                                            Extract
                                        </button>
                                    </div>
                                </div>

                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-slate-800"></div>
                                    <span className="flex-shrink mx-4 text-[10px] text-slate-500 uppercase tracking-widest">Or Multiple Links</span>
                                    <div className="flex-grow border-t border-slate-800"></div>
                                </div>

                                {/* Google Drive Public Links (One per line) */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Google Drive Public Links (One per line)
                                    </label>
                                    <textarea 
                                        rows={6}
                                        required
                                        value={linksInput}
                                        onChange={(e) => setLinksInput(e.target.value)}
                                        placeholder="https://drive.google.com/file/d/1xxxxxxx/view&#10;https://drive.google.com/file/d/2xxxxxxx/view"
                                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-4 focus:outline-none focus:border-blue-600 font-mono leading-relaxed"
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <span>⬆️</span> {isLoading ? 'Processing Queue...' : 'Upload Links'}
                                </button>
                            </form>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}