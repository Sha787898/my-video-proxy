'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MASCOTS, mascotById } from '../utils/mascots';
import { parseConfig, resolvePrefs, readOverrides, saveOverrides, isLocked } from '../utils/playerConfig';

// ==========================================================================
// A small animated helper character (SVG, no images). She follows your cursor with her eyes, blinks, floats, reacts when
// touched, can be dragged anywhere, falls asleep when nothing happens and talks a little (about the page you are on).
// The admin can switch her off for everybody (Player settings > Mascot); a visitor / user can hide her or change the
// character from her own little buttons.
// ==========================================================================

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const LS_POS = 'ms_mascot_pos';

// your OWN sticker characters: files you put in public/mascots/ plus a list in public/mascots/mascots.json
// { "characters": [ { "id": "mine", "name": "My girl", "idle": "idle.webp", "reactions": ["hello.webp", "happy.webp"] } ] }
const FILE_OK = /^[\w.-]{1,80}\.(webp|png|gif|apng|webm)$/i;
export function cleanCustom(json) {
    const out = [];
    const list = json && Array.isArray(json.characters) ? json.characters : [];
    list.slice(0, 12).forEach((c) => {
        if (!c || !/^[a-z0-9-]{2,24}$/.test(String(c.id)) || !FILE_OK.test(String(c.idle))) return;
        const reactions = (Array.issince ? [] : Array.isArray(c.reactions) ? c.reactions : []).filter((f) => FILE_OK.test(String(f))).slice(0, 12);
        out.push({ id: String(c.id), name: String(c.name || c.id).replace(/[<>]/g, '').slice(0, 20), sticker: true, idle: `/mascots/${c.idle}`, reactions: reactions.map((f) => `/mascots/${f}`) });
    });
    return out;
}
const pick = (arr, not) => { let v = arr[Math.floor(Math.random() * arr.length)]; for (let i = 0; i < 4 && v === not; i++) v = arr[Math.floor(Math.random() * arr.length)]; return v; };

// touch reactions: [pose/mood, text]
const TOUCH = [
    ['wave', 'Hi hi! 👋'], ['peace', 'Peace! ✌️'], ['heart', 'Thank you! 💖'], ['wink', 'Hehe~ 😉'],
    ['cheer', 'You can do it! ✨'], ['shy', 'Eh? You touched me… 🙈'], ['love', 'You are the best! 💕'], ['wave', 'Boop! Hello there!'],
];
const CHATTER = ['Remember to drink some water 💧', 'You are doing great today ✨', 'Need a stretch? Roll your shoulders! 🌸', 'I am here if you need me 💬', 'Take a short break, you deserve it ☕'];
const PAGE = {
    '/dashboard': ['Welcome back! Let me show you around 🌟', 'Your numbers are on this page 📈'],
    '/gdrive-upload': ['Paste your links and press Generate. I will cheer for you! 📣', 'Pick the upload profile first, then go! 🚀'],
    '/drive-upload': ['One file ID, one click. Easy! ✨'],
    '/remote-upload': ['Direct links work here 🔗'],
    '/web-upload': ['Drop a file here and I will watch it go 📤'],
    '/processing-files': ['The servers are busy. I will keep an eye on them 👀', 'Hang in there, files are being mirrored! 💪'],
    '/file-manager': ['Folders keep things tidy. I like tidy! 📁', 'Select files to copy many links at once ✨'],
    '/embed-generator': ['Advanced mode can add other sites\' embed links too 🔧'],
    '/analytics': ['Look at those visitors! 🌍', 'Hover the chart for exact numbers 📊'],
    '/manage-sites': ['Profiles let one upload go to just a few servers 🎯'],
    '/player-settings': ['Change the look for everyone here 🎨', 'You can switch me off for all visitors too 😢'],
    download: ['Enjoy the show! 🍿', 'Pick any server. They are all checked ✅'],
};

