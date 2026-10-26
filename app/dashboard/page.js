'use client';

export default function DashboardPage() {
    return (
        <div className="p-4 lg:p-6 pb-12 max-w-7xl mx-auto w-full space-y-6">
            {/* Top Greeting Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-wide">Welcome to MultiServer Dashboard</h2>
                    <p className="text-slate-400 text-xs mt-1">Monitor your video streaming bandwidth, active nodes, and storage usage in real-time.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Nodes Online
                    </span>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Files</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">1,248</h3>
                    <span className="text-[11px] text-blue-400 font-medium mt-2 inline-block">+12 today</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Views</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">2,793</h3>
                    <span className="text-[11px] text-emerald-400 font-medium mt-2 inline-block">+180 this week</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">Storage Used</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">142.5 GB</h3>
                    <span className="text-[11px] text-slate-400 font-medium mt-2 inline-block">Out of Unlimited</span>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase">Active Nodes</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">5 / 5</h3>
                    <span className="text-[11px] text-emerald-400 font-medium mt-2 inline-block">100% Operational</span>
                </div>
            </div>
        </div>
    );
}