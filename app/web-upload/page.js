'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { IconUpload, IconInfo, IconRefresh, IconCheckCircle, IconAlert } from '../components/Icons';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WebUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    // Auth guard: redirect to login if there is no session
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
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" /> Checking authorization...
                </div>
            </div>
        );
    }

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0 || !user) return;
        setUploading(true);
        setStatus('Uploading file to cloud node...');

        try {
            const file = files[0];
            // Insert file record into Supabase with user_id for RLS
            const { error } = await supabase.from('files').insert([
                { 
                    title: file.name, 
                    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, 
                    status: 'Processing', 
                    type: 'Web Upload',
                    user_id: user.id 
                }
            ]);

            if (error) throw error;
            setStatus('File uploaded successfully! Added to processing queue.');
            setTimeout(() => router.push('/file-manager'), 1500);
        } catch (err) {
            setStatus(`Error: ${err.message}`);
            setUploading(false);
        }
    };

    const isError = status.startsWith('Error:');

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconUpload size={18} /></span>
                        <h1 className="ms-h1 truncate">Web File Uploader</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-alert ms-alert-blue">
                        <IconInfo size={18} className="shrink-0" />
                        <p className="min-w-0">Direct web upload: drag and drop your media files or browse from your device to prepare files for upload.</p>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
                        className={`ms-card border-2 border-dashed p-6 sm:p-12 text-center transition ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}
                    >
                        <input type="file" id="fileInput" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 mx-auto mb-4">
                            <IconUpload size={28} />
                        </div>
                        <h2 className="text-sm font-bold text-white mb-1">Drag and drop your files here</h2>
                        <p className="ms-muted text-xs mb-5">or choose a file from your device</p>
                        <label htmlFor="fileInput" className="ms-btn ms-btn-primary cursor-pointer">
                            <IconUpload size={16} /> Browse files
                        </label>

                        {uploading && (
                            <p className="mt-5 text-xs text-blue-400 font-semibold flex items-center justify-center gap-2 break-words">
                                <IconRefresh size={14} className="ms-spin shrink-0" /> {status}
                            </p>
                        )}
                        {!uploading && status && (
                            <p className={`mt-5 text-xs font-semibold flex items-center justify-center gap-2 break-words ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                                {isError ? <IconAlert size={14} className="shrink-0" /> : <IconCheckCircle size={14} className="shrink-0" />} {status}
                            </p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
