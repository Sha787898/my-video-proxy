'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [uploadOpen, setUploadOpen] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(true);

    const isActive = (path) => pathname === path;

    return (
        <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between h-screen sticky top-0 shrink-0 font-mono select-none">
            <div className="p-4 space-y-6 overflow-y-auto">
                {/* Logo Section */}
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 text-xs">
                        MS
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white tracking-wider">MULTISERVER</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">PRO</span>
                    </div>
                </div>

                {/* Main Navigation */}
                <nav className="space-y-1">
                    <Link 
                        href="/dashboard" 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive('/dashboard') ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <span>📊</span> Dashboard
                    </Link>

                    <Link 
                        href="/file-manager" 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive('/file-manager') ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <span>📁</span> File Manager
                    </Link>

                    {/* Upload Options Accordion */}
                    <div className="pt-2">
                        <button 
                            onClick={() => setUploadOpen(!uploadOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition"
                        >
                            <span className="flex items-center gap-2">⬆️ Upload Options</span>
                            <span className="text-[9px]">{uploadOpen ? '▲' : '▼'}</span>
                        </button>

                        {uploadOpen && (
                            <div className="mt-1 ml-3 space-y-1 border-l border-slate-800/80 pl-3">
                                <Link 
                                    href="/remote-upload" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/remote-upload') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>🌐</span> Remote Upload
                                </Link>

                                <Link 
                                    href="/gdrive-upload" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/gdrive-upload') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>☁️</span> GDrive Mirror
                                </Link>

                                <Link 
                                    href="/drive-upload" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/drive-upload') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>🆔</span> GDrive File ID
                                </Link>

                                <Link 
                                    href="/web-upload" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/web-upload') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>💻</span> Direct Web Upload
                                </Link>

                                <Link 
                                    href="/processing-files" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/processing-files') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>⚙️</span> Processing Queue
                                </Link>
                            </div>
                        )}
                    </div>

                    <Link 
                        href="/embed-generator" 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition mt-2 ${
                            isActive('/embed-generator') ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <span>⚡</span> Embed Generator
                    </Link>

                    <Link 
                        href="/analytics" 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive('/analytics') ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <span>📈</span> Analytics
                    </Link>

                    {/* Settings Accordion */}
                    <div className="pt-2">
                        <button 
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition"
                        >
                            <span className="flex items-center gap-2">⚙️ Settings</span>
                            <span className="text-[9px]">{settingsOpen ? '▲' : '▼'}</span>
                        </button>

                        {settingsOpen && (
                            <div className="mt-1 ml-3 space-y-1 border-l border-slate-800/80 pl-3">
                                <Link 
                                    href="/manage-sites" 
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                                        isActive('/manage-sites') ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <span>🔑</span> Manage Sites & Keys
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>
            </div>

            <div className="p-4 border-t border-slate-900">
                <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">MultiServer Nodes Active</span>
                </div>
            </div>
        </aside>
    );
}