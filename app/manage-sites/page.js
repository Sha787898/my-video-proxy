'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function ManageSitesPage() {
    const [sites, setSites] = useState([
        { id: 1, domain: 'multishows.top', status: 'Active', addedDate: '2026-10-01', views: '1.2K' },
        { id: 2, domain: 'streamhub.net', status: 'Active', addedDate: '2026-10-05', views: '840' },
        { id: 3, domain: 'animebangla.org', status: 'Pending', addedDate: '2026-10-20', views: '0' },
    ]);
    const [newDomain, setNewDomain] = useState('');

    const handleAddSite = (e) => {
        e.preventDefault();
        if (!newDomain.trim()) return;

        const newItem = {
            id: Date.now(),
            domain: newDomain.trim(),
            status: 'Active',
            addedDate: new Date().toISOString().split('T')[0],
            views: '0'
        };

        setSites([newItem, ...sites]);
        setNewDomain('');
    };

    const handleDelete = (id) => {
        setSites(sites.filter(s => s.id !== id));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase font-mono">Manage Authorized Sites</h1>
                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg">
                        Total Domains: {sites.length}
                    </span>
                </header>

                <main className="p-6 lg:p-10 space-y-6 max-w-5xl">
                    {/* Add Domain Form */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-4">Add New Allowed Domain</h2>
                        <form onSubmit={handleAddSite} className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="text"
                                placeholder="e.g. yourdomain.com"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 transition"
                            />
                            <button 
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-plus"></i> Whitelist Domain
                            </button>
                        </form>
                    </div>

                    {/* Sites List Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase font-mono text-slate-400">
                                        <th className="p-4">Domain Name</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Added Date</th>
                                        <th className="p-4">Proxy Views</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                                    {sites.map((site) => (
                                        <tr key={site.id} className="hover:bg-slate-850/50 transition">
                                            <td className="p-4 font-bold text-white flex items-center gap-2">
                                                <i className="fa-solid fa-globe text-blue-400"></i> {site.domain}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                                                    {site.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400">{site.addedDate}</td>
                                            <td className="p-4 text-slate-300">{site.views}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDelete(site.id)} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition">
                                                    <i className="fa-solid fa-trash mr-1"></i> Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}