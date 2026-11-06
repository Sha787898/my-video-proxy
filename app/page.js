'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SERVERS } from './utils/mirrors';
import { Bg3D, BrandMark } from './components/Bg3D';
import { BGS } from './utils/playerConfig';
import { IconLayers, IconZap, IconDownload, IconCloud, IconLink, IconUsers, IconDashboard, IconCheck, IconShieldCheck, IconServer, IconLock, IconChevronRight, IconPlay } from './components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FEATURES = [
    { Icon: IconLayers, title: 'Multi-server mirroring', text: 'Mirror every video across 24+ servers so a single outage never takes your library offline.' },
    { Icon: IconZap, title: 'Instant embed and player', text: 'Paste a link and get a fast, responsive player with a ready-to-use iframe embed code.' },
    { Icon: IconDownload, title: 'Secure download page', text: 'Offer visitors a clean download page with a link check before every download and no direct file exposure.' },
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

const SERVER_NAMES = Object.keys(SERVERS).map((k) => SERVERS[k].name);
const SERVER_COUNT = SERVER_NAMES.length;

const CSS = `
.lp { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; }
.lp-layer { position: relative; z-index: 1; }

/* scroll reveal */
.lp-rv { opacity: 0; transform: translateY(26px) scale(.98); transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); transition-delay: var(--d, 0ms); }
.lp-rv.in { opacity: 1; transform: none; }
.lp-nojs .lp-rv { opacity: 1; transform: none; }

/* hero 3D scene */
.lp-stage { perspective: 1300px; max-width: 780px; margin: 46px auto 0; padding: 0 4px; }
.lp-scene { position: relative; transform-style: preserve-3d; transform: rotateX(calc(9deg + var(--rx, 0deg))) rotateY(calc(-12deg + var(--ry, 0deg))); transition: transform .25s ease-out; }
.lp-float { position: relative; transform-style: preserve-3d; animation: lp-float 7s ease-in-out infinite; }
@keyframes lp-float { 50% { transform: translateY(-12px); } }
.lp-win { position: relative; border-radius: 18px; border: 1px solid rgba(255,255,255,.1); border-top-color: rgba(var(--ac-rgb), .5); background: linear-gradient(180deg, rgba(18,26,40,.92), rgba(9,13,21,.96)); box-shadow: 0 50px 90px rgba(0,0,0,.65), 0 0 90px rgba(var(--ac-rgb), .18); overflow: hidden; text-align: left; }
.lp-bar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,.07); }
.lp-bar i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.14); }
.lp-bar span { margin-left: 8px; font-size: 10.5px; color: #8e9bb0; letter-spacing: .04em; }
.lp-screen { position: relative; aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 42%, rgba(var(--ac-rgb), .26), rgba(5,8,14,.95) 70%); overflow: hidden; }
.lp-screen::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 40%; background: linear-gradient(180deg, rgba(var(--ac-rgb), .16), transparent); transform: translateY(-120%); animation: lp-scan 5s ease-in-out infinite; }
@keyframes lp-scan { 0% { transform: translateY(-120%); } 60%, 100% { transform: translateY(300%); } }
.lp-play { position: relative; width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; background: rgba(var(--ac-rgb), .5); border: 1px solid rgba(255,255,255,.35); }
.lp-play::before, .lp-play::after { content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; border-radius: 50%; border: 1px solid rgba(var(--ac-rgb), .7); animation: lp-ring 2.4s ease-out infinite; }
.lp-play::after { animation-delay: 1.2s; }
@keyframes lp-ring { from { transform: scale(1); opacity: .8; } to { transform: scale(2.1); opacity: 0; } }
.lp-prog { height: 4px; margin: 12px 14px 4px; border-radius: 999px; background: rgba(255,255,255,.08); overflow: hidden; }
.lp-prog i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, var(--ac), var(--ac-hi)); animation: lp-prog 6s linear infinite; }
@keyframes lp-prog { to { width: 100%; } }
.lp-srv { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 14px; }
.lp-srv span { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; font-size: 10.5px; font-weight: 600; color: #cdd5e2; border-radius: 999px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); }
.lp-srv span::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.9); }
.lp-srv span.on { border-color: rgba(var(--ac-rgb), .6); background: rgba(var(--ac-rgb), .16); color: #fff; }
.lp-chip3d { position: absolute; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 13px; font-size: 11.5px; font-weight: 700; color: #fff; background: rgba(14,20,30,.82); border: 1px solid rgba(255,255,255,.14); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 18px 40px rgba(0,0,0,.55); white-space: nowrap; animation: lp-bob 5s ease-in-out infinite; }
.lp-chip3d svg { color: var(--ac-hi); }
.lp-chip3d.a { top: 14%; left: -4%; transform: translateZ(90px); }
.lp-chip3d.b { top: 52%; right: -4%; transform: translateZ(120px); animation-delay: -1.7s; }
.lp-chip3d.c { bottom: -4%; left: 12%; transform: translateZ(70px); animation-delay: -3.2s; }
@keyframes lp-bob { 50% { margin-top: -7px; } }

/* server marquee */
.lp-mq { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
.lp-mq-track { display: flex; width: max-content; gap: 12px; animation: lp-mq 42s linear infinite; }
.lp-mq:hover .lp-mq-track { animation-play-state: paused; }
.lp-mq-track span { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #cdd5e2; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.04); }
.lp-mq-track span::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ac-hi); }
@keyframes lp-mq { to { transform: translateX(-50%); } }

/* stats */
.lp-stat b { display: block; font-size: clamp(30px, 6vw, 46px); font-weight: 900; line-height: 1; background: linear-gradient(135deg, #fff, var(--ac-hi)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lp-stat span { display: block; margin-top: 6px; font-size: 12px; color: #8e9bb0; }

/* tilt cards */
.lp-tilt { transform-style: preserve-3d; transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .18s ease-out, border-color .2s; }
.lp-tilt .ic3 { transform: translateZ(34px); }
.lp-tilt h3, .lp-tilt p { transform: translateZ(14px); }
.lp-glow { position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .25s; background: radial-gradient(260px circle at var(--gx, 50%) var(--gy, 50%), rgba(var(--ac-rgb), .18), transparent 70%); }
.lp-tilt:hover .lp-glow { opacity: 1; }

/* rotating feature cube */
.lp-cube-wrap { --cs: min(250px, 66vw); width: var(--cs); height: var(--cs); margin: 0 auto; perspective: 1100px; }
.lp-cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: lp-cube 20s linear infinite; }
.lp-cube-wrap:hover .lp-cube { animation-play-state: paused; }
@keyframes lp-cube { from { transform: rotateX(-12deg) rotateY(0deg); } to { transform: rotateX(-12deg) rotateY(360deg); } }
.lp-face { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 18px; text-align: center; border-radius: 18px; border: 1px solid rgba(var(--ac-rgb), .5); background: linear-gradient(160deg, rgba(var(--ac-rgb), .2), rgba(10,15,24,.88)); box-shadow: inset 0 0 44px rgba(var(--ac-rgb), .14); -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.lp-face b { font-size: 15px; color: #fff; }
.lp-face span.t { font-size: 12px; line-height: 1.45; color: #aab5c7; }
.lp-face .ic { width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--ac-tint); background: rgba(var(--ac-rgb), .18); border: 1px solid rgba(var(--ac-rgb), .45); }
.lp-face:nth-child(1) { transform: translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(2) { transform: rotateY(90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(5) { transform: rotateX(90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(6) { transform: rotateX(-90deg) translateZ(calc(var(--cs) / 2)); }
.lp-cube-shadow { width: 60%; height: 14px; margin: 34px auto 0; border-radius: 50%; background: radial-gradient(closest-side, rgba(var(--ac-rgb), .4), transparent); filter: blur(4px); animation: lp-shadow 20s linear infinite; }
@keyframes lp-shadow { 50% { transform: scaleX(.85); opacity: .7; } }

/* background picker */
.lp-cfg { position: fixed; right: 14px; bottom: 14px; z-index: 55; }
.lp-cfg > button { width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.12); background: rgba(14,20,30,.88); color: #cdd5e2; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: border-color .2s; }
.lp-cfg > button:hover { border-color: rgba(var(--ac-rgb), .6); }
.lp-cfg-panel { position: absolute; right: 0; bottom: 52px; width: min(280px, calc(100vw - 28px)); padding: 14px; border-radius: 16px; background: rgba(10,15,24,.97); border: 1px solid rgba(255,255,255,.1); box-shadow: 0 20px 50px rgba(0,0,0,.6); }
.lp-cfg-panel h4 { margin: 0 0 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #8e9bb0; }
.lp-cfg-panel div { display: flex; flex-wrap: wrap; gap: 6px; }
.lp-cfg-panel button { flex: 1 1 28%; min-height: 36px; border-radius: 9px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #cdd5e2; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.lp-cfg-panel button.on { border-color: rgba(var(--ac-rgb), .65); background: rgba(var(--ac-rgb), .16); color: var(--ac-tint); }

@media (max-width: 640px) {
  .lp-scene { transform: rotateX(6deg) rotateY(-6deg); }
  .lp-chip3d { font-size: 10px; padding: 7px 10px; }
  .lp-chip3d.a { left: -2%; } .lp-chip3d.b { right: -2%; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-cube, .lp-cube-shadow, .lp-float, .lp-screen::after, .lp-play::before, .lp-play::after, .lp-prog i, .lp-chip3d, .lp-mq-track { animation: none !important; }
  .lp-prog i { width: 60%; }
  .lp-rv { opacity: 1; transform: none; transition: none; }
}
`;

