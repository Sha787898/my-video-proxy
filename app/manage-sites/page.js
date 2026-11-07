'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import ProfilesEditor from '../components/ProfilesEditor';
import { IconGear, IconUpload, IconKey, IconGlobe, IconMail, IconLink, IconCheckCircle, IconX, IconEye, IconEyeOff, IconServer, IconPlus, IconPencil } from '../components/Icons';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Display-only grouping used for the type badge on each card
const NODE_TYPE = {
    vidmoly: 'stream', abyss: 'stream', voe: 'stream', streamhg: 'stream', earnvids: 'stream', turboviplay: 'stream',
    dropload: 'stream', ruby: 'stream', byse: 'stream', vidara: 'stream', streamp2p: 'stream', player4me: 'stream',
    upnshare: 'stream', rpmshare: 'stream', streamtape: 'stream',
    gcloud: 'download', pixeldrain: 'download', vikingfile: 'download', gofile: 'download', sendnow: 'download',
    mixdrop: 'download', buzzheavier: 'download', mega: 'download', filepress: 'download',
};

const DEFAULT_NODES = [
    { id: 'vidmoly', name: 'Vidmoly.me', limit: 'Unlimited', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'abyss', name: 'Abyss.to / LoadMyFile', limit: 'Unlimited', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'gcloud', name: 'Google Cloud Drive', limit: '15 GB', status: 'ONLINE', active: true, key: '', customDomain: '' },
    { id: 'pixeldrain', name: 'Pixeldrain', limit: '10 GB', status: 'ONLINE', active: true, key: '', customDomain: '', pdlink: true },
    { id: 'vikingfile', name: 'VikingFile', limit: '100 GB', status: 'ONLINE', active: false, key: '', customDomain: '', pdlink: true },
    { id: 'gofile', name: 'GoFile', limit: '500 GB', status: 'ONLINE', active: false, key: '', customDomain: '', pdlink: true },
    { id: 'voe', name: 'VOE.sx', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'sendnow', name: 'Send.now', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'streamhg', name: 'StreamHG', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'earnvids', name: 'EarnVids', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'turboviplay', name: 'TurboViPlay', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'dropload', name: 'DropLoad', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'ruby', name: 'Ruby.video', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'byse', name: 'Byse', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'mixdrop', name: 'MixDrop', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '', email: '', extraField: 'email', extraLabel: 'Email' },
    { id: 'buzzheavier', name: 'BuzzHeavier', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '', pdlink: true },
    { id: 'mega', name: 'MEGA', limit: '20 GB', status: 'ONLINE', active: false, key: '', customDomain: '', pdlink: true },
    { id: 'vidara', name: 'Vidara', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'filepress', name: 'Filepress', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'streamp2p', name: 'StreamP2P', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'player4me', name: 'Player4Me', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'upnshare', name: 'UpnShare', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'rpmshare', name: 'RPMShare', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '' },
    { id: 'streamtape', name: 'Streamtape', limit: 'Unlimited', status: 'ONLINE', active: false, key: '', customDomain: '', email: '', extraField: 'login', extraLabel: 'Login' }
];

