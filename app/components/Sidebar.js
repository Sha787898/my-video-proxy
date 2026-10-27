'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [uploadOpen, setUploadOpen] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path) => pathname === path;

    return (
        <>
            {/* Mobile Top Toggle Bar */}
            <div className="lg:hidden h-16 bg-slate-950 border-b border-slate-900 px-4 flex items-center justify-between sticky top-0 z-50 font-mono">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg">MS</div>
                    <span className="text-xs font-black text-white tracking-wider uppercase">MULTISERVER</span>
                </Link>
                <button 
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                >
                    {mobileOpen ? '✕ Close' : '☰ Menu'}
                </button>
            </div>

            {/* Sidebar Container */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-900 flex flex-col h-screen font-mono select-none transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                
                {/* Logo Header (Desktop) */}
                <div className="h-16 border-b border-slate-900 px-6 hidden lg:flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-600/30">
                            MS
                        </div>
                        <span className="text-sm font-black tracking-widest text-white uppercase">
                            MULTISERVER
                        </span>
                    </Link>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">PRO</span>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 text-xs">
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition ${isActive('/dashboard') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}>
                        <span>📊</span> Dashboard
                    </Link>

                    <Link href="/file-manager" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition ${isActive('/file-manager') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}>
                        <span>🗂️</span> File Manager
                    </Link>

                    {/* Upload Options Dropdown */}
                    <div className="space-y-1">
                        <button 
                            onClick={() => setUploadOpen(!uploadOpen)} 
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-900/50 transition"
                        >
                            <div className="flex items-center gap-3">
                                <span>⬆️</span> Upload Options
                            </div>
                            <span className={`transition-transform text-[10px] ${uploadOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {uploadOpen && (
                            <div className="pl-4 space-y-1 border-l border-slate-800 ml-4 my-1">
                                <Link href="/remote-upload" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg font-bold transition ${isActive('/remote-upload') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
                                    Remote Upload
                                </Link>
                                <Link href="/drive-upload" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg font-bold transition ${isActive('/gdrive-upload') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
                                    GDrive Mirror
                                </Link>
                                <Link href="/web-upload" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg font-bold transition ${isActive('/web-upload') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
                                    Direct Web Upload
                                </Link>
                                <Link href="/processing-files" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg font-bold transition ${isActive('/processing-files') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
                                    Processing Queue
                                </Link>
                            </div>
                        )}
                    </div>

                    <Link href="/embed-generator" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition ${isActive('/embed-generator') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}>
                        <span>⚡</span> Embed Generator
                    </Link>

                    <Link href="/analytics" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition ${isActive('/analytics') ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'}`}>
                        <span>📈</span> Analytics
                    </Link>

                    {/* Settings Dropdown */}
                    <div className="space-y-1 pt-2">
                        <button 
                            onClick={() => setSettingsOpen(!settingsOpen)} 
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-900/50 transition"
                        >
                            <div className="flex items-center gap-3">
                                <span>⚙️</span> Settings
                            </div>
                            <span className={`transition-transform text-[10px] ${settingsOpen ? 'rotate-180' : ''}`}>▼</span>
                        </button>

                        {settingsOpen && (
                            <div className="pl-4 space-y-1 border-l border-slate-800 ml-4 my-1">
                                <Link href="/manage-sites" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg font-bold transition ${isActive('/manage-sites') ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
                                    Manage Sites & Keys
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}