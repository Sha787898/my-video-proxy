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

    const [driveFileId, setDriveFileId] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // ১. সিকিউরিটি গার্ড: লগইন করা আছে কিনা চেক করা
    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setUser(session.user);
                setLoadingAuth(false);
            }
        }
        checkAuth();
    }, [router]);

    // লোডিং অবস্থায় ব্লকিং স্ক্রিন
    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
            </div>
        );
    }

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!driveFileId || !user) return;

        setLoading(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uploadType: 'drive',
                    driveFileId,
                    fileName,
                    user_id: user.id // ইউজারের আইডি পাস করা হলো
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload from Google Drive');
            }

            setSuccessMsg('Google Drive file successfully mirrored & saved to Supabase!');
            setDriveFileId('');
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
                    <h1 className="text-sm font-bold text-white uppercase">Google Drive Remote Upload</h1>
                    <span className="text-xs text-slate-400">{user?.email}</span>
                </header>

                <main className="p-6 lg:p-10 max-w-2xl">
                    <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                            Remote Import via Google Drive File ID
                        </h2>
                        
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
                                placeholder="e.g. Naruto_Shippuden_Ep_01.mp4" 
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 uppercase">Google Drive File ID or Shareable Link</label>
                            <input 
                                type="text" 
                                placeholder="e.g. 1B2M2Y8AsgTpgAmCvzvPyCn" 
                                value={driveFileId}
                                onChange={(e) => setDriveFileId(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Google Drive file ID text paste korun. Example: <code>https://drive.google.com/file/d/<b>FILE_ID</b>/view</code>
                            </p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
                        >
                            {loading ? 'Fetching from Google Drive...' : 'Import from Google Drive'}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
}