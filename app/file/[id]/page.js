'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';

function FileDownloadContent({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || 'default';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative z-10 space-y-6">
                <div className="flex items-start gap-4 pb-5 border-b border-slate-700">
                    <div className="w-14 h-14 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-blue-500/20">
                        <i className="fa-solid fa-file-video"></i>
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded inline-block mb-1">
                            File ID: {id}
                        </span>
                        <h1 className="text-lg font-bold text-white truncate">MultiServer_Video_Media_Node_File.mkv</h1>
                        <p className="text-xs text-slate-400 mt-1">Size: <span className="text-slate-200 font-medium">1.45 GB</span> | Quality: <span className="text-emerald-400 font-semibold">1080p FHD</span></p>
                    </div>
                </div>

                <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative shadow-inner">
                    <iframe 
                        src={`/embed/${id}`} 
                        className="w-full h-full border-0" 
                        allowFullScreen
                    ></iframe>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a 
                        href="#" 
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg"
                    >
                        <i className="fa-solid fa-download text-sm"></i> Download File (Direct)
                    </a>
                    <Link 
                        href="/remote-upload" 
                        className="bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                        <i className="fa-solid fa-wand-magic-sparkles text-blue-400"></i> MultiServer Embed
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function FileDownloadPage({ params }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs font-mono">Loading File Node...</div>}>
            <FileDownloadContent params={params} />
        </Suspense>
    );
}