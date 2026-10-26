'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
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

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0 || !user) return;
        setUploading(true);
        setStatus('Uploading file to Cloud node...');

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
            setTimeout(() => router.push('/processing-files'), 1500);
        } catch (err) {
            setStatus(`Error: ${err.message}`);
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Web File Uploader</h1>
                    <span className="text-xs text-slate-400">{user?.email}</span>
                </header>

                {/* Centered Main Content Container */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10">
                    <div className="w-full max-w-3xl space-y-6">
                        
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-bold">
                            ℹ️ Direct Web Upload: Drag and drop your media files or browse from your device to prepare files for upload.
                        </div>

                        <div 
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
                            className={`border-2 border-dashed rounded-3xl p-12 text-center transition bg-slate-900/40 shadow-2xl ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}
                        >
                            <input type="file" id="fileInput" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                                📤
                            </div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Drag and drop your files here</h3>
                            <p className="text-[11px] text-slate-400 mb-6">or <label htmlFor="fileInput" className="text-blue-400 underline cursor-pointer font-bold">browse</label> to choose files from your device</p>
                            
                            {uploading && <p className="text-xs text-yellow-400 font-bold animate-pulse">{status}</p>}
                            {!uploading && status && <p className="text-xs text-emerald-400 font-bold">{status}</p>}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}