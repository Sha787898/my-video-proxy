'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../utils/supabase';

export default function ManageSitesPage() {
    const [apiKey, setApiKey] = useState('d6dfaae96764d5bce6fe82fe9b739ac5');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [serverActive, setServerActive] = useState(true);

    // ডাটাবেজ থেকে বা লোকাললি সেভ করা এপিআই কি লোড করা
    useEffect(() => {
        async function fetchSettings() {
            const { data } = await supabase
                .from('settings')
                .select('*')
                .eq('key', 'abyss_api_key')
                .single();
            if (data) {
                setApiKey(data.value);
            }
        }
        fetchSettings();
    }, []);

    const handleSaveKey = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSuccessMsg('');

        // Supabase-এ settings টেবিলে এপিআই কি সেভ করা (upsert)
        const { error } = await supabase
            .from('settings')
            .upsert({ key: 'abyss_api_key', value: apiKey });

        setSaving(false);
        if (error) {
            alert('Failed to save API Key');
        } else {
            setSuccessMsg('Abyss API Key updated successfully!');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-white uppercase">Manage Storage Servers & APIs</h1>
                </header>

                <main className="p-6 lg:p-10 space-y-6 max-w-4xl">
                    {successMsg && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                            {successMsg}
                        </div>
                    )}

                    {/* Abyss Server Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-400 font-bold">
                                    #08
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Abyss Storage Server</h3>
                                    <p className="text-[10px] text-slate-400">Endpoint: https://api.abyss.to | Limit: 5 GB</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">
                                    ONLINE
                                </span>
                                <input 
                                    type="checkbox" 
                                    checked={serverActive} 
                                    onChange={() => setServerActive(!serverActive)}
                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                            </div>
                        </div>

                        <form onSubmit={handleSaveKey} className="pt-4 border-t border-slate-800 space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 uppercase">Abyss API Key</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="text" 
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                                        placeholder="Enter your Abyss API key..."
                                        required
                                    />
                                    <button 
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Key'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Future Servers Notice */}
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 text-center">
                        Other servers (GoFile, Buzzheavier, Vidmoly, etc.) can be configured similarly as requested.
                    </div>
                </main>
            </div>
        </div>
    );
}