const CSS = `
.mc-wrap { position: fixed; z-index: 45; pointer-events: none; width: var(--mc-w, 112px); user-select: none; -webkit-user-select: none; touch-action: none; }
.mc-char { touch-action: none; position: relative; width: 100%; aspect-ratio: 5 / 6; pointer-events: auto; cursor: grab; background: none; border: 0; padding: 0; -webkit-tap-highlight-color: transparent; filter: drop-shadow(0 8px 14px rgba(0,0,0,.45)); animation: mc-float 3.6s ease-in-out infinite; outline: none; }
.mc-char:active { cursor: grabbing; }
.mc-char:focus-visible { outline: 2px solid rgba(255,255,255,.7); outline-offset: 4px; border-radius: 16px; }
.mc-char svg { width: 100%; height: 100%; display: block; overflow: visible; }
.mc-still .mc-char, .mc-still .mc-sway, .mc-still .mc-breath { animation: none !important; }
.mc-drag .mc-char { animation: none; cursor: grabbing; transform: scale(1.06) rotate(-3deg); }
@keyframes mc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.mc-sway { transform-box: fill-box; transform-origin: 50% 12%; animation: mc-sway 4s ease-in-out infinite; }
@keyframes mc-sway { 0%, 100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
.mc-breath { transform-box: fill-box; transform-origin: 50% 100%; animation: mc-breath 3.6s ease-in-out infinite; }
@keyframes mc-breath { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.025); } }
.mc-blink { transform-box: fill-box; transform-origin: 50% 55%; animation: mc-blink 4.6s infinite; }
@keyframes mc-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.08); } }
.mc-arm { transition: transform .35s cubic-bezier(.3,1.4,.5,1); }
.mc-wavehand { transform-box: fill-box; transform-origin: 50% 0%; animation: mc-wave .5s ease-in-out infinite alternate; }
@keyframes mc-wave { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
.mc-up { animation: mc-up 1.8s ease-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes mc-up { 0% { opacity: 0; transform: translateY(8px) scale(.6); } 25% { opacity: 1; } 100% { opacity: 0; transform: translateY(-26px) scale(1.1); } }
.mc-twinkle { animation: mc-tw .9s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
@keyframes mc-tw { from { opacity: .3; transform: scale(.6) rotate(0); } to { opacity: 1; transform: scale(1.1) rotate(25deg); } }
.mc-z { animation: mc-zz 2.2s ease-in-out infinite; }
@keyframes mc-zz { 0% { opacity: 0; transform: translate(0, 6px); } 40% { opacity: 1; } 100% { opacity: 0; transform: translate(8px, -14px); } }
.mc-st { position: relative; width: 100%; height: 100%; transform-origin: 50% 90%; }
.mc-st video, .mc-st img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; -webkit-user-drag: none; }
.mc-st-wave, .mc-st-peace, .mc-st-wink { animation: mc-s-wig .5s ease-in-out 3; }
.mc-st-cheer, .mc-st-love, .mc-st-heart { animation: mc-s-bounce .45s ease-out 4; }
.mc-st-shy { animation: mc-s-shy 1.2s ease-in-out 2; }
.mc-st-pout { animation: mc-s-shake .12s linear 12; }
.mc-st-dizzy { animation: mc-s-spin .8s linear 2; }
.mc-st-sleep { filter: grayscale(.6) brightness(.8); transform: scale(.96) rotate(-4deg); transition: filter .4s, transform .4s; }
.mc-st-fx { position: absolute; inset: 0; pointer-events: none; }
.mc-st-fx i { position: absolute; font-style: normal; font-size: 20px; animation: mc-up 1.8s ease-out infinite; }
@keyframes mc-s-wig { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-7deg); } 75% { transform: rotate(7deg); } }
@keyframes mc-s-bounce { 0%, 100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-14px) scale(1.05, .96); } }
@keyframes mc-s-shy { 0%, 100% { transform: scale(1); } 50% { transform: scale(.9) rotate(-5deg); } }
@keyframes mc-s-shake { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
@keyframes mc-s-spin { to { transform: rotate(360deg); } }
.mc-bubble { position: absolute; bottom: calc(100% + 6px); max-width: 210px; min-width: 90px; width: max-content; padding: 8px 12px; border-radius: 14px; background: #fff; color: #1a1a22; font: 600 12px/1.4 Inter, system-ui, sans-serif; box-shadow: 0 10px 26px rgba(0,0,0,.45); pointer-events: none; animation: mc-pop .25s cubic-bezier(.3,1.5,.5,1) both; }
.mc-bubble::after { content: ''; position: absolute; top: 100%; width: 12px; height: 12px; background: #fff; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.mc-bubble.r { right: 8px; } .mc-bubble.r::after { right: 26px; }
.mc-bubble.l { left: 8px; } .mc-bubble.l::after { left: 26px; }
@keyframes mc-pop { from { opacity: 0; transform: translateY(6px) scale(.85); } to { opacity: 1; transform: none; } }
.mc-tools { position: absolute; top: -4px; right: -6px; display: flex; flex-direction: column; gap: 4px; opacity: 0; transform: translateX(6px); transition: opacity .2s, transform .2s; pointer-events: none; }
.mc-wrap:hover .mc-tools, .mc-wrap:focus-within .mc-tools, .mc-wrap.mc-touch .mc-tools { opacity: 1; transform: none; pointer-events: auto; }
.mc-tools button { width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(14,14,18,.88); color: #e8e8ee; font: 700 13px/1 Inter, system-ui, sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); transition: background .2s, transform .2s; }
.mc-tools button:hover { background: rgba(229,56,59,.85); transform: scale(1.1); }
.mc-tools button.off { opacity: .55; }
.mc-summon { position: fixed; z-index: 45; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(14,14,18,.9); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; backdrop-filter: blur(6px); transition: transform .2s, border-color .2s; }
.mc-summon:hover { transform: scale(1.1) rotate(-6deg); border-color: rgba(255,107,115,.7); }
@media (max-width: 640px) { .mc-wrap { --mc-w: 84px !important; } .mc-bubble { max-width: 170px; font-size: 11.5px; } }
@media (prefers-reduced-motion: reduce) { .mc-char, .mc-sway, .mc-breath, .mc-blink, .mc-wavehand, .mc-up, .mc-twinkle, .mc-z { animation: none !important; } }
`;

