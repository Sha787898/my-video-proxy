'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getStoredFiles, deleteStoredFile } from '../utils/fileStore';

export default function FilesPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFiles = async () => {
        setLoading(true);
        const data = await getStoredFiles();
        setFiles(data);
        setLoading(false);
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        const success = await deleteStoredFile(id);
        if (success) {
            loadFiles();
        } else {
            alert('Failed to delete file.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase">Cloud File Manager</h1>
                    <button 
                        onClick={loadFiles}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg transition"
                    >
                        Refresh
                    </button>
                </header>

                <main className="p-6 lg:p-10 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                                        <th className="p-4 uppercase tracking-wider">File Name</th>
                                        <th className="p-4 uppercase tracking-wider">Quality</th>
                                        <th className="p-4 uppercase tracking-wider">Size</th>
                                        <th className="p-4 uppercase tracking-wider">Date</th>
                                        <th className="p-4 uppercase tracking-wider">Status</th>
                                        <th className="p-4 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-500">
                                                Loading files from Supabase...
                                            </td>
                                        </tr>
                                    ) : files.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-500">
                                                No files found in cloud database. Upload some files first!
                                            </td>
                                        </tr>
                                    ) : (
                                        files.map((file) => (
                                            <tr key={file.id} className="hover:bg-slate-800/30 transition">
                                                <td className="p-4 font-medium text-white max-w-xs truncate">
                                                    {file.name}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px]">
                                                        {file.quality || '1080p'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-400">{file.size || 'N/A'}</td>
                                                <td className="p-4 text-slate-400">{file.date}</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                                                        {file.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right space-x-2">
                                                    <a 
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] transition inline-block"
                                                    >
                                                        View
                                                    </a>
                                                    <button 
                                                        onClick={() => handleDelete(file.id)}
                                                        className="px-3 py-1 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-[10px] transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
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