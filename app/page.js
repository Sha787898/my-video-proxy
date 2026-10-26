'use client';

import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glow Effect */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-3xl w-full text-center space-y-6 relative z-10">
                {/* Logo / Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-300 tracking-wide">MultiServer Cloud & Stream Node</span>
                </div>

                {/* Heading */}
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                    High-Performance <span className="text-blue-500">Cloud Storage</span> & Streaming Engine
                </h1>

                {/* Description */}
                <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                    Secure file management, lightning-fast video delivery nodes, remote embed generators, and advanced Telegram bot integrations all in one place.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                    <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie"></i> Go to Dashboard
                    </Link>
                    <Link href="/remote-upload" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3 rounded-xl text-xs font-semibold transition flex items-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles text-blue-400"></i> MultiServer Embed Generator
                    </Link>
                </div>
            </div>
        </div>
    );
}