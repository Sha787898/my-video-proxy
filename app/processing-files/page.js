'use client';

import Sidebar from '../components/sidebar';

export default function ProcessingFilesPage() {
    const jobs = [
        { id: 'p1', name: 'Anime_Series_Batch_01.mkv', progress: 74, speed: '24.5 fps', status: 'Encoding (x265)' },
        { id: 'p2', name: 'Movie_Remux_4K_UHD.ts', progress: 32, speed: '12.1 fps', status: 'Audio Syncing' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Active Processing Queue</h1>
                    <span className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">Jobs: {jobs.length}</span>
                </header>
                <main className="p-6 lg:p-10 max-w-5xl space-y-4">
                    {jobs.map(job => (
                        <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl font-mono">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white"><i className="fa-solid fa-rotate fa-spin text-blue-500 mr-2"></i>{job.name}</span>
                                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">{job.status}</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Progress: {job.progress}%</span>
                                <span>Speed: {job.speed}</span>
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
}