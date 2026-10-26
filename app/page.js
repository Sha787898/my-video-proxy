'use client';

import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
            {/* Top Navigation */}
            <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <i className="fa-solid fa-server text-white text-sm"></i>
                        </div>
                        <span className="text-base font-extrabold tracking-wide text-white uppercase font-mono">
                            Multi<span className="text-blue-500">Server</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20">
                            Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Next-Gen Video Proxy & Storage Infrastructure
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                        Lightning Fast Video Streaming & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Storage Management</span>
                    </h1>

                    <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Deploy nodes, manage high-definition media libraries, generate automated embed codes, and monitor bandwidth telemetry in real-time.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                        <Link href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2">
                            <span>Open Dashboard</span> <i className="fa-solid fa-arrow-right text-[10px]"></i>
                        </Link>
                        <Link href="/remote-upload" className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2">
                            <i className="fa-solid fa-wand-magic-sparkles text-blue-400"></i> Embed Generator
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
                &copy; 2026 MultiServer.top &mdash; All Rights Reserved.
            </footer>
        </div>
    );
}