const heartPath = 'M0 -4 C-1 -9 -9 -9 -9 -3 C-9 3 -2 7 0 10 C2 7 9 3 9 -3 C9 -9 1 -9 0 -4Z';
const starPath = 'M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2Z';

// ---------- the drawing ----------
function Girl({ c, mood, look }) {
    const arms = {
        idle: [10, -10], wave: [10, -150], peace: [10, -140], cheer: [150, -150], heart: [165, -165], shy: [-150, 150], love: [160, -160],
        wink: [10, -140], dizzy: [25, -25], sleep: [6, -6], pout: [-60, 60],
    }[mood] || [10, -10];
    const happy = ['cheer', 'love', 'heart'].includes(mood);
    const eyeClosed = mood === 'sleep';
    const winkR = mood === 'wink' || mood === 'peace';
    const ex = look.x; const ey = look.y;

    const eye = (cx, side) => {
        const cy = 104;
        if (eyeClosed) return <path d={`M${cx - 9} ${cy} Q${cx} ${cy + 7} ${cx + 9} ${cy}`} stroke="#3b2a2a" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
        if (happy && mood !== 'love' && mood !== 'heart') return <path d={`M${cx - 9} ${cy + 3} Q${cx} ${cy - 8} ${cx + 9} ${cy + 3}`} stroke="#3b2a2a" strokeWidth="2.6" fill="none" strokeLinecap="round" />;
        if (winkR && side === 'r') return <path d={`M${cx - 9} ${cy + 2} Q${cx} ${cy - 7} ${cx + 9} ${cy + 2}`} stroke="#3b2a2a" strokeWidth="2.6" fill="none" strokeLinecap="round" />;
        if (mood === 'love' || mood === 'heart') return <path d={heartPath} transform={`translate(${cx} ${cy}) scale(1.05)`} fill="#ff4d6d" />;
        if (mood === 'dizzy') return <g stroke="#3b2a2a" strokeWidth="2.6" strokeLinecap="round"><path d={`M${cx - 6} ${cy - 6} L${cx + 6} ${cy + 6}`} /><path d={`M${cx + 6} ${cy - 6} L${cx - 6} ${cy + 6}`} /></g>;
        const sx = mood === 'shy' ? -1.4 : ex; const sy = mood === 'shy' ? 2.4 : ey;
        return (
            <g className="mc-blink">
                <ellipse cx={cx} cy={cy} rx="10" ry="12" fill="#fff" stroke="#3b2a2a" strokeWidth="1" />
                <ellipse cx={cx + sx} cy={cy + sy} rx="7.4" ry="9.8" fill="url(#mc-iris)" />
                <ellipse cx={cx + sx} cy={cy + sy + 0.6} rx="3.4" ry="5" fill="#1d1216" />
                <path d={`M${cx + sx - 6} ${cy + sy - 2} Q${cx + sx} ${cy + sy - 11} ${cx + sx + 6} ${cy + sy - 2} Q${cx + sx} ${cy + sy - 6} ${cx + sx - 6} ${cy + sy - 2}Z`} fill="#000" opacity=".28" />
                <ellipse cx={cx + sx - 2.6} cy={cy + sy - 3.8} rx="2.9" ry="3.2" fill="#fff" />
                <circle cx={cx + sx + 3} cy={cy + sy + 4} r="1.5" fill="#fff" opacity=".9" />
                <circle cx={cx + sx + 4.4} cy={cy + sy - 1.4} r=".8" fill="#fff" opacity=".8" />
                <path d={`M${cx - 11} ${cy - 4} Q${cx} ${cy - 15} ${cx + 11} ${cy - 4}`} stroke="#2a1d1d" strokeWidth="3.2" fill="none" strokeLinecap="round" />
                <path d={`M${cx - 9} ${cy + 9} Q${cx} ${cy + 13} ${cx + 9} ${cy + 9}`} stroke="#3b2a2a" strokeWidth=".9" fill="none" opacity=".5" />
            </g>
        );
    };

    const mouth = () => {
        if (mood === 'sleep') return <ellipse cx="100" cy="128" rx="3" ry="3.4" fill="#d9777a" />;
        if (mood === 'dizzy') return <path d="M90 129 q5 -5 10 0 t10 0" stroke="#a8474b" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
        if (mood === 'shy') return <path d="M94 130 q3 -3 6 0 q3 3 6 0" stroke="#a8474b" strokeWidth="2" fill="none" strokeLinecap="round" />;
        if (mood === 'pout') return <path d="M92 132 Q100 126 108 132" stroke="#a8474b" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
        if (happy || mood === 'wave') return (<g><path d="M89 123 Q100 142 111 123 Z" fill="#c9444a" /><path d="M94 132 Q100 138 106 132 Q100 129 94 132Z" fill="#ff8c94" /></g>);
        return <path d="M91 125 Q100 134 109 125" stroke="#a8474b" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    };

    const brows = mood === 'pout'
        ? <g stroke="#6b4a3a" strokeWidth="2.6" strokeLinecap="round"><path d="M71 88 L89 94" /><path d="M129 88 L111 94" /></g>
        : <g stroke="#7a5a48" strokeWidth="2.2" strokeLinecap="round" fill="none"><path d={`M72 ${mood === 'shy' ? 85 : 89} Q80 ${mood === 'shy' ? 80 : 85} 88 ${mood === 'shy' ? 85 : 88}`} /><path d={`M112 ${mood === 'shy' ? 85 : 88} Q120 ${mood === 'shy' ? 80 : 85} 128 ${mood === 'shy' ? 85 : 89}`} /></g>;

    // hair behind the head
    const backHair = () => {
        const cap = <ellipse cx="100" cy="94" rx="51" ry="49" fill={c.hairDark} />;
        if (c.style === 'twin') return (<g className="mc-sway">{cap}<path d="M62 92 Q22 116 38 186 Q60 178 66 134Z" fill={c.hair} /><path d="M138 92 Q178 116 162 186 Q140 178 134 134Z" fill={c.hair} /><circle cx="60" cy="92" r="7" fill={c.accent} /><circle cx="140" cy="92" r="7" fill={c.accent} /></g>);
        if (c.style === 'bob') return (<g className="mc-sway"><path d="M45 98 Q42 152 64 152 L136 152 Q158 152 155 98 Q150 42 100 40 Q50 42 45 98Z" fill={c.hair} /></g>);
        if (c.style === 'long') return (<g className="mc-sway"><path d="M45 98 Q36 196 70 210 L130 210 Q164 196 155 98 Q150 42 100 40 Q50 42 45 98Z" fill={c.hair} /></g>);
        if (c.style === 'bun') return (<g>{cap}<g className="mc-sway"><circle cx="100" cy="42" r="17" fill={c.hair} /><path d="M86 48 Q100 56 114 48" stroke={c.hairDark} strokeWidth="2.5" fill="none" /></g></g>);
        return (<g>{cap}<g className="mc-sway"><path d="M146 80 Q192 84 180 156 Q172 184 154 174 Q170 130 144 108Z" fill={c.hair} /><circle cx="148" cy="82" r="6.5" fill={c.accent} /></g></g>);
    };

    const top = () => {
        const body = <path d="M66 146 Q100 136 134 146 L141 208 Q100 220 59 208Z" fill={c.outfit} />;
        if (c.top === 'hoodie') return (<g>{body}<path d="M76 144 Q100 166 124 144 Q100 152 76 144Z" fill={c.outfitDark} /><path d="M92 156 L90 176 M108 156 L110 176" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><rect x="82" y="186" width="36" height="14" rx="6" fill={c.outfitDark} opacity=".7" /></g>);
        if (c.top === 'sweater') return (<g>{body}<path d="M80 144 Q100 158 120 144" stroke={c.outfitDark} strokeWidth="7" fill="none" strokeLinecap="round" /><path d="M62 190 Q100 200 138 190" stroke={c.accent} strokeWidth="4" fill="none" /></g>);
        if (c.top === 'jacket') return (<g>{body}<path d="M100 148 L100 214" stroke={c.outfitDark} strokeWidth="3" /><path d="M84 144 L100 166 L116 144" fill={c.accent} opacity=".9" /><rect x="94" y="150" width="12" height="3" rx="1.5" fill={c.outfitDark} /></g>);
        if (c.top === 'dress') return (<g><path d="M70 146 Q100 138 130 146 L136 184 L152 220 Q100 232 48 220 L64 184Z" fill={c.outfit} /><path d="M64 184 L136 184" stroke={c.accent} strokeWidth="5" /><path d="M84 144 Q100 156 116 144" stroke={c.outfitDark} strokeWidth="5" fill="none" strokeLinecap="round" /></g>);
        return (<g>{body}<path d="M82 144 Q100 156 118 144" stroke={c.accent} strokeWidth="4.5" fill="none" strokeLinecap="round" /><path d="M66 180 Q100 188 136 180" stroke={c.accent} strokeWidth="3.5" fill="none" /></g>);
    };

    const accessory = () => {
        if (c.acc === 'cat') return (<g><path d="M56 78 Q100 36 144 78" stroke={c.accent} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M58 70 L64 40 L82 58Z" fill={c.accent} /><path d="M142 70 L136 40 L118 58Z" fill={c.accent} /><path d="M62 62 L66 48 L74 57Z" fill="#ffd3d6" /><path d="M138 62 L134 48 L126 57Z" fill="#ffd3d6" /></g>);
        if (c.acc === 'star') return (<g><path d={starPath} transform="translate(68 70) scale(1.1)" fill={c.accent} stroke="#fff" strokeWidth=".8" /><path d={starPath} transform="translate(134 62) scale(.6)" fill={c.accent} /></g>);
        if (c.acc === 'phones') return (<g><path d="M52 98 Q52 40 100 40 Q148 40 148 98" stroke={c.accent} strokeWidth="5.5" fill="none" strokeLinecap="round" /><rect x="42" y="92" width="14" height="26" rx="7" fill={c.accent} /><rect x="144" y="92" width="14" height="26" rx="7" fill={c.accent} /><rect x="46" y="97" width="6" height="16" rx="3" fill="#fff" opacity=".5" /></g>);
        if (c.acc === 'bow') return (<g><path d="M118 62 L142 50 L142 76Z" fill={c.accent} /><path d="M118 62 L94 50 L94 76Z" fill={c.accent} /><circle cx="118" cy="62" r="6" fill="#c92a2e" /></g>);
        return (<g stroke="#2a2a31" strokeWidth="2.6" fill="rgba(255,255,255,.14)"><circle cx="80" cy="104" r="14" /><circle cx="120" cy="104" r="14" /><path d="M94 102 Q100 98 106 102" fill="none" /><path d="M66 100 L54 96 M134 100 L146 96" fill="none" /></g>);
    };

    const arm = (side, deg) => {
        const sx = side === 'l' ? 70 : 130;
        const hand = mood === 'wave' && side === 'r';
        const peace = (mood === 'peace' || mood === 'wink') && side === 'r';
        return (
            <g key={side} className="mc-arm" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${sx}px 152px`, transformBox: 'view-box' }}>
                <g className={hand ? 'mc-wavehand' : ''} style={hand ? { transformOrigin: `${sx}px 152px`, transformBox: 'view-box' } : undefined}>
                    <rect x={sx - 7} y="150" width="14" height="38" rx="7" fill={c.outfit} stroke={c.outfitDark} strokeWidth="1" />
                    <circle cx={sx} cy="192" r="8" fill={c.skin} />
                    {peace && <g stroke={c.skin} strokeWidth="4" strokeLinecap="round"><path d={`M${sx - 3} 188 L${sx - 7} 205`} /><path d={`M${sx + 3} 188 L${sx + 7} 205`} /></g>}
                </g>
            </g>
        );
    };

    return (
        <svg viewBox="0 0 200 240" role="img" aria-label={`${c.name}, the helper`}>
            <defs>
                <radialGradient id="mc-iris" cx="50%" cy="68%" r="75%">
                    <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
                    <stop offset="45%" stopColor={c.eye} />
                    <stop offset="100%" stopColor={c.eye} stopOpacity=".92" />
                </radialGradient>
                <linearGradient id="mc-hairshine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity=".5" />
                    <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
            </defs>
            {backHair()}
            <g className="mc-breath">
                <rect x="92" y="134" width="16" height="16" rx="6" fill={c.skin} />
                {top()}
                <rect x="78" y="212" width="15" height="14" rx="6" fill={c.skin} />
                <rect x="107" y="212" width="15" height="14" rx="6" fill={c.skin} />
                <ellipse cx="85" cy="228" rx="12" ry="6" fill={c.accent} />
                <ellipse cx="115" cy="228" rx="12" ry="6" fill={c.accent} />
            </g>
            <ellipse cx="100" cy="100" rx="47" ry="43" fill={c.skin} />
            <ellipse cx="100" cy="84" rx="40" ry="10" fill="#c98c78" opacity=".16" />
            <circle cx="100" cy="117" r="1.1" fill="#c98c78" opacity=".7" />
            <ellipse cx="70" cy="117" rx="9" ry="5.5" fill="#ff8c94" opacity={mood === 'shy' || mood === 'love' ? 0.85 : 0.5} />
            <ellipse cx="130" cy="117" rx="9" ry="5.5" fill="#ff8c94" opacity={mood === 'shy' || mood === 'love' ? 0.85 : 0.5} />
            {eye(80, 'l')}
            {eye(120, 'r')}
            {brows}
            {mouth()}
            <path d="M52 98 Q50 46 100 44 Q150 46 148 98 Q134 74 118 88 Q106 66 94 88 Q76 72 52 98Z" fill={c.hair} />
            <path d="M70 62 Q86 50 106 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".35" />
            <path d="M60 80 Q82 56 100 58 Q124 56 142 80 Q124 62 100 66 Q76 62 60 80Z" fill="url(#mc-hairshine)" />
            <path d="M52 98 Q50 118 58 142 Q66 124 64 98Z" fill={c.hair} />
            <path d="M148 98 Q150 118 142 142 Q134 124 136 98Z" fill={c.hair} />
            <path d="M58 104 Q56 122 60 136" stroke={c.hairDark} strokeWidth="1.2" fill="none" opacity=".55" />
            <path d="M142 104 Q144 122 140 136" stroke={c.hairDark} strokeWidth="1.2" fill="none" opacity=".55" />
            <path d="M92 52 Q94 66 90 80 M108 52 Q106 66 110 80 M76 58 Q78 70 74 84 M124 58 Q122 70 126 84" stroke={c.hairDark} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".5" />
            <path d="M100 46 Q94 30 108 22" stroke={c.hair} strokeWidth="3.4" fill="none" strokeLinecap="round" />
            <g stroke="#ff6f7a" strokeWidth="1.3" strokeLinecap="round" opacity=".7"><path d="M64 113 l3 5 M69 112 l3 5 M74 112 l3 5" /><path d="M126 112 l3 5 M131 112 l3 5 M136 113 l3 5" /></g>
            {accessory()}
            {arm('l', arms[0])}
            {arm('r', arms[1])}

            {(mood === 'love' || mood === 'heart') && [0, 1, 2].map((i) => <path key={i} className="mc-up" style={{ animationDelay: `${i * 0.55}s` }} d={heartPath} transform={`translate(${70 + i * 30} ${30 - i * 4})`} fill="#ff4d6d" />)}
            {mood === 'cheer' && [[40, 40], [160, 48], [30, 110], [172, 120]].map(([x, y], i) => <path key={i} className="mc-twinkle" style={{ animationDelay: `${i * 0.2}s` }} d={starPath} transform={`translate(${x} ${y})`} fill="#ffd166" />)}
            {mood === 'sleep' && <g fill="#cfd6ff" fontFamily="Inter, sans-serif" fontWeight="700"><text className="mc-z" x="146" y="60" fontSize="22">Z</text><text className="mc-z" style={{ animationDelay: '.7s' }} x="160" y="40" fontSize="16">z</text></g>}
            {mood === 'dizzy' && <g stroke="#8ec5ff" strokeWidth="2.4" fill="none" strokeLinecap="round"><path d="M138 70 q6 -8 12 0 q-6 8 -12 0" /><circle cx="60" cy="64" r="3" fill="#8ec5ff" /></g>}
            {mood === 'pout' && <g stroke="#e5383b" strokeWidth="2.6" strokeLinecap="round"><path d="M144 66 l8 -4 M146 58 l4 8 M152 66 l-8 -4" /></g>}
        </svg>
    );
}

// a sticker character (your own .webm / .webp / .png file): it cannot change its drawing, so it bounces, wiggles, shakes or spins
function Sticker({ c, mood }) {
    const isVideo = /\.(webm|mp4)$/i.test(c.src);
    return (
        <div className={`mc-st mc-st-${mood}`}>
            {isVideo
                ? <video src={c.src} autoPlay loop muted playsInline preload="auto" aria-label={c.name} />
                : <img src={c.src} alt={c.name} draggable={false} />}
            <div className="mc-st-fx" aria-hidden="true">
                {(mood === 'love' || mood === 'heart') && ['❤', '💖', '❤'].map((h, i) => <i key={i} style={{ left: `${20 + i * 28}%`, top: '10%', animationDelay: `${i * 0.5}s` }}>{h}</i>)}
                {mood === 'cheer' && ['✨', '⭐', '✨'].map((h, i) => <i key={i} style={{ left: `${10 + i * 38}%`, top: '14%', animationDelay: `${i * 0.3}s` }}>{h}</i>)}
                {mood === 'sleep' && <i style={{ right: '10%', top: '6%' }}>💤</i>}
            </div>
        </div>
    );
}

// ---------- the behaviour ----------
export default function Mascot({ config, fetchConfig = false, page }) {
    const path = usePathname();
    const key = page || path || '';
    const [mounted, setMounted] = useState(false);
    const [raw, setRaw] = useState(config);
    const [ov, setOv] = useState({});
    const [mood, setMood] = useState('idle');
    const [say, setSay] = useState('');
    const [look, setLook] = useState({ x: 0, y: 0 });
    const [pos, setPos] = useState({ r: 18, b: 18 });
    const [drag, setDrag] = useState(false);
    const [touch, setTouch] = useState(false);
    const wrapRef = useRef(null);
    const tm = useRef({}); // timers
    const last = useRef(0);
    const clicks = useRef([]);
    const lastTouch = useRef(null);
    const moodRef = useRef('idle');
    moodRef.current = mood;

    useEffect(() => { setRaw(config); }, [config]);

    // first paint is client-only: the character uses random choices and the current time
    useEffect(() => {
        setMounted(true); last.current = Date.now();
        setOv(readOverrides());
        try { const p = JSON.parse(localStorage.getItem(LS_POS) || 'null'); if (p && typeof p.r === 'number' && typeof p.b === 'number') setPos(p); } catch (e) { /* ignore */ }
        const onPrefs = () => setOv(readOverrides());
        window.addEventListener('ms-prefs', onPrefs);
        return () => window.removeEventListener('ms-prefs', onPrefs);
    }, []);

    // the admin's settings (admin pages read them themselves; the download page passes them in)
    useEffect(() => {
        if (!fetchConfig) return;
        let alive = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data } = await supabase.from('settings').select('value').eq('user_id', session.user.id).eq('key', 'player_config').maybeSingle();
            if (alive && data) setRaw(data.value);
        })();
        return () => { alive = false; };
    }, [fetchConfig]);

    const cfg = parseConfig(raw);
    const prefs = resolvePrefs(cfg, ov);
    const locked = isLocked(cfg.locked, 'mascot');
    const c = mascotById(prefs.mascotChar);
    const on = prefs.mascot !== false;
    const talk = prefs.mascotTalk !== false;

    const react = useCallback((m, text, ms = 2600) => {
        clearTimeout(tm.current.mood);
        last.current = Date.now();
        setMood(m);
        if (text) {
            setSay(text);
            clearTimeout(tm.current.say);
            tm.current.say = setTimeout(() => setSay(''), Math.max(2400, ms) + text.length * 25);
        }
        if (m !== 'sleep') tm.current.mood = setTimeout(() => setMood('idle'), ms);
    }, []);

    // greeting once per tab and page
    useEffect(() => {
        if (!mounted || !on) return undefined;
        let t;
        try {
            const k = `ms_mascot_hi_${key}`;
            if (!sessionStorage.getItem(k)) {
                sessionStorage.setItem(k, '1');
                t = setTimeout(() => react('wave', pick(PAGE[key] || PAGE[Object.keys(PAGE).find((p) => key.startsWith(p) && p !== '/')] || ['Hello! 👋']), 3200), 1400);
            }
        } catch (e) { /* ignore */ }
        return () => clearTimeout(t);
    }, [mounted, on, key, react]);

    // events from the rest of the site: window.dispatchEvent(new CustomEvent('ms-mascot', { detail: { mood, text } }))
    useEffect(() => {
        const h = (e) => { const d = e.detail || {}; react(d.mood || 'cheer', d.text || '', 3000); };
        window.addEventListener('ms-mascot', h);
        return () => window.removeEventListener('ms-mascot', h);
    }, [react]);

    // eyes follow the pointer
    useEffect(() => {
        if (!mounted || !on) return undefined;
        let raf = 0;
        const move = (e) => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                const el = wrapRef.current;
                if (!el || moodRef.current === 'sleep') return;
                const r = el.getBoundingClientRect();
                const dx = e.clientX - (r.left + r.width / 2);
                const dy = e.clientY - (r.top + r.height * 0.45);
                const d = Math.hypot(dx, dy) || 1;
                const k = Math.min(1, d / 160);
                const nx = Math.round(((dx / d) * 2.6 * k) * 2) / 2;
                const ny = Math.round(((dy / d) * 2.6 * k) * 2) / 2;
                setLook((p) => (p.x === nx && p.y === ny ? p : { x: nx, y: ny }));
            });
        };
        window.addEventListener('pointermove', move, { passive: true });
        return () => { window.removeEventListener('pointermove', move); if (raf) cancelAnimationFrame(raf); };
    }, [mounted, on]);

    // sleeps when nothing happens, says something now and then
    useEffect(() => {
        if (!mounted || !on) return undefined;
        const wake = () => { last.current = Date.now(); if (moodRef.current === 'sleep') { setMood('idle'); setSay('Mm? I am awake! 😳'); clearTimeout(tm.current.say); tm.current.say = setTimeout(() => setSay(''), 2200); } };
        ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
        const iv = setInterval(() => {
            const idle = Date.now() - last.current;
            if (idle > 60000 && moodRef.current === 'idle') { setMood('sleep'); setSay(''); }
            else if (talk && idle > 24000 && idle < 60000 && moodRef.current === 'idle' && Math.random() < 0.35) {
                const pool = PAGE[key] || CHATTER;
                react(pick(['wave', 'wink', 'heart', 'peace']), pick(Math.random() < 0.5 ? pool : CHATTER), 2600);
                last.current = Date.now() - 12000;
            }
        }, 5000);
        return () => { ['pointerdown', 'keydown'].forEach((ev) => window.removeEventListener(ev, wake)); clearInterval(iv); };
    }, [mounted, on, talk, key, react]);

    useEffect(() => () => { Object.values(tm.current).forEach(clearTimeout); }, []);

    // touch / drag
    const press = useRef(null);
    const onDown = (e) => {
        e.preventDefault();
        last.current = Date.now();
        press.current = { x: e.clientX, y: e.clientY, r: pos.r, b: pos.b, moved: false };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (e.pointerType === 'touch') setTouch(true);
    };
    const onMove = (e) => {
        const p = press.current;
        if (!p) return;
        const dx = e.clientX - p.x; const dy = e.clientY - p.y;
        if (!p.moved && Math.hypot(dx, dy) > 6) { p.moved = true; setDrag(true); react('cheer', 'Wheee! 🎈', 60000); }
        if (p.moved) {
            const w = wrapRef.current ? wrapRef.current.offsetWidth : 112;
            const h = wrapRef.current ? wrapRef.current.offsetHeight : 134;
            const r = Math.max(4, Math.min(window.innerWidth - w - 4, p.r - dx));
            const b = Math.max(4, Math.min(window.innerHeight - h - 4, p.b - dy));
            setPos({ r, b });
        }
    };
    const onUp = (e) => {
        const p = press.current;
        press.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (!p) return;
        if (p.moved) {
            setDrag(false);
            try { localStorage.setItem(LS_POS, JSON.stringify(pos)); } catch (err) { /* ignore */ }
            react('wave', pick(['Nice spot! 🌸', 'I like it here ✨', 'Phew, that was fun! 😆']), 2600);
            return;
        }
        // a click / tap
        const now = Date.now();
        clicks.current = [...clicks.current.filter((t) => now - t < 3200), now];
        if (clicks.current.length >= 6) {
            clicks.current = [];
            react('pout', 'Hey! Stop poking me! 😤', 2800);
            clearTimeout(tm.current.fix);
            tm.current.fix = setTimeout(() => react('shy', 'Okay okay… I forgive you 😊', 2400), 3000);
            return;
        }
        const t = pick(TOUCH, lastTouch.current);
        lastTouch.current = t;
        react(t[0], t[1], 2600);
    };
    const onDouble = () => { react('love', 'Double tap?! You really like me 💕', 3200); };

    const swap = () => {
        const i = MASCOTS.findIndex((m) => m.id === c.id);
        const next = MASCOTS[(i + 1) % MASCOTS.length];
        saveOverrides({ ...readOverrides(), mascotChar: next.id });
        setOv(readOverrides());
        react('cheer', `Hi, I am ${next.name}! ✨`, 2600);
    };
    const toggleTalk = () => { saveOverrides({ ...readOverrides(), mascotTalk: !talk }); setOv(readOverrides()); react('wink', talk ? 'I will be quiet 🤐' : 'I can chat again! 💬', 2000); };
    const hide = () => { saveOverrides({ ...readOverrides(), mascot: false }); setOv(readOverrides()); };
    const show = () => { saveOverrides({ ...readOverrides(), mascot: true }); setOv(readOverrides()); setTimeout(() => react('wave', 'I am back! 👋', 2600), 60); };

    if (!mounted) return null;
    if (!on) {
        if (locked) return null; // the admin turned her off for everyone
        return (
            <>
                <style>{CSS}</style>
                <button type="button" className="mc-summon" style={{ right: 18, bottom: 18 }} onClick={show} aria-label="Show the helper character" title="Show the helper">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9" fill={c.skin} /><path d="M3 12 Q4 3 12 3 Q20 3 21 12 Q17 8 12 10 Q7 8 3 12Z" fill={c.hair} /><circle cx="9" cy="13" r="1.3" fill="#3b2a2a" /><circle cx="15" cy="13" r="1.3" fill="#3b2a2a" /><path d="M9.5 16.5 Q12 18.5 14.5 16.5" stroke="#a8474b" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
                </button>
            </>
        );
    }

    const flipRight = typeof window !== 'undefined' ? window.innerWidth - pos.r > window.innerWidth / 2 : true;
    return (
        <>
            <style>{CSS}</style>
            <div ref={wrapRef} className={`mc-wrap ${prefs.anim === false ? 'mc-still' : ''} ${drag ? 'mc-drag' : ''} ${touch ? 'mc-touch' : ''}`} style={{ right: pos.r, bottom: pos.b }} onPointerEnter={() => { if (moodRef.current === 'idle' && Date.now() - last.current > 20000) react('wave', '', 1800); last.current = Date.now(); }}>
                {say && <div className={`mc-bubble ${flipRight ? 'r' : 'l'}`} role="status">{say}</div>}
                <button
                    type="button"
                    className="mc-char"
                    style={c.src ? { aspectRatio: '1 / 1' } : undefined}
                    aria-label={`${c.name}, the helper. Click to say hi, drag to move.`}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    onDoubleClick={onDouble}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const t = pick(TOUCH, lastTouch.current); lastTouch.current = t; react(t[0], t[1], 2600); } }}
                >
                    {c.src ? <Sticker c={c} mood={mood} /> : <Girl c={c} mood={mood} look={look} />}
                </button>
                {!locked && (
                    <div className="mc-tools">
                        <button type="button" onClick={swap} aria-label="Change character" title="Change character">↻</button>
                        <button type="button" onClick={toggleTalk} className={talk ? '' : 'off'} aria-label={talk ? 'Stop chatting' : 'Allow chatting'} title={talk ? 'Quiet mode' : 'Let her chat'}>…</button>
                        <button type="button" onClick={hide} aria-label="Hide the helper" title="Hide">×</button>
                    </div>
                )}
            </div>
        </>
    );
}
