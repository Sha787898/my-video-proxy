'use client';

import Sidebar from '../components/sidebar';

export default function AccountSettingsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Account & API Settings</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Profile & API Credentials</h2>
                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Administrator Email</label>
                                <input type="email" readOnly value="admin@multiserver.top" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">Master API Key</label>
                                <div className="flex gap-2">
                                    <input type="password" readOnly value="ms_live_998374a819b2c77f" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300" />
                                    <button onClick={() => alert('API Key Copied!')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold">Copy</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}