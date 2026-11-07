'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SERVERS, DEFAULT_ACTIVE } from '../utils/mirrors';
import { parseProfiles, PROFILES_KEY, DEFAULT_ID, readChosenProfile, saveChosenProfile } from '../utils/profiles';
import { IconServer, IconCheck, IconSliders } from './Icons';

// "Upload to" chooser that sits on top of the upload pages.
// It remembers the choice (same on every upload page) and tells the page through onChange(profileId, profile).
export default function ProfilePicker({ supabase, userId, onChange, title = 'Upload to' }) {
    const [profiles, setProfiles] = useState([]);
    const [activeIds, setActiveIds] = useState([]);
    const [chosen, setChosen] = useState(DEFAULT_ID);
    const [ready, setReady] = useState(false);
    const cb = useRef(onChange);
    cb.current = onChange;

    useEffect(() => {
        if (!userId) return undefined;
        let dead = false;
        (async () => {
            const { data } = await supabase.from('settings').select('key, value').eq('user_id', userId);
            if (dead) return;
            const rows = data || [];
            const get = (k) => (rows.find((r) => r.key === k) || {}).value || '';
            const list = parseProfiles(get(PROFILES_KEY));
            setProfiles(list);
            setActiveIds(Object.keys(DEFAULT_ACTIVE).filter((id) => {
                const saved = get(`${id}_active`);
                return saved === '' ? DEFAULT_ACTIVE[id] : saved === 'true';
            }));
            const stored = readChosenProfile();
            const id = stored === DEFAULT_ID || list.some((p) => p.id === stored) ? stored : DEFAULT_ID;
            setChosen(id);
            setReady(true);
            if (cb.current) cb.current(id);
        })();
        return () => { dead = true; };
    }, [supabase, userId]);

    const pick = (id) => {
        setChosen(id);
        saveChosenProfile(id);
        if (cb.current) cb.current(id);
    };

    const options = [{ id: DEFAULT_ID, name: 'Default', servers: activeIds }, ...profiles];
    const current = options.find((o) => o.id === chosen) || options[0];
    const names = current.servers.map((id) => (SERVERS[id] ? SERVERS[id].name : id));

    return (
        <section className="ms-card p-4 sm:p-5 space-y-3" aria-label="Upload profile">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="ms-h2 flex items-center gap-2"><IconServer size={14} /> {title}</h2>
                <Link href="/manage-sites#profiles" className="text-xs font-semibold text-blue-300 hover:underline inline-flex items-center gap-1.5">
                    <IconSliders size={13} /> Edit profiles
                </Link>
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Upload profile">
                {options.map((o) => {
                    const on = o.id === current.id;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => pick(o.id)}
                            className={`min-h-[42px] px-4 rounded-xl border text-left transition ${on ? 'bg-blue-500/15 border-blue-400/60 text-white' : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.07]'}`}
                        >
                            <span className="flex items-center gap-2 text-[13px] font-semibold">
                                {on && <IconCheck size={13} className="text-blue-300" />}{o.name}
                                <span className="text-[11px] font-medium text-slate-400">{o.servers.length} server{o.servers.length === 1 ? '' : 's'}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
            {ready && (
                <p className="ms-muted text-xs leading-relaxed">
                    {names.length > 0 ? (
                        <>
                            {current.id === DEFAULT_ID ? 'Every server that is switched ON: ' : 'Only these servers: '}
                            <span className="text-slate-300">{names.slice(0, 8).join(', ')}{names.length > 8 ? ` +${names.length - 8} more` : ''}</span>
                        </>
                    ) : (
                        current.id === DEFAULT_ID ? 'No server is switched ON. Turn some on in Manage Sites.' : 'This profile has no servers yet. Pick some in Manage Sites.'
                    )}
                </p>
            )}
        </section>
    );
}
