'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function EmbedGeneratorPage() {
    const [links, setLinks] = useState('');
    const [embeds, setEmbeds] = useState('');

    const handleGenerate = (e) => {
        e.preventDefault();
        const lines = links.split('\n');
        let generated = lines.map(line => {
            return `<iframe src="https://multishows.top/embed/${btoa(line.trim())}" width="100%" height="400px" frameborder="0" allowfullscreen></iframe>`;
        }).join('\n\n');
        setEmbeds(generated);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase">Embed Generator</h1>
                </header>

                <main className="p-6 lg:p-10 max-w-3xl space-y-6">
                    <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Remote Link & Embed Parser</h2>
                        <textarea 
                            rows="6"
                            placeholder="Paste links (one per line, e.g. Title | https://...)"
                            value={links}
                            onChange={(e) => setLinks(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                        />
                        <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25">
                            Generate MultiServer Embeds
                        </button>
                    </form>

                    {embeds && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
                            <label className="text-[10px] text-slate-400 uppercase">Generated Embed Codes</label>
                            <textarea 
                                rows="6"
                                readOnly
                                value={embeds}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-emerald-400 font-mono"
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}