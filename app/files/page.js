'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getStoredFiles, deleteStoredFile } from '../utils/fileStore';
import { IconFolder, IconRefresh, IconInbox, IconExternal, IconTrash } from '../components/Icons';

function statusBadge(status) {
    const s = String(status || 'Active').toLowerCase();
    if (s.includes('fail') || s.includes('error')) return 'ms-badge-red';
    if (s.includes('partial')) return 'ms-badge-amber';
    if (s.includes('process') || s.includes('pending') || s.includes('upload')) return 'ms-badge-blue';
    return 'ms-badge-green';
}

export default function FilesPage() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFiles = async () => {
        setLoading(true);
        const data = await getStoredFiles();
        setFiles(data);
        setLoading(false);
    };

    useEffect(() => {
        loadFiles();
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
        const success = await deleteStoredFile(id);
        if (success) {
            loadFiles();
        } else {
            alert('Failed to delete file.');
        }
    };

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconFolder size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Cloud File Manager</h1>
                    </div>
                    <button onClick={loadFiles} className="ms-btn ms-btn-ghost ms-btn-sm shrink-0">
                        <IconRefresh size={14} className={loading ? 'ms-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {loading ? (
                        <div className="ms-card p-4 sm:p-6 space-y-3">
                            <div className="ms-skeleton h-10 w-full" />
                            <div className="ms-skeleton h-10 w-full" />
                            <div className="ms-skeleton h-10 w-full" />
                            <p className="ms-muted text-xs text-center">Loading files from Supabase…</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="ms-card p-8 sm:p-12 text-center space-y-2">
                            <span className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
                                <IconInbox size={22} />
                            </span>
                            <p className="text-sm font-semibold text-white">No files found</p>
                            <p className="ms-muted text-xs">No files found in cloud database. Upload some files first!</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="ms-card overflow-hidden hidden md:block">
                                <div className="ms-scroll-x">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400">
                                                <th className="p-4 ms-h2">File Name</th>
                                                <th className="p-4 ms-h2">Quality</th>
                                                <th className="p-4 ms-h2">Size</th>
                                                <th className="p-4 ms-h2">Date</th>
                                                <th className="p-4 ms-h2">Status</th>
                                                <th className="p-4 ms-h2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {files.map((file) => (
                                                <tr key={file.id} className="hover:bg-slate-800/30 transition">
                                                    <td className="p-4 font-medium text-white max-w-xs truncate">{file.name}</td>
                                                    <td className="p-4"><span className="ms-badge ms-badge-blue">{file.quality || '1080p'}</span></td>
                                                    <td className="p-4 text-slate-400">{file.size || 'N/A'}</td>
                                                    <td className="p-4 text-slate-400">{file.date}</td>
                                                    <td className="p-4"><span className={`ms-badge ${statusBadge(file.status)}`}>{file.status || 'Active'}</span></td>
                                                    <td className="p-4">
                                                        <div className="flex justify-end gap-2">
                                                            <a href={file.url} target="_blank" rel="noreferrer" className="ms-btn ms-btn-primary ms-btn-sm">
                                                                <IconExternal size={14} /> View
                                                            </a>
                                                            <button onClick={() => handleDelete(file.id)} className="ms-btn ms-btn-danger ms-btn-sm">
                                                                <IconTrash size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden space-y-3">
                                {files.map((file) => (
                                    <div key={file.id} className="ms-card p-4 space-y-3">
                                        <p className="text-sm font-semibold text-white break-words">{file.name}</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="ms-badge ms-badge-blue">{file.quality || '1080p'}</span>
                                            <span className={`ms-badge ${statusBadge(file.status)}`}>{file.status || 'Active'}</span>
                                        </div>
                                        <p className="ms-muted text-xs">{file.size || 'N/A'} · {file.date}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <a href={file.url} target="_blank" rel="noreferrer" className="ms-btn ms-btn-primary ms-btn-sm flex-1">
                                                <IconExternal size={14} /> View
                                            </a>
                                            <button onClick={() => handleDelete(file.id)} className="ms-btn ms-btn-danger ms-btn-sm flex-1">
                                                <IconTrash size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
