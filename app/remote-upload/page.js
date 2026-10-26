'use client';

import { useState } from 'react';

export default function RemoteUploadPage() {
    const [inputLinks, setInputLinks] = useState('');
    const [processedResults, setProcessedResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // LoadMyFile বা যেকোনো এমবেড লিংক পার্স করে MultiServer প্লেয়ার লিংকে রূপান্তর করার লজিক
    const handleGenerateEmbeds = () => {
        if (!inputLinks.trim()) return;
        setIsLoading(true);

        setTimeout(() => {
            const lines = inputLinks.split('\n').filter(line => line.trim() !== '');
            const results = lines.map((line, index) => {
                let cleanLink = line.trim();
                let title = `MultiServer Video Stream #${index + 1}`;
                
                // যদি লিংকের ভেতরে ট্যাগ বা টাইটেল থাকে সেপারেট করা
                if (line.includes('|')) {
                    const parts = line.split('|');
                    title = parts[0].trim();
                    cleanLink = parts[1].trim();
                }

                // আইডি এক্সট্রাক্ট করা
                const matchId = cleanLink.match(/\/([a-zA-Z0-9-_]{8,})\/?$/);
                const fileId = matchId ? matchId[1] : 'ms_' + Math.random().toString(36).substring(2, 10);

                const embedUrl = `https://multiserver.top/embed/${fileId}`;
                const watchUrl = `https://multiserver.top/file/${fileId}`;

                return {
                    id: fileId,
                    title: title,
                    original: cleanLink,
                    embed: embedUrl,
                    watch: watchUrl,
                    iframeCode: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen></iframe>`
                };
            });

            setProcessedResults(results);
            setIsLoading(false);
        }, 600);
    };

    const copyToClipboard = (text, btnId) => {
        navigator.clipboard.writeText(text);
        const btn = document.getElementById(btnId);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check text-xs"></i> Copied';
            btn.className = 'px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold transition';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.className = 'px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm';
            }, 2000);
        }
    };

    return (
        <div className="p-4 lg:p-6 pb-12 max-w-4xl mx-auto w-full relative space-y-6">
            {/* Header Notice Card */}
            <div className="bg-blue-900/20 border border-blue-500/30 text-blue-400 px-4 py-3.5 rounded-xl flex items-start sm:items-center gap-3 shadow-sm">
                <i className="fa-solid fa-circle-info text-lg mt-0.5 sm:mt-0 flex-shrink-0"></i>
                <span className="text-[13px] sm:text-sm font-medium">MultiServer Embed Generator: Paste LoadMyFile or external player links below to instantly convert and generate your custom MultiServer embed codes.</span>
            </div>

            {/* Input Box Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 sm:p-6 lg:p-7 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2.5">
                    <i className="fa-solid fa-link text-blue-500 text-lg"></i> Remote Link & Embed Parser
                </h3>
                
                <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Paste Links (One per line, e.g. <span className="text-slate-300 font-mono">Title | https://...</span> or just URL)
                    </label>
                    <textarea 
                        rows="5" 
                        value={inputLinks}
                        onChange={(e) => setInputLinks(e.target.value)}
                        placeholder="Naruto Shippuden E365 | https://loadmyfile.com/file/xyz123&#10;https://loadmyfile.com/embed/abc789" 
                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs sm:text-sm font-mono rounded-xl p-3.5 focus:outline-none focus:border-blue-500 transition-colors shadow-inner custom-scrollbar"
                    ></textarea>
                </div>

                <button 
                    onClick={handleGenerateEmbeds}
                    disabled={isLoading}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                    {isLoading ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin text-sm"></i>
                            <span>Generating Embeds...</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-wand-magic-sparkles text-sm"></i>
                            <span>Generate MultiServer Embeds</span>
                        </>
                    )}
                </button>
            </div>

            {/* Generated Results Section */}
            {processedResults.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Generated Links & Copy Section ({processedResults.length})</h4>
                        <button 
                            onClick={() => setProcessedResults([])} 
                            className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                        >
                            Clear Results
                        </button>
                    </div>

                    <div className="space-y-3">
                        {processedResults.map((res, idx) => (
                            <div key={res.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                                    <span className="text-xs font-bold text-white truncate"><span className="text-blue-400 font-mono mr-1.5">#{idx + 1}</span> {res.title}</span>
                                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">MultiServer Node</span>
                                </div>

                                {/* Embed Link */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Embed Link</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={res.embed} readOnly className="w-full bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
                                        <button id={`btn-emb-${idx}`} onClick={() => copyToClipboard(res.embed, `btn-emb-${idx}`)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm">Copy</button>
                                    </div>
                                </div>

                                {/* Iframe Code */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Iframe HTML Code</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={res.iframeCode} readOnly className="w-full bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none" />
                                        <button id={`btn-ifr-${idx}`} onClick={() => copyToClipboard(res.iframeCode, `btn-ifr-${idx}`)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm">Copy</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}