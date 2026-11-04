'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { IconLayers, IconZap, IconDownload, IconCloud, IconLink, IconUsers, IconDashboard, IconCheck, IconShieldCheck, IconServer, IconLock, IconChevronRight } from './components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FEATURES = [
    { Icon: IconLayers, title: 'Multi-server mirroring', text: 'Mirror every video across 24+ servers so a single outage never takes your library offline.' },
    { Icon: IconZap, title: 'Instant embed and player', text: 'Paste a link and get a fast, responsive player with a ready-to-use iframe embed code.' },
    { Icon: IconDownload, title: 'Secure download page', text: 'Offer visitors a clean download page with one-time tokens and no direct file exposure.' },
    { Icon: IconCloud, title: 'Remote upload from Google Drive', text: 'Import files straight from Google Drive links without downloading them to your device first.' },
    { Icon: IconLink, title: 'Domain-proof links', text: 'Links keep working when you change domains, so shared content never breaks.' },
    { Icon: IconUsers, title: 'Watch party', text: 'Watch together in sync with friends through a shared room and a single private link.' },
];

const STEPS = [
    { title: 'Add your link', text: 'Paste a Google Drive or direct file link, or upload a batch at once.' },
    { title: 'We mirror it', text: 'Your video is copied to multiple servers automatically in the background.' },
    { title: 'Share and embed', text: 'Copy the player, embed or download link and publish it anywhere.' },
];

const CHIPS = [
    { Icon: IconServer, label: '24+ servers' },
    { Icon: IconLock, label: 'Private links' },
    { Icon: IconShieldCheck, label: 'No cookies on player' },
];

export default function LandingPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
            }
            setLoading(false);
        }
        checkUser();
    }, []);

    return (
        <div className="ms-app flex flex-col">
            {/* Sticky glass header */}
            <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-2">
                    <Link href="/" className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-600/30">MS</span>
                        <span className="text-sm font-black tracking-widest text-white uppercase truncate">MULTISERVER</span>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                        {loading ? (
                            <span className="ms-skeleton h-9 w-24" />
                        ) : user ? (
                            <>
                                <span className="text-xs text-slate-400 hidden md:inline max-w-[200px] truncate">{user.email}</span>
                                <Link href="/dashboard" className="ms-btn ms-btn-primary ms-btn-sm whitespace-nowrap">
                                    <IconDashboard size={15} /> Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="ms-btn ms-btn-ghost ms-btn-sm whitespace-nowrap">Sign in</Link>
                                <Link href="/login" className="ms-btn ms-btn-primary ms-btn-sm whitespace-nowrap">Get started</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-14 sm:pt-24 pb-12 sm:pb-16 text-center ms-fade-up">
                    <span className="ms-badge ms-badge-blue mx-auto">
                        <span className="ms-pulse-dot" /> Cloud video mirroring and hosting
                    </span>
                    <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] break-words">
                        Scale your media vault with <span className="ms-grad-text">MultiServer</span>
                    </h1>
                    <p className="mt-5 text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Upload once, mirror everywhere. Fast players, private links and reliable delivery from a single dashboard.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                        <Link href={user ? "/dashboard" : "/login"} className="ms-btn ms-btn-primary px-8 min-h-[48px]">
                            Get started free <IconChevronRight size={16} />
                        </Link>
                        <Link href="/embed-generator" className="ms-btn ms-btn-ghost px-8 min-h-[48px]">
                            Explore features
                        </Link>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                        {CHIPS.map(({ Icon, label }) => (
                            <span key={label} className="ms-badge ms-badge-green"><Icon size={13} /> {label}</span>
                        ))}
                    </div>
                </section>

                {/* Features */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="text-center mb-8">
                        <h2 className="ms-h2">Features</h2>
                        <p className="mt-2 text-xl sm:text-3xl font-bold text-white">Everything you need to publish video</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map(({ Icon, title, text }) => (
                            <div key={title} className="ms-card ms-card-hover p-5 sm:p-6">
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center">
                                    <Icon size={20} />
                                </div>
                                <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
                                <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="text-center mb-8">
                        <h2 className="ms-h2">How it works</h2>
                        <p className="mt-2 text-xl sm:text-3xl font-bold text-white">Live in three steps</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {STEPS.map((step, i) => (
                            <div key={step.title} className="ms-card p-5 sm:p-6 flex md:block gap-4">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-black flex items-center justify-center">{i + 1}</div>
                                <div className="min-w-0">
                                    <h3 className="md:mt-4 text-sm font-bold text-white">{step.title}</h3>
                                    <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{step.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="ms-card p-6 sm:p-12 text-center">
                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Ready to <span className="ms-grad-text">go multi-server</span>?</h2>
                        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">Create a free account and publish your first mirrored video in minutes.</p>
                        <div className="mt-6 flex justify-center">
                            <Link href={user ? "/dashboard" : "/login"} className="ms-btn ms-btn-primary px-8 min-h-[48px] w-full sm:w-auto">
                                {user ? 'Open dashboard' : 'Create your account'} <IconCheck size={16} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/70">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <p className="text-center">© 2026 MultiServer Cloud Platform. All rights reserved.</p>
                    <div className="flex items-center gap-4">
                        <span>Privacy Policy</span>
                        <span>Terms of Service</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