export default function ManageSitesPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const [nodes, setNodes] = useState(DEFAULT_NODES);
    const [activeModal, setActiveModal] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [saveStatus, setSaveStatus] = useState('');
    const [showSecret, setShowSecret] = useState(false);

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

            // Supabase settings table theke user-er save kora key ebong domain fetch kora
            const { data: settingsData, error } = await supabase
                .from('settings')
                .select('key, value')
                .eq('user_id', currentUser.id);

            if (!error && settingsData) {
                setNodes(prevNodes => prevNodes.map(node => {
                    const foundKey = settingsData.find(s => s.key === `${node.id}_api_key`);
                    const foundDomain = settingsData.find(s => s.key === `${node.id}_domain`);
                    const foundActive = settingsData.find(s => s.key === `${node.id}_active`);
                    const foundEmail = settingsData.find(s => s.key === `${node.id}_${node.extraField || 'email'}`);
                    return {
                        ...node,
                        key: foundKey ? foundKey.value : node.key,
                        customDomain: foundDomain ? foundDomain.value : node.customDomain,
                        // সেভ করা থাকলে সেটাই, না থাকলে ডিফল্ট
                        active: foundActive ? foundActive.value === 'true' : node.active,
                        email: foundEmail ? foundEmail.value : node.email
                    };
                }));
            }
        }
        checkAuthAndFetch();
    }, [router]);

    if (loadingAuth) {
        return (
            <div className="ms-app flex items-center justify-center">
                <p className="text-sm ms-muted flex items-center gap-2"><IconServer className="ms-spin" /> Checking authorization...</p>
            </div>
        );
    }

    const toggleNodeActive = async (id) => {
        if (!user) return;
        const current = nodes.find(n => n.id === id);
        const nextActive = !current.active;

        // সাথে সাথে UI আপডেট
        setNodes(prev => prev.map(node => node.id === id ? { ...node, active: nextActive } : node));

        // ডাটাবেজে সেভ (এটাই আপলোডের সময় ব্যবহার হয়)
        const { error } = await supabase
            .from('settings')
            .upsert({
                user_id: user.id,
                key: `${id}_active`,
                value: String(nextActive)
            }, { onConflict: 'user_id,key' });

        if (error) {
            // সেভ না হলে আগের অবস্থায় ফেরত
            setNodes(prev => prev.map(node => node.id === id ? { ...node, active: !nextActive } : node));
            alert('Failed to save: ' + error.message);
        }
    };

    const handleOpenModal = (node, type) => {
        setActiveModal({ type, node });
        setShowSecret(false);
        setInputValue(type === 'key' ? node.key || '' : type === 'email' ? node.email || '' : node.customDomain || '');
    };

    const handleSaveModal = async () => {
        if (!activeModal || !user) return;
        const { node, type } = activeModal;

        const targetSettingKey = type === 'key' ? `${node.id}_api_key` : type === 'email' ? `${node.id}_${node.extraField || 'email'}` : `${node.id}_domain`;

        // Supabase-e upsert (Insert or Update) korar logic
        const { error } = await supabase
            .from('settings')
            .upsert({
                user_id: user.id,
                key: targetSettingKey,
                value: inputValue
            }, { onConflict: 'user_id,key' });

        if (error) {
            alert('Failed to save: ' + error.message);
            return;
        }

        const updatedNodes = nodes.map(n => {
            if (n.id === node.id) {
                if (type === 'key') return { ...n, key: inputValue };
                if (type === 'email') return { ...n, email: inputValue };
                return { ...n, customDomain: inputValue };
            }
            return n;
        });

        setNodes(updatedNodes);
        setSaveStatus(`Successfully updated ${type === 'key' ? 'API Key' : type === 'email' ? node.extraLabel : 'Custom Domain'} for ${node.name}`);
        setTimeout(() => setSaveStatus(''), 3000);
        setActiveModal(null);
    };

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0"><IconGear size={18} /></span>
                        <h1 className="ms-h1 truncate">Storage &amp; Stream Nodes</h1>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs ms-muted hidden sm:inline truncate max-w-[200px]">{user?.email}</span>
                        <a href="/gdrive-upload" className="ms-btn ms-btn-primary ms-btn-sm">
                            <IconUpload size={15} /> <span className="hidden xs:inline sm:inline">Upload</span><span className="hidden md:inline">&nbsp;new file</span>
                        </a>
                    </div>
                </header>

                <main className="ms-main w-full max-w-7xl mx-auto space-y-5">
                    {saveStatus && (
                        <div className="ms-alert ms-alert-green ms-fade-up" role="status">
                            <IconCheckCircle size={18} className="shrink-0 mt-0.5" />
                            <span className="min-w-0 break-words">{saveStatus}</span>
                        </div>
                    )}

                    <section className="ms-card p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="ms-h2 flex items-center gap-2"><IconServer size={14} /> Node &amp; storage management</h2>
                            <p className="text-sm ms-muted mt-1.5">
                                Turn servers on or off, attach your own API keys and custom domains. Changes to the switches are saved instantly.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="ms-badge ms-badge-green"><span className="ms-pulse-dot" /> {nodes.filter(n => n.active).length} active</span>
                            <span className="ms-badge">{nodes.length} total</span>
                        </div>
                    </section>

                    <ProfilesEditor supabase={supabase} userId={user?.id} nodes={nodes} />

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {nodes.map((node, index) => {
                            const type = NODE_TYPE[node.id] || 'stream';
                            return (
                                <div
                                    key={node.id}
                                    className={`ms-card p-4 flex flex-col gap-4 min-w-0 transition-colors ${node.active ? 'border-emerald-500/30' : 'opacity-80'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="ms-code text-[11px] text-slate-500 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 shrink-0">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-bold text-white truncate" title={node.name}>{node.name}</h3>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className={`ms-badge ${type === 'download' ? 'ms-badge-amber' : 'ms-badge-blue'}`}>{type}</span>
                                                <span className="ms-badge">Limit {node.limit}</span>
                                                <span className={`ms-badge ${node.active ? 'ms-badge-green' : ''}`}>{node.active ? 'Active' : 'Off'}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={node.active}
                                            aria-label={`${node.active ? 'Disable' : 'Enable'} ${node.name}`}
                                            onClick={() => toggleNodeActive(node.id)}
                                            className={`relative shrink-0 w-12 h-7 rounded-full border transition-colors cursor-pointer ${
                                                node.active ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700'
                                            }`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                                node.active ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                        </button>
                                    </div>

                                    {node.customDomain && (
                                        <p className="text-xs text-blue-400 flex items-center gap-1.5 min-w-0">
                                            <IconGlobe size={13} className="shrink-0" />
                                            <span className="truncate ms-code">{node.customDomain}</span>
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-2 mt-auto">
                                        {node.pdlink ? (
                                            <div className="ms-alert ms-alert-blue !py-2.5 !text-xs items-center">
                                                <IconLink size={15} className="shrink-0" />
                                                <span>via PDLink (no key needed)</span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(node, 'key')}
                                                className={`ms-btn ms-btn-sm ms-btn-block justify-between ${node.key ? 'ms-btn-ghost' : 'ms-btn-primary'}`}
                                            >
                                                <span className="flex items-center gap-2"><IconKey size={15} /> {node.key ? 'API key set' : 'Add API key'}</span>
                                                {node.key ? <IconPencil size={14} /> : <IconPlus size={14} />}
                                            </button>
                                        )}

                                        {node.extraField && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(node, 'email')}
                                                className={`ms-btn ms-btn-sm ms-btn-block justify-between ${node.email ? 'ms-btn-ghost' : 'ms-btn-primary'}`}
                                            >
                                                <span className="flex items-center gap-2 min-w-0"><IconMail size={15} className="shrink-0" /> <span className="truncate">{node.email ? `${node.extraLabel}: ${node.email}` : `Add ${node.extraLabel}`}</span></span>
                                                {node.email ? <IconPencil size={14} className="shrink-0" /> : <IconPlus size={14} className="shrink-0" />}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleOpenModal(node, 'domain')}
                                            className="ms-btn ms-btn-sm ms-btn-ghost ms-btn-block justify-between"
                                        >
                                            <span className="flex items-center gap-2"><IconGlobe size={15} /> {node.customDomain ? 'Edit custom domain' : 'Set custom domain'}</span>
                                            <IconPencil size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            {activeModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
                    <div className="ms-card w-full max-w-md p-5 sm:p-6 space-y-4 max-h-[90dvh] overflow-y-auto ms-fade-up">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-white">
                                    {activeModal.type === 'key' ? 'Set API key' : activeModal.type === 'email' ? `Set ${activeModal.node.extraLabel}` : 'Set custom domain'}
                                </h3>
                                <p className="text-xs text-blue-400 mt-0.5 truncate">{activeModal.node.name}</p>
                            </div>
                            <button type="button" aria-label="Close" onClick={() => setActiveModal(null)} className="ms-btn ms-btn-ghost ms-btn-sm ms-btn-icon shrink-0">
                                <IconX size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="ms-label" htmlFor="node-input">
                                {activeModal.type === 'key' ? 'API key / token' : activeModal.type === 'email' ? activeModal.node.extraLabel : 'Custom proxy / mirror domain'}
                            </label>
                            <div className="relative">
                                <input
                                    id="node-input"
                                    type={activeModal.type === 'key' && !showSecret ? 'password' : 'text'}
                                    autoComplete="off"
                                    placeholder={activeModal.type === 'key' ? 'Paste API key here...' : activeModal.type === 'email' ? (activeModal.node.extraField === 'login' ? 'Account login / username' : 'you@example.com') : 'https://cdn.yourdomain.com'}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className={`ms-input ${activeModal.type === 'key' ? 'pr-12' : ''}`}
                                />
                                {activeModal.type === 'key' && (
                                    <button
                                        type="button"
                                        aria-label={showSecret ? 'Hide key' : 'Show key'}
                                        onClick={() => setShowSecret(v => !v)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                                    >
                                        {showSecret ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button type="button" onClick={() => setActiveModal(null)} className="ms-btn ms-btn-ghost flex-1">Cancel</button>
                            <button type="button" onClick={handleSaveModal} className="ms-btn ms-btn-primary flex-1">Save changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
