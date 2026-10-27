'use client';

import { use, Suspense, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function EmbedContent({ params }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || 'default';

    const [fileData, setFileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ১. অ্যাডব্লকার ও পপ-আপ প্রটেকশন লজিক
        const blockAds = () => {
            try {
                window.open = function() { return null; };
                const scripts = document.querySelectorAll('script');
                scripts.forEach(script => {
                    if (script.src && (script.src.includes('ads') || script.src.includes('pop') || script.src.includes('tracker'))) {
                        script.remove();
                    }
                });
            } catch (e) {
                console.error(e);
            }
        };
        blockAds();

        // ২. Supabase থেকে রিয়েল ফাইল ডাটা ফেচ করা
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
            <div className="w-screen h-screen bg-black flex items-center justify-center font-mono text-xs text-blue-400 animate-pulse">
                Initializing Secure MultiServer Stream Node...
            </div>
        );
    }

    // ভিডিও সোর্স: ডাটাবেজ থেকে পাওয়া আসল লিংক অথবা ফলব্যাক হিসেবে ডামি ভিডিও
    const videoSource = fileData?.original_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    const displayTitle = fileData?.name || `MultiServer Stream (${id})`;

    return (
        <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative group font-mono">
            <video 
                controls 
                autoPlay={false}
                playsInline
                className="w-full h-full object-contain focus:outline-none"
                poster="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop"
                src={videoSource}
            >
                Your browser does not support video playback.
            </video>

            {/* টপ লেফট ওয়াটারমার্ক বা টাইটেল */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 opacity-80 group-hover:opacity-100 transition shadow-2xl">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-200 tracking-wider truncate max-w-[250px]">{displayTitle}</span>
            </div>

            {/* অ্যাডব্লকার স্ট্যাটাস ব্যাজ */}
            <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold backdrop-blur-md shadow-2xl">
                🛡️ Adblocker Active
            </div>
        </div>
    );
}

export default function EmbedPlayerPage({ params }) {
    return (
        <Suspense fallback={<div className="w-screen h-screen bg-black flex items-center justify-center text-slate-400 text-xs font-mono">Loading Stream Node...</div>}>
            <EmbedContent params={params} />
        </Suspense>
    );
}