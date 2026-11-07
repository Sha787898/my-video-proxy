'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { SERVERS } from './utils/mirrors';
import { Bg3D, BrandMark } from './components/Bg3D';
import { BGS } from './utils/playerConfig';
import {
    IconLayers, IconZap, IconDownload, IconCloud, IconLink, IconUsers, IconDashboard, IconCheck, IconShieldCheck,
    IconServer, IconLock, IconChevronRight, IconPlay, IconFullscreen,
} from './components/Icons';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FEATURES = [
    { Icon: IconLayers, title: 'Multi-server mirroring', text: 'Mirror every video across 24+ servers so a single outage never takes your library offline.' },
    { Icon: IconZap, title: 'Instant embed and player', text: 'Paste a link and get a fast, responsive player with a ready-to-use iframe embed code.' },
    { Icon: IconDownload, title: 'Secure download page', text: 'A clean download page that checks every link before it opens and never exposes the raw file location.' },
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

// palette: near-black surfaces, white text, red as the brand colour, green only for "live / ok"
const CSS = `
.lp { --ac: #e5383b; --ac-hi: #ff6b73; --ac-rgb: 229,56,59; --ac-tint: #ffc2c4; --ink: #07090d; --panel: rgba(13,17,25,.84); --line: rgba(255,255,255,.08); --line2: rgba(255,255,255,.14); --mut: #9aa4b6; --ok: #22c55e;
  position: relative; overflow-x: clip; color: #e8ebf2;
  background: radial-gradient(900px 520px at 50% -12%, rgba(229,56,59,.18), transparent 62%), radial-gradient(760px 420px at 100% 100%, rgba(34,197,94,.06), transparent 62%), var(--ink); }
.lp * { box-sizing: border-box; }
.lp-layer { position: relative; z-index: 1; }
.lp-wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.lp-sec { padding: 72px 0; }
@media (max-width: 640px) { .lp-sec { padding: 48px 0; } .lp-wrap { padding: 0 16px; } }

/* header */
.lp-head { position: sticky; top: 0; z-index: 50; background: rgba(7,9,13,.72); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); border-bottom: 1px solid var(--line); }
.lp-head-in { display: flex; align-items: center; justify-content: space-between; gap: 12px; height: 64px; }
.lp-nav { display: none; gap: 26px; }
.lp-nav a { font-size: 13px; font-weight: 600; color: var(--mut); text-decoration: none; transition: color .2s; }
.lp-nav a:hover { color: #fff; }
@media (min-width: 820px) { .lp-nav { display: flex; } }
.lp-prog-top { position: absolute; left: 0; bottom: -1px; height: 2px; width: var(--sp, 0%); background: linear-gradient(90deg, var(--ac), var(--ac-hi)); box-shadow: 0 0 12px rgba(var(--ac-rgb), .8); }

/* buttons */
.lp-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 26px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; letter-spacing: .01em; text-decoration: none; white-space: nowrap; cursor: pointer; transition: transform .2s, box-shadow .2s, background .2s, border-color .2s; }
.lp-btn.sm { min-height: 36px; padding: 0 16px; font-size: 12.5px; border-radius: 10px; }
.lp-btn-red { color: #fff; border: 1px solid rgba(255,255,255,.18); background: linear-gradient(180deg, #ef4a4d, #c62a2f); box-shadow: 0 10px 28px rgba(var(--ac-rgb), .32), inset 0 1px 0 rgba(255,255,255,.22); }
.lp-btn-red:hover { transform: translateY(-1px); box-shadow: 0 14px 34px rgba(var(--ac-rgb), .45), inset 0 1px 0 rgba(255,255,255,.28); }
.lp-btn-red::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 28%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.3), transparent); transform: skewX(-20deg); animation: lp-shine 4.5s ease-in-out infinite; }
@keyframes lp-shine { 0%, 55% { left: -40%; } 100% { left: 135%; } }
.lp-btn-ghost { color: #e8ebf2; border: 1px solid var(--line2); background: rgba(255,255,255,.04); }
.lp-btn-ghost:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); transform: translateY(-1px); }
.lp-btn:focus-visible, .lp-nav a:focus-visible { outline: 2px solid var(--ac-hi); outline-offset: 2px; }

/* type */
.lp-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--ac-hi); }
.lp-eyebrow::before { content: ''; width: 22px; height: 2px; border-radius: 2px; background: var(--ac); }
.lp-h2 { margin: 12px 0 0; font-size: clamp(26px, 4.4vw, 40px); font-weight: 900; line-height: 1.1; letter-spacing: -.02em; color: #fff; }
.lp-lead { margin: 14px 0 0; font-size: 15px; line-height: 1.65; color: var(--mut); }
.lp-grad { background: linear-gradient(120deg, #fff 0%, var(--ac-hi) 55%, var(--ac) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lp-center { text-align: center; }
.lp-center .lp-eyebrow::after { content: ''; width: 22px; height: 2px; border-radius: 2px; background: var(--ac); }
.lp-rule { height: 1px; border: 0; margin: 0; background: linear-gradient(90deg, transparent, rgba(var(--ac-rgb), .55), transparent); }

/* hero */
.lp-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #ffd0d2; border: 1px solid rgba(var(--ac-rgb), .4); background: rgba(var(--ac-rgb), .1); }
.lp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 8px rgba(34,197,94,.9); animation: lp-dotp 2s ease-in-out infinite; }
@keyframes lp-dotp { 50% { opacity: .45; } }
.lp-h1 { margin: 22px 0 0; font-size: clamp(36px, 7vw, 68px); font-weight: 900; line-height: 1.04; letter-spacing: -.03em; color: #fff; overflow-wrap: anywhere; }
.lp-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 600; color: #86efac; border: 1px solid rgba(34,197,94,.3); background: rgba(34,197,94,.08); }

/* scroll reveal */
.lp-rv { opacity: 0; transform: translateY(24px); transition: opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); transition-delay: var(--d, 0ms); }
.lp-rv.in { opacity: 1; transform: none; }

/* hero 3D scene */
.lp-stage { perspective: 1400px; max-width: 640px; margin: 52px auto 0; }
.lp-scene { position: relative; transform-style: preserve-3d; transform: rotateX(calc(6deg + var(--rx, 0deg))) rotateY(calc(-9deg + var(--ry, 0deg))); transition: transform .25s ease-out; }
.lp-float { position: relative; transform-style: preserve-3d; animation: lp-float 7s ease-in-out infinite; }
@keyframes lp-float { 50% { transform: translateY(-10px); } }
.lp-win { position: relative; border-radius: 16px; border: 1px solid var(--line2); border-top-color: rgba(var(--ac-rgb), .55); background: linear-gradient(180deg, #121821, #0a0d13); box-shadow: 0 40px 80px rgba(0,0,0,.7), 0 0 80px rgba(var(--ac-rgb), .16); overflow: hidden; text-align: left; }
.lp-bar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
.lp-bar i { width: 9px; height: 9px; border-radius: 50%; background: rgba(255,255,255,.16); }
.lp-bar i:nth-child(1) { background: #ef4444; } .lp-bar i:nth-child(2) { background: #f59e0b; } .lp-bar i:nth-child(3) { background: #22c55e; }
.lp-bar span { margin-left: 8px; font-size: 10.5px; color: var(--mut); letter-spacing: .04em; }
.lp-screen { position: relative; aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 46%, rgba(var(--ac-rgb), .28), #05070b 72%); overflow: hidden; }
.lp-screen::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 38%; background: linear-gradient(180deg, rgba(var(--ac-rgb), .14), transparent); transform: translateY(-120%); animation: lp-scan 5s ease-in-out infinite; pointer-events: none; }
@keyframes lp-scan { 0% { transform: translateY(-120%); } 60%, 100% { transform: translateY(320%); } }
.lp-pill { position: absolute; top: 10px; left: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px; height: 24px; border-radius: 8px; font-size: 10px; font-weight: 700; color: #fff; background: rgba(10,14,20,.9); border: 1px solid rgba(var(--ac-rgb), .45); }
.lp-pill::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 6px var(--ok); }
.lp-sq { position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; }
.lp-sq i { width: 24px; height: 24px; border-radius: 8px; background: rgba(10,14,20,.9); border: 1px solid var(--line2); }
.lp-play { position: relative; width: 58px; height: 58px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(180deg, #ef4a4d, #c62a2f); border: 1px solid rgba(255,255,255,.35); box-shadow: 0 10px 30px rgba(var(--ac-rgb), .5); }
.lp-play::before, .lp-play::after { content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px; border-radius: 50%; border: 1px solid rgba(var(--ac-rgb), .7); animation: lp-ring 2.4s ease-out infinite; }
.lp-play::after { animation-delay: 1.2s; }
@keyframes lp-ring { from { transform: scale(1); opacity: .8; } to { transform: scale(2.1); opacity: 0; } }
.lp-ctrl { position: absolute; left: 12px; right: 12px; bottom: 10px; display: flex; align-items: center; gap: 10px; font-size: 9.5px; color: #cbd2de; }
.lp-prog { flex: 1; height: 4px; border-radius: 999px; background: rgba(255,255,255,.14); overflow: hidden; }
.lp-prog i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, var(--ac), var(--ac-hi)); animation: lp-prog 6s linear infinite; }
@keyframes lp-prog { to { width: 100%; } }
.lp-srv { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px 14px; }
.lp-srv span { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; font-size: 10.5px; font-weight: 600; color: #cdd5e2; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,.04); }
.lp-srv span::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 6px rgba(34,197,94,.9); }
.lp-srv span.on { border-color: rgba(var(--ac-rgb), .6); background: rgba(var(--ac-rgb), .16); color: #fff; }
.lp-chip3d { position: absolute; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 12px; font-size: 11.5px; font-weight: 700; color: #fff; background: rgba(12,16,23,.9); border: 1px solid var(--line2); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 18px 40px rgba(0,0,0,.6); white-space: nowrap; animation: lp-bob 5s ease-in-out infinite; }
.lp-chip3d svg { color: var(--ac-hi); }
.lp-chip3d.a { top: 16%; left: -3%; transform: translateZ(80px); }
.lp-chip3d.b { top: 54%; right: -3%; transform: translateZ(110px); animation-delay: -1.7s; }
.lp-chip3d.c { bottom: -5%; left: 10%; transform: translateZ(64px); animation-delay: -3.2s; }
.lp-chip3d.b svg { color: var(--ok); }
@keyframes lp-bob { 50% { margin-top: -7px; } }
@media (max-width: 640px) { .lp-scene { transform: rotateX(4deg) rotateY(-5deg); } .lp-chip3d { font-size: 10px; padding: 7px 10px; } .lp-chip3d.a { left: 0; } .lp-chip3d.b { right: 0; } .lp-chip3d.c { left: 6%; } }

/* marquee */
.lp-mq { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
.lp-mq-track { display: flex; width: max-content; gap: 10px; animation: lp-mq 46s linear infinite; }
.lp-mq:hover .lp-mq-track { animation-play-state: paused; }
.lp-mq-track span { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 600; color: #cdd5e2; border: 1px solid var(--line); background: var(--panel); }
.lp-mq-track span::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ac); }
@keyframes lp-mq { to { transform: translateX(-50%); } }

/* stat bar: one box, thin dividers */
.lp-stats { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line2); border-radius: 16px; background: var(--panel); overflow: hidden; }
.lp-stat { padding: 26px 12px; text-align: center; }
.lp-stat + .lp-stat { border-left: 1px solid var(--line); }
.lp-stat b { display: block; font-size: clamp(28px, 5.4vw, 44px); font-weight: 900; line-height: 1; color: #fff; }
.lp-stat b em { font-style: normal; color: var(--ac-hi); }
.lp-stat span { display: block; margin-top: 8px; font-size: 12px; color: var(--mut); }

/* cards */
.lp-card { position: relative; height: 100%; padding: 24px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); overflow: hidden; transition: border-color .25s, transform .18s ease-out; transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); }
.lp-card::before { content: ''; position: absolute; top: 0; left: 0; height: 2px; width: 0; background: linear-gradient(90deg, var(--ac), var(--ac-hi)); transition: width .4s ease; }
.lp-card:hover { border-color: rgba(var(--ac-rgb), .45); }
.lp-card:hover::before { width: 100%; }
.lp-glow { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; opacity: 0; transition: opacity .25s; background: radial-gradient(260px circle at var(--gx, 50%) var(--gy, 50%), rgba(var(--ac-rgb), .14), transparent 70%); }
.lp-card:hover .lp-glow { opacity: 1; }
.lp-card .idx { position: absolute; top: 18px; right: 20px; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: rgba(255,255,255,.22); }
.lp-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ac-hi); background: rgba(var(--ac-rgb), .12); border: 1px solid rgba(var(--ac-rgb), .35); }
.lp-card h3 { margin: 18px 0 0; font-size: 15px; font-weight: 700; color: #fff; }
.lp-card p { margin: 8px 0 0; font-size: 13.5px; line-height: 1.65; color: var(--mut); }

/* steps with a connecting line */
.lp-steps { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lp-steps::before { content: ''; position: absolute; top: 49px; left: 16%; right: 16%; height: 1px; background: linear-gradient(90deg, rgba(var(--ac-rgb), .1), rgba(var(--ac-rgb), .7), rgba(var(--ac-rgb), .1)); }
.lp-step { position: relative; text-align: center; padding: 26px 20px; }
.lp-num { position: relative; z-index: 1; width: 46px; height: 46px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #fff; background: linear-gradient(180deg, #ef4a4d, #c62a2f); border: 1px solid rgba(255,255,255,.25); box-shadow: 0 0 0 6px rgba(var(--ac-rgb), .12), 0 10px 24px rgba(var(--ac-rgb), .35); }
@media (max-width: 820px) { .lp-steps { grid-template-columns: 1fr; } .lp-steps::before { display: none; } .lp-step { display: flex; gap: 16px; text-align: left; align-items: flex-start; } .lp-num { margin: 0; flex-shrink: 0; } }

/* showcase */
.lp-show { display: grid; grid-template-columns: 1fr; gap: 44px; align-items: center; padding: 34px 26px; border-radius: 22px; border: 1px solid var(--line2); background: linear-gradient(180deg, rgba(18,24,34,.8), rgba(9,12,18,.86)); position: relative; overflow: hidden; }
.lp-show::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 38px 38px; -webkit-mask-image: radial-gradient(circle at 70% 50%, #000, transparent 72%); mask-image: radial-gradient(circle at 70% 50%, #000, transparent 72%); pointer-events: none; }
.lp-show > * { position: relative; }
@media (min-width: 820px) { .lp-show { grid-template-columns: 1.05fr 1fr; padding: 48px 44px; } }
.lp-list { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 12px; }
.lp-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: #cdd5e2; line-height: 1.5; }
.lp-list li span.k { margin-top: 2px; width: 20px; height: 20px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4ade80; background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.4); }

.lp-cube-wrap { --cs: min(230px, 62vw); width: var(--cs); height: var(--cs); margin: 0 auto; perspective: 1100px; }
.lp-cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: lp-cube 22s linear infinite; }
.lp-cube-wrap:hover .lp-cube { animation-play-state: paused; }
@keyframes lp-cube { from { transform: rotateX(-12deg) rotateY(0deg); } to { transform: rotateX(-12deg) rotateY(360deg); } }
.lp-face { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 18px; text-align: center; border-radius: 16px; border: 1px solid rgba(var(--ac-rgb), .5); background: linear-gradient(160deg, rgba(var(--ac-rgb), .22), rgba(8,11,17,.92)); box-shadow: inset 0 0 40px rgba(var(--ac-rgb), .14); -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.lp-face b { font-size: 15px; color: #fff; }
.lp-face span.t { font-size: 12px; line-height: 1.45; color: #aab5c7; }
.lp-face .ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--ac-tint); background: rgba(var(--ac-rgb), .18); border: 1px solid rgba(var(--ac-rgb), .45); }
.lp-face:nth-child(1) { transform: translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(2) { transform: rotateY(90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(3) { transform: rotateY(180deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(5) { transform: rotateX(90deg) translateZ(calc(var(--cs) / 2)); }
.lp-face:nth-child(6) { transform: rotateX(-90deg) translateZ(calc(var(--cs) / 2)); }
.lp-cube-shadow { width: 58%; height: 14px; margin: 38px auto 0; border-radius: 50%; background: radial-gradient(closest-side, rgba(var(--ac-rgb), .45), transparent); filter: blur(4px); animation: lp-shadow 22s linear infinite; }
@keyframes lp-shadow { 50% { transform: scaleX(.85); opacity: .7; } }

/* final call to action */
.lp-cta { position: relative; padding: 56px 24px; text-align: center; border-radius: 22px; border: 1px solid rgba(var(--ac-rgb), .35); background: radial-gradient(600px 260px at 50% 0%, rgba(var(--ac-rgb), .22), transparent 70%), linear-gradient(180deg, rgba(18,24,34,.9), rgba(8,11,17,.94)); overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.5), 0 0 80px rgba(var(--ac-rgb), .1); }
.lp-cta::before { content: ''; position: absolute; top: 0; left: 18%; right: 18%; height: 2px; background: linear-gradient(90deg, transparent, var(--ac-hi), transparent); }

/* footer */
.lp-foot { border-top: 1px solid var(--line); background: rgba(5,7,10,.7); }
.lp-foot-grid { display: grid; grid-template-columns: 1fr; gap: 28px; padding: 44px 0 30px; }
@media (min-width: 720px) { .lp-foot-grid { grid-template-columns: 1.6fr 1fr 1fr; } }
.lp-foot h5 { margin: 0 0 12px; font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #fff; }
.lp-foot a, .lp-foot span.l { display: block; margin-bottom: 9px; font-size: 13px; color: var(--mut); text-decoration: none; transition: color .2s; }
.lp-foot a:hover { color: #fff; }
.lp-foot-bot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; padding: 18px 0 26px; border-top: 1px solid var(--line); font-size: 12px; color: #6b7587; }

/* background picker */
.lp-cfg { position: fixed; right: 14px; bottom: 14px; z-index: 55; }
.lp-cfg > button { width: 42px; height: 42px; border-radius: 50%; border: 1px solid var(--line2); background: rgba(12,16,23,.9); color: #cdd5e2; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); transition: border-color .2s; }
.lp-cfg > button:hover { border-color: rgba(var(--ac-rgb), .6); }
.lp-cfg-panel { position: absolute; right: 0; bottom: 52px; width: min(290px, calc(100vw - 28px)); padding: 14px; border-radius: 16px; background: rgba(10,13,19,.98); border: 1px solid var(--line2); box-shadow: 0 20px 50px rgba(0,0,0,.6); }
.lp-cfg-panel h4 { margin: 0 0 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--mut); }
.lp-cfg-panel div { display: flex; flex-wrap: wrap; gap: 6px; }
.lp-cfg-panel button { flex: 1 1 28%; min-height: 36px; border-radius: 9px; border: 1px solid var(--line); background: rgba(255,255,255,.04); color: #cdd5e2; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.lp-cfg-panel button.on { border-color: rgba(var(--ac-rgb), .65); background: rgba(var(--ac-rgb), .16); color: var(--ac-tint); }

@media (prefers-reduced-motion: reduce) {
  .lp-cube, .lp-cube-shadow, .lp-float, .lp-screen::after, .lp-play::before, .lp-play::after, .lp-prog i, .lp-chip3d, .lp-mq-track, .lp-btn-red::after, .lp-dot { animation: none !important; }
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
    return <div ref={ref} className={`lp-rv ${on ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms`, height: '100%' }}>{children}</div>;
}

// card that tilts a little towards the mouse and has a light that follows it (desktop only)
function TiltCard({ children, className = '' }) {
    const ref = useRef(null);
    const move = (e) => {
        const el = ref.current;
        if (!el || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${x * 6}deg`);
        el.style.setProperty('--rx', `${-y * 5}deg`);
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
        <div ref={ref} className={`lp-card ${className}`} onPointerMove={move} onPointerLeave={leave}>
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
    return <b ref={ref}>{n}{suffix ? <em>{suffix}</em> : null}</b>;
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
        el.style.setProperty('--ry', `${x * 12}deg`);
        el.style.setProperty('--rx', `${-y * 9}deg`);
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
                        <div className="lp-screen">
                            <span className="lp-pill">{shown[0]}</span>
                            <span className="lp-sq"><i /><i /></span>
                            <div className="lp-play"><IconPlay size={22} /></div>
                            <div className="lp-ctrl"><span>00:42</span><div className="lp-prog"><i /></div><IconFullscreen size={12} /></div>
                        </div>
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
    const rootRef = useRef(null);

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

    // thin red progress line under the header
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return undefined;
        let raf = 0;
        const upd = () => {
            raf = 0;
            const h = document.documentElement.scrollHeight - window.innerHeight;
            el.style.setProperty('--sp', `${h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0}%`);
        };
        const on = () => { if (!raf) raf = requestAnimationFrame(upd); };
        upd();
        window.addEventListener('scroll', on, { passive: true });
        return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
    }, []);

    const primaryHref = user ? '/dashboard' : '/login';

    return (
        <div ref={rootRef} className="lp flex flex-col min-h-screen">
            <style>{CSS}</style>
            <Bg3D kind={bg} rgb="229,56,59" animate opacity={0.5} />

            <header className="lp-head">
                <div className="lp-wrap lp-head-in">
                    <Link href="/" className="min-w-0" aria-label="MultiServer home">
                        <BrandMark name="MultiServer" anim="shine" size={26} fontSize={14} />
                    </Link>
                    <nav className="lp-nav" aria-label="Sections">
                        <a href="#features">Features</a>
                        <a href="#how">How it works</a>
                        <a href="#start">Get started</a>
                    </nav>
                    <div className="flex items-center gap-2 shrink-0">
                        {loading ? (
                            <span className="ms-skeleton h-9 w-24" />
                        ) : user ? (
                            <Link href="/dashboard" className="lp-btn lp-btn-red sm"><IconDashboard size={15} /> Dashboard</Link>
                        ) : (
                            <>
                                <Link href="/login" className="lp-btn lp-btn-ghost sm">Sign in</Link>
                                <Link href="/login" className="lp-btn lp-btn-red sm">Get started</Link>
                            </>
                        )}
                    </div>
                </div>
                <span className="lp-prog-top" />
            </header>

            <main className="flex-1 lp-layer">
                {/* Hero */}
                <section className="lp-wrap lp-center" style={{ paddingTop: 72, paddingBottom: 40 }}>
                    <span className="lp-badge"><span className="lp-dot" /> Cloud video mirroring and hosting</span>
                    <h1 className="lp-h1">Scale your media vault with <span className="lp-grad">MultiServer</span></h1>
                    <p className="lp-lead" style={{ maxWidth: 640, margin: '20px auto 0', fontSize: 17 }}>
                        Upload once, mirror everywhere. Fast players, private links and reliable delivery from a single dashboard.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3" style={{ marginTop: 32 }}>
                        <Link href={primaryHref} className="lp-btn lp-btn-red">Get started free <IconChevronRight size={16} /></Link>
                        <a href="#features" className="lp-btn lp-btn-ghost">Explore features</a>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginTop: 28 }}>
                        {CHIPS.map(({ Icon, label }) => (
                            <span key={label} className="lp-chip"><Icon size={13} /> {label}</span>
                        ))}
                    </div>
                    <Hero3D />
                </section>

                <hr className="lp-rule" />

                {/* Server marquee */}
                <section className="lp-wrap" style={{ padding: '40px 20px 8px' }} aria-label="Supported servers">
                    <p className="lp-center" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6b7587', marginBottom: 18 }}>Mirrors to the servers you already use</p>
                    <div className="lp-mq">
                        <div className="lp-mq-track">
                            {[...SERVER_NAMES, ...SERVER_NAMES].map((n, i) => <span key={`${n}-${i}`}>{n}</span>)}
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="lp-wrap" style={{ padding: '40px 20px 0' }}>
                    <Reveal>
                        <div className="lp-stats">
                            <div className="lp-stat"><CountUp to={SERVER_COUNT} suffix="+" /><span>Servers supported</span></div>
                            <div className="lp-stat"><CountUp to={3} /><span>Steps to publish</span></div>
                            <div className="lp-stat"><CountUp to={0} /><span>Cookies on the player</span></div>
                        </div>
                    </Reveal>
                </section>

                {/* 3D showcase */}
                <section className="lp-wrap lp-sec">
                    <Reveal>
                        <div className="lp-show">
                            <div>
                                <span className="lp-eyebrow">Built for speed</span>
                                <h2 className="lp-h2">One upload. <span className="lp-grad">Every server.</span></h2>
                                <p className="lp-lead">Send a file once and MultiServer takes care of the rest, so every viewer gets a working link.</p>
                                <ul className="lp-list">
                                    {['Mirror to many hosts in the background', 'Player, embed code and download page in one click', 'Links survive a domain change'].map((t) => (
                                        <li key={t}><span className="k"><IconCheck size={12} /></span><span>{t}</span></li>
                                    ))}
                                </ul>
                            </div>
                            <FeatureCube />
                        </div>
                    </Reveal>
                </section>

                {/* Features */}
                <section id="features" className="lp-wrap" style={{ paddingTop: 24, paddingBottom: 72, scrollMarginTop: 80 }}>
                    <Reveal>
                        <div className="lp-center" style={{ marginBottom: 36 }}>
                            <span className="lp-eyebrow">Features</span>
                            <h2 className="lp-h2">Everything you need to publish video</h2>
                        </div>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map(({ Icon, title, text }, i) => (
                            <Reveal key={title} delay={(i % 3) * 90}>
                                <TiltCard>
                                    <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                                    <div className="lp-ic"><Icon size={20} /></div>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </TiltCard>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <hr className="lp-rule" />

                {/* How it works */}
                <section id="how" className="lp-wrap lp-sec" style={{ scrollMarginTop: 80 }}>
                    <Reveal>
                        <div className="lp-center" style={{ marginBottom: 36 }}>
                            <span className="lp-eyebrow">How it works</span>
                            <h2 className="lp-h2">Live in three steps</h2>
                        </div>
                    </Reveal>
                    <div className="lp-steps">
                        {STEPS.map((step, i) => (
                            <Reveal key={step.title} delay={i * 120}>
                                <div className="lp-card lp-step">
                                    <div className="lp-num">{i + 1}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <h3 style={{ marginTop: 16 }}>{step.title}</h3>
                                        <p>{step.text}</p>
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                {/* Final CTA */}
                <section id="start" className="lp-wrap" style={{ paddingBottom: 80, scrollMarginTop: 80 }}>
                    <Reveal>
                        <div className="lp-cta">
                            <span className="lp-eyebrow">Get started</span>
                            <h2 className="lp-h2" style={{ fontSize: 'clamp(26px, 5vw, 44px)' }}>Ready to <span className="lp-grad">go multi-server</span>?</h2>
                            <p className="lp-lead" style={{ maxWidth: 520, margin: '14px auto 0' }}>Create a free account and publish your first mirrored video in minutes.</p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3" style={{ marginTop: 28 }}>
                                <Link href={primaryHref} className="lp-btn lp-btn-red">{user ? 'Open dashboard' : 'Create your account'} <IconCheck size={16} /></Link>
                                {!user && <Link href="/login" className="lp-btn lp-btn-ghost">Sign in</Link>}
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

            <footer className="lp-foot lp-layer">
                <div className="lp-wrap">
                    <div className="lp-foot-grid">
                        <div>
                            <BrandMark name="MultiServer" anim="none" size={24} fontSize={13} />
                            <p style={{ margin: '14px 0 0', maxWidth: 320, fontSize: 13, lineHeight: 1.65, color: '#8b95a7' }}>Cloud video mirroring and hosting. Upload once, publish everywhere.</p>
                        </div>
                        <div>
                            <h5>Product</h5>
                            <a href="#features">Features</a>
                            <a href="#how">How it works</a>
                            <a href="#start">Get started</a>
                        </div>
                        <div>
                            <h5>Account</h5>
                            {user ? <Link href="/dashboard">Dashboard</Link> : <Link href="/login">Sign in</Link>}
                            <span className="l">Privacy Policy</span>
                            <span className="l">Terms of Service</span>
                        </div>
                    </div>
                    <div className="lp-foot-bot">
                        <span>© 2026 MultiServer Cloud Platform. All rights reserved.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
