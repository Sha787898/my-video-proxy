'use client';

import Sidebar from '../components/Sidebar';
import { IconChart, IconDownload, IconActivity, IconZap } from '../components/Icons';

export default function AnalyticsPage() {
    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconChart size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Bandwidth &amp; Traffic Analytics</h1>
                    </div>
                    <span className="ms-badge ms-badge-green shrink-0 hidden sm:inline-flex">
                        <span className="ms-pulse-dot" /> Real-time Telemetry Active
                    </span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <span className="ms-badge ms-badge-green sm:hidden">
                        <span className="ms-pulse-dot" /> Real-time Telemetry Active
                    </span>

                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <p className="ms-h2">Total Bandwidth (7 Days)</p>
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <IconDownload size={18} />
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mt-3">1.84 TB</h3>
                            <span className="text-xs text-emerald-400 mt-1 inline-block">+14% vs last week</span>
                        </div>
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <p className="ms-h2">Peak Request Rate</p>
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <IconActivity size={18} />
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mt-3">450 req/s</h3>
                            <span className="text-xs text-blue-400 mt-1 inline-block">Stable Node Load</span>
                        </div>
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between gap-2">
                                <p className="ms-h2">Cache Hit Ratio</p>
                                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                    <IconZap size={18} />
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mt-3">98.2%</h3>
                            <span className="text-xs text-emerald-400 mt-1 inline-block">Optimal Performance</span>
                        </div>
                    </div>

                    {/* Simulated Traffic Chart Box */}
                    <div className="ms-card p-4 sm:p-6 space-y-4">
                        <h2 className="ms-h2">Traffic Spike Overview (Hourly)</h2>
                        <div className="h-56 sm:h-64 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 pb-8 sm:pb-8 flex items-end justify-between gap-1 sm:gap-2">
                            {[40, 65, 30, 85, 95, 60, 45, 90, 100, 75, 55, 80].map((val, idx) => (
                                <div key={idx} className="flex-1 min-w-0 bg-slate-900 hover:bg-blue-600 transition rounded-t flex flex-col justify-end items-center group relative h-full">
                                    <div
                                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t transition-all duration-500 group-hover:brightness-125"
                                        style={{ height: `${val}%` }}
                                    ></div>
                                    <span className="absolute -bottom-6 text-[9px] text-slate-500 group-hover:text-slate-300">{idx * 2}h</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
