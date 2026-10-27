'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function FileManagerPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    
    const [files, setFiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingFileId, setEditingFileId] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    useEffect(() => {
        async function checkAuthAndFetchFiles() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            fetchFiles(session.user.id);
            setLoadingAuth(false);
        }
        checkAuthAndFetchFiles();
    }, [router]);

    const fetchFiles = async (userId) => {
        const { data, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (!error && data) {
            setFiles(data);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Link copied to clipboard! 📋');
    };

    // ১. ফাইল রিনেম করার ফাংশন
    const handleRename = async (fileId) => {
        if (!newFileName.trim()) return;

        const { error } = await supabase
            .from('files')
            .update({ name: newFileName })
            .eq('id', fileId);

        if (error) {
            alert('Failed to rename file: ' + error.message);
        } else {
            setFiles(files.map(f => f.id === fileId ? { ...f, name: newFileName } : f));
            setEditingFileId(null);
            setNewFileName('');
        }
    };

    // ২. ফাইল ডিলিট করার ফাংশন
    const handleDelete = async (fileId) => {
        if (!confirm('Are you sure you want to delete this file record?')) return;

        const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);

        if (error) {
            alert('Failed to delete: ' + error.message);
        } else {
            setFiles(files.filter(f => f.id !== fileId));
        }
    };

    // ৩. রি-আপলোড বা রিকোয়েস্ট পুনরায় পাঠানোর ফাংশন (Retry Upload)
    const handleRetryUpload = async (file) => {
        alert(`Retrying upload request for: ${file.name}`);
        // এখানে ব্যাকএন্ড API-এ পুনরায় রিকোয়েস্ট পাঠানোর লজিক যুক্ত করা যাবে
    };

    const filteredFiles = files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Loading File Manager...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-blue-500 text-lg">📁</span>
                        <h1 className="text-xs font-extrabold text-white uppercase tracking-wider">Cloud File Manager</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                </header>

                <main className="flex-1 p-6 lg:p-10 space-y-6">
                    {/* Top Search & Stats Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl">
                        <div className="w-full sm:w-72">
                            <input 
                                type="text"
                                placeholder="Search files by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                            />
                        </div>
                        <div className="text-xs text-slate-400">
                            Total Stored Files: <span className="text-blue-400 font-bold">{files.length}</span>
                        </div>
                    </div>

                    {/* Files List Table / Cards */}
                    <div className="space-y-4">
                        {filteredFiles.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-3xl">
                                <p className="text-xs text-slate-500">No files found in your storage.</p>
                            </div>
                        ) : (
                            filteredFiles.map((file) => (
                                <div key={file.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 transition hover:border-slate-700">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 text-sm">🎞️</span>
                                            <div>
                                                {editingFileId === file.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="text"
                                                            value={newFileName}
                                                            onChange={(e) => setNewFileName(e.target.value)}
                                                            className="bg-slate-950 border border-blue-500 text-white text-xs px-2.5 py-1 rounded-lg"
                                                        />
                                                        <button onClick={() => handleRename(file.id)} className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg">Save</button>
                                                        <button onClick={() => setEditingFileId(null)} className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-lg">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-xs font-bold text-white">{file.name}</h4>
                                                        <button 
                                                            onClick={() => { setEditingFileId(file.id); setNewFileName(file.name); }} 
                                                            className="text-slate-500 hover:text-blue-400 text-[10px]"
                                                            title="Rename File"
                                                        >
                                                            ✏️
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-0.5">Size: {file.size} | Date: {file.date}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                                file.status === 'Active' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {file.status || 'Active'}
                                            </span>

                                            {file.status !== 'Active' && (
                                                <button 
                                                    onClick={() => handleRetryUpload(file)}
                                                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[10px] font-bold rounded-xl border border-blue-500/30 transition cursor-pointer"
                                                >
                                                    Retry Upload
                                                </button>
                                            )}

                                            <button 
                                                onClick={() => handleDelete(file.id)}
                                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-xl border border-rose-500/20 transition cursor-pointer"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Links Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Download Link</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    readOnly 
                                                    value={file.url} 
                                                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3.5 py-2 font-mono"
                                                />
                                                <button 
                                                    onClick={() => copyToClipboard(file.url)}
                                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Embed Player Link</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text" 
                                                    readOnly 
                                                    value={file.embed_url || `${file.url}/embed`} 
                                                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3.5 py-2 font-mono"
                                                />
                                                <button 
                                                    onClick={() => copyToClipboard(file.embed_url || `${file.url}/embed`)}
                                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}