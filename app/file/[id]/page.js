'use client';

import { use, Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function FileDownloadContent({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || 'default';

    const [fileData, setFileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFileRecord() {
            if (id && id !== 'default') {
                const { data, error } = await supabase
                    .from('files')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!error && data) {
                    setFileData(data);
                }
            }
            setLoading(false);
        }
        fetchFileRecord();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-blue-400 text-xs font-mono animate-pulse">
                Fetching Secure File Node...
            </div>
        );
    }

    // ডাটাবেজ থেকে ডেটা না পেলে ফলব্যাক বা ডিফল্ট মান
    const fileName = fileData?.name || 'MultiServer_Video_Media_Node_File.mkv';
    const fileSize = fileData?.size || '1.45 GB';
    const fileQuality = fileData?.quality || '1080p FHD';
    const directDownloadUrl = fileData?.original_url || '#';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-mono">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-2xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 lg:p-8 shadow-2xl relative z-10 space-y-6">
                <div className="flex items-start gap-4 pb-5 border-b border-slate-700">
                    <div className="w-14 h-14 bg-blue-600/15 text-blue-400 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-blue-500/20">
                        📁
                    </div>
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded inline-block mb-1">
                            File ID: {id}
                        </span>
                        <h1 className="text-lg font-bold text-white truncate">{fileName}</h1>
                        <p className="text-xs text-slate-400 mt-1">Size: <span className="text-slate-200 font-medium">{fileSize}</span> | Quality: <span className="text-emerald-400 font-semibold">{fileQuality}</span></p>
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
                        href={directDownloadUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
                    >
                        📥 Download File (Direct)
                    </a>
                    <Link 
                        href="/remote-upload" 
                        className="bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 h-11 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                    >
                        ⚡ MultiServer Embed
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