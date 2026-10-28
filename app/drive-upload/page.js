'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function DriveUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [driveInput, setDriveInput] = useState('');
    const [customTitle, setCustomTitle] = useState('');
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

    // Extract File ID if full URL pasted
    const extractedFileId = () => {
        if (!driveInput) return '';
        const match = driveInput.match(/[-\w]{25,}/);
        return match ? match[0] : driveInput;
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if (!driveInput.trim()) return;

        setIsLoading(true);
        setSuccessMsg('');

        const finalFileId = extractedFileId();
        const fullDriveUrl = `https://drive.google.com/file/d/${finalFileId}/view`;

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    links: fullDriveUrl,
                    fileName: customTitle,
                    uploadType: 'gdrive',
                    userId: user?.id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to import Google Drive file');

            setSuccessMsg(`File [ID: ${finalFileId.substring(0, 8)}...] successfully queued and synced! 🚀`);
            setDriveInput('');
            setCustomTitle('');
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
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 text-lg">☁️</span>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Google Drive Remote Import</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start p-6 lg:p-12">
                    <div className="w-full max-w-3xl space-y-6">

                        {successMsg && (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold flex items-center gap-2 shadow-lg animate-fade-in">
                                <span>✅</span> {successMsg}
                            </div>
                        )}

                        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>🆔</span> Remote Import via Google Drive File ID
                                </h3>
                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase">High-Speed Mirror</span>
                            </div>

                            <form onSubmit={handleImport} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Custom File Name (Optional)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        placeholder="e.g. Naruto_Shippuden_Ep_01.mp4"
                                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 text-xs rounded-2xl px-4 py-3.5 focus:outline-none transition font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Google Drive File ID or Shareable Link
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            required
                                            value={driveInput}
                                            onChange={(e) => setDriveInput(e.target.value)}
                                            placeholder="e.g. 1B2M2Y8AsgTpgAmCvzvPyCn OR paste full link"
                                            className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 text-slate-100 text-xs rounded-2xl pl-4 pr-24 py-3.5 focus:outline-none transition font-mono"
                                        />
                                        {driveInput && (
                                            <span className="absolute right-3 top-2.5 px-2 py-1 rounded-md bg-slate-800 text-[9px] text-blue-400 font-bold">
                                                ID Detected
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        Google Drive file ID text paste করুন। Example: <span className="text-slate-400 font-mono">https://drive.google.com/file/d/FILE_ID/view</span>
                                    </p>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold uppercase transition shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <span>⚡</span> {isLoading ? 'Extracting & Syncing...' : 'Import from Google Drive'}
                                </button>
                            </form>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}