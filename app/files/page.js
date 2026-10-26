'use client';

import { useState } from 'react';

export default function ManageFilesPage() {
    const [searchTerm, setSearchTerm] = useState('');

    // ডেমো ফাইল লিস্ট (আপনার ব্যাকএন্ড বা API আসার আগে প্রিভিউ দেখানোর জন্য)
    const filesList = [
        { id: 'ms_abc123', name: 'Naruto Shippuden Episode 365 [1080p].mkv', size: '1.2 GB', format: 'MKV', date: 'Oct 26, 2026' },
        { id: 'ms_xyz789', name: 'Chainsaw Man Movie Reze Arc [480p].mp4', size: '650 MB', format: 'MP4', date: 'Oct 25, 2026' },
        { id: 'ms_def456', name: 'That Time I Got Reincarnated as a Slime S3.mkv', size: '1.8 GB', format: 'MKV', date: 'Oct 24, 2026' },
    ];

    const filteredFiles = filesList.filter(file => 
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCopy = (text, btnId) => {
        navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check text-xs"></i> Copied';
            btn.className = 'px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold transition';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.className = 'px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm';
            }, 2000);
        }
    };

    return (
        <div className="p-4 lg:p-6 pb-12 max-w-7xl mx-auto w-full space-y-6">
            {/* Header & Search Bar */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-folder-open text-blue-500"></i> Manage Files
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">View, search, and copy embed/download links for all stored media.</p>
                </div>

                <div className="w-full md:w-72">
                    <input 
                        type="text" 
                        placeholder="Search files..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 shadow-inner"
                    />
                </div>
            </div>

            {/* Files List Table / Cards */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-700 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stored Media Files ({filteredFiles.length})</h3>
                </div>

                <div className="divide-y divide-slate-700/60">
                    {filteredFiles.length > 0 ? (
                        filteredFiles.map((file, idx) => {
                            const embedUrl = `https://multiserver.top/embed/${file.id}`;
                            const downloadUrl = `https://multiserver.top/file/${file.id}`;

                            return (
                                <div key={file.id} className="p-4 lg:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-slate-750 transition">
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-slate-900 text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-700">
                                            <i className="fa-solid fa-file-video text-base"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{file.format}</span>
                                                <span><i className="fa-solid fa-hard-drive mr-1"></i> {file.size}</span>
                                                <span><i className="fa-solid fa-calendar mr-1"></i> {file.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-end">
                                        <button 
                                            id={`btn-dl-${idx}`} 
                                            onClick={() => handleCopy(downloadUrl, `btn-dl-${idx}`)}
                                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                                        >
                                            Copy DL Link
                                        </button>
                                        <button 
                                            id={`btn-emb-${idx}`} 
                                            onClick={() => handleCopy(embedUrl, `btn-emb-${idx}`)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
                                        >
                                            Copy Embed
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center text-slate-500 text-xs">
                            No files found matching your search.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}