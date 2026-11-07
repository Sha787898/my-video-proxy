// ==========================================================================
// Upload profiles: which servers an upload goes to.
//   "default" = every server that is switched ON in Manage Sites (the way uploads always worked)
//   p1..p3    = extra profiles the owner builds in Manage Sites (a name + a hand-picked set of servers)
// Stored in the `settings` table under the key "upload_profiles" (JSON), so no new table is needed.
// ==========================================================================
export const PROFILES_KEY = 'upload_profiles';
export const DEFAULT_ID = 'default';
export const EXTRA_IDS = ['p1', 'p2', 'p3'];
export const LS_PROFILE = 'ms_upload_profile';

export function parseProfiles(raw) {
    let o = raw;
    if (typeof raw === 'string') {
        try { o = JSON.parse(raw); } catch (e) { o = null; }
    }
    const list = Array.isArray(o) ? o : (o && Array.isArray(o.list) ? o.list : []);
    const out = [];
    list.forEach((p) => {
        if (!p || typeof p !== 'object' || !EXTRA_IDS.includes(p.id) || out.some((x) => x.id === p.id)) return;
        const name = String(p.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || `Profile ${p.id.slice(1)}`;
        const servers = Array.isArray(p.servers)
            ? [...new Set(p.servers.filter((s) => typeof s === 'string' && /^[a-z0-9_]{2,24}$/.test(s)))].slice(0, 40)
            : [];
        out.push({ id: p.id, name, servers });
    });
    return out;
}

export function readChosenProfile() {
    try { return localStorage.getItem(LS_PROFILE) || DEFAULT_ID; } catch (e) { return DEFAULT_ID; }
}
export function saveChosenProfile(id) {
    try { localStorage.setItem(LS_PROFILE, id); } catch (e) { /* ignore */ }
}
