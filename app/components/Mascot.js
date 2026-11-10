'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MASCOTS, mascotById } from '../utils/mascots';
import { answer, chipsFor, langOf, PAGE_INFO, GO_PAGES } from '../utils/mascotBrain';
import { parseConfig, resolvePrefs, readOverrides, saveOverrides, isLocked } from '../utils/playerConfig';

// ==========================================================================
// A small animated helper character (SVG, no images). She follows your cursor with her eyes, blinks, floats, reacts when
// touched, can be dragged anywhere, falls asleep when nothing happens and talks a little (about the page you are on).
// The admin can switch her off for everybody (Player settings > Mascot); a visitor / user can hide her or change the
// character from her own little buttons.
// ==========================================================================

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const LS_POS = 'ms_mascot_pos';
const LS_ROAM = 'ms_mascot_roam';
const LS_NAME = 'ms_mascot_name';
const LS_CHAT = 'ms_mascot_chat_seen';
let aiOff = false; // set when the online brain is not available (no key / not signed in): the offline brain answers everything

// your OWN sticker characters: files you put in public/mascots/ plus a list in public/mascots/mascots.json
// { "characters": [ { "id": "mine", "name": "My girl", "idle": "idle.webp", "reactions": ["hello.webp", "happy.webp"] } ] }
const FILE_OK = /^[\w.-]{1,80}\.(webp|png|gif|apng|webm)$/i;
export function cleanCustom(json) {
    const out = [];
    const list = json && Array.isArray(json.characters) ? json.characters : [];
    list.slice(0, 12).forEach((c) => {
        if (!c || !/^[a-z0-9-]{2,24}$/.test(String(c.id)) || !FILE_OK.test(String(c.idle))) return;
        const reactions = (Array.isArray(c.reactions) ? c.reactions : []).filter((f) => FILE_OK.test(String(f))).slice(0, 12);
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
const TEASE = ['Catch me if you can! 😜', 'Boo! Did I scare you? 👻', 'I was watching your cursor… 👀', 'Psst, I came closer 🐾', 'Hehe, you can not catch me! 🏃‍♀️', 'Hey! Over here! 🙋‍♀️', 'Tag, you are it! 😆'];
const SIT = ['Let me sit for a bit 🪑', 'My feet are tired… 🥱', 'Do not mind me, just resting 😌', 'La la la~ 🎵'];
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

// things she can point at on the current page: [text on the button, English, Bangla]
const PAGE_STEPS = {
    '/gdrive-upload': [
        [/extract/i, 'Paste a Drive FOLDER link, then press this: I list every file inside 📂', 'ড্রাইভ ফোল্ডারের লিংক দিয়ে এটা চাপুন: ভেতরের সব ফাইল বের করে দেব 📂'],
        [/generate links/i, 'Press this and your MultiServer links appear instantly. Mirroring continues in the background 🚀', 'এটা চাপলেই MultiServer লিংক সাথে সাথে পাবেন, মিররিং ব্যাকগ্রাউন্ডে চলবে 🚀'],
    ],
    '/file-manager': [
        [/repair/i, 'Repair re-sends a file to the servers it is missing from 🔧', 'Repair চাপলে যে সার্ভারে ফাইল নেই সেখানে আবার পাঠানো হবে 🔧'],
        [/folder/i, 'Make folders to keep your files tidy 📁', 'ফোল্ডার বানিয়ে ফাইল গুছিয়ে রাখুন 📁'],
    ],
    '/processing-files': [
        [/force sync|start all/i, 'Press this to push stuck files again right now ⚡', 'আটকে থাকা ফাইল এখনই আবার পাঠাতে এটা চাপুন ⚡'],
    ],
    '/embed-generator': [
        [/advanced/i, 'Advanced mode adds other sites\' embed links too 🔧', 'Advanced মোডে অন্য সাইটের এম্বেড লিংকও পাবেন 🔧'],
    ],
};

const CSS = `
.mc-wrap { position: fixed; z-index: 45; pointer-events: none; width: var(--mc-w, 112px); user-select: none; -webkit-user-select: none; }
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
.mc-head { transform-box: fill-box; transform-origin: 50% 96%; animation: mc-tilt 6.5s ease-in-out infinite; }
@keyframes mc-tilt { 0%, 100% { transform: rotate(-1.8deg) translateY(0); } 30% { transform: rotate(2.2deg) translateY(-1px); } 60% { transform: rotate(-.6deg) translateY(1px); } }
.mc-tpl { animation: mc-tp .34s ease-in-out infinite alternate; } .mc-tpr { animation: mc-tp .34s ease-in-out -.17s infinite alternate; }
@keyframes mc-tp { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
.mc-legL, .mc-legR { transform-box: view-box; animation: mc-swing 2.8s ease-in-out infinite; }
.mc-legL { transform-origin: 86px 268px; } .mc-legR { transform-origin: 114px 268px; animation-delay: -1.4s; }
@keyframes mc-swing { 0%, 100% { transform: rotate(6deg); } 50% { transform: rotate(-8deg); } }
.mc-giggle .mc-legL, .mc-giggle .mc-legR { animation-duration: .55s; }
.mc-still .mc-legL, .mc-still .mc-legR { animation: none; }
.mc-ahoge { transform-box: fill-box; transform-origin: 20% 100%; animation: mc-ahoge 2.6s ease-in-out infinite; }
@keyframes mc-ahoge { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(8deg); } }
.mc-giggle .mc-head { animation: mc-giggle .22s ease-in-out infinite alternate; }
@keyframes mc-giggle { from { transform: rotate(-3deg); } to { transform: rotate(3deg) translateY(-2px); } }
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
.mc-wrap.mc-walk .mc-char { animation: mc-hop .4s ease-in-out infinite; }
@keyframes mc-hop { 0%, 100% { transform: translateY(0) rotate(var(--mc-lean, 0deg)); } 50% { transform: translateY(-9px) rotate(var(--mc-lean, 0deg)); } }
.mc-wrap.mc-sit .mc-char { animation: mc-sitbob 3.2s ease-in-out infinite; }
.mc-wrap.mc-sit .mc-char svg { transform: translateY(6%) scaleY(.87); transform-origin: 50% 100%; }
@keyframes mc-sitbob { 0%, 100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(2px) rotate(1deg); } }
.mc-st-tease { animation: mc-s-wig .4s ease-in-out 4; }
.mc-chatbtn { position: absolute; top: 0; left: -4px; width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.9); background: linear-gradient(135deg, #ff6b73, #e5383b); color: #fff; font-size: 11px; line-height: 1; cursor: pointer; pointer-events: auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,.4); transition: transform .2s; padding: 0; }
.mc-chatbtn:hover { transform: scale(1.12) rotate(-6deg); }
.mc-chatbtn.new::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 2px solid rgba(229,56,59,.7); animation: mc-ping 1.6s ease-out infinite; }
@keyframes mc-ping { from { transform: scale(.8); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
.mc-chat { position: absolute; bottom: calc(100% + 10px); width: 304px; max-width: calc(100vw - 20px); display: flex; flex-direction: column; border-radius: 18px; background: rgba(18,18,24,.97); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 18px 50px rgba(0,0,0,.6); color: #ececf2; font: 500 13px/1.45 Inter, system-ui, sans-serif; pointer-events: auto; overflow: hidden; animation: mc-pop .25s cubic-bezier(.3,1.5,.5,1) both; touch-action: auto; }
.mc-chat, .mc-chat * { user-select: text; -webkit-user-select: text; }
.mc-chat.r { right: 0; } .mc-chat.l { left: 0; }
.mc-chat-h { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: linear-gradient(90deg, rgba(229,56,59,.28), rgba(229,56,59,.06)); border-bottom: 1px solid rgba(255,255,255,.08); }
.mc-chat-h b { font-size: 13px; } .mc-chat-h small { opacity: .55; font-size: 11px; margin-right: auto; }
.mc-chat-h button { width: 24px; height: 24px; border-radius: 50%; border: 0; background: rgba(255,255,255,.08); color: #fff; cursor: pointer; font-size: 15px; line-height: 1; }
.mc-chat-h button:hover { background: rgba(229,56,59,.8); }
.mc-dot { width: 8px; height: 8px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 8px #3ddc84; }
.mc-chat-b { height: 250px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; scrollbar-width: thin; }
.mc-m { max-width: 86%; padding: 8px 11px; border-radius: 14px; white-space: pre-wrap; word-break: break-word; animation: mc-pop .2s ease-out both; }
.mc-m.bot { align-self: flex-start; background: rgba(255,255,255,.09); border-bottom-left-radius: 4px; }
.mc-m.me { align-self: flex-end; background: #e5383b; color: #fff; border-bottom-right-radius: 4px; }
.mc-go { display: block; margin-top: 7px; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.08); color: #fff; font: 600 12px Inter, system-ui, sans-serif; cursor: pointer; }
.mc-go:hover { background: rgba(229,56,59,.85); }
.mc-typing { display: flex; gap: 4px; padding: 11px 13px; }
.mc-typing i { width: 6px; height: 6px; border-radius: 50%; background: #cfd3e6; animation: mc-dots 1s ease-in-out infinite; }
.mc-typing i:nth-child(2) { animation-delay: .15s; } .mc-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes mc-dots { 0%, 80%, 100% { transform: translateY(0); opacity: .4; } 40% { transform: translateY(-4px); opacity: 1; } }
.mc-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; }
.mc-chips button { padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); color: #e8e8ee; font: 600 11.5px Inter, system-ui, sans-serif; cursor: pointer; }
.mc-chips button:hover { background: rgba(229,56,59,.7); border-color: transparent; }
.mc-chat-f { display: flex; gap: 6px; padding: 8px 10px 10px; border-top: 1px solid rgba(255,255,255,.08); }
.mc-chat-f input { flex: 1; min-width: 0; padding: 9px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #fff; font: 500 13px Inter, system-ui, sans-serif; outline: none; }
.mc-chat-f input:focus { border-color: rgba(229,56,59,.8); }
.mc-chat-f button { width: 36px; height: 36px; border-radius: 50%; border: 0; background: #e5383b; color: #fff; font-size: 14px; cursor: pointer; }
.mc-chat-f button:disabled { opacity: .5; cursor: default; }
.mc-bubble { position: absolute; bottom: calc(100% + 6px); max-width: 240px; min-width: 90px; width: max-content; padding: 8px 12px; border-radius: 14px; background: #fff; color: #1a1a22; font: 600 12px/1.4 Inter, system-ui, sans-serif; box-shadow: 0 10px 26px rgba(0,0,0,.45); pointer-events: none; animation: mc-pop .25s cubic-bezier(.3,1.5,.5,1) both; }
.mc-bubble::after { content: ''; position: absolute; top: 100%; width: 12px; height: 12px; background: #fff; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.mc-bubble.r { right: 8px; } .mc-bubble.r::after { right: 26px; }
.mc-bubble.l { left: 8px; } .mc-bubble.l::after { left: 26px; }
@keyframes mc-pop { from { opacity: 0; transform: translateY(6px) scale(.85); } to { opacity: 1; transform: none; } }
.mc-tools { position: absolute; top: 2px; right: -10px; display: flex; flex-direction: column; gap: 3px; padding: 3px; border-radius: 999px; background: rgba(14,14,18,.72); border: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(8px); opacity: 0; transform: translateX(6px); transition: opacity .2s, transform .2s; pointer-events: none; }
.mc-wrap:hover .mc-tools, .mc-wrap:focus-within .mc-tools, .mc-wrap.mc-touch .mc-tools { opacity: 1; transform: none; pointer-events: auto; }
.mc-tools button { width: 20px; height: 20px; border-radius: 50%; border: 0; background: transparent; color: #d7d9e4; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; transition: background .2s, transform .2s, color .2s; }
.mc-tools button svg { width: 12px; height: 12px; display: block; }
.mc-tools button:hover { background: rgba(229,56,59,.9); color: #fff; transform: scale(1.12); }
.mc-tools button.off { opacity: .55; }
.mc-summon { position: fixed; z-index: 45; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(14,14,18,.9); display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; backdrop-filter: blur(6px); transition: transform .2s, border-color .2s; }
.mc-summon:hover { transform: scale(1.1) rotate(-6deg); border-color: rgba(255,107,115,.7); }
.mc-spot { position: fixed; z-index: 44; pointer-events: none; border-radius: 12px; border: 2px solid #ff6b73; box-shadow: 0 0 0 4px rgba(229,56,59,.3), 0 0 0 9999px rgba(0,0,0,.42); transition: left .45s ease, top .45s ease, width .45s ease, height .45s ease; animation: mc-spotp 1.4s ease-in-out infinite; }
@keyframes mc-spotp { 50% { border-color: #fff; } }
.mc-tourbar { position: fixed; z-index: 47; left: 50%; bottom: 16px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 14px; border-radius: 999px; background: rgba(18,18,24,.96); border: 1px solid rgba(255,255,255,.14); box-shadow: 0 12px 34px rgba(0,0,0,.55); color: #ececf2; font: 600 12px Inter, system-ui, sans-serif; }
.mc-tourbar button { padding: 6px 12px; border-radius: 999px; border: 0; background: #e5383b; color: #fff; font: 700 12px Inter, system-ui, sans-serif; cursor: pointer; }
.mc-tourbar button.g { background: rgba(255,255,255,.1); }
@media (max-width: 640px) { .mc-wrap { --mc-w: 84px !important; } .mc-bubble { max-width: 170px; font-size: 11.5px; } .mc-chat { position: fixed; left: 10px !important; right: 10px !important; bottom: 10px; width: auto; max-width: none; } .mc-chat-b { height: 38vh; } }
@media (prefers-reduced-motion: reduce) { .mc-tpl, .mc-tpr { animation: none !important; } .mc-legL, .mc-legR { animation: none !important; } .mc-wrap.mc-walk .mc-char, .mc-wrap.mc-sit .mc-char, .mc-chatbtn.new::after, .mc-char, .mc-sway, .mc-breath, .mc-blink, .mc-wavehand, .mc-up, .mc-twinkle, .mc-z { animation: none !important; } }
`;

const heartPath = 'M0 -4 C-1 -9 -9 -9 -9 -3 C-9 3 -2 7 0 10 C2 7 9 3 9 -3 C9 -9 1 -9 0 -4Z';
const starPath = 'M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2Z';

// ---------- the drawing ----------
function Girl({ c, mood, look }) {
    const arms = {
        idle: [10, -10], wave: [10, -150], peace: [10, -140], cheer: [150, -150], heart: [165, -165], shy: [-150, 150], love: [160, -160],
        wink: [10, -140], dizzy: [25, -25], sleep: [6, -6], pout: [-60, 60], walk: [30, -30], sit: [22, -22], giggle: [-150, 150], stretch: [160, -160], tease: [10, -10],
    }[mood] || [10, -10];
    const happy = ['cheer', 'love', 'heart', 'giggle', 'stretch'].includes(mood);
    const eyeClosed = mood === 'sleep';
    const winkR = mood === 'wink' || mood === 'peace' || mood === 'tease';
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
                <ellipse cx={cx + sx} cy={cy + sy} rx="7.4" ry="9.8" fill={`url(#mc-iris-${c.id})`} />
                <ellipse cx={cx + sx} cy={cy + sy + 0.6} rx="3.4" ry="5" fill="#1d1216" />
                <path d={`M${cx + sx - 6} ${cy + sy - 2} Q${cx + sx} ${cy + sy - 11} ${cx + sx + 6} ${cy + sy - 2} Q${cx + sx} ${cy + sy - 6} ${cx + sx - 6} ${cy + sy - 2}Z`} fill="#000" opacity=".28" />
                <ellipse cx={cx + sx - 2.6} cy={cy + sy - 3.8} rx="2.9" ry="3.2" fill="#fff" />
                <circle cx={cx + sx + 3} cy={cy + sy + 4} r="1.5" fill="#fff" opacity=".9" />
                <circle cx={cx + sx + 4.4} cy={cy + sy - 1.4} r=".8" fill="#fff" opacity=".8" />
                <path d={`M${cx - 11} ${cy - 4} Q${cx} ${cy - 15} ${cx + 11} ${cy - 4}`} stroke="#2a1d1d" strokeWidth="3.2" fill="none" strokeLinecap="round" />
                <path d={`M${cx - 9} ${cy + 9} Q${cx} ${cy + 13} ${cx + 9} ${cy + 9}`} stroke="#3b2a2a" strokeWidth=".9" fill="none" opacity=".5" />
                <path d={side === 'l' ? `M${cx - 11} ${cy - 4} l-4.5 -3.5 M${cx - 9} ${cy - 8} l-3 -4` : `M${cx + 11} ${cy - 4} l4.5 -3.5 M${cx + 9} ${cy - 8} l3 -4`} stroke="#2a1d1d" strokeWidth="2.2" strokeLinecap="round" />
            </g>
        );
    };

    const mouth = () => {
        if (mood === 'sleep') return <ellipse cx="100" cy="128" rx="3" ry="3.4" fill="#d9777a" />;
        if (mood === 'dizzy') return <path d="M90 129 q5 -5 10 0 t10 0" stroke="#a8474b" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
        if (mood === 'shy') return <path d="M94 130 q3 -3 6 0 q3 3 6 0" stroke="#a8474b" strokeWidth="2" fill="none" strokeLinecap="round" />;
        if (mood === 'tease') return (<g><path d="M91 124 Q100 136 109 124 Z" fill="#c9444a" /><path d="M95 129 Q100 146 105 129 Z" fill="#ff7d86" /><path d="M100 131 L100 138" stroke="#e0606b" strokeWidth="1" /></g>);
        if (mood === 'pout') return <path d="M92 132 Q100 126 108 132" stroke="#a8474b" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
        if (happy || mood === 'wave' || mood === 'giggle') return (<g><path d="M89 123 Q100 142 111 123 Z" fill="#c9444a" /><path d="M94 132 Q100 138 106 132 Q100 129 94 132Z" fill="#ff8c94" /></g>);
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
        if (c.top === 'uniform') return (<g><path d="M66 146 Q100 136 134 146 L141 208 Q100 220 59 208Z" fill="#fff" /><path d="M66 146 Q100 168 134 146 L141 170 Q100 196 59 170Z" fill={c.outfit} /><path d="M82 146 L100 172 L118 146" fill="#fff" /><path d="M59 170 Q100 196 141 170" stroke={c.accent} strokeWidth="2.5" fill="none" /><path d="M100 168 L88 180 L92 160Z M100 168 L112 180 L108 160Z" fill="#e5384f" /><circle cx="100" cy="168" r="3.2" fill="#c42a40" /><path d="M62 200 Q100 212 138 200 L141 208 Q100 220 59 208Z" fill={c.outfit} /><path d="M60 207 Q100 219 140 207" stroke={c.accent} strokeWidth="1.8" fill="none" /></g>);
        if (c.top === 'hoodie') return (<g>{body}<path d="M76 144 Q100 166 124 144 Q100 152 76 144Z" fill={c.outfitDark} /><path d="M92 156 L90 176 M108 156 L110 176" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><rect x="82" y="186" width="36" height="14" rx="6" fill={c.outfitDark} opacity=".7" /></g>);
        if (c.top === 'sweater') return (<g>{body}<path d="M80 144 Q100 158 120 144" stroke={c.outfitDark} strokeWidth="7" fill="none" strokeLinecap="round" /><path d="M62 190 Q100 200 138 190" stroke={c.accent} strokeWidth="4" fill="none" /></g>);
        if (c.top === 'jacket') return (<g>{body}<path d="M100 148 L100 214" stroke={c.outfitDark} strokeWidth="3" /><path d="M84 144 L100 166 L116 144" fill={c.accent} opacity=".9" /><rect x="94" y="150" width="12" height="3" rx="1.5" fill={c.outfitDark} /></g>);
        if (c.top === 'dress') return (<g><path d="M70 146 Q100 138 130 146 L136 184 L152 220 Q100 232 48 220 L64 184Z" fill={c.outfit} /><path d="M64 184 L136 184" stroke={c.accent} strokeWidth="5" /><path d="M84 144 Q100 156 116 144" stroke={c.outfitDark} strokeWidth="5" fill="none" strokeLinecap="round" /></g>);
        return (<g>{body}<path d="M82 144 Q100 156 118 144" stroke={c.accent} strokeWidth="4.5" fill="none" strokeLinecap="round" /><path d="M66 180 Q100 188 136 180" stroke={c.accent} strokeWidth="3.5" fill="none" /></g>);
    };

    const accessory = () => {
        if (c.acc === 'ribbon') return (<g><path d="M52 66 Q40 52 30 58 Q36 72 50 74Z" fill={c.accent} /><path d="M52 66 Q56 48 70 46 Q68 62 56 72Z" fill={c.accent} /><circle cx="52" cy="67" r="5.5" fill="#6aa8f0" /><path d="M32 60 Q38 66 48 70" stroke="#fff" strokeWidth="1.2" fill="none" opacity=".6" /><path d="M148 76 q8 3 6 12" stroke="#fff" strokeWidth="2" fill="none" opacity=".5" strokeLinecap="round" /></g>);
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
                <radialGradient id={`mc-iris-${c.id}`} cx="50%" cy="68%" r="75%">
                    <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
                    <stop offset="45%" stopColor={c.eye} />
                    <stop offset="100%" stopColor={c.eye} stopOpacity=".92" />
                </radialGradient>
                <linearGradient id={`mc-hg-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.hairDark} />
                    <stop offset="50%" stopColor={c.hair} />
                    <stop offset="100%" stopColor={c.hair} />
                </linearGradient>
                <radialGradient id="mc-blush" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff7d86" stopOpacity=".95" />
                    <stop offset="100%" stopColor="#ff7d86" stopOpacity="0" />
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
            <g className="mc-head">
            <path d="M52 96 Q51 56 100 54 Q149 56 148 96 Q147 126 128 141 Q114 149 100 150 Q86 149 72 141 Q53 126 52 96Z" fill={c.skin} />
            <path d="M60 112 Q64 132 82 144" stroke="#c98c78" strokeWidth="2" fill="none" opacity=".18" strokeLinecap="round" />
            <ellipse cx="100" cy="84" rx="40" ry="10" fill="#c98c78" opacity=".16" />
            <circle cx="100" cy="117" r="1.1" fill="#c98c78" opacity=".7" />
            <ellipse cx="70" cy="118" rx="12" ry="7" fill="url(#mc-blush)" opacity={mood === 'shy' || mood === 'love' ? 1 : 0.7} />
            <ellipse cx="130" cy="118" rx="12" ry="7" fill="url(#mc-blush)" opacity={mood === 'shy' || mood === 'love' ? 1 : 0.7} />
            {eye(80, 'l')}
            {eye(120, 'r')}
            {brows}
            {mouth()}
            <path d="M52 98 Q50 46 100 44 Q150 46 148 98 Q134 74 118 88 Q106 66 94 88 Q76 72 52 98Z" fill={`url(#mc-hg-${c.id})`} />
            <path d="M66 62 Q100 48 134 62" stroke="#fff" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".28" />
            <path d="M70 62 Q86 50 106 52" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".35" />
            <path d="M60 80 Q82 56 100 58 Q124 56 142 80 Q124 62 100 66 Q76 62 60 80Z" fill="url(#mc-hairshine)" />
            <path d="M52 98 Q50 118 58 142 Q66 124 64 98Z" fill={c.hair} />
            <path d="M148 98 Q150 118 142 142 Q134 124 136 98Z" fill={c.hair} />
            <path d="M58 104 Q56 122 60 136" stroke={c.hairDark} strokeWidth="1.2" fill="none" opacity=".55" />
            <path d="M142 104 Q144 122 140 136" stroke={c.hairDark} strokeWidth="1.2" fill="none" opacity=".55" />
            <path d="M92 52 Q94 66 90 80 M108 52 Q106 66 110 80 M76 58 Q78 70 74 84 M124 58 Q122 70 126 84" stroke={c.hairDark} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".5" />
            <path className="mc-ahoge" d="M100 46 Q92 30 108 20" stroke={c.hair} strokeWidth="3.6" fill="none" strokeLinecap="round" />
            <g stroke="#ff6f7a" strokeWidth="1.3" strokeLinecap="round" opacity=".7"><path d="M64 113 l3 5 M69 112 l3 5 M74 112 l3 5" /><path d="M126 112 l3 5 M131 112 l3 5 M136 113 l3 5" /></g>
            {accessory()}
            </g>
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

// ---------- the grown-up characters: tall, slim, elegant anime women (20+) ----------
function Woman({ c, mood, look, seated }) {
    const arms = {
        idle: [7, -5, 7, -5], wave: [7, -5, 95, 80], peace: [7, -5, 95, 80], cheer: [105, 75, 105, 75], heart: [48, 140, 48, 140], shy: [-30, -150, -30, -150], love: [48, 140, 48, 140],
        wink: [7, -5, 95, 80], dizzy: [18, -10, 18, -10], sleep: [5, -3, 5, -3], pout: [-40, -125, -40, -125], walk: [20, -12, 20, -12], sit: [10, -6, 10, -6], giggle: [-30, -150, -30, -150], stretch: [165, 8, 165, 8], tease: [7, -5, 7, -5], type: [8, -35, 8, -35],
    }[mood] || [7, -5, 7, -5];
    const typing = mood === 'type';
    const rest = seated && ['idle', 'sit', 'tease', 'sleep', 'dizzy', 'pout'].includes(mood) ? [3, -14, 3, -14] : arms;
    const happy = ['cheer', 'love', 'heart', 'giggle', 'stretch'].includes(mood);
    const closed = mood === 'sleep';
    const winkR = mood === 'wink' || mood === 'peace' || mood === 'tease';
    const id = c.id;
    const ink = '#2a1a22';
    const EY = 58;

    const eye = (cx, side) => {
        const arc = (up) => <path d={`M${cx - 9} ${EY + (up ? 3 : 0)} Q${cx} ${EY + (up ? -8 : 7)} ${cx + 9} ${EY + (up ? 3 : 0)}`} stroke={ink} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
        if (closed) return arc(false);
        if (happy && mood !== 'love' && mood !== 'heart') return arc(true);
        if (winkR && side === 'r') return arc(true);
        if (mood === 'love' || mood === 'heart') return <path d={heartPath} transform={`translate(${cx} ${EY}) scale(1.05)`} fill="#ff4d6d" />;
        if (mood === 'dizzy') return <g stroke={ink} strokeWidth="2.4" strokeLinecap="round"><path d={`M${cx - 6} ${EY - 6} L${cx + 6} ${EY + 6}`} /><path d={`M${cx + 6} ${EY - 6} L${cx - 6} ${EY + 6}`} /></g>;
        const sx = (mood === 'shy' ? -1 : typing ? 0 : look.x) * 0.9; const sy = (mood === 'shy' ? 2 : typing ? 2.4 : look.y) * 0.9;
        const wing = side === 'l' ? `M${cx - 11} ${EY - 3} l-5 -3 M${cx - 9} ${EY - 8} l-3 -3.6` : `M${cx + 11} ${EY - 3} l5 -3 M${cx + 9} ${EY - 8} l3 -3.6`;
        return (
            <g className="mc-blink">
                <ellipse cx={cx} cy={EY} rx="10.4" ry="12.6" fill="#fff" />
                <ellipse cx={cx + sx} cy={EY + sy} rx="7.8" ry="10.6" fill={`url(#wi-${id})`} />
                <ellipse cx={cx + sx} cy={EY + sy + .6} rx="3.6" ry="5.4" fill="#17101a" />
                <path d={`M${cx - 10} ${EY} Q${cx} ${EY - 16} ${cx + 10} ${EY} Q${cx} ${EY - 8} ${cx - 10} ${EY}Z`} fill="#000" opacity=".22" />
                <ellipse cx={cx + sx - 2.8} cy={EY + sy - 4.2} rx="3" ry="3.4" fill="#fff" />
                <circle cx={cx + sx + 3.2} cy={EY + sy + 4.4} r="1.5" fill="#fff" opacity=".95" />
                <path d={starPath} transform={`translate(${cx + sx + 3.6} ${EY + sy + 5.6}) scale(.28)`} fill="#fff" opacity=".9" />
                <ellipse cx={cx + sx} cy={EY + sy} rx="7.8" ry="10.6" fill="none" stroke={c.hairDark} strokeOpacity=".45" strokeWidth="1" />
                <circle cx={cx + sx + 4.8} cy={EY + sy - 1.5} r=".8" fill="#fff" opacity=".8" />
                <path d={`M${cx - 11} ${EY - 3} Q${cx} ${EY - 17} ${cx + 11} ${EY - 3}`} stroke={ink} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                <path d={`M${cx - 8} ${EY - 9} Q${cx} ${EY - 14} ${cx + 8} ${EY - 9}`} stroke={ink} strokeWidth=".7" fill="none" opacity=".4" />
                <path d={`M${cx - 8} ${EY + 11} Q${cx} ${EY + 14.5} ${cx + 8} ${EY + 11}`} stroke={ink} strokeWidth=".8" fill="none" opacity=".45" />
                <path d={`M${cx - 6} ${EY + 13} Q${cx} ${EY + 15.5} ${cx + 6} ${EY + 13}`} stroke="#ff9aa2" strokeWidth="1.4" fill="none" opacity=".35" strokeLinecap="round" />
                <path d={wing} stroke={ink} strokeWidth="2" strokeLinecap="round" />
            </g>
        );
    };
    const mouth = () => {
        if (mood === 'sleep') return <ellipse cx="100" cy="82" rx="2.6" ry="3" fill="#d9777a" />;
        if (mood === 'dizzy') return <path d="M91 82 q4.5 -4 9 0 t9 0" stroke="#a8474b" strokeWidth="1.9" fill="none" strokeLinecap="round" />;
        if (mood === 'shy') return <path d="M95.5 82 q2.2 -2.6 4.5 0 q2.2 2.6 4.5 0" stroke="#a8474b" strokeWidth="1.8" fill="none" strokeLinecap="round" />;
        if (mood === 'tease') return <g><path d="M92 79 Q100 89 108 79Z" fill="#c9444a" /><path d="M96 83 Q100 96 104 83Z" fill="#ff7d86" /></g>;
        if (mood === 'pout') return <path d="M93 84 Q100 78 107 84" stroke="#a8474b" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
        if (happy || mood === 'wave') return <g><path d="M91 78 Q100 91 109 78Z" fill="#c9444a" /><path d="M95.5 84.5 Q100 88.5 104.5 84.5 Q100 82 95.5 84.5Z" fill="#ff8c94" /></g>;
        return <g><path d="M93 80 Q100 87 107 80" stroke="#a8474b" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M97 83.5 Q100 85 103 83.5" stroke="#ff9aa2" strokeWidth="1.2" fill="none" strokeLinecap="round" /></g>;
    };
    const brows = mood === 'pout'
        ? <g stroke="#5b3a30" strokeWidth="2.4" strokeLinecap="round"><path d="M76 42 L92 47" /><path d="M124 42 L108 47" /></g>
        : <g stroke={c.hairDark} strokeWidth="2" strokeLinecap="round" fill="none"><path d={`M76 ${mood === 'shy' ? 41 : 44} Q84 ${mood === 'shy' ? 37 : 40} 93 ${mood === 'shy' ? 41 : 43}`} /><path d={`M107 ${mood === 'shy' ? 41 : 43} Q116 ${mood === 'shy' ? 37 : 40} 124 ${mood === 'shy' ? 41 : 44}`} /></g>;

    const backHair = () => {
        if (c.style === 'pony') return (<g><g className="mc-sway"><path d="M126 30 Q182 44 176 130 Q172 176 150 190 Q160 124 126 74Z" fill={`url(#wh-${id})`} /><path d="M140 60 Q170 80 164 150" stroke={c.hairDark} strokeWidth="1.6" fill="none" opacity=".5" /><circle cx="128" cy="36" r="5.5" fill={c.accent} /></g><path d="M62 52 Q56 96 70 118 L130 118 Q144 96 138 52 Q130 6 100 6 Q70 6 62 52Z" fill={c.hairDark} /></g>);
        if (c.style === 'bun') return (<g><path d="M62 56 Q56 100 70 124 L130 124 Q144 100 138 56 Q130 6 100 6 Q70 6 62 56Z" fill={c.hairDark} /><g className="mc-sway"><circle cx="100" cy="-6" r="19" fill={`url(#wh-${id})`} /><path d="M86 4 Q100 12 114 4" stroke={c.hairDark} strokeWidth="2" fill="none" /><circle cx="100" cy="6" r="5" fill={c.accent} /></g></g>);
        if (c.style === 'wave') return (<g className="mc-sway"><path d="M60 54 Q42 112 56 164 Q62 192 46 216 Q76 222 90 192 Q96 206 100 210 Q104 206 110 192 Q124 222 154 216 Q138 192 144 164 Q158 112 140 54 Q130 6 100 6 Q70 6 60 54Z" fill={`url(#wh-${id})`} /><path d="M70 130 Q64 170 74 196 M130 130 Q136 170 126 196" stroke={c.hairDark} strokeWidth="1.6" fill="none" opacity=".45" strokeLinecap="round" /></g>);
        return (<g className="mc-sway"><path d="M60 54 Q46 120 58 186 Q64 220 86 214 L114 214 Q136 220 142 186 Q154 120 140 54 Q130 6 100 6 Q70 6 60 54Z" fill={`url(#wh-${id})`} /><path d="M72 120 Q66 170 76 206 M128 120 Q134 170 124 206 M100 110 L100 208" stroke={c.hairDark} strokeWidth="1.5" fill="none" opacity=".4" strokeLinecap="round" /></g>);
    };

    const skinLine = { stroke: '#c98c78', strokeOpacity: '.38', strokeWidth: '.7' };
    const sneaker = (cx, y) => (
        <g>
            <path d={`M${cx - 8.5} ${y} L${cx + 8.5} ${y} Q${cx + 11} ${y + 8} ${cx + 9} ${y + 13} Q${cx} ${y + 17} ${cx - 9} ${y + 13} Q${cx - 11} ${y + 8} ${cx - 8.5} ${y}Z`} fill={c.shoe || c.outfitDark} stroke="#000" strokeOpacity=".28" strokeWidth=".8" />
            <path d={`M${cx - 10} ${y + 12} Q${cx} ${y + 19} ${cx + 10} ${y + 12} L${cx + 10} ${y + 15} Q${cx} ${y + 22} ${cx - 10} ${y + 15}Z`} fill="#dcdce6" stroke="#000" strokeOpacity=".2" strokeWidth=".6" />
            <path d={`M${cx - 5} ${y + 8} Q${cx} ${y + 5} ${cx + 5} ${y + 8}`} stroke="#000" strokeOpacity=".16" strokeWidth="1.2" fill="none" />
            <path d={`M${cx - 4} ${y + 2} L${cx + 4} ${y + 3} M${cx - 4} ${y + 4.6} L${cx + 4} ${y + 5.6}`} stroke="#000" strokeOpacity=".22" strokeWidth=".9" strokeLinecap="round" />
        </g>
    );
    // a finished hand: palm, four fingers and a thumb (drawn hanging down from the wrist at 0,0)
    const handShape = (curl) => (
        <g>
            <path d="M-4 -1 Q-5.6 7 -4.4 13 Q0 16 4.4 13 Q5.6 7 4 -1Z" fill={c.skin} {...skinLine} />
            <g stroke={c.skin} strokeLinecap="round" fill="none">
                <path d={`M-3.1 11 L-3.4 ${17.5 - curl}`} strokeWidth="2.3" /><path d={`M-1 12 L-1.1 ${20 - curl}`} strokeWidth="2.3" /><path d={`M1.2 12 L1.3 ${19 - curl}`} strokeWidth="2.3" /><path d={`M3.2 11 L3.5 ${16 - curl}`} strokeWidth="2.1" />
                <path d="M-4 4 Q-7.4 8 -6.6 12.4" strokeWidth="2.6" />
            </g>
            <g stroke="#c98c78" strokeOpacity=".4" strokeWidth=".5" fill="none"><path d={`M-2 12 L-2.2 ${17 - curl}`} /><path d={`M0 12.5 L0 ${19 - curl}`} /><path d={`M2.2 12 L2.3 ${17.5 - curl}`} /></g>
        </g>
    );
    const legStand = () => (
        <g>
            <path d="M74 252 Q70 292 79 322 Q76 348 84 372 L96 372 Q97 348 94 324 Q100 292 99 252Z" fill={c.skin} {...skinLine} />
            <path d="M96 262 Q94 320 94 370" stroke="#c98c78" strokeOpacity=".16" strokeWidth="3" fill="none" strokeLinecap="round" />
            <ellipse cx="87" cy="296" rx="4.5" ry="6" fill="#fff" opacity=".13" /><path d="M82 322 Q89 326 94 322" stroke="#c98c78" strokeOpacity=".28" strokeWidth=".9" fill="none" strokeLinecap="round" />
            {sneaker(90, 372)}
        </g>
    );
    const legSeat = () => (
        <g>
            <path d="M78 268 Q74 294 78 320 Q76 338 82 348 L91 348 Q94 338 93 320 Q96 294 93 268Z" fill={c.skin} {...skinLine} />
            <path d="M91 272 Q90 318 90 346" stroke="#c98c78" strokeOpacity=".16" strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <ellipse cx="85" cy="274" rx="5" ry="3.6" fill="#fff" opacity=".16" /><ellipse cx="85" cy="296" rx="3.4" ry="7" fill="#fff" opacity=".1" />
            {sneaker(85.5, 346)}
        </g>
    );

    const body = () => {
        const sk = `url(#ws-${id})`;
        const shorts = c.bottom === 'shorts';
        const skirt = <path d="M82 198 L118 198 Q126 236 150 308 Q100 318 50 308 Q74 236 82 198Z" fill={sk} stroke="#000" strokeOpacity=".15" strokeWidth=".8" />;
        const folds = <path d="M86 206 Q78 252 68 308 M96 202 Q92 254 88 314 M106 202 Q110 254 112 314 M116 206 Q124 252 134 308" stroke="#000" strokeOpacity=".14" strokeWidth="1.5" fill="none" strokeLinecap="round" />;
        const torso = <path d="M73 118 Q100 107 127 118 Q130 136 123 156 Q119 172 117 192 Q116 198 118 202 L82 202 Q84 198 83 192 Q81 172 77 156 Q70 136 73 118Z" fill={`url(#wt-${id})`} stroke="#000" strokeOpacity=".12" strokeWidth=".8" />;
        const bust = <path d="M84 150 Q92 162 99 152 M101 152 Q108 162 116 150" stroke="#000" strokeOpacity=".09" strokeWidth="2" fill="none" strokeLinecap="round" />;
        let top;
        if (c.top === 'dress') top = (<g>{torso}{bust}<path d="M84 114 Q100 132 116 114" stroke={c.outfitDark} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M82 184 Q100 192 118 184 L118 198 Q100 204 82 198Z" fill={c.accent} /></g>);
        else if (c.top === 'sweater') top = (<g>{torso}{bust}<path d="M88 112 Q100 126 112 112" stroke={c.outfitDark} strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M82 198 Q100 206 118 198" stroke={c.outfitDark} strokeWidth="5" fill="none" /><path d="M92 140 L92 196 M100 140 L100 198 M108 140 L108 196" stroke={c.outfitDark} strokeWidth="1.1" opacity=".45" /></g>);
        else if (c.top === 'hoodie') top = (<g>{torso}{bust}<path d="M80 114 Q100 138 120 114 Q114 124 100 126 Q86 124 80 114Z" fill={c.outfitDark} /><path d="M93 128 L91 160 M107 128 L109 160" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /><path d="M82 178 Q100 186 118 178 L120 200 L80 200Z" fill={c.outfitDark} opacity=".55" /><path d="M82 198 L118 198" stroke={c.outfitDark} strokeWidth="6" /></g>);
        else if (c.top === 'tee') top = (<g>{torso}{bust}<path d="M86 113 Q100 126 114 113" stroke={c.outfitDark} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M88 150 Q100 160 112 150" stroke={c.accent} strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="100" cy="146" r="5" fill={c.accent} opacity=".85" /><path d="M81 198 L119 198" stroke={c.skirt} strokeWidth="6" /></g>);
        else top = (<g>{torso}{bust}<path d="M86 114 Q100 134 114 114" fill={c.outfitDark} opacity=".7" /><path d="M100 130 Q87 120 85 136 Q94 142 100 132Z M100 130 Q113 120 115 136 Q106 142 100 132Z" fill={c.accent} /><circle cx="100" cy="131" r="3.4" fill={c.accent} stroke="#000" strokeOpacity=".15" /><path d="M82 198 L118 198" stroke={c.skirt} strokeWidth="6" /></g>);
        const shortsStand = (<g>
            {legStand()}<g transform="translate(200 0) scale(-1 1)">{legStand()}</g>
            <path d="M79 198 L100 198 L100 232 L99 256 L72 256 Q72 222 79 198Z" fill={sk} stroke="#000" strokeOpacity=".15" strokeWidth=".8" />
            <path d="M121 198 L100 198 L100 232 L101 256 L128 256 Q128 222 121 198Z" fill={sk} stroke="#000" strokeOpacity=".15" strokeWidth=".8" />
        </g>);
        if (seated) return (<g>
            <path d="M68 168 Q68 150 76 148 L124 148 Q132 150 132 168 L132 244 L68 244Z" fill="#33333f" stroke="#000" strokeOpacity=".25" strokeWidth=".8" />
            <path d="M74 156 L126 156" stroke="#fff" strokeOpacity=".08" strokeWidth="2" />
            <path d="M66 396 L74 252 M134 396 L126 252 M72 340 L128 340" stroke="#2a2a35" strokeWidth="5" strokeLinecap="round" />
            <rect x="54" y="240" width="92" height="16" rx="8" fill="#3d3d4b" stroke="#000" strokeOpacity=".25" strokeWidth=".8" />
            <path d="M62 244 L138 244" stroke="#fff" strokeOpacity=".12" strokeWidth="2" strokeLinecap="round" />
            {top}
            {shorts
                ? (<g>
                    <path d="M78 198 L122 198 Q130 222 130 244 L70 244 Q70 222 78 198Z" fill={sk} stroke="#000" strokeOpacity=".15" strokeWidth=".8" />
                    <path d="M100 206 L100 244" stroke="#000" strokeOpacity=".2" strokeWidth="1.2" />
                    <path d="M72 244 Q66 262 74 274 L98 274 Q101 258 99 244Z" fill={c.skin} stroke="#c98c78" strokeOpacity=".4" strokeWidth=".8" />
                    <path d="M128 244 Q134 262 126 274 L102 274 Q99 258 101 244Z" fill={c.skin} stroke="#c98c78" strokeOpacity=".4" strokeWidth=".8" />
                </g>)
                : (<g>
                    <path d="M82 198 L118 198 Q134 230 146 266 Q100 278 54 266 Q66 230 82 198Z" fill={sk} stroke="#000" strokeOpacity=".15" strokeWidth=".8" />
                    <path d="M92 206 Q88 240 82 270 M108 206 Q112 240 118 270" stroke="#000" strokeOpacity=".14" strokeWidth="1.4" fill="none" />
                </g>)}
            <g className="mc-legL">{legSeat()}</g>
            <g className="mc-legR"><g transform="translate(200 0) scale(-1 1)">{legSeat()}</g></g>
        </g>);
        if (shorts) return (<g>
            {shortsStand}{top}
        </g>);
        return (<g>
            {legStand()}<g transform="translate(200 0) scale(-1 1)">{legStand()}</g>
            {skirt}{folds}{top}
        </g>);
    };

    const arm = (side, up, fore) => {
        const L = side === 'l';
        const sgn = L ? 1 : -1;
        const sx = L ? 74 : 126;
        const hand = mood === 'wave' && !L;
        const peace = (mood === 'peace' || mood === 'wink') && !L;
        const sh = { transform: `rotate(${up * sgn}deg)`, transformOrigin: `${sx}px 120px`, transformBox: 'view-box' };
        const el = { transform: `rotate(${fore * sgn}deg)`, transformOrigin: `${sx}px 176px`, transformBox: 'view-box' };
        const slv = c.top === 'sweater' ? 176 : 150;
        return (
            <g key={side} className="mc-arm" style={sh}>
                <path d={`M${sx - 6 } 118 Q${sx - 7} 150 ${sx - 4.6} 176 L${sx + 4.6} 176 Q${sx + 7} 150 ${sx + 6} 118Z`} fill={c.skin} stroke="#c98c78" strokeOpacity=".35" strokeWidth=".7" />
                <path d={`M${sx - 8} 116 Q${sx - 9} 134 ${sx - 7} ${slv > 160 ? 172 : 148} L${sx + 7} ${slv > 160 ? 172 : 148} Q${sx + 9} 134 ${sx + 8} 116Z`} fill={c.outfit} stroke={c.outfitDark} strokeWidth=".7" />
                <g className="mc-arm" style={el}>
                    <g className={hand ? 'mc-wavehand' : typing ? (L ? 'mc-tpl' : 'mc-tpr') : ''} style={hand || typing ? { transformOrigin: `${sx}px 176px`, transformBox: 'view-box' } : undefined}>
                        <path d={`M${sx - 4.8} 174 Q${sx - 5.6} 204 ${sx - 3.4} 232 L${sx + 3.4} 232 Q${sx + 5.6} 204 ${sx + 4.8} 174Z`} fill={c.skin} stroke="#c98c78" strokeOpacity=".35" strokeWidth=".7" />
                        <g transform={`translate(${sx} 229)`}>{handShape(mood === 'cheer' || mood === 'wave' ? 0 : 3)}</g>
                        {c.top !== 'sweater' ? null : <path d={`M${sx - 4.6} 174 Q${sx - 5.4} 190 ${sx - 4} 204 L${sx + 4} 204 Q${sx + 5.4} 190 ${sx + 4.6} 174Z`} fill={c.outfit} />}
                        {peace && <g stroke={c.skin} strokeWidth="3.2" strokeLinecap="round"><path d={`M${sx - 2} 240 L${sx - 5} 256`} /><path d={`M${sx + 2} 240 L${sx + 5} 256`} /></g>}
                    </g>
                </g>
            </g>
        );
    };

    return (
        <svg viewBox="0 -14 200 414" role="img" aria-label={`${c.name}, the helper`}>
            <defs>
                <linearGradient id={`wi-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.hairDark} /><stop offset="35%" stopColor={c.eye} /><stop offset="100%" stopColor="#fff" stopOpacity=".7" /></linearGradient>
                <linearGradient id={`wh-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.hairDark} /><stop offset="40%" stopColor={c.hair} /><stop offset="100%" stopColor={c.hair} /></linearGradient>
                <linearGradient id={`ws-${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c.skirt} /><stop offset="60%" stopColor={c.skirt} /><stop offset="100%" stopColor="#000" stopOpacity=".12" /></linearGradient>
                <linearGradient id={`wt-${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={c.outfit} /><stop offset="65%" stopColor={c.outfit} /><stop offset="100%" stopColor={c.outfitDark} /></linearGradient>
                <radialGradient id={`wb-${id}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ff7d86" stopOpacity=".9" /><stop offset="100%" stopColor="#ff7d86" stopOpacity="0" /></radialGradient>
            </defs>
            <g transform="translate(12 11.5) scale(.88)">{backHair()}</g>
            <g className="mc-breath">
                <path d="M93 88 L93 112 Q100 118 107 112 L107 88Z" fill={c.skin} />
                <path d="M93 94 Q100 104 107 94 L107 90 Q100 98 93 90Z" fill="#c98c78" opacity=".4" />
                {body()}
            </g>
            <g transform="translate(12 11.5) scale(.88)"><g className="mc-head">
                <path d="M65 52 Q65 24 100 21 Q135 24 135 52 Q135 72 122 85 Q111 95 100 96 Q89 95 78 85 Q65 72 65 52Z" fill={c.skin} stroke="#c98c78" strokeOpacity=".3" strokeWidth=".8" />
                <path d="M68 72 Q74 88 90 94" stroke="#c98c78" strokeWidth="1.8" fill="none" opacity=".18" strokeLinecap="round" />
                <ellipse cx="100" cy="42" rx="34" ry="9" fill="#c98c78" opacity=".16" />
                <ellipse cx="80" cy="73" rx="11" ry="6" fill={`url(#wb-${id})`} opacity={mood === 'shy' || mood === 'love' ? 1 : 0.65} />
                <ellipse cx="120" cy="73" rx="11" ry="6" fill={`url(#wb-${id})`} opacity={mood === 'shy' || mood === 'love' ? 1 : 0.65} />
                <path d="M99 71 Q100 73.4 102 71.6" stroke="#c98c78" strokeWidth="1.1" fill="none" opacity=".75" strokeLinecap="round" /><ellipse cx="100" cy="74.5" rx="4" ry="1.4" fill="#c98c78" opacity=".12" />
                {eye(84, 'l')}{eye(116, 'r')}
                {brows}
                {mouth()}
                <path d="M62 58 Q56 6 100 5 Q144 6 138 58 Q134 32 118 36 Q112 20 104 38 Q100 24 96 38 Q88 20 82 36 Q66 32 62 58Z" fill={`url(#wh-${id})`} />
                <path d="M100 8 Q82 14 72 46 Q88 34 100 34Z" fill={c.hair} opacity=".9" /><path d="M100 8 Q118 14 128 46 Q112 34 100 34Z" fill={c.hair} opacity=".9" />
                <path d="M62 54 Q50 104 60 150 Q70 124 72 62Z" fill={c.hair} stroke={c.hairDark} strokeOpacity=".3" strokeWidth=".8" />
                <path d="M138 54 Q150 104 140 150 Q130 124 128 62Z" fill={c.hair} stroke={c.hairDark} strokeOpacity=".3" strokeWidth=".8" />
                <path d="M68 22 Q100 4 132 22" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".32" />
                <path d="M88 10 Q90 24 84 36 M112 10 Q110 24 116 36 M96 9 Q97 22 94 32" stroke={c.hairDark} strokeWidth="1.2" fill="none" opacity=".5" strokeLinecap="round" />
                <path className="mc-ahoge" d="M100 6 Q92 -8 106 -14" stroke={c.hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
                {c.acc === 'bow' && <g><path d="M122 18 L142 8 L142 30Z" fill={c.accent} /><path d="M122 18 L104 8 L104 30Z" fill={c.accent} /><circle cx="122" cy="18" r="4.6" fill="#fff" opacity=".6" /></g>}
                {c.acc === 'phones' && <g><path d="M64 56 Q62 12 100 11 Q138 12 136 56" stroke={c.accent} strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="56" y="50" width="13" height="26" rx="6.5" fill={c.accent} /><rect x="131" y="50" width="13" height="26" rx="6.5" fill={c.accent} /><rect x="59.5" y="55" width="5" height="16" rx="2.5" fill="#fff" opacity=".45" /></g>}
                {c.acc === 'clip' && <g><path d="M70 32 L90 25 L88 32 L72 39Z" fill={c.accent} /><circle cx="75" cy="35" r="2.2" fill="#fff" /></g>}
                {c.acc === 'pins' && <g fill={c.accent}><rect x="66" y="30" width="13" height="3.6" rx="1.8" transform="rotate(-24 72 32)" /><rect x="66" y="38" width="13" height="3.6" rx="1.8" transform="rotate(-24 72 40)" /></g>}
            </g></g>
            {arm('l', rest[0], rest[1])}
            {arm('r', rest[2], rest[3])}
            {typing && seated && (<g>
                <rect x="30" y="236" width="140" height="13" rx="4" fill="#5a4636" stroke="#000" strokeOpacity=".25" strokeWidth=".8" />
                <path d="M34 238 L166 238" stroke="#fff" strokeOpacity=".15" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="56" y="229" width="88" height="8" rx="3" fill="#3c3c4a" />
                <rect x="64" y="172" width="72" height="58" rx="5" fill="#2b2b36" stroke="#000" strokeOpacity=".3" strokeWidth=".8" />
                <circle cx="100" cy="200" r="5.5" fill={c.accent} opacity=".9" />
                <path d="M68 176 L132 176" stroke="#fff" strokeOpacity=".12" strokeWidth="1.6" strokeLinecap="round" />
                <g className="mc-keys" fill="#fff" fillOpacity=".0"><circle cx="86" cy="233" r="1.4" /><circle cx="100" cy="233" r="1.4" /><circle cx="114" cy="233" r="1.4" /></g>
            </g>)}
            {(mood === 'love' || mood === 'heart') && [0, 1, 2].map((i) => <path key={i} className="mc-up" style={{ animationDelay: `${i * 0.55}s` }} d={heartPath} transform={`translate(${70 + i * 30} ${-10 - i * 3})`} fill="#ff4d6d" />)}
            {mood === 'cheer' && [[36, 24], [164, 30], [26, 96], [176, 104]].map(([x, y], i) => <path key={i} className="mc-twinkle" style={{ animationDelay: `${i * 0.2}s` }} d={starPath} transform={`translate(${x} ${y})`} fill="#ffd166" />)}
            {mood === 'sleep' && <g fill="#cfd6ff" fontFamily="Inter, sans-serif" fontWeight="700"><text className="mc-z" x="146" y="24" fontSize="20">Z</text><text className="mc-z" style={{ animationDelay: '.7s' }} x="160" y="6" fontSize="14">z</text></g>}
            {mood === 'dizzy' && <g stroke="#8ec5ff" strokeWidth="2.2" fill="none" strokeLinecap="round"><path d="M138 22 q6 -8 12 0 q-6 8 -12 0" /><circle cx="58" cy="22" r="3" fill="#8ec5ff" /></g>}
            {mood === 'pout' && <g stroke="#e5383b" strokeWidth="2.4" strokeLinecap="round"><path d="M142 22 l8 -4 M144 14 l4 8 M150 22 l-8 -4" /></g>}
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
    const router = useRouter();
    const [walkMs, setWalkMs] = useState(0);
    const [spot, setSpot] = useState(null);
    const [tourInfo, setTourInfo] = useState(null);
    const tourRef = useRef(null);
    const [lean, setLean] = useState(0);
    const [roam, setRoam] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [msgs, setMsgs] = useState([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [myName, setMyName] = useState('');
    const [chatSeen, setChatSeen] = useState(true);
    const posRef = useRef({ r: 18, b: 18 });
    const ptr = useRef(null);
    const nextRoam = useRef(0);
    const lastDodge = useRef(0);
    const chatBody = useRef(null);
    const chatOpenRef = useRef(false);
    const msgsRef = useRef([]);
    const wrapRef = useRef(null);
    const tm = useRef({}); // timers
    const last = useRef(0);
    const clicks = useRef([]);
    const lastTouch = useRef(null);
    const moodRef = useRef('idle');
    moodRef.current = mood;
    posRef.current = pos;
    chatOpenRef.current = chatOpen;
    msgsRef.current = msgs;

    useEffect(() => { setRaw(config); }, [config]);

    // first paint is client-only: the character uses random choices and the current time
    useEffect(() => {
        setMounted(true); last.current = Date.now();
        setOv(readOverrides());
        try { setRoam(localStorage.getItem(LS_ROAM) !== '0'); setMyName(localStorage.getItem(LS_NAME) || ''); setChatSeen(localStorage.getItem(LS_CHAT) === '1'); } catch (e) { setChatSeen(false); }
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

    const react = useCallback((m, text, ms = 2600, keepIdle = false) => {
        clearTimeout(tm.current.mood);
        if (!keepIdle) last.current = Date.now();
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

    // she notices what happens around her: internet gone / back, you come back to the tab after a while
    useEffect(() => {
        let hiddenAt = 0;
        const off = () => react('shy', 'The internet is gone! 😱', 4000);
        const onl = () => react('cheer', 'Back online! 🌐', 3000);
        const vis = () => {
            if (document.hidden) hiddenAt = Date.now();
            else if (hiddenAt && Date.now() - hiddenAt > 120000) { hiddenAt = 0; react('wave', 'Welcome back! I missed you 💕', 3200); }
        };
        window.addEventListener('offline', off); window.addEventListener('online', onl); document.addEventListener('visibilitychange', vis);
        return () => { window.removeEventListener('offline', off); window.removeEventListener('online', onl); document.removeEventListener('visibilitychange', vis); };
    }, [react]);

    // eyes follow the pointer
    useEffect(() => {
        if (!mounted || !on) return undefined;
        let raf = 0;
        const move = (e) => {
            ptr.current = { x: e.clientX, y: e.clientY };
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
            else if (moodRef.current === 'idle' && !press.current && !tourRef.current && idle > 5000 && Math.random() < 0.3) {
                const r = Math.random();
                if (r < 0.4) { setLook({ x: Math.round((Math.random() * 5 - 2.5) * 2) / 2, y: Math.round((Math.random() * 3 - 1) * 2) / 2 }); clearTimeout(tm.current.glance); tm.current.glance = setTimeout(() => setLook({ x: 0, y: 0 }), 1500); }
                else { const gm = pick(c.adult ? ['giggle', 'stretch', 'wink', 'peace', 'type', 'type'] : ['giggle', 'stretch', 'wink', 'peace']); react(gm, gm === 'type' ? (talk ? 'Working on it… ⌨️' : '') : '', gm === 'type' ? 12000 : 1700, true); }
            }
            else if (talk && idle > 24000 && idle < 60000 && moodRef.current === 'idle' && Math.random() < 0.35) {
                const pool = PAGE[key] || CHATTER;
                react(pick(['wave', 'wink', 'heart', 'peace']), pick(Math.random() < 0.5 ? pool : CHATTER), 2600);
                last.current = Date.now() - 12000;
            }
        }, 5000);
        return () => { ['pointerdown', 'keydown'].forEach((ev) => window.removeEventListener(ev, wake)); clearInterval(iv); };
    }, [mounted, on, talk, key, react, c.adult]);

    useEffect(() => () => { Object.values(tm.current).forEach(clearTimeout); }, []);

    const speak = useCallback((text, ms = 3200) => {
        setSay(text);
        clearTimeout(tm.current.say);
        tm.current.say = setTimeout(() => setSay(''), ms);
    }, []);

    // walk along the screen to a position (distance from the right edge, in px)
    const walkTo = useCallback((r, after) => {
        const p = posRef.current;
        const dist = Math.abs(r - p.r);
        if (dist < 24) { if (after) after(); return; }
        const ms = Math.max(700, Math.round((dist / 80) * 1000));
        clearTimeout(tm.current.walk);
        setLean(r < p.r ? 5 : -5);
        setWalkMs(ms);
        setMood('walk');
        setPos({ r, b: p.b });
        tm.current.walk = setTimeout(() => { setWalkMs(0); setMood('idle'); if (after) after(); }, ms + 60);
    }, []);

    const press = useRef(null);

    // ----- guided tour: she walks to a button, lights it up and says what it does -----
    const visibleEl = (e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; };
    const endTour = useCallback((text) => {
        tourRef.current = null;
        clearTimeout(tm.current.tour);
        setSpot(null); setTourInfo(null);
        if (text) react('cheer', text, 3200);
        else setMood('idle');
    }, [react]);
    const tourStep = useCallback((i) => {
        const t = tourRef.current;
        if (!t) return;
        let idx = i; let el = null;
        while (idx < t.steps.length) {
            const st = t.steps[idx];
            el = st.href ? [...document.querySelectorAll(`a[href="${st.href}"]`)].find(visibleEl) : [...document.querySelectorAll('button,a,h1,h2,summary,label')].find((e) => visibleEl(e) && st.re.test(e.textContent || ''));
            if (el) break;
            idx += 1;
        }
        if (!el) { endTour(t.lang === 'bn' ? 'এই ছিল সব! কিছু জানতে চাইলে আমাকে জিজ্ঞেস করুন 💬' : 'That was everything! Ask me if you need anything else 💬'); return; }
        t.i = idx;
        const st = t.steps[idx];
        try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ }
        clearTimeout(tm.current.tour);
        tm.current.tour = setTimeout(() => {
            if (tourRef.current !== t) return;
            const rect = el.getBoundingClientRect();
            const wrap = wrapRef.current;
            const w = wrap ? wrap.offsetWidth : 112; const h = wrap ? wrap.offsetHeight : 134;
            let x = rect.right + 18;
            if (x + w > window.innerWidth - 8) x = rect.left - 18 - w;
            const r = Math.max(8, Math.min(window.innerWidth - w - 8, window.innerWidth - (x + w)));
            const b = Math.max(8, Math.min(window.innerHeight - h - 80, window.innerHeight - (rect.top + rect.height / 2 + h / 2)));
            setSpot({ x: rect.left - 6, y: rect.top - 6, w: rect.width + 12, h: rect.height + 12 });
            setTourInfo({ n: idx + 1, of: t.steps.length });
            const p = posRef.current;
            const ms = Math.max(600, Math.min(1500, Math.round(Math.hypot(r - p.r, b - p.b) / 0.45)));
            setLean(r < p.r ? 5 : -5);
            setWalkMs(ms); setMood('walk'); setPos({ r, b });
            clearTimeout(tm.current.walk);
            tm.current.walk = setTimeout(() => {
                setWalkMs(0);
                if (tourRef.current !== t) return;
                react('wave', st.say[t.lang] || st.say.en, 9000, true);
                speak(st.say[t.lang] || st.say.en, 9000);
                tm.current.tour = setTimeout(() => { if (tourRef.current === t) tourStep(idx + 1); }, 9500);
            }, ms + 60);
        }, 380);
    }, [endTour, react, speak]);
    const startTour = useCallback((lang = 'en') => {
        const pageSteps = (PAGE_STEPS[key] || []).map(([re, en, bn]) => ({ re, say: { en, bn } }));
        const navSteps = fetchConfig ? Object.keys(GO_PAGES).map((href) => ({ href, say: { en: `${GO_PAGES[href]}: ${PAGE_INFO[href] ? PAGE_INFO[href].en : ''}`, bn: `${GO_PAGES[href]}: ${PAGE_INFO[href] ? PAGE_INFO[href].bn : ''}` } })) : [];
        const steps = [...pageSteps, ...navSteps];
        if (!steps.length) { react('shy', lang === 'bn' ? 'এই পেজে দেখানোর মতো বাটন পাইনি 🙈' : 'I could not find anything to point at here 🙈', 2800); return; }
        clearTimeout(tm.current.sit); clearTimeout(tm.current.peek);
        setChatOpen(false);
        tourRef.current = { steps, i: 0, lang };
        tourStep(0);
    }, [key, fetchConfig, react, tourStep]);

    // roaming: now and then she walks around, sits down, hunts your cursor to tease you, or peeks from the screen edge
    useEffect(() => {
        if (!mounted || !on || !roam || prefs.anim === false) return undefined;
        if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        nextRoam.current = Date.now() + 7000;
        const iv = setInterval(() => {
            if (document.hidden || chatOpenRef.current || tourRef.current || press.current || moodRef.current !== 'idle' || Date.now() < nextRoam.current) return;
            const el = wrapRef.current;
            if (!el) return;
            nextRoam.current = Date.now() + 9000 + Math.random() * 9000;
            const w = el.offsetWidth;
            const maxR = Math.max(8, window.innerWidth - w - 8);
            const clampR = (v) => Math.max(8, Math.min(maxR, v));
            const roll = Math.random();
            if (roll < 0.38) {
                walkTo(clampR(8 + Math.random() * (maxR - 8)));
            } else if (roll < 0.56) {
                setMood('sit');
                speak(pick(SIT), 3000);
                clearTimeout(tm.current.sit);
                tm.current.sit = setTimeout(() => { if (moodRef.current === 'sit') setMood('idle'); }, 9000 + Math.random() * 6000);
            } else if (roll < 0.8 && ptr.current) {
                walkTo(clampR(window.innerWidth - ptr.current.x - w / 2), () => react('tease', pick(TEASE), 2800, true));
            } else if (roll < 0.92) {
                const right = posRef.current.r < window.innerWidth / 2;
                walkTo(right ? -w * 0.55 : window.innerWidth - w * 0.45, () => {
                    setMood('idle');
                    speak('👀', 3200);
                    clearTimeout(tm.current.peek);
                    tm.current.peek = setTimeout(() => {
                        react('cheer', 'Boo! 👻', 2000, true);
                        tm.current.peek = setTimeout(() => walkTo(clampR(8 + Math.random() * (maxR - 8))), 1500);
                    }, 3600);
                });
            } else {
                walkTo(clampR(8 + Math.random() * (maxR - 8)));
            }
        }, 1500);
        return () => { clearInterval(iv); };
    }, [mounted, on, roam, prefs.anim, walkTo, speak, react]);

    // ----- chat -----
    useEffect(() => { if (chatBody.current) chatBody.current.scrollTop = chatBody.current.scrollHeight; }, [msgs, typing, chatOpen]);
    useEffect(() => {
        if (!chatOpen) return undefined;
        const k = (e) => { if (e.key === 'Escape') setChatOpen(false); };
        window.addEventListener('keydown', k);
        return () => window.removeEventListener('keydown', k);
    }, [chatOpen]);

    const openChat = () => {
        if (tourRef.current) endTour('');
        last.current = Date.now();
        clearTimeout(tm.current.walk); clearTimeout(tm.current.peek); clearTimeout(tm.current.sit);
        setWalkMs(0);
        if (moodRef.current === 'sleep' || moodRef.current === 'walk' || moodRef.current === 'sit') setMood('idle');
        setSay('');
        const el = wrapRef.current;
        const w = el ? el.offsetWidth : 112; const h = el ? el.offsetHeight : 134;
        const p = posRef.current;
        const r = Math.max(12, Math.min(window.innerWidth - w - 12, p.r));
        const b = Math.max(12, Math.min(window.innerHeight - h - 440, p.b));
        if (r !== p.r || b !== p.b) setPos({ r, b });
        if (!msgsRef.current.length) {
            const hi = myName ? `Hi ${myName}! I am ${c.name}. Ask me anything about the site, or just chat ✨` : `Hi! I am ${c.name}. Ask me how to upload, copy links, fix a stuck file… or press “Show me around” ✨`;
            setMsgs([{ id: 'hi', from: 'bot', text: hi }]);
        }
        setChatOpen(true);
        setChatSeen(true);
        try { localStorage.setItem(LS_CHAT, '1'); } catch (e) { /* ignore */ }
        react('wave', '', 1800);
    };
    const closeChat = () => { setChatOpen(false); clearInterval(tm.current.type); };

    const askAI = async (history, ctx) => {
        if (aiOff) return null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return null;
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 22000);
            const res = await fetch('/api/mascot-chat', {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ messages: history.map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })), page: ctx.page, name: ctx.name }),
                signal: ctl.signal,
            });
            clearTimeout(t);
            const j = await res.json();
            if (j && j.ok) return j;
            if (j && j.reason === 'no_key') aiOff = true;
        } catch (e) { /* the offline brain answers */ }
        return null;
    };

    const send = async (raw) => {
        const text = String(raw === undefined ? input : raw).trim().slice(0, 400);
        if (!text || typing) return;
        setInput('');
        last.current = Date.now();
        const history = [...msgsRef.current, { id: `u${Date.now()}`, from: 'me', text }];
        setMsgs(history);
        setTyping(true);
        react('wink', '', 1400);
        const ctx = { page: key, admin: !!fetchConfig, name: myName };
        let res = answer(text, ctx);
        if (res.unknown) {
            const ai = await askAI(history, ctx);
            if (ai) res = { text: ai.text, mood: 'wave', go: fetchConfig ? ai.go : null, lang: langOf(text) };
        } else {
            await new Promise((ok) => setTimeout(ok, 350 + Math.random() * 450));
        }
        if (res.remember) { setMyName(res.remember.name); try { localStorage.setItem(LS_NAME, res.remember.name); } catch (e) { /* ignore */ } }
        setTyping(false);
        const id = `b${Date.now()}`;
        const chars = Array.from(res.text);
        setMsgs((m) => [...m, { id, from: 'bot', text: '', go: res.go || null }]);
        clearInterval(tm.current.type);
        let i = 0;
        tm.current.type = setInterval(() => {
            i += 2;
            const part = chars.slice(0, i).join('');
            setMsgs((m) => m.map((x) => (x.id === id ? { ...x, text: part } : x)));
            if (i >= chars.length) clearInterval(tm.current.type);
        }, 20);
        react(res.mood || 'wave', '', 2600, true);
        if (res.tour) setTimeout(() => { closeChat(); startTour(res.lang); }, 1400);
    };

    // touch / drag
    const onDown = (e) => {
        e.preventDefault();
        last.current = Date.now();
        let r0 = pos.r; let b0 = pos.b;
        if (walkMs > 0 && wrapRef.current) {
            // she was walking: freeze where she is right now, then she can be dragged from there
            r0 = Math.round(window.innerWidth - wrapRef.current.getBoundingClientRect().right);
            clearTimeout(tm.current.walk); clearTimeout(tm.current.peek);
            setWalkMs(0); setPos({ r: r0, b: b0 });
            if (moodRef.current === 'walk') setMood('idle');
        }
        press.current = { x: e.clientX, y: e.clientY, r: r0, b: b0, moved: false };
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
    const toggleRoam = () => {
        const v = !roam;
        setRoam(v);
        try { localStorage.setItem(LS_ROAM, v ? '1' : '0'); } catch (e) { /* ignore */ }
        if (!v) { clearTimeout(tm.current.walk); clearTimeout(tm.current.peek); clearTimeout(tm.current.sit); setWalkMs(0); if (['walk', 'sit'].includes(moodRef.current)) setMood('idle'); }
        react(v ? 'cheer' : 'wink', v ? 'Yay, I can explore! 🚶‍♀️' : 'Okay, I will stay right here 🧍‍♀️', 2200);
    };
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
            {spot && <div className="mc-spot" style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }} aria-hidden="true" />}
            {tourInfo && (
                <div className="mc-tourbar" role="group" aria-label="Tour">
                    <span>🧭 {tourInfo.n}/{tourInfo.of}</span>
                    <button type="button" onClick={() => { clearTimeout(tm.current.tour); clearTimeout(tm.current.walk); setWalkMs(0); tourStep(tourRef.current.i + 1); }}>Next ▸</button>
                    <button type="button" className="g" onClick={() => endTour('Okay! Ask me any time 💬')}>Stop</button>
                </div>
            )}
            <div ref={wrapRef} className={`mc-wrap ${prefs.anim === false ? 'mc-still' : ''} ${drag ? 'mc-drag' : ''} ${touch ? 'mc-touch' : ''} ${mood === 'walk' ? 'mc-walk' : ''} ${mood === 'sit' && !c.adult ? 'mc-sit' : ''} ${mood === 'giggle' ? 'mc-giggle' : ''}`} style={{ right: pos.r, bottom: pos.b, '--mc-lean': `${lean}deg`, '--mc-w': c.adult ? '98px' : undefined, transition: walkMs ? `right ${walkMs}ms ease-in-out, bottom ${walkMs}ms ease-in-out` : undefined }} onPointerEnter={(e) => {
                if (e.pointerType === 'mouse' && roam && prefs.anim !== false && !chatOpen && !press.current && moodRef.current === 'idle' && Date.now() - lastDodge.current > 40000 && Math.random() < 0.2) {
                    lastDodge.current = Date.now();
                    const w = wrapRef.current ? wrapRef.current.offsetWidth : 112;
                    const maxR = Math.max(8, window.innerWidth - w - 8);
                    const away = pos.r + (pos.r > window.innerWidth / 2 ? -1 : 1) * (170 + Math.random() * 150);
                    walkTo(Math.max(8, Math.min(maxR, away)), () => react('tease', 'Catch me if you can! 😜', 2600, true));
                    return;
                }
                if (moodRef.current === 'idle' && Date.now() - last.current > 20000) react('wave', '', 1800);
                last.current = Date.now();
            }}>
                {say && !chatOpen && <div className={`mc-bubble ${flipRight ? 'r' : 'l'}`} role="status">{say}</div>}
                <button
                    type="button"
                    className="mc-char"
                    style={c.src ? { aspectRatio: '1 / 1' } : c.adult ? { aspectRatio: '1 / 2' } : undefined}
                    aria-label={`${c.name}, the helper. Click to say hi, drag to move.`}
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    onDoubleClick={onDouble}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const t = pick(TOUCH, lastTouch.current); lastTouch.current = t; react(t[0], t[1], 2600); } }}
                >
                    {c.src ? <Sticker c={c} mood={mood} /> : c.adult ? <Woman c={c} mood={mood} look={look} seated={mood !== 'walk' && !tourInfo} /> : <Girl c={c} mood={mood} look={look} />}
                </button>
                {chatOpen && (
                    <div className={`mc-chat ${flipRight ? 'r' : 'l'}`} role="dialog" aria-label={`Chat with ${c.name}`}>
                        <div className="mc-chat-h">
                            <span className="mc-dot" /><b>{c.name}</b><small>online helper</small>
                            <button type="button" onClick={closeChat} aria-label="Close chat">×</button>
                        </div>
                        <div className="mc-chat-b" ref={chatBody}>
                            {msgs.map((m) => (
                                <div key={m.id} className={`mc-m ${m.from}`}>
                                    {m.text}
                                    {m.go && fetchConfig && <button type="button" className="mc-go" onClick={() => { router.push(m.go[0]); react('cheer', '', 1800); }}>Open {m.go[1]} →</button>}
                                </div>
                            ))}
                            {typing && <div className="mc-m bot mc-typing" aria-label="typing"><i /><i /><i /></div>}
                        </div>
                        {msgs.length <= 2 && !typing && (
                            <div className="mc-chips">
                                {chipsFor(langOf(msgs.length ? (msgs.find((x) => x.from === 'me') || { text: '' }).text : '')).map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}
                            </div>
                        )}
                        <form className="mc-chat-f" onSubmit={(e) => { e.preventDefault(); send(); }}>
                            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything…" maxLength={400} autoFocus aria-label="Message" />
                            <button type="submit" disabled={typing || !input.trim()} aria-label="Send">➤</button>
                        </form>
                    </div>
                )}
                {!drag && <button type="button" className={`mc-chatbtn ${chatSeen ? '' : 'new'}`} onClick={() => (chatOpen ? closeChat() : openChat())} aria-label="Chat with the helper" title="Chat with me">💬</button>}
                {!locked && (
                    <div className="mc-tools">
                        <button type="button" onClick={() => startTour('en')} aria-label="Show me around" title="Show me around"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5Z" /></svg></button>
                        <button type="button" onClick={swap} aria-label="Change character" title="Change character"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4" /></svg></button>
                        <button type="button" onClick={toggleTalk} className={talk ? '' : 'off'} aria-label={talk ? 'Stop chatting' : 'Allow chatting'} title={talk ? 'Quiet mode' : 'Let her chat'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z" />{!talk && <path d="M4 4l16 16" />}</svg></button>
                        <button type="button" onClick={toggleRoam} className={roam ? '' : 'off'} aria-label={roam ? 'Stop wandering' : 'Let her wander'} title={roam ? 'Stay here' : 'Let her wander'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="13" cy="4.5" r="1.6" /><path d="M9 21l3-6 3 3v4M12 15l-1-5 4 1 2 3M10 10l-3 2" /></svg></button>
                        <button type="button" onClick={hide} aria-label="Hide the helper" title="Hide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
                    </div>
                )}
            </div>
        </>
    );
}
