'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { IconCloud, IconUpload, IconCheckCircle, IconRefresh, IconKey } from '../components/Icons';
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
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" /> Checking authorization...
                </div>
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

            setSuccessMsg(`File [ID: ${finalFileId.substring(0, 8)}...] successfully queued and synced.`);
            setDriveInput('');
            setCustomTitle('');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconCloud size={18} /></span>
                        <h1 className="ms-h1 truncate">Google Drive Remote Import</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {successMsg && (
                        <div className="ms-alert ms-alert-green ms-fade-up">
                            <IconCheckCircle size={18} className="shrink-0" />
                            <p className="min-w-0 break-words">{successMsg}</p>
                        </div>
                    )}

                    <div className="ms-card p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-800">
                            <h2 className="ms-h2 flex items-center gap-2"><IconKey size={16} /> Import via Google Drive file ID</h2>
                            <span className="ms-badge ms-badge-blue self-start sm:self-auto">High-speed mirror</span>
                        </div>

                        <form onSubmit={handleImport} className="space-y-5">
                            <div className="space-y-2">
                                <label className="ms-label">Custom file name (optional)</label>
                                <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    placeholder="e.g. Naruto_Shippuden_Ep_01.mp4"
                                    className="ms-input"
                                />
                                <p className="ms-muted text-xs">Leave empty to use the original file name.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="ms-label">Google Drive file ID or shareable link</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={driveInput}
                                        onChange={(e) => setDriveInput(e.target.value)}
                                        placeholder="e.g. 1B2M2Y8AsgTpgAmCvzvPyCn or paste the full link"
                                        className="ms-input ms-code pr-28"
                                    />
                                    {driveInput && (
                                        <span className="ms-badge ms-badge-blue absolute right-2 top-1/2 -translate-y-1/2">ID detected</span>
                                    )}
                                </div>
                                <p className="ms-muted text-xs break-words">
                                    Paste the Google Drive file ID or link. Example: <span className="ms-code text-slate-300 break-all">https://drive.google.com/file/d/FILE_ID/view</span>
                                </p>
                            </div>

                            <button type="submit" disabled={isLoading} className="ms-btn ms-btn-primary ms-btn-block">
                                {isLoading ? <IconRefresh size={16} className="ms-spin" /> : <IconUpload size={16} />}
                                {isLoading ? 'Processing...' : 'Import from Google Drive'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}
