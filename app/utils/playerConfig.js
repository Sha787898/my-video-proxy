// ==========================================================================
// Player + download page settings, in ONE place.
//
//  - The admin page (/player-settings) saves { defaults, locked } as JSON in the `settings` table (key "player_config").
//  - public_file() hands that JSON to the embed page and the download page.
//  - A visitor's own choices live only in their browser (localStorage, overrides only), so a changed admin default reaches
//    everybody who has not chosen something themselves. A setting the admin LOCKED always uses the admin value.
// Plain JS, no React: safe to import from server and client components.
// ==========================================================================

export const THEMES = [
    { id: 'red', name: 'Crimson', ac: '#e5383b', hi: '#ff6b73', rgb: '229,56,59', tint: '#ffc2c4' },
    { id: 'blue', name: 'Ocean', ac: '#3b7bf5', hi: '#6ba6ff', rgb: '59,123,245', tint: '#b9d3ff' },
    { id: 'green', name: 'Emerald', ac: '#10b981', hi: '#34d399', rgb: '16,185,129', tint: '#a7f3d0' },
    { id: 'violet', name: 'Violet', ac: '#8b5cf6', hi: '#a78bfa', rgb: '139,92,246', tint: '#ddd6fe' },
    { id: 'amber', name: 'Amber', ac: '#f59e0b', hi: '#fbbf24', rgb: '245,158,11', tint: '#fde68a' },
    { id: 'pink', name: 'Rose', ac: '#ec4899', hi: '#f472b6', rgb: '236,72,153', tint: '#fbcfe8' },
    { id: 'cyan', name: 'Cyan', ac: '#06b6d4', hi: '#22d3ee', rgb: '6,182,212', tint: '#a5f3fc' },
];
export const LOADERS = [['ring', 'Ring'], ['dots', 'Dots'], ['bars', 'Bars'], ['pulse', 'Pulse'], ['orbit', 'Orbit']];
export const LOOKS = [['dark', 'Dark'], ['glass', 'Glass'], ['black', 'Black']];
export const WAITS = [[10, '10s'], [15, '15s'], [25, '25s'], [40, '40s']];
export const LEVELS = ['strict', 'relaxed', 'off'];

// the values everybody gets when the admin has not set anything (the original red look)
export const FACTORY = {
    theme: 'red', customColor: '#e5383b', look: 'dark', loader: 'ring', anim: true,
    autoSwitch: false, autoSec: 15,
    block: true, guard: false, download: true, fullscreen: true, lock: true, party: false, title: true,
    sb: {},
};

// every setting the admin can control: key, label, description
export const SETTING_ROWS = {
    look: [
        { key: 'theme', label: 'Theme colour', desc: 'Colour of the player and the download page' },
        { key: 'look', label: 'Panel style', desc: 'How the menus and buttons are drawn' },
        { key: 'loader', label: 'Loading animation', desc: 'Shown while a server loads' },
        { key: 'anim', label: 'Animations', desc: 'Panel and button motion' },
    ],
    behave: [
        { key: 'block', label: 'Pop-up blocker', desc: 'Sandbox that blocks new tabs and redirects' },
        { key: 'guard', label: 'Redirect guard', desc: 'Asks before the page is left or reloaded' },
        { key: 'autoSwitch', label: 'Auto-switch server', desc: 'Moves on when a server does not work' },
        { key: 'download', label: 'Download link', desc: 'Shown in the server menu' },
        { key: 'fullscreen', label: 'Fullscreen button', desc: 'Shown on the top bar' },
        { key: 'lock', label: 'Lock button', desc: 'Shown on the top bar' },
        { key: 'party', label: 'Watch Party', desc: 'Shown on the top bar' },
        { key: 'title', label: 'Title overlay', desc: 'The "Now playing" badge' },
    ],
};

