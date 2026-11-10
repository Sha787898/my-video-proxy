// Lets any page make the mascot react: mascotSay('cheer', 'Done! 🎉'). Safe to call anywhere (does nothing on the server).
let lastAt = 0;
export function mascotSay(mood, text, { force = false } = {}) {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (!force && now - lastAt < 1200) return;
    lastAt = now;
    try { window.dispatchEvent(new CustomEvent('ms-mascot', { detail: { mood, text } })); } catch (e) { /* ignore */ }
}
// pick a mood from the wording of a toast / notice
export function mascotSayAuto(msg) {
    const t = String(msg || '').trim();
    if (!t) return;
    const bad = /fail|error|couldn'?t|cannot|can't|blocked|invalid|not found|denied|wrong/i.test(t);
    mascotSay(bad ? 'shy' : 'wink', bad ? `${t.slice(0, 90)} 🥺` : `${t.slice(0, 90)} ✨`);
}
