'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function WebUploadPage() {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setStatus('Uploading file to Cloud node...');

        try {
            const file = files[0];
            // Insert file record into Supabase
            const { error } = await supabase.from('files').insert([
                { title: file.name, size: `${(file.size / (1024*1024)).toFixed(2)} MB`, status: 'Processing', type: 'Web Upload' }
            ]);

            if (error) throw error;
            setStatus('File uploaded successfully! Added to processing queue.');
            setTimeout(() => window.location.href = '/processing-files', 1500);
        } catch (err) {
            setStatus(`Error: ${err.message}`);
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur px-6 flex items-center justify-between">
                    <h1 className="text-xs font-bold uppercase text-white tracking-wider">Web File Uploader</h1>
                </header>
                <main className="p-6 lg:p-10 max-w-4xl space-y-6">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-bold">
                        ℹ️ Direct Web Upload: Drag and drop your media files or browse from your device to prepare files for upload.
                    </div>

                    <div 
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileUpload(e.dataTransfer.files); }}
                        className={`border-2 border-dashed rounded-2xl p-12 text-center transition bg-slate-900/40 ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800'}`}
                    >
                        <input type="file" id="fileInput" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mx-auto mb-4">
                            📤
                        </div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Drag and drop your files here</h3>
                        <p className="text-[11px] text-slate-400 mb-6">or <label htmlFor="fileInput" className="text-blue-400 underline cursor-pointer font-bold">browse</label> to choose files from your device</p>
                        
                        {uploading && <p className="text-xs text-yellow-400 font-bold animate-pulse">{status}</p>}
                    </div>
                </main>
            </div>
        </div>
    );
}