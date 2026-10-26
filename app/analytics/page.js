'use client';

import Sidebar from '../components/Sidebar';

export default function AnalyticsPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Bandwidth & Traffic Analytics</h1>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Real-time Telemetry Active
                    </div>
                </header>

                <main className="p-6 lg:p-10 space-y-6 max-w-6xl">
                    {/* Top Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                            <p className="text-xs text-slate-400 font-mono uppercase">Total Bandwidth (7 Days)</p>
                            <h3 className="text-2xl font-extrabold text-white mt-1">1.84 TB</h3>
                            <span className="text-[10px] text-emerald-400 font-mono mt-2 inline-block">+14% vs last week</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                            <p className="text-xs text-slate-400 font-mono uppercase">Peak Request Rate</p>
                            <h3 className="text-2xl font-extrabold text-white mt-1">450 req/s</h3>
                            <span className="text-[10px] text-blue-400 font-mono mt-2 inline-block">Stable Node Load</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                            <p className="text-xs text-slate-400 font-mono uppercase">Cache Hit Ratio</p>
                            <h3 className="text-2xl font-extrabold text-white mt-1">98.2%</h3>
                            <span className="text-[10px] text-emerald-400 font-mono mt-2 inline-block">Optimal Performance</span>
                        </div>
                    </div>

                    {/* Simulated Traffic Chart Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Traffic Spike Overview (Hourly)</h2>
                        <div className="h-64 w-full bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-end justify-between gap-2">
                            {[40, 65, 30, 85, 95, 60, 45, 90, 100, 75, 55, 80].map((val, idx) => (
                                <div key={idx} className="flex-1 bg-slate-900 hover:bg-blue-600 transition rounded-t flex flex-col justify-end items-center group relative h-full">
                                    <div 
                                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t transition-all duration-500 group-hover:brightness-125" 
                                        style={{ height: `${val}%` }}
                                    ></div>
                                    <span className="absolute -bottom-6 text-[9px] font-mono text-slate-500 group-hover:text-slate-300">{idx * 2}h</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}