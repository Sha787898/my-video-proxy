'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_NODES = [
    { id: 'vidmoly', name: 'Vidmoly.me', limit: 'Unlimited', icon: '⚡', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'abyss', name: 'Abyss.to / LoadMyFile', limit: 'Unlimited', icon: '🌊', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'gcloud', name: 'Google Cloud Drive', limit: '15 GB', icon: '☁️', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'pixeldrain', name: 'Pixeldrain', limit: '10 GB', icon: '🧪', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'vikingfile', name: 'VikingFile', limit: '100 GB', icon: '🛡️', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'gofile', name: 'GoFile', limit: '500 GB', icon: '📁', status: 'ONLINE', active: false, key: '', customDomain: '' }
];

export default function ManageSitesPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [nodes, setNodes] = useState(DEFAULT_NODES);
    const [activeModal, setActiveModal] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        async function checkAuthAndFetch() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            const currentUser = session.user;
            setUser(currentUser);
            setLoadingAuth(false);

            // Supabase settings টেবিল থেকে ইউজারের সেভ করা কি এবং ডোমেইন ফেচ করা
            const { data: settingsData, error } = await supabase
                .from('settings')
                .select('key, value')
                .eq('user_id', currentUser.id);

            if (!error && settingsData) {
                setNodes(prevNodes => prevNodes.map(node => {
                    const foundKey = settingsData.find(s => s.key === `${node.id}_api_key`);
                    const foundDomain = settingsData.find(s => s.key === `${node.id}_domain`);
                    return {
                        ...node,
                        key: foundKey ? foundKey.value : node.key,
                        customDomain: foundDomain ? foundDomain.value : node.customDomain
                    };
                }));
            }
        }
        checkAuthAndFetch();
    }, [router]);

    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-mono">
                <p className="text-xs text-blue-400 animate-pulse">Checking authorization...</p>
            </div>
        );
    }

    const toggleNodeActive = (id) => {
        setNodes(prev => prev.map(node => node.id === id ? { ...node, active: !node.active } : node));
    };

    const handleOpenModal = (node, type) => {
        setActiveModal({ type, node });
        setInputValue(type === 'key' ? node.key || '' : node.customDomain || '');
    };

    const handleSaveModal = async () => {
        if (!activeModal || !user) return;
        const { node, type } = activeModal;

        const targetSettingKey = type === 'key' ? `${node.id}_api_key` : `${node.id}_domain`;

        // Supabase-এ আপসার্ট (Insert or Update) করার লজিক
        const { error } = await supabase
            .from('settings')
            .upsert({
                user_id: user.id,
                key: targetSettingKey,
                value: inputValue
            }, { onConflict: ['user_id', 'key'] });

        if (error) {
            alert('Failed to save: ' + error.message);
            return;
        }

        const updatedNodes = nodes.map(n => {
            if (n.id === node.id) {
                return type === 'key' ? { ...n, key: inputValue } : { ...n, customDomain: inputValue };
            }
            return n;
        });

        setNodes(updatedNodes);
        setSaveStatus(`Successfully updated ${type === 'key' ? 'API Key' : 'Custom Domain'} for ${node.name}`);
        setTimeout(() => setSaveStatus(''), 3000);
        setActiveModal(null);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex font-mono">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚙️</span>
                        <h1 className="text-sm font-bold text-white uppercase tracking-wider">Storage & Stream Nodes</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400 hidden sm:inline">{user?.email}</span>
                        <a href="/gdrive-upload" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20 flex items-center gap-2">
                            <span>⬆️</span> Upload New File
                        </a>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-start p-6 lg:p-10">
                    <div className="w-full max-w-5xl space-y-6">
                        {saveStatus && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold flex items-center gap-2">
                                <span>✅</span> {saveStatus}
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
                            <div>
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span>🗄️</span> Node & Storage Management
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Configure operational nodes, attach your personal API keys, custom domains, and route uploads securely.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {nodes.map((node, index) => (
                                <div 
                                    key={node.id} 
                                    className={`bg-slate-900 border rounded-3xl p-6 shadow-xl transition-all duration-200 ${
                                        node.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-900 opacity-60'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs text-slate-500 font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                                                #{String(index + 1).padStart(2, '0')}
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shadow-lg">
                                                {node.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xs font-bold text-white">{node.name}</h3>
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        ● {node.status}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Limit: <span className="text-slate-200 font-bold">{node.limit}</span>
                                                    {node.customDomain && (
                                                        <span className="ml-3 text-blue-400 font-bold">| Domain: {node.customDomain}</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-auto">
                                            <button 
                                                onClick={() => handleOpenModal(node, 'key')}
                                                className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                                    node.key 
                                                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' 
                                                        : 'bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20'
                                                }`}
                                            >
                                                <span>🔑</span> {node.key ? 'Edit Key' : '+ Add Key'}
                                            </button>

                                            <button 
                                                onClick={() => handleOpenModal(node, 'domain')}
                                                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <span>🌐</span> Domain
                                            </button>

                                            <button 
                                                onClick={() => toggleNodeActive(node.id)}
                                                className={`w-12 h-6 rounded-full transition-colors relative p-1 cursor-pointer ${
                                                    node.active ? 'bg-blue-600' : 'bg-slate-800'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                                    node.active ? 'translate-x-6' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {activeModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                {activeModal.type === 'key' ? 'Set API Key' : 'Set Custom Domain'} - {activeModal.node.name}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase">
                                {activeModal.type === 'key' ? 'API Key / Token' : 'Custom Proxy / Mirror Domain'}
                            </label>
                            <input 
                                type={activeModal.type === 'key' ? 'password' : 'text'}
                                placeholder={activeModal.type === 'key' ? 'Paste API Key here...' : 'https://cdn.yourdomain.com'}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-blue-600 font-mono"
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button 
                                onClick={() => setActiveModal(null)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveModal}
                                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 cursor-pointer"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}