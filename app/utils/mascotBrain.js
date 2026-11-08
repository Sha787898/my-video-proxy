// The mascot's "brain": a small offline assistant that knows this site. It answers in English or Bangla (it follows the language you
// type, Banglish included), understands typos loosely (keyword + prefix matching), remembers your name, can do quick maths, tell the time,
// jokes, and point you to the right page. An optional online AI (api/mascot-chat) can answer anything else when ANTHROPIC_API_KEY is set.
// Pure functions only, so it is safe to import anywhere.

const BN_SCRIPT = /[ঀ-৿]/;
const BANGLISH = ['kemon', 'koro', 'kora', 'korbo', 'korte', 'korbe', 'ache', 'nai', 'amar', 'tumi', 'ami', 'kano', 'kothay', 'dao', 'bolo', 'hobe', 'jabe', 'jai', 'bhai', 'vai', 'dekhao', 'shekhao', 'sikhao', 'koi', 'kivabe', 'kibhabe', 'kisu', 'kichu', 'valo', 'bhalo', 'oita', 'aita', 'ekta', 'sob', 'kaj', 'somossa', 'problem hocche', 'pari', 'parbo', 'lagbe', 'ki'];

export function tokens(s) {
    return String(s || '').toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
}

export function langOf(text) {
    if (BN_SCRIPT.test(text)) return 'bn';
    const t = tokens(text);
    return t.some((w) => BANGLISH.includes(w)) ? 'bn' : 'en';
}

const pick = (v) => (Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v);

// what each page is, for "what is this page?"
export const PAGE_INFO = {
    '/dashboard': { en: 'This is your Dashboard: totals, recent files and live traffic at a glance.', bn: 'এটা ড্যাশবোর্ড। এখানে মোট ফাইল, সাম্প্রতিক ফাইল আর লাইভ ট্রাফিক দেখা যায়।' },
    '/gdrive-upload': { en: 'GDrive Upload: pick a profile, paste Drive links (or extract a whole folder) and press Generate links. You get your MultiServer links at once.', bn: 'GDrive Upload: প্রোফাইল বেছে Drive লিংক পেস্ট করুন (বা পুরো ফোল্ডার Extract করুন), তারপর Generate links চাপুন। সাথে সাথেই MultiServer লিংক পাবেন।' },
    '/processing-files': { en: 'Processing Queue: every file that is still being mirrored to the servers, live. Failed servers are retried automatically.', bn: 'Processing Queue: যেসব ফাইল এখনো সার্ভারে মিরর হচ্ছে সেগুলো লাইভ দেখা যায়। ফেইল হলে নিজে থেকে আবার চেষ্টা হয়।' },
    '/file-manager': { en: 'File Manager: all your files, folders, copy buttons and Repair (re-send a file to missing servers).', bn: 'File Manager: সব ফাইল, ফোল্ডার, কপি বাটন আর Repair (যে সার্ভারে নেই সেখানে আবার পাঠানো)।' },
    '/embed-generator': { en: 'Link Generator: make many links at once. Advanced mode can also add other sites\' embed links.', bn: 'Link Generator: একসাথে অনেক লিংক বানানো যায়। Advanced mode এ অন্য সাইটের embed লিংকও যোগ করা যায়।' },
    '/analytics': { en: 'Analytics: real visitors, countries, devices, top files and estimated bandwidth.', bn: 'Analytics: আসল ভিজিটর, দেশ, ডিভাইস, টপ ফাইল আর আনুমানিক ব্যান্ডউইথ।' },
    '/manage-sites': { en: 'Manage Sites: your servers, API keys and upload profiles.', bn: 'Manage Sites: সার্ভার, API key আর আপলোড প্রোফাইল।' },
    '/player-settings': { en: 'Player Settings: the look of the player and download page, and whether I show up for everyone.', bn: 'Player Settings: প্লেয়ার আর ডাউনলোড পেজের লুক, আর আমি সবার জন্য দেখাব কিনা।' },
    download: { en: 'This is the download page. Pick any server, they are all checked. The tags show the quality found in the file name.', bn: 'এটা ডাউনলোড পেজ। যেকোনো সার্ভার বেছে নিন, সবগুলো চেক করা। ট্যাগগুলো ফাইলের নাম থেকে কোয়ালিটি দেখায়।' },
};

