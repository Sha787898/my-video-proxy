'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { createClient } from '@supabase/supabase-js';
import {
    IconDashboard, IconFolder, IconShieldCheck, IconActivity, IconLogout,
    IconCloud, IconUpload, IconGlobe, IconLink, IconLaptop, IconChevronRight,
} from '../components/Icons';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const QUICK_ACTIONS = [
    { href: '/remote-upload', label: 'Remote Upload', desc: 'Mirror a file from a direct link', Icon: IconLink },
    { href: '/gdrive-upload', label: 'Google Drive Upload', desc: 'Import files from Google Drive', Icon: IconCloud },
    { href: '/drive-upload', label: 'Drive Upload', desc: 'Send files from your drive storage', Icon: IconUpload },
    { href: '/web-upload', label: 'Web Upload', desc: 'Upload directly from your browser', Icon: IconLaptop },
    { href: '/file-manager', label: 'File Manager', desc: 'Browse, copy and manage your files', Icon: IconFolder },
    { href: '/manage-sites', label: 'Manage Sites', desc: 'Configure your connected sites', Icon: IconGlobe },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [fileCount, setFileCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUser(session.user);

            const { count } = await supabase
                .from('files')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id);

            setFileCount(count || 0);
            setLoading(false);
        }
        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400">
                    <IconActivity size={18} className="ms-spin" />
                    <span>Loading dashboard…</span>
                </div>
            </div>
        );
    }

    return (
        <div className="ms-app flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <IconDashboard size={18} />
                        </span>
                        <h1 className="ms-h1 truncate">Cloud Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[220px]">{user?.email}</span>
                        <button
                            onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
                            className="ms-btn ms-btn-danger ms-btn-sm"
                        >
                            <IconLogout size={14} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </header>

                <main className="ms-main w-full max-w-6xl mx-auto space-y-5">
                    {/* Status strip */}
                    <div className="ms-card ms-fade-up p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="ms-pulse-dot" />
                            <p className="text-sm text-slate-200">All systems operational</p>
                        </div>
                        <p className="ms-muted text-xs break-words">Signed in as {user?.email}</p>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <p className="ms-h2">Your Mirrored Files</p>
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                    <IconFolder size={18} />
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-white mt-3">{fileCount}</p>
                            <p className="ms-muted text-xs mt-1">Files stored in your account</p>
                        </div>
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <p className="ms-h2">Node Status</p>
                                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                    <IconActivity size={18} />
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-emerald-400 mt-3">Active</p>
                            <p className="ms-muted text-xs mt-1">Mirror node is online and ready</p>
                        </div>
                        <div className="ms-card ms-fade-up p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                                <p className="ms-h2">Security Model</p>
                                <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                    <IconShieldCheck size={18} />
                                </span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400 mt-3">RLS Locked</p>
                            <p className="ms-muted text-xs mt-1">Row-level security protects your data</p>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <section className="space-y-3">
                        <h2 className="ms-h2">Quick Actions</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {QUICK_ACTIONS.map(({ href, label, desc, Icon }) => (
                                <Link key={href} href={href} className="ms-card ms-card-hover p-4 flex items-center gap-3 min-w-0">
                                    <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                        <Icon size={18} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-white truncate">{label}</span>
                                        <span className="block ms-muted text-xs truncate">{desc}</span>
                                    </span>
                                    <IconChevronRight size={16} className="text-slate-500 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
