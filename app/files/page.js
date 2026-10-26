'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function FilesPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const files = [
        { id: 'f1a2b3', name: 'MultiServer_Video_Node_01.mkv', size: '1.45 GB', quality: '1080p FHD', date: '2026-10-26', status: 'Active' },
        { id: 'x9y8z7', name: 'Action_Movie_Trailer_Remux.mp4', size: '650 MB', quality: '4K UHD', date: '2026-10-25', status: 'Active' },
        { id: 'm4n5p6', name: 'Anime_Episode_Raw_Rip.mkv', size: '380 MB', quality: '1080p', date: '2026-10-24', status: 'Processing' },
    ];

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const copyLink = (id) => {
        const url = `${window.location.origin}/file/${id}`;
        navigator.clipboard.writeText(url);
        alert('File link copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">File Manager</h1>
                    <span className="text-xs font-mono text-slate-400">Total: {files.length} Files</span>
                </header>

                <main className="p-6 lg:p-10 space-y-6">
                    {/* Search Bar */}
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                            <input 
                                type="text"
                                placeholder="Search files by name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono transition"
                            />
                        </div>
                    </div>

                    {/* Files Table / List */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase font-mono text-slate-400">
                                        <th className="p-4">File Name</th>
                                        <th className="p-4">Size</th>
                                        <th className="p-4">Quality</th>
                                        <th className="p-4">Date Added</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                                    {filteredFiles.map((file) => (
                                        <tr key={file.id} className="hover:bg-slate-850/50 transition">
                                            <td className="p-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                                                    <i className="fa-solid fa-file-video text-xs"></i>
                                                </div>
                                                <span className="font-bold text-white truncate max-w-xs">{file.name}</span>
                                            </td>
                                            <td className="p-4 text-slate-300">{file.size}</td>
                                            <td className="p-4">
                                                <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] border border-blue-500/20">{file.quality}</span>
                                            </td>
                                            <td className="p-4 text-slate-400">{file.date}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${file.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                    {file.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button onClick={() => copyLink(file.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition">
                                                    <i className="fa-solid fa-link mr-1"></i> Copy Link
                                                </button>
                                                <a href={`/file/${file.id}`} target="_blank" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold inline-block transition">
                                                    <i className="fa-solid fa-eye"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}