const J_EN = [
    'Why did the file go to therapy? It had too many mirrors! 🪞',
    'I would tell you a UDP joke, but you might not get it. 📡',
    'Why do servers never get lonely? They always have a backup. 💾',
    'What do you call 24 hosts that all work? A miracle. ✨',
];
const J_BN = [
    'ফাইল কেন থেরাপিতে গেল? কারণ তার অনেক মিরর ছিল! 🪞',
    'সার্ভার কখনো একা হয় না, কারণ তার সবসময় ব্যাকআপ থাকে 💾',
    'ইন্টারনেট স্লো হলে আমিও স্লো মোশনে নাচি 🐢',
    '২৪টা হোস্ট একসাথে চললে সেটাকে বলে অলৌকিক ঘটনা ✨',
];

// id, keywords (English, Banglish, Bangla), reply, mood, optional page to open, admin-only
const INTENTS = [
    { id: 'greet', kw: ['hi', 'hello', 'hey', 'hola', 'yo', 'salam', 'assalamu', 'সালাম', 'হাই', 'হ্যালো', 'হেই'], en: ['Hi hi! 👋 How can I help?', 'Hello! I am here, ask me anything 💬'], bn: ['হাই হাই! 👋 কীভাবে সাহায্য করব?', 'হ্যালো! যা জানতে চান জিজ্ঞেস করুন 💬'], mood: 'wave' },
    { id: 'how', kw: ['how are you', 'how r u', 'kemon acho', 'kemon aco', 'kemon asen', 'কেমন আছ', 'কেমন আছো', 'কেমন আছেন', 'whats up', 'sup'], en: 'I am great, thanks for asking! Servers are humming and I had a nap ☺️', bn: 'আমি দারুণ আছি! সার্ভার ঠিকঠাক চলছে আর আমি একটু ঘুমিয়ে নিয়েছি ☺️', mood: 'heart' },
    { id: 'who', kw: ['who are you', 'your name', 'who r u', 'tumi ke', 'tomar nam', 'tumi ki', 'তুমি কে', 'তোমার নাম', 'about you'], en: 'I am your little helper character! I live on this site, know where everything is and I love to chat. Ask me how to upload, copy links, fix a stuck file… anything 🌸', bn: 'আমি এই সাইটের ছোট্ট হেল্পার! সবকিছু কোথায় আছে আমি জানি, আর গল্প করতে ভালোবাসি। আপলোড, লিংক কপি, আটকে থাকা ফাইল, যা খুশি জিজ্ঞেস করুন 🌸', mood: 'wave' },
    { id: 'help', kw: ['help', 'what can you do', 'commands', 'features', 'sahajjo', 'help koro', 'কি পারো', 'কী পারো', 'সাহায্য', 'হেল্প'], en: 'I can explain every page, tell you how to upload, copy links, use profiles or fix files, open pages for you, do quick maths, tell the time and jokes. Try the buttons below! ✨', bn: 'আমি প্রতিটা পেজ বুঝিয়ে দিতে পারি, আপলোড, লিংক কপি, প্রোফাইল বা ফাইল ঠিক করার নিয়ম বলতে পারি, পেজ খুলে দিতে পারি, হিসাব করতে পারি, সময় আর জোকসও বলতে পারি। নিচের বাটনগুলো দেখুন! ✨', mood: 'cheer' },
    { id: 'upload', kw: ['upload', 'gdrive', 'google drive', 'drive link', 'generate link', 'generate links', 'আপলোড', 'আপলোড', 'ড্রাইভ', 'link banabo', 'link banano', 'link generate'], en: 'Open GDrive Upload, choose a profile on top, paste your Drive links (or press "Extract files" for a whole folder) and press "Generate links". You get the MultiServer links instantly, mirroring to the servers continues in the background 🚀', bn: 'GDrive Upload খুলুন, উপরে প্রোফাইল বেছে নিন, Drive লিংক পেস্ট করুন (পুরো ফোল্ডারের জন্য "Extract files" চাপুন) তারপর "Generate links"। MultiServer লিংক সাথে সাথেই পাবেন, সার্ভারে মিরর ব্যাকগ্রাউন্ডে চলতে থাকবে 🚀', mood: 'cheer', go: ['/gdrive-upload', 'GDrive Upload'], admin: true },
    { id: 'folder_extract', kw: ['extract', 'folder link', 'drive folder', 'whole folder', 'ফোল্ডার লিংক'], en: 'On GDrive Upload press "Extract files", paste the Drive folder link, and I will list the files inside so you can generate links for all of them. The folder must be shared with "anyone with the link".', bn: 'GDrive Upload এ "Extract files" চাপুন, Drive ফোল্ডারের লিংক দিন, আমি ভেতরের সব ফাইল লিস্ট করব। ফোল্ডারটা "anyone with the link" করে শেয়ার করা থাকতে হবে।', mood: 'wink', go: ['/gdrive-upload', 'GDrive Upload'], admin: true },
    { id: 'queue', kw: ['processing', 'queue', 'pending', 'stuck', 'atke', 'atkey', 'wait', 'mirror', 'mirroring', 'retry', 'force sync', 'প্রসেসিং', 'আটকে', 'কিউ', 'processing a', 'koto time', 'koto somoy'], en: 'The Processing Queue shows each file live while it is mirrored to your servers. Failed servers retry by themselves (up to 4 tries). If something is slow, press "Force sync". Keep the site open in a tab so the queue can work 👀', bn: 'Processing Queue এ প্রতিটা ফাইলের লাইভ অবস্থা দেখা যায়। ফেইল হলে নিজে থেকে ৪ বার পর্যন্ত চেষ্টা করে। ধীর হলে "Force sync" চাপুন। কাজ চলার জন্য সাইটটা একটা ট্যাবে খোলা রাখুন 👀', mood: 'wave', go: ['/processing-files', 'Processing Queue'], admin: true },
    { id: 'profile', kw: ['profile', 'profiles', 'sub id', 'subid', 'api key', 'choose server', 'which server', 'প্রোফাইল', 'এপিআই', 'default profile'], en: 'Profiles live in Manage Sites. "Default" uses every server that is ON, and you can make up to 3 more with just the servers you pick (for example the 3-4 sites of one API key). You choose the profile on the upload page and when repairing files 🎯', bn: 'প্রোফাইল Manage Sites এ। "Default" মানে যত সার্ভার ON সবগুলো, আর আপনি আরও ৩টা প্রোফাইল বানাতে পারেন নিজের পছন্দের সার্ভার দিয়ে (যেমন এক API key এর ৩-৪টা সাইট)। আপলোডের সময় আর Repair এর সময় প্রোফাইল বেছে নেওয়া যায় 🎯', mood: 'wink', go: ['/manage-sites', 'Manage Sites'], admin: true },
    { id: 'copy', kw: ['copy', 'title embed', 'embed link', 'copy link', 'copy all', 'কপি', 'cpy', 'embed copy', 'title file'], en: 'Everywhere you see a link there is a Copy menu: Title, Embed, File, Title+Embed (name, size and embed link) and All. On the upload results, File Manager and Processing Queue one click copies it 📋', bn: 'যেখানেই লিংক আছে সেখানে Copy মেনু আছে: Title, Embed, File, Title+Embed (নাম, সাইজ আর embed লিংক) আর All। আপলোড রেজাল্ট, File Manager আর Processing Queue তে এক ক্লিকেই কপি হয় 📋', mood: 'peace' },
    { id: 'linkgen', kw: ['link generator', 'generator', 'embed generator', 'bulk links', 'advanced mode', 'many links', 'অনেক লিংক'], en: 'Link Generator makes lots of links in one go. Simple mode turns file IDs into MultiServer links, Advanced mode can also add the embed links of other hosts 🔧', bn: 'Link Generator দিয়ে একসাথে অনেক লিংক বানানো যায়। Simple mode এ file ID থেকে MultiServer লিংক হয়, Advanced mode এ অন্য হোস্টের embed লিংকও যোগ করা যায় 🔧', mood: 'cheer', go: ['/embed-generator', 'Link Generator'], admin: true },
    { id: 'fm', kw: ['file manager', 'folder', 'folders', 'repair', 'delete file', 'rename', 'manage files', 'ফাইল ম্যানেজার', 'ফোল্ডার', 'move file'], en: 'File Manager lists every file. Make folders, move files into them, copy links, and use Repair to re-send a file to missing servers (you choose which profile to repair with) 📁', bn: 'File Manager এ সব ফাইল থাকে। ফোল্ডার বানানো, ফাইল সরানো, লিংক কপি আর Repair (যেসব সার্ভারে নেই সেখানে আবার পাঠানো, কোন প্রোফাইলে সেটা আপনি বেছে নেন) করা যায় 📁', mood: 'wave', go: ['/file-manager', 'File Manager'], admin: true },
    { id: 'analytics', kw: ['analytics', 'visitors', 'traffic', 'country', 'countries', 'views', 'bandwidth', 'stats', 'অ্যানালিটিক্স', 'ভিজিটর', 'ট্রাফিক', 'viewer', 'ভিউ'], en: 'Analytics shows real visitors, countries, devices, top files and profiles, and an estimated bandwidth (views × file size). If it is empty, run sql/6-analytics.sql in Supabase once 📊', bn: 'Analytics এ আসল ভিজিটর, দেশ, ডিভাইস, টপ ফাইল, প্রোফাইল আর আনুমানিক ব্যান্ডউইথ (ভিউ × ফাইলের সাইজ) দেখা যায়। খালি থাকলে একবার Supabase এ sql/6-analytics.sql চালান 📊', mood: 'cheer', go: ['/analytics', 'Analytics'], admin: true },
    { id: 'theme', kw: ['theme', 'color', 'colour', 'dark', 'white', 'red theme', 'player settings', 'look', 'design', 'থিম', 'কালার', 'রং', 'player'], en: 'Player Settings changes the look of the player and the download page for everyone: themes, colours and more. I have a switch there too (you can turn me off for all visitors 🥺).', bn: 'Player Settings এ প্লেয়ার আর ডাউনলোড পেজের লুক সবার জন্য বদলানো যায়: থিম, কালার আরও অনেক কিছু। সেখানে আমার একটা সুইচও আছে (সবার জন্য আমাকে বন্ধ করা যায় 🥺)।', mood: 'wink', go: ['/player-settings', 'Player Settings'], admin: true },
    { id: 'quality', kw: ['quality', 'hdr', 'dovi', 'dolby', '1080p', '720p', '4k', '2160p', 'web-dl', 'bluray', 'কোয়ালিটি'], en: 'The quality tags on the download page (1080p, WEB-DL, HDR, DoVi…) are read from the file name, so name your files like "Movie.2026.1080p.WEB-DL.HDR.mkv" and the tags appear by themselves 🏷️', bn: 'ডাউনলোড পেজের কোয়ালিটি ট্যাগ (1080p, WEB-DL, HDR, DoVi…) ফাইলের নাম থেকে পড়া হয়। ফাইলের নাম "Movie.2026.1080p.WEB-DL.HDR.mkv" এভাবে দিলে ট্যাগ নিজেই আসবে 🏷️', mood: 'peace' },
    { id: 'download', kw: ['download', 'download page', 'ডাউনলোড', 'how to download', 'server pick', 'which server to download'], en: 'On the download page pick any server from the list. They are all checked, so just choose the one that is fastest for you. Use the gear for the look settings ✅', bn: 'ডাউনলোড পেজে লিস্ট থেকে যেকোনো সার্ভার বেছে নিন। সবগুলো চেক করা, তাই আপনার জন্য যেটা দ্রুত সেটাই নিন। লুক বদলাতে গিয়ারে চাপুন ✅', mood: 'wave' },
    { id: 'mascot', kw: ['mascot', 'character', 'change you', 'hide you', 'quiet', 'roam', 'walk', 'ক্যারেক্টার', 'তোমাকে সরাব', 'বন্ধ', 'চুপ'], en: 'Hover over me for little buttons: ↻ changes my character, … makes me quiet, 🚶 stops me from wandering and × hides me. You can drag me anywhere too! The admin can turn me off for everyone in Player Settings.', bn: 'আমার ওপর মাউস নিলে ছোট বাটন আসে: ↻ ক্যারেক্টার বদলায়, … আমাকে চুপ করায়, 🚶 ঘোরাঘুরি বন্ধ করে আর × লুকিয়ে ফেলে। আমাকে টেনে যেকোনো জায়গায় রাখতেও পারেন! অ্যাডমিন Player Settings থেকে সবার জন্য আমাকে বন্ধ করতে পারে।', mood: 'shy' },
    { id: 'error', kw: ['error', 'not working', 'failed', 'fail', 'problem', 'bug', 'broken', 'doesnt work', "doesn't work", 'kaj korche na', 'kaj kore na', 'hocche na', 'hoy na', 'somossa', 'সমস্যা', 'কাজ করছে না', 'এরর', 'হচ্ছে না'], en: 'Oh no! Quick checks: 1) look at the Processing Queue for the red line, it says what failed, 2) check the API key of that server in Manage Sites, 3) press Repair in File Manager, 4) paste me the error text and I will help 🛠️', bn: 'আহা! দ্রুত চেক করুন: ১) Processing Queue তে লাল লাইনটা দেখুন, কী ফেইল হয়েছে লেখা থাকে, ২) Manage Sites এ ওই সার্ভারের API key ঠিক আছে কিনা, ৩) File Manager এ Repair চাপুন, ৪) এরর লেখাটা আমাকে পেস্ট করুন, আমি দেখব 🛠️', mood: 'shy', go: ['/processing-files', 'Processing Queue'], admin: true },
    { id: 'thanks', kw: ['thanks', 'thank you', 'thx', 'ty', 'dhonnobad', 'dhonyobad', 'ধন্যবাদ', 'থ্যাংকস', 'thanks a lot'], en: ['You are welcome! 💖', 'Anytime! That is what I am here for ✨'], bn: ['স্বাগতম! 💖', 'যেকোনো সময়! এইজন্যই তো আছি ✨'], mood: 'heart' },
    { id: 'bye', kw: ['bye', 'goodbye', 'see you', 'cya', 'tata', 'বিদায়', 'আসি', 'good night', 'gn'], en: 'Bye bye! Come back soon 👋', bn: 'বাই বাই! আবার আসবেন 👋', mood: 'wave' },
    { id: 'joke', kw: ['joke', 'funny', 'make me laugh', 'jokes', 'মজা', 'জোকস', 'হাসাও', 'hasao', 'hashao'], mood: 'cheer' },
    { id: 'love', kw: ['love you', 'i love', 'like you', 'ভালোবাসি', 'valobashi', 'bhalobashi', 'cute', 'beautiful', 'pretty', 'sundor', 'সুন্দর', 'kyut', 'কিউট', 'best'], en: ['Stop it, you are making me blush! 🙈💕', 'Aww, you are the best, you know that? 💖'], bn: ['থামুন তো, আমি লজ্জা পাচ্ছি! 🙈💕', 'ইশ, আপনি সবচেয়ে ভালো! 💖'], mood: 'love' },
    { id: 'bored', kw: ['bored', 'boring', 'nothing to do', 'বোর', 'বিরক্ত', 'bor hocchi', 'bore'], en: 'Bored? Let me dance for you! 💃 Or try dragging me around, or double-click me 😏', bn: 'বোর লাগছে? চলো নাচি! 💃 নয়তো আমাকে টেনে নিয়ে ঘুরান, কিংবা ডাবল ক্লিক করুন 😏', mood: 'cheer' },
    { id: 'sleep', kw: ['sleepy', 'tired', 'ghum', 'ঘুম', 'good morning', 'morning'], en: 'Sleepy? Same… but we have files to mirror! ☕ A short break is fine too 💤', bn: 'ঘুম পাচ্ছে? আমারও! কিন্তু ফাইল তো মিরর করতে হবে! ☕ ছোট্ট বিরতিও ঠিক আছে 💤', mood: 'sleep' },
    { id: 'dance', kw: ['dance', 'sing', 'nach', 'নাচ', 'গান'], en: 'La la la~ 🎵 *twirls*', bn: 'লা লা লা~ 🎵 *ঘুরে ঘুরে নাচে*', mood: 'cheer' },
    { id: 'hug', kw: ['hug', 'kiss', 'জড়িয়ে', 'hug me'], en: 'Hug! 🤗 *hugs back*', bn: 'হাগ! 🤗 *জড়িয়ে ধরে*', mood: 'love' },
];

