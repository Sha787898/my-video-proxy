'use client';

export default function AnalyticsPage() {
    return (
        <div className="p-4 lg:p-6 pb-12 max-w-7xl mx-auto w-full space-y-6">
            {/* Header Title */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-chart-simple text-blue-500"></i> Platform Analytics
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">Real-time audience insights, stream views, and bandwidth consumption.</p>
                </div>
                <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold">
                    Live Telemetry Active
                </span>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lifetime Views</p>
                        <h3 className="text-3xl font-extrabold text-white mt-1">2,793</h3>
                        <span className="text-xs text-purple-400 font-semibold mt-2 inline-block"><i className="fa-solid fa-arrow-trend-up mr-1"></i> +12% this month</span>
                    </div>
                    <div className="w-14 h-14 bg-purple-600/15 text-purple-400 rounded-2xl flex items-center justify-center text-2xl border border-purple-500/20">
                        <i className="fa-solid fa-eye"></i>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Plays</p>
                        <h3 className="text-3xl font-extrabold text-white mt-1">2,518</h3>
                        <span className="text-xs text-blue-400 font-semibold mt-2 inline-block"><i className="fa-solid fa-arrow-trend-up mr-1"></i> +8% this week</span>
                    </div>
                    <div className="w-14 h-14 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center text-2xl border border-blue-500/20">
                        <i className="fa-solid fa-play"></i>
                    </div>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Downloads</p>
                        <h3 className="text-3xl font-extrabold text-white mt-1">275</h3>
                        <span className="text-xs text-emerald-400 font-semibold mt-2 inline-block"><i className="fa-solid fa-arrow-trend-up mr-1"></i> Stable flow</span>
                    </div>
                    <div className="w-14 h-14 bg-emerald-600/15 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl border border-emerald-500/20">
                        <i className="fa-solid fa-download"></i>
                    </div>
                </div>
            </div>

            {/* Analytics Graph Placeholder Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 lg:p-8 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <h3 className="text-base font-bold text-white">Streaming Traffic Overview (30 Days)</h3>
                    <span className="text-xs text-slate-400 font-mono">MultiServer Node #1</span>
                </div>
                <div className="h-64 flex items-center justify-center bg-slate-900/60 rounded-xl border border-slate-700/60 text-slate-500 text-xs font-mono">
                    [ Interactive Chart.js Telemetry Graph Loaded ]
                </div>
            </div>
        </div>
    );
}