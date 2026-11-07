'use client';

import { useState, useEffect } from 'react';
import { PROFILES_KEY, EXTRA_IDS, parseProfiles } from '../utils/profiles';
import { IconLayers, IconCheckCircle, IconAlert, IconRefresh } from './Icons';

// Upload profiles: "Default" always uses every server that is switched ON.
// Up to 3 extra profiles, each with its own list of servers (e.g. the 3-4 sites one API key set belongs to).
export default function ProfilesEditor({ supabase, userId, nodes }) {
    const [profiles, setProfiles] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        if (!userId) return;
        let alive = true;
        (async () => {
            const { data } = await supabase.from('settings').select('value').eq('user_id', userId).eq('key', PROFILES_KEY).maybeSingle();
            if (!alive) return;
            setProfiles(parseProfiles(data && data.value));
            setLoaded(true);
        })();
        return () => { alive = false; };
    }, [supabase, userId]);

    const nextId = () => EXTRA_IDS.find((id) => !profiles.some((p) => p.id === id));
    const add = () => {
        const id = nextId();
        if (!id) return;
        setProfiles((p) => [...p, { id, name: `Profile ${p.length + 1}`, servers: [] }]);
    };
    const remove = (id) => setProfiles((p) => p.filter((x) => x.id !== id));
    const rename = (id, name) => setProfiles((p) => p.map((x) => (x.id === id ? { ...x, name: name.slice(0, 24) } : x)));
    const toggle = (id, sid) => setProfiles((p) => p.map((x) => (x.id !== id ? x : { ...x, servers: x.servers.includes(sid) ? x.servers.filter((s) => s !== sid) : [...x.servers, sid] })));

    const save = async () => {
        setSaving(true);
        setMsg(null);
        const clean = parseProfiles(JSON.stringify(profiles.map((p) => ({ ...p, name: p.name.trim() || p.id }))));
        const { error } = await supabase.from('settings').upsert({ user_id: userId, key: PROFILES_KEY, value: JSON.stringify(clean) }, { onConflict: 'user_id,key' });
        setSaving(false);
        if (error) { setMsg({ ok: false, text: error.message }); return; }
        setProfiles(clean);
        setMsg({ ok: true, text: 'Profiles saved' });
        setTimeout(() => setMsg(null), 2500);
    };

    const activeCount = nodes.filter((n) => n.active).length;

    return (
        <section id="profiles" className="ms-card p-4 sm:p-6 space-y-4 scroll-mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="ms-h2 flex items-center gap-2"><IconLayers size={14} /> Upload profiles</h2>
                    <p className="text-sm ms-muted mt-1.5">
                        Pick a profile on the upload page and the file goes ONLY to that profile&apos;s servers. Default uses every server that is switched on below.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={add} disabled={!nextId()} className="ms-btn ms-btn-ghost ms-btn-sm">+ New profile</button>
                    <button type="button" onClick={save} disabled={saving || !loaded} className="ms-btn ms-btn-primary ms-btn-sm">
                        {saving ? <IconRefresh size={14} className="ms-spin" /> : null} Save profiles
                    </button>
                </div>
            </div>

            {msg && (
                <div className={`ms-alert ${msg.ok ? 'ms-alert-green' : 'ms-alert-red'}`} role="status">
                    {msg.ok ? <IconCheckCircle size={16} className="shrink-0" /> : <IconAlert size={16} className="shrink-0" />}
                    <span className="min-w-0 break-words">{msg.text}</span>
                </div>
            )}

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <span className="font-bold text-white">Default</span>
                <span className="ms-muted"> · all {activeCount} server(s) that are ON</span>
            </div>

            {profiles.length === 0 && loaded && <p className="text-sm ms-muted">No extra profiles yet. Press &quot;New profile&quot; to make one.</p>}

            {profiles.map((p) => {
                const noKey = p.servers.map((sid) => nodes.find((n) => n.id === sid)).filter((n) => n && !n.pdlink && !n.key);
                return (
                    <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input
                                value={p.name}
                                onChange={(e) => rename(p.id, e.target.value)}
                                aria-label="Profile name"
                                className="ms-input flex-1 min-w-0"
                                maxLength={24}
                            />
                            <span className="ms-badge">{p.servers.length} server(s)</span>
                            <button type="button" onClick={() => remove(p.id)} className="ms-btn ms-btn-ghost ms-btn-sm">Delete</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {nodes.map((n) => {
                                const on = p.servers.includes(n.id);
                                return (
                                    <button
                                        key={n.id}
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        onClick={() => toggle(p.id, n.id)}
                                        className={`text-left rounded-lg border px-2.5 py-2 text-xs transition truncate ${on ? 'border-blue-400/70 bg-blue-500/15 text-white' : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'}`}
                                        title={n.name}
                                    >
                                        {on ? '✓ ' : ''}{n.name}
                                    </button>
                                );
                            })}
                        </div>
                        {noKey.length > 0 && (
                            <p className="text-xs text-amber-300">No API key yet for: {noKey.map((n) => n.name).join(', ')}</p>
                        )}
                    </div>
                );
            })}
        </section>
    );
}