const CHIPS = {
    en: ['Show me around 🧭', 'How do I upload?', 'What is this page?', 'Tell me a joke'],
    bn: ['ঘুরিয়ে দেখাও 🧭', 'কীভাবে আপলোড করব?', 'এটা কোন পেজ?', 'একটা জোক বলো'],
};
export const chipsFor = (lang) => CHIPS[lang] || CHIPS.en;

// "12*(3+4)", "what is 5 x 6" -> number, or null
function calc(text) {
    const s = String(text).toLowerCase().replace(/what is|calculate|calc|how much is|=|\?/g, '').replace(/[x×]/g, '*').replace(/÷/g, '/').replace(/\^/g, '**').trim();
    if (!s || !/\d/.test(s) || !/[+\-*/%]/.test(s.replace(/^-/, ''))) return null;
    if (!/^[\d\s+\-*/().%]+$/.test(s.replace(/\*\*/g, '*'))) return null;
    try {
        // eslint-disable-next-line no-new-func
        const v = Function(`"use strict"; return (${s});`)();
        return typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 1e8) / 1e8 : null;
    } catch (e) { return null; }
}

function score(norm, toks, kws) {
    let sc = 0;
    kws.forEach((kw) => {
        const k = kw.toLowerCase();
        if (k.includes(' ')) { if (norm.includes(k)) sc += 3; return; }
        if (BN_SCRIPT.test(k)) { if (norm.includes(k)) sc += 2; return; }
        if (toks.some((t) => t === k || (k.length >= 4 && t.length >= 4 && (t.startsWith(k) || k.startsWith(t))))) sc += 2;
    });
    return sc;
}