// fades/slides in when scrolled into view
function Reveal({ children, delay = 0, className = '' }) {
    const ref = useRef(null);
    const [on, setOn] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        if (typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return <div ref={ref} className={`lp-rv ${on ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms` }}>{children}</div>;
}

// card that tilts towards the mouse and has a light that follows it (desktop only)
function TiltCard({ children, className = '' }) {
    const ref = useRef(null);
    const move = (e) => {
        const el = ref.current;
        if (!el || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${x * 12}deg`);
        el.style.setProperty('--rx', `${-y * 10}deg`);
        el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    };
    const leave = () => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
    };
    return (
        <div ref={ref} className={`ms-card ms-card-hover lp-tilt relative ${className}`} onPointerMove={move} onPointerLeave={leave}>
            <span className="lp-glow" />
            {children}
        </div>
    );
}

function CountUp({ to, suffix = '' }) {
    const ref = useRef(null);
    const [n, setN] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        let raf = 0;
        const run = () => {
            const t0 = performance.now();
            const tick = (t) => {
                const p = Math.min(1, (t - t0) / 1200);
                setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
                if (p < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        };
        if (typeof IntersectionObserver === 'undefined') { setN(to); return undefined; }
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { run(); io.disconnect(); } }, { threshold: 0.4 });
        io.observe(el);
        return () => { io.disconnect(); cancelAnimationFrame(raf); };
    }, [to]);
    return <b ref={ref}>{n}{suffix}</b>;
}

const CUBE_FACES = [
    { Icon: IconLayers, t: 'Mirror', d: 'One upload, 24+ servers' },
    { Icon: IconZap, t: 'Embed', d: 'Fast player with iframe code' },
    { Icon: IconDownload, t: 'Download', d: 'Checked links, no file exposure' },
    { Icon: IconUsers, t: 'Watch party', d: 'Sync with friends in a room' },
];

function FeatureCube() {
    return (
        <div aria-hidden="true">
            <div className="lp-cube-wrap">
                <div className="lp-cube">
                    {CUBE_FACES.map(({ Icon, t, d }) => (
                        <div key={t} className="lp-face"><span className="ic"><Icon size={22} /></span><b>{t}</b><span className="t">{d}</span></div>
                    ))}
                    <div className="lp-face"><span className="ic"><IconServer size={22} /></span><b>MultiServer</b></div>
                    <div className="lp-face"><span className="ic"><IconShieldCheck size={22} /></span><b>Private</b></div>
                </div>
            </div>
            <div className="lp-cube-shadow" />
        </div>
    );
}

function Hero3D() {
    const ref = useRef(null);
    const move = (e) => {
        const el = ref.current;
        if (!el || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${x * 16}deg`);
        el.style.setProperty('--rx', `${-y * 12}deg`);
    };
    const leave = () => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--rx', '0deg');
    };
    const shown = SERVER_NAMES.slice(0, 6);
    return (
        <div className="lp-stage" onPointerMove={move} onPointerLeave={leave} aria-hidden="true">
            <div ref={ref} className="lp-scene">
                <div className="lp-float">
                    <div className="lp-win">
                        <div className="lp-bar"><i /><i /><i /><span>player · multiserver</span></div>
                        <div className="lp-screen"><div className="lp-play"><IconPlay size={22} /></div></div>
                        <div className="lp-prog"><i /></div>
                        <div className="lp-srv">
                            {shown.map((n, i) => <span key={n} className={i === 0 ? 'on' : ''}>{n}</span>)}
                        </div>
                    </div>
                    <div className="lp-chip3d a"><IconLayers size={15} /> Mirrored on {SERVER_COUNT} servers</div>
                    <div className="lp-chip3d b"><IconShieldCheck size={15} /> Link checked</div>
                    <div className="lp-chip3d c"><IconZap size={15} /> Instant embed</div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bg, setBg] = useState('globe');
    const [pick, setPick] = useState(false);

    useEffect(() => {
        try {
            const v = localStorage.getItem('ms_home_bg');
            if (v && BGS.some(([k]) => k === v)) setBg(v);
        } catch (e) { /* ignore */ }
    }, []);
    const chooseBg = (k) => {
        setBg(k);
        try { localStorage.setItem('ms_home_bg', k); } catch (e) { /* ignore */ }
    };

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
        <div className="ms-app lp flex flex-col">
            <style>{CSS}</style>
            <Bg3D kind={bg} rgb="229,56,59" animate />

            {/* Sticky glass header */}
            <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-2">
                    <Link href="/" className="min-w-0" aria-label="MultiServer home">
                        <BrandMark name="MultiServer" anim="shine" size={26} fontSize={14} />
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

            <main className="flex-1 lp-layer">
                {/* Hero */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-14 text-center ms-fade-up">
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
                        <Link href={user ? '/dashboard' : '/login'} className="ms-btn ms-btn-primary px-8 min-h-[48px]">
                            Get started free <IconChevronRight size={16} />
                        </Link>
                        <a href="#features" className="ms-btn ms-btn-ghost px-8 min-h-[48px]">
                            Explore features
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                        {CHIPS.map(({ Icon, label }) => (
                            <span key={label} className="ms-badge ms-badge-green"><Icon size={13} /> {label}</span>
                        ))}
                    </div>

                    <Hero3D />
                </section>

                {/* Server marquee */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6" aria-label="Supported servers">
                    <p className="text-center text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 mb-4">Mirrors to the servers you already use</p>
                    <div className="lp-mq">
                        <div className="lp-mq-track">
                            {[...SERVER_NAMES, ...SERVER_NAMES].map((n, i) => <span key={`${n}-${i}`}>{n}</span>)}
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                        <Reveal className="lp-stat"><CountUp to={SERVER_COUNT} suffix="+" /><span>Servers supported</span></Reveal>
                        <Reveal delay={100} className="lp-stat"><CountUp to={3} /><span>Steps to publish</span></Reveal>
                        <Reveal delay={200} className="lp-stat"><CountUp to={0} /><span>Cookies on the player</span></Reveal>
                    </div>
                </section>

                {/* 3D showcase */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
                        <Reveal>
                            <h2 className="ms-h2">Built for speed</h2>
                            <p className="mt-2 text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">One upload. <span className="ms-grad-text">Every server.</span></p>
                            <ul className="mt-5 space-y-3 text-sm text-slate-300">
                                {['Mirror to many hosts in the background', 'Player, embed code and download page in one click', 'Links survive a domain change'].map((t) => (
                                    <li key={t} className="flex items-start gap-3"><span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 flex items-center justify-center"><IconCheck size={12} /></span><span>{t}</span></li>
                                ))}
                            </ul>
                        </Reveal>
                        <Reveal delay={120}><FeatureCube /></Reveal>
                    </div>
                </section>

                {/* Features */}
                <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 scroll-mt-20">
                    <Reveal>
                        <div className="text-center mb-8">
                            <h2 className="ms-h2">Features</h2>
                            <p className="mt-2 text-xl sm:text-3xl font-bold text-white">Everything you need to publish video</p>
                        </div>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map(({ Icon, title, text }, i) => (
                            <Reveal key={title} delay={(i % 3) * 90}>
                                <TiltCard className="p-5 sm:p-6 h-full">
                                    <div className="ic3 w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center">
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
                                    <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{text}</p>
                                </TiltCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <Reveal>
                        <div className="text-center mb-8">
                            <h2 className="ms-h2">How it works</h2>
                            <p className="mt-2 text-xl sm:text-3xl font-bold text-white">Live in three steps</p>
                        </div>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {STEPS.map((step, i) => (
                            <Reveal key={step.title} delay={i * 120}>
                                <TiltCard className="p-5 sm:p-6 flex md:block gap-4 h-full">
                                    <div className="ic3 w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-black flex items-center justify-center">{i + 1}</div>
                                    <div className="min-w-0">
                                        <h3 className="md:mt-4 text-sm font-bold text-white">{step.title}</h3>
                                        <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{step.text}</p>
                                    </div>
                                </TiltCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
                    <Reveal>
                        <div className="ms-card p-6 sm:p-12 text-center">
                            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Ready to <span className="ms-grad-text">go multi-server</span>?</h2>
                            <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">Create a free account and publish your first mirrored video in minutes.</p>
                            <div className="mt-6 flex justify-center">
                                <Link href={user ? '/dashboard' : '/login'} className="ms-btn ms-btn-primary px-8 min-h-[48px] w-full sm:w-auto">
                                    {user ? 'Open dashboard' : 'Create your account'} <IconCheck size={16} />
                                </Link>
                            </div>
                        </div>
                    </Reveal>
                </section>
            </main>

            <div className="lp-cfg">
                {pick && (
                    <div className="lp-cfg-panel" role="dialog" aria-label="Background">
                        <h4>3D background</h4>
                        <div>
                            {BGS.map(([k, l]) => <button key={k} type="button" className={bg === k ? 'on' : ''} onClick={() => chooseBg(k)}>{l}</button>)}
                        </div>
                    </div>
                )}
                <button type="button" aria-label="Change background" aria-expanded={pick} onClick={() => setPick((p) => !p)}><IconLayers size={18} /></button>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800/70 lp-layer">
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
