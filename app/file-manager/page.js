'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function FileManagerPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    // ১. সিকিউরিটি গার্ড ও ইউজার সেশন চেক
    useEffect(() => {
        async function checkAuthAndFetch() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoadingAuth(false);
            fetchFiles(session.user.id);
        }
        checkAuthAndFetch();
    }, [router]);

    const fetchFiles = async (userId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('user_id', userId) // শুধু বর্তমান ইউজারের ফাইলগুলো ফেচ করবে
                .order('created_at', { ascending: false });

            if (data) setFiles(data);
        } catch (err) {
            console.error('Error loading files:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
            </div>
        );
    }

    const copyEmbedCode = (file) => {
        const embedUrl = `<iframe src="https://multishows.top/embed/${file.id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`;
        navigator.clipboard.writeText(embedUrl);
        setCopiedId(file.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleDelete = async (id) => {
        const { error } = await supabase.from('files').delete().eq('id', id);
        if (!error && user) fetchFiles(user.id);
    };

    const filteredFiles = files.filter(f => 
        f.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🗂️</span>
                        <h1 className="text-xs font-bold text-white uppercase tracking-wider">MultiServer File Manager</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                        <a href="/remote-upload" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20">
                            + New Mirror Upload
                        </a>
                    </div>
                </header>

                <main className="p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-6">
                    {/* Search & Actions Bar */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
                        <input 
                            type="text" 
                            placeholder="🔍 Search files by title or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-96 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                        />
                        <div className="text-xs text-slate-400 font-bold">
                            Total Items: <span className="text-blue-400">{filteredFiles.length}</span>
                        </div>
                    </div>

                    {/* Files Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950">
                                        <th className="p-4">Media File Name</th>
                                        <th className="p-4">Type / Source</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Created Date</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-500 animate-pulse">
                                                Loading MultiServer files from Supabase cloud database...
                                            </td>
                                        </tr>
                                    ) : filteredFiles.length > 0 ? (
                                        filteredFiles.map((file) => (
                                            <tr key={file.id} className="hover:bg-slate-800/40 transition">
                                                <td className="p-4 font-bold text-white max-w-xs truncate">
                                                    {file.title || 'Untitled Media Asset'}
                                                </td>
                                                <td className="p-4 text-slate-400">
                                                    <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-bold text-blue-400">
                                                        {file.type || 'Abyss Mirror'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        {file.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-500 text-[11px]">
                                                    {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'Recent'}
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    <button 
                                                        onClick={() => copyEmbedCode(file)}
                                                        className="px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition text-[10px] font-bold"
                                                    >
                                                        {copiedId === file.id ? 'Copied! ✅' : 'Copy Embed'}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(file.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition text-[10px]"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-slate-500">
                                                No media files found in your MultiServer repository.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}