// text: what the person typed. ctx: { page: current page key, admin: bool, name: remembered name }
// returns { text, mood, go?: [href, label], remember?: { name } }
export function answer(text, ctx = {}) {
    const lang = langOf(text);
    const L = (en, bn) => (lang === 'bn' ? bn : en);
    const norm = String(text || '').toLowerCase().trim();
    const toks = tokens(norm);
    if (!toks.length) return { text: L('Say something and I will answer! 😊', 'কিছু লিখুন, আমি উত্তর দেব! 😊'), mood: 'wink', lang };

    // remember the name
    const nm = norm.match(/(?:my name is|call me|amar nam(?: hocche| holo| ta)?|আমার নাম(?: হলো| হচ্ছে)?)\s+([\p{L}\p{M}]{2,16})/u);
    if (nm) {
        const name = nm[1].charAt(0).toUpperCase() + nm[1].slice(1);
        return { text: L(`Nice to meet you, ${name}! I will remember it 💕`, `আপনার সাথে পরিচিত হয়ে ভালো লাগল, ${name}! আমি মনে রাখব 💕`), mood: 'heart', remember: { name }, lang };
    }
    if (/(what'?s my name|my name\?|amar nam ki|আমার নাম কী)/.test(norm)) {
        return { text: ctx.name ? L(`Your name is ${ctx.name}, of course! 😄`, `আপনার নাম ${ctx.name}, মনে আছে তো! 😄`) : L('You have not told me yet! Say "my name is …" 😊', 'আপনি এখনো বলেননি! "আমার নাম …" বলুন 😊'), mood: 'wink', lang };
    }

    // guided tour: she walks to the buttons and points at them
    if (/(show me around|give me a tour|\btour\b|guide me|walk me through|ghurie dekh|ghure dekh|ki kaj kore|kon\w* ki kaj|kon\w* kaj kore|সাইট দেখাও|ঘুরিয়ে দেখাও|কোনটা কী কাজ|কোনটার কী কাজ)/.test(norm)) {
        return { text: L('Sure! Follow me, I will point at things and tell you what each one does 🧭', 'ঠিক আছে! আমার সাথে আসুন, কোনটার কী কাজ সামনে গিয়ে দেখাচ্ছি 🧭'), mood: 'cheer', tour: true, lang };
    }

    // maths
    const m = calc(norm);
    if (m !== null) return { text: L(`That is ${m} ✨`, `উত্তর ${m} ✨`), mood: 'cheer', lang };

    // time and date
    if (/\b(time|clock)\b|somoy|koyta baje|kota baje|সময়|কয়টা বাজে/.test(norm)) {
        const d = new Date();
        return { text: L(`It is ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} right now ⏰`, `এখন সময় ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ⏰`), mood: 'wave', lang };
    }
    if (/\b(date|today|day)\b|ajker tarikh|aj ki bar|তারিখ|আজ কী বার/.test(norm)) {
        const d = new Date();
        return { text: L(`Today is ${d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 📅`, `আজ ${d.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} 📅`), mood: 'wave', lang };
    }

    // this page
    if (/(this page|current page|where am i|ei page|eta kon page|ata kon page|এই পেজ|এটা কোন|এটা কী)/.test(norm)) {
        const info = PAGE_INFO[ctx.page] || PAGE_INFO[Object.keys(PAGE_INFO).find((p) => p !== 'download' && String(ctx.page || '').startsWith(p))];
        if (info) return { text: info[lang], mood: 'wave', lang };
    }

    // best intent
    let best = null; let bestScore = 0;
    INTENTS.forEach((it) => {
        const s = score(norm, toks, it.kw);
        if (s > bestScore) { best = it; bestScore = s; }
    });
    if (best && bestScore >= 2) {
        let out;
        if (best.id === 'joke') out = pick(lang === 'bn' ? J_BN : J_EN);
        else out = pick(best[lang]);
        const res = { text: out, mood: best.mood || 'wave', lang };
        if (best.admin && !ctx.admin) {
            res.text = L('That one lives in the admin dashboard, so you need to sign in there first 🔑 But I can help with the download page and anything else!', 'ওটা অ্যাডমিন ড্যাশবোর্ডে আছে, তাই আগে সেখানে সাইন ইন করতে হবে 🔑 তবে ডাউনলোড পেজ বা অন্য কিছুতে আমি সাহায্য করতে পারি!');
        } else if (best.go) res.go = best.go;
        return res;
    }

    return {
        text: L(
            pick(['Hmm, I am not sure about that one 🤔 Try asking about uploading, the queue, profiles, copying links, folders or analytics!', 'I did not quite get that 🙈 I know this site best: ask me how to upload, copy links or fix a stuck file!']),
            pick(['হুম, এটা ঠিক বুঝলাম না 🤔 আপলোড, কিউ, প্রোফাইল, লিংক কপি, ফোল্ডার বা অ্যানালিটিক্স নিয়ে জিজ্ঞেস করে দেখুন!', 'ঠিক বুঝতে পারিনি 🙈 এই সাইটের ব্যাপারে আমি সবচেয়ে ভালো জানি: আপলোড, লিংক কপি বা আটকে থাকা ফাইল নিয়ে জিজ্ঞেস করুন!']),
        ),
        mood: 'shy',
        unknown: true,
        lang,
    };
}

// pages the AI is allowed to point to ("[[go:/analytics]]" at the end of its answer)
export const GO_PAGES = {
    '/gdrive-upload': 'GDrive Upload', '/processing-files': 'Processing Queue', '/file-manager': 'File Manager', '/embed-generator': 'Link Generator',
    '/analytics': 'Analytics', '/manage-sites': 'Manage Sites', '/player-settings': 'Player Settings', '/dashboard': 'Dashboard',
};
export const SITE_FACTS = `The site is MultiServer: it uploads a file once (from Google Drive) and mirrors it to about 24 video hosts, then gives one MultiServer link, an embed link and a download page.
Pages: /dashboard (totals, live traffic), /gdrive-upload (choose an upload profile, paste Drive links or press "Extract files" for a folder, press "Generate links": links come instantly and mirroring continues in the background), /processing-files (live queue, automatic retries up to 4 times, "Force sync"/"Start all"), /file-manager (folders, Repair with a chosen profile, copy buttons), /embed-generator (Link Generator: simple and advanced mode with other hosts' embed links), /analytics (real visitors, countries, devices, top files/profiles, estimated bandwidth = views x file size; needs sql/6-analytics.sql run once), /manage-sites (servers, API keys, upload profiles: Default = all servers that are ON plus up to 3 custom profiles), /player-settings (look of the player and download page, mascot switch).
Copy menu everywhere: Title, Embed, File, Title+Embed, All. Quality tags on the download page come from the file name (1080p, WEB-DL, HDR, DoVi...).`;
