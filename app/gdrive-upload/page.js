'use client';

import { useState, useEffect } from 'react';
import { embedBase } from '../utils/embedOrigin';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { IconFolder, IconCloud, IconUpload, IconInfo, IconCheckCircle, IconAlert, IconCopy, IconRefresh, IconFilm, IconServer } from '../components/Icons';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function CopyRow({ label, value, onCopy, hint }) {
    return (
        <div className="space-y-1.5 min-w-0">
            <label className="ms-label">{label}</label>
            <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <input type="text" readOnly value={value} className="ms-input ms-code min-w-0 flex-1" />
                <button type="button" onClick={onCopy} className="ms-btn ms-btn-ghost ms-btn-block sm:w-auto!" aria-label={`Copy ${label}`}>
                    <IconCopy size={16} /> <span>Copy</span>
                </button>
            </div>
            {hint && <p className="ms-muted text-xs">{hint}</p>}
        </div>
    );
}

function statusBadge(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('complete') || s === 'done' || s === 'success') return 'ms-badge-green';
    if (s.includes('process') || s.includes('queue') || s.includes('pending')) return 'ms-badge-blue';
    if (s.includes('fail') || s.includes('error')) return 'ms-badge-red';
    return 'ms-badge-amber';
}

export default function GDriveUploadPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [folderUrl, setFolderUrl] = useState('');
    const [linksInput, setLinksInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);
            setLoadingAuth(false);
        }
        checkAuth();
    }, [router]);

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-blue-400">
                    <IconRefresh size={18} className="ms-spin" /> Checking authorization...
                </div>
            </div>
        );
    }

    // Append the folder link to the link queue
    const handleExtractFolder = () => {
        if (!folderUrl.trim()) return;

        // If it is a folder link or any valid Drive link, add it to the queue
        setLinksInput(prev => (prev ? prev + '\n' : '') + folderUrl.trim());
        setFolderUrl('');
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        
        // Filter out empty lines and placeholder links
        const cleanLinks = linksInput.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.includes('1xxxxxxx'));
        
        if (cleanLinks.length === 0) {
            alert('Please enter at least one valid Google Drive link.');
            return;
        }

        setIsLoading(true);
        setSuccessMsg('');
        setUploadedFiles([]);

        try {
            const payload = {
                links: cleanLinks.join('\n'),
                uploadType: 'gdrive',
                userId: user?.id || null
            };

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to process links');

            setSuccessMsg(`Completed! Successfully processed and queued ${data.count} file(s).` + (data.errors?.length ? ` (${data.errors.length} failed: ${data.errors[0].error})` : '') + (data.missingKeys?.length ? ` Missing API keys: ${data.missingKeys.join(', ')}` : ''));
            setUploadedFiles(data.files || []);
            setLinksInput('');
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Error: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Link copied to clipboard.');
    };

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconFolder size={18} /></span>
                        <h1 className="ms-h1 truncate">Google Drive Link Uploader</h1>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline truncate">{user?.email}</span>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    <div className="ms-alert ms-alert-blue">
                        <IconInfo size={18} className="shrink-0" />
                        <p className="min-w-0">Extract links from shared folders into the queue, or paste individual file links one per line.</p>
                    </div>

                    {successMsg && (
                        <div className="ms-alert ms-alert-green ms-fade-up">
                            <IconCheckCircle size={18} className="shrink-0" />
                            <p className="min-w-0 break-words">{successMsg}</p>
                        </div>
                    )}

                    <div className="ms-card p-4 sm:p-6 space-y-5">
                        <h2 className="ms-h2 flex items-center gap-2"><IconCloud size={16} /> Google Drive Bulk Link Mirror</h2>

                        <form onSubmit={handleBulkUpload} className="space-y-5">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                    <label className="ms-label">Extract from GDrive folder</label>
                                    <span className="text-[11px] text-blue-400 font-semibold">Auto-fills the link queue</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="url"
                                        value={folderUrl}
                                        onChange={(e) => setFolderUrl(e.target.value)}
                                        placeholder="https://drive.google.com/drive/folders/..."
                                        className="ms-input min-w-0 flex-1"
                                    />
                                    <button type="button" onClick={handleExtractFolder} className="ms-btn ms-btn-ghost ms-btn-block sm:w-auto!">
                                        <IconFolder size={16} /> Extract
                                    </button>
                                </div>
                                <p className="ms-muted text-xs">Paste a shared folder link and press Extract to add it to the queue below.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 border-t border-slate-800"></div>
                                <span className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">Or multiple links</span>
                                <div className="flex-1 border-t border-slate-800"></div>
                            </div>

                            <div className="space-y-2">
                                <label className="ms-label">Google Drive public links (one per line)</label>
                                <textarea
                                    rows={6}
                                    value={linksInput}
                                    onChange={(e) => setLinksInput(e.target.value)}
                                    placeholder={`https://drive.google.com/file/d/1xxxxxxx/view\nhttps://drive.google.com/file/d/2xxxxxxx/view`}
                                    className="ms-input ms-code leading-relaxed"
                                />
                                <p className="ms-muted text-xs">Links must be publicly shared. Placeholder links are ignored.</p>
                            </div>

                            <button type="submit" disabled={isLoading} className="ms-btn ms-btn-primary ms-btn-block">
                                {isLoading ? <IconRefresh size={16} className="ms-spin" /> : <IconUpload size={16} />}
                                {isLoading ? 'Processing...' : 'Upload Links'}
                            </button>
                        </form>
                    </div>

                    {uploadedFiles.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="ms-h2 px-1">Queued files ({uploadedFiles.length})</h2>

                            {uploadedFiles.map((file) => (
                                <div key={file.id} className="ms-card p-4 sm:p-6 space-y-4 ms-fade-up">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><IconFilm size={18} /></span>
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-white break-words">{file.name}</h3>
                                                <p className="ms-muted text-xs mt-0.5">Status: {file.status} | Size: {file.size}</p>
                                            </div>
                                        </div>
                                        <span className={`ms-badge ${statusBadge(file.status)} self-start sm:self-auto`}>{file.status}</span>
                                    </div>

                                    {file.db_error && (
                                        <div className="ms-alert ms-alert-red">
                                            <IconAlert size={16} className="shrink-0" />
                                            <p className="min-w-0 break-words">Database: {file.db_error}</p>
                                        </div>
                                    )}

                                    <CopyRow
                                        label="Download page"
                                        value={`${window.location.origin}/file/${file.id}`}
                                        onCopy={() => copyToClipboard(`${window.location.origin}/file/${file.id}`)}
                                    />

                                    <CopyRow
                                        label="Embed player"
                                        value={`${embedBase(window.location.origin)}/embed/${file.id}`}
                                        onCopy={() => copyToClipboard(`${embedBase(window.location.origin)}/embed/${file.id}`)}
                                    />

                                    {file.mirrors && file.mirrors.length > 0 && (
                                        <div className="space-y-2 min-w-0">
                                            <label className="ms-label flex items-center gap-1.5"><IconServer size={14} /> Server links ({file.mirrors.length})</label>
                                            {file.mirrors.map((m) => (
                                                <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2 min-w-0">
                                                    <span className="text-xs font-bold text-white break-words">{m.name}</span>
                                                    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                                                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="ms-code text-blue-400 hover:underline break-all min-w-0 flex-1 self-center">{m.url}</a>
                                                        <button type="button" onClick={() => copyToClipboard(m.url)} className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-block sm:w-auto!" aria-label={`Copy ${m.name} link`}>
                                                            <IconCopy size={14} /> <span>Copy</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {file.failed && file.failed.length > 0 && (
                                        <div className="space-y-1.5">
                                            <label className="ms-label">Failed / skipped servers</label>
                                            <div className="flex flex-wrap gap-2">
                                                {file.failed.map((f, i) => (
                                                    <span key={`${f.name}-${i}`} className="ms-badge ms-badge-amber max-w-full whitespace-normal break-words text-left">
                                                        {f.name} ({f.reason})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