// locking one setting also locks the values that belong to it
const ALIAS = { customColor: 'theme', autoSec: 'autoSwitch', sb: 'block' };
export const isLocked = (locked, key) => !!(locked && locked[ALIAS[key] || key]);

const BOOLS = ['anim', 'autoSwitch', 'block', 'guard', 'download', 'fullscreen', 'lock', 'party', 'title'];
const HEX = /^#[0-9a-f]{6}$/i;

// keeps only known keys with valid values (works for admin config and for visitor overrides)
export function sanitize(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    BOOLS.forEach((k) => { if (typeof obj[k] === 'boolean') out[k] = obj[k]; });
    if (obj.theme === 'custom' || THEMES.some((t) => t.id === obj.theme)) out.theme = obj.theme;
    if (typeof obj.customColor === 'string' && HEX.test(obj.customColor)) out.customColor = obj.customColor;
    if (LOOKS.some(([k]) => k === obj.look)) out.look = obj.look;
    if (LOADERS.some(([k]) => k === obj.loader)) out.loader = obj.loader;
    if (WAITS.some(([k]) => k === Number(obj.autoSec))) out.autoSec = Number(obj.autoSec);
    if (obj.sb && typeof obj.sb === 'object' && !Array.isArray(obj.sb)) {
        const sb = {};
        Object.keys(obj.sb).slice(0, 60).forEach((k) => { if (LEVELS.includes(obj.sb[k])) sb[String(k).slice(0, 40)] = obj.sb[k]; });
        out.sb = sb;
    }
    return out;
}

// raw = JSON string or object from the database (anything else -> no admin config)
export function parseConfig(raw) {
    let o = raw;
    if (typeof raw === 'string') {
        try { o = JSON.parse(raw); } catch (e) { o = null; }
    }
    const defaults = sanitize(o && o.defaults);
    const locked = {};
    if (o && o.locked && typeof o.locked === 'object') {
        Object.keys(o.locked).forEach((k) => { if (o.locked[k] === true && (k in FACTORY) && k !== 'sb' && k !== 'customColor' && k !== 'autoSec') locked[k] = true; });
    }
    return { defaults, locked };
}

// admin defaults, then the visitor's own choices on top (except locked settings)
export function resolvePrefs(config, overrides) {
    const cfg = config && config.defaults ? config : parseConfig(config);
    const out = { ...FACTORY, ...cfg.defaults };
    const ov = sanitize(overrides);
    Object.keys(ov).forEach((k) => { if (!isLocked(cfg.locked, k)) out[k] = ov[k]; });
    return out;
}

export const LS_PREFS = 'ms_player_prefs_v4'; // v4 stores ONLY what the visitor changed

export function readOverrides() {
    try { return sanitize(JSON.parse(localStorage.getItem(LS_PREFS) || 'null')); } catch (e) { return {}; }
}
export function saveOverrides(o) {
    try { localStorage.setItem(LS_PREFS, JSON.stringify(o)); } catch (e) { /* ignore */ }
}

const mixHex = (hex, toward, amt) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (toward - v) * amt));
};

// CSS variables for the chosen theme (inline style on the root element)
export function themeVars(prefs) {
    const t = THEMES.find((x) => x.id === prefs.theme) || (prefs.theme === 'custom' ? null : THEMES[0]);
    if (t) return { '--ac': t.ac, '--ac-hi': t.hi, '--ac-rgb': t.rgb, '--ac-tint': t.tint, '--acsoft': `rgba(${t.rgb},.10)` };
    const c = HEX.test(prefs.customColor || '') ? prefs.customColor : THEMES[0].ac;
    const rgb = mixHex(c, 0, 0).join(',');
    return {
        '--ac': c,
        '--ac-hi': `rgb(${mixHex(c, 255, 0.3).join(',')})`,
        '--ac-rgb': rgb,
        '--ac-tint': `rgb(${mixHex(c, 255, 0.7).join(',')})`,
        '--acsoft': `rgba(${rgb},.10)`,
    };
}
