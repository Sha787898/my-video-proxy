'use client';

import Sidebar from '../components/Sidebar';
import { IconSliders } from '../components/Icons';

export default function MoreSettingsPage() {
    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center"><IconSliders size={18} /></span>
                        <h1 className="ms-h1 truncate">System &amp; node settings</h1>
                    </div>
                </header>
                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-card ms-fade-up p-4 sm:p-6 space-y-4 max-w-3xl">
                        <h2 className="ms-h2">Advanced proxy parameters</h2>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between gap-3 p-3 min-h-[48px] bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                                <span className="text-sm text-slate-200 min-w-0">Anti-Adblocker Script Verification</span>
                                <input type="checkbox" defaultChecked className="ms-check shrink-0" />
                            </label>
                            <label className="flex items-center justify-between gap-3 p-3 min-h-[48px] bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                                <span className="text-sm text-slate-200 min-w-0">Edge Caching Aggressive Mode</span>
                                <input type="checkbox" defaultChecked className="ms-check shrink-0" />
                            </label>
                            <label className="flex items-center justify-between gap-3 p-3 min-h-[48px] bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                                <span className="text-sm text-slate-200 min-w-0">Auto-Remux Incoming MKV to MP4</span>
                                <input type="checkbox" className="ms-check shrink-0" />
                            </label>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
