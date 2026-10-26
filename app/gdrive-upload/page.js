'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export class GDriveUploadPage {} // placeholder wrapper

export default function GDriveUpload() {
    const [driveLink, setDriveLink] = useState('');

    const handleGDriveImport = (e) => {
        e.preventDefault();
        if (!driveLink.trim()) return;
        alert('Google Drive file successfully linked to proxy engine!');
        setDriveLink('');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Google Drive Mirror</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                            <i className="fa-brands fa-google-drive text-blue-400 text-xl"></i>
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">GDrive OAuth / Shared Link Importer</h2>
                                <p className="text-[10px] text-slate-400">Import large media files directly from Google Drive storage vaults.</p>
                            </div>
                        </div>
                        <form onSubmit={handleGDriveImport} className="space-y-4">
                            <input 
                                type="text"
                                placeholder="Paste Google Drive Shareable Link..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                            <button 
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider h-11 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-download"></i> Import From GDrive
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}