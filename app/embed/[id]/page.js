'use client';

import { use } from 'react';

export default function EmbedPlayerPage({ params }) {
    // Dynamic Route Params Extract
    const { id } = use(params);

    return (
        <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative group">
            {/* MultiServer Custom Video Player Framework */}
            <video 
                controls 
                autoPlay={false}
                className="w-full h-full object-contain focus:outline-none"
                poster="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop"
            >
                <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
                Your browser does not support video playback.
            </video>

            {/* Top Branding Overlay */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 opacity-80 group-hover:opacity-100 transition">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-200 tracking-wide font-mono">MultiServer Stream ({id})</span>
            </div>
        </div>
    );
}