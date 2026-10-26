'use client';

import Sidebar from '../components/sidebar';

export default function MoreSettingsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">System & Node Settings</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Advanced Proxy Parameters</h2>
                        <div className="space-y-3 text-xs">
                            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span className="text-slate-200">Anti-Adblocker Script Verification</span>
                                <input type="checkbox" defaultChecked className="accent-blue-600 w-4 h-4" />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span className="text-slate-200">Edge Caching Aggressive Mode</span>
                                <input type="checkbox" defaultChecked className="accent-blue-600 w-4 h-4" />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                <span className="text-slate-200">Auto-Remux Incoming MKV to MP4</span>
                                <input type="checkbox" className="accent-blue-600 w-4 h-4" />
                            </label>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}