'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '../components/Sidebar';
import { IconPlay, IconActivity, IconCheck, IconLock, IconRefresh, IconInfo, IconAlert } from '../components/Icons';
import {
    THEMES, LOADERS, LOOKS, WAITS, BGS, BRANDS, FACTORY, SETTING_ROWS, parseConfig, resolvePrefs, themeVars,
} from '../utils/playerConfig';
import { Bg3D, BrandMark } from '../components/Bg3D';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const CONFIG_KEY = 'player_config';

function Toggle({ on, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`relative shrink-0 w-11 h-6 rounded-full border transition ${on ? 'bg-blue-500 border-blue-400' : 'bg-slate-700 border-slate-600'} ${disabled ? 'opacity-40' : ''}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </button>
    );
}

function Seg({ value, options, onChange }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map(([k, l]) => (
                <button
                    key={String(k)}
                    type="button"
                    onClick={() => onChange(k)}
                    className={`min-h-[38px] px-3.5 rounded-lg border text-[13px] font-semibold transition ${value === k ? 'bg-blue-500/15 border-blue-400/60 text-blue-200' : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'}`}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

function Swatches({ value, custom, onPick, onCustom }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5">
            {THEMES.map((t) => (
                <button
                    key={t.id}
                    type="button"
                    title={t.name}
                    aria-label={t.name}
                    onClick={() => onPick(t.id)}
                    className="w-9 h-9 rounded-full border-2 transition"
                    style={{ background: t.ac, borderColor: value === t.id ? '#fff' : 'rgba(255,255,255,.14)', boxShadow: value === t.id ? `0 0 0 3px rgba(${t.rgb},.5)` : 'none' }}
                />
            ))}
            <label
                title="Custom colour"
                className="relative w-9 h-9 rounded-full border-2 overflow-hidden cursor-pointer"
                style={{ background: 'conic-gradient(#e5383b,#f59e0b,#10b981,#06b6d4,#8b5cf6,#ec4899,#e5383b)', borderColor: value === 'custom' ? '#fff' : 'rgba(255,255,255,.14)' }}
            >
                <input type="color" value={custom} onChange={(e) => onCustom(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Custom colour" />
            </label>
        </div>
    );
}

// small live preview of what visitors will see
function Preview({ prefs }) {
    const vars = themeVars(prefs);
    const kind = prefs.loader;
    return (
        <div style={vars} className="rounded-2xl border border-white/10 overflow-hidden bg-black">
            <style>{`
                .pv-ld { display: flex; align-items: center; justify-content: center; height: 46px; }
                .pv-ring { width: 34px; height: 34px; border-radius: 50%; border: 2px solid rgba(255,255,255,.08); border-top-color: var(--ac); animation: pv-spin .8s linear infinite; }
                @keyframes pv-spin { to { transform: rotate(360deg); } }
                .pv-dots span { width: 9px; height: 9px; margin: 0 3px; border-radius: 50%; background: var(--ac); animation: pv-b 1s infinite ease-in-out; }
                .pv-dots span:nth-child(2) { animation-delay: .15s; } .pv-dots span:nth-child(3) { animation-delay: .3s; }
                @keyframes pv-b { 0%,80%,100% { transform: scale(.4); opacity: .4; } 40% { transform: scale(1); opacity: 1; } }
                .pv-bars span { width: 4px; height: 24px; margin: 0 2px; border-radius: 2px; background: var(--ac); animation: pv-bar 1s infinite ease-in-out; }
                .pv-bars span:nth-child(2) { animation-delay: .1s; } .pv-bars span:nth-child(3) { animation-delay: .2s; } .pv-bars span:nth-child(4) { animation-delay: .3s; } .pv-bars span:nth-child(5) { animation-delay: .4s; }
                @keyframes pv-bar { 0%,40%,100% { transform: scaleY(.35); } 20% { transform: scaleY(1); } }
                .pv-pulse i { width: 34px; height: 34px; border-radius: 50%; background: var(--ac); animation: pv-p 1.3s infinite ease-out; }
                @keyframes pv-p { 0% { transform: scale(.3); opacity: .9; } 100% { transform: scale(1.3); opacity: 0; } }
                .pv-orbit { position: relative; width: 40px; height: 40px; }
                .pv-orbit i { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--ac); animation: pv-spin 1s linear infinite; }
                .pv-orbit i + i { top: 7px; right: 7px; bottom: 7px; left: 7px; border-top-color: var(--ac-hi); animation-duration: 1.5s; animation-direction: reverse; }
            `}</style>
            <div className="relative aspect-video flex items-center justify-center">
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] font-semibold text-white" style={{ background: prefs.look === 'glass' ? 'rgba(255,255,255,.12)' : prefs.look === 'black' ? '#000' : 'rgba(16,24,38,.95)', border: '1px solid rgba(var(--ac-rgb),.4)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Server
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5">
                    {prefs.lock && <span className="w-7 h-7 rounded-lg border border-white/10 bg-slate-900/90 flex items-center justify-center text-slate-300"><IconLock size={13} /></span>}
                    {prefs.fullscreen && <span className="w-7 h-7 rounded-lg border border-white/10 bg-slate-900/90" />}
                </div>
                <div className="pv-ld">
                    {kind === 'dots' && <div className="pv-ld pv-dots"><span /><span /><span /></div>}
                    {kind === 'bars' && <div className="pv-ld pv-bars"><span /><span /><span /><span /><span /></div>}
                    {kind === 'pulse' && <div className="pv-ld pv-pulse"><i /></div>}
                    {kind === 'orbit' && <div className="pv-orbit"><i /><i /></div>}
                    {kind === 'ring' && <div className="pv-ring" />}
                </div>
            </div>
            <div className="p-3 flex items-center gap-3 border-t border-white/10 bg-[#0a0f18]">
                <span className="flex-1 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold text-white" style={{ background: 'linear-gradient(180deg, rgba(var(--ac-rgb),.6), rgba(var(--ac-rgb),.35))', border: '1px solid rgba(var(--ac-rgb),.6)' }}>Download page button</span>
                <span className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden"><i className="block h-full w-2/3 rounded-full" style={{ background: 'linear-gradient(90deg, var(--ac), var(--ac-hi))' }} /></span>
            </div>
        </div>
    );
}

// one setting: label + control on the left, "visitors can change" switch on the right
function PagePreview({ prefs }) {
    const vars = themeVars(prefs);
    return (
        <div style={vars} className="relative h-44 rounded-2xl border border-white/10 overflow-hidden bg-[#0a0f18]">
            <Bg3D contained kind={prefs.bg} rgb={vars['--ac-rgb']} animate={prefs.anim !== false} />
            <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 px-3">
                <BrandMark name={prefs.brandName} anim={prefs.brand} animate={prefs.anim !== false} size={24} fontSize={13} />
                <span className="px-5 h-9 rounded-lg flex items-center text-[12px] font-bold text-white" style={{ background: 'linear-gradient(180deg, rgba(var(--ac-rgb),.6), rgba(var(--ac-rgb),.35))', border: '1px solid rgba(var(--ac-rgb),.6)' }}>Download</span>
            </div>
        </div>
    );
}

function Row({ title, desc, locked, onLock, children = null }) {
    return (
        <div className="py-4 border-b border-white/[0.06] last:border-b-0 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0 space-y-2.5">
                <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="ms-muted text-xs">{desc}</p>
                </div>
                {children}
            </div>
            <label className="flex items-center gap-2.5 text-xs text-slate-400 sm:flex-col sm:items-end sm:gap-1.5">
                <span className="flex items-center gap-1.5">{locked ? <IconLock size={12} className="text-amber-400" /> : null}{locked ? 'Locked for visitors' : 'Visitors can change'}</span>
                <Toggle on={!locked} onChange={(v) => onLock(!v)} label={`Visitors can change ${title}`} />
            </label>
        </div>
    );
}

export default function PlayerSettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [defaults, setDefaults] = useState({ ...FACTORY });
    const [locked, setLocked] = useState({});
    const [savedJson, setSavedJson] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null); // { ok, text }

    useEffect(() => {
        let dead = false;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            if (dead) return;
            setUser(session.user);
            const { data } = await supabase.from('settings').select('value').eq('user_id', session.user.id).eq('key', CONFIG_KEY).maybeSingle();
            if (dead) return;
            const cfg = parseConfig(data && data.value);
            const d = { ...FACTORY, ...cfg.defaults };
            setDefaults(d);
            setLocked(cfg.locked);
            setSavedJson(JSON.stringify({ d, l: cfg.locked }));
            setLoading(false);
        })();
        return () => { dead = true; };
    }, [router]);

    const dirty = useMemo(() => JSON.stringify({ d: defaults, l: locked }) !== savedJson, [defaults, locked, savedJson]);
    const preview = useMemo(() => resolvePrefs({ defaults, locked }, {}), [defaults, locked]);

    const setDef = (patch) => { setMsg(null); setDefaults((d) => ({ ...d, ...patch })); };
    const setLock = (key, v) => {
        setMsg(null);
        setLocked((l) => {
            const next = { ...l };
            if (v) next[key] = true; else delete next[key];
            return next;
        });
    };

    const save = async () => {
        if (!user || saving) return;
        setSaving(true);
        setMsg(null);
        const payload = JSON.stringify({ defaults, locked });
        const { error } = await supabase.from('settings').upsert({ user_id: user.id, key: CONFIG_KEY, value: payload }, { onConflict: 'user_id,key' });
        setSaving(false);
        if (error) { setMsg({ ok: false, text: `Could not save: ${error.message}` }); return; }
        setSavedJson(JSON.stringify({ d: defaults, l: locked }));
        setMsg({ ok: true, text: 'Saved. Player and download pages use it right away.' });
    };

    const factory = () => { setMsg(null); setDefaults({ ...FACTORY }); setLocked({}); };

    if (loading) {
        return (
            <div className="ms-app flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-blue-400"><IconActivity size={18} className="ms-spin" /><span>Loading settings…</span></div>
            </div>
        );
    }

    const behaveToggle = (r) => (
        <div className="flex items-center gap-3">
            <Toggle on={!!defaults[r.key]} onChange={(v) => setDef({ [r.key]: v })} label={`${r.label} default`} />
            <span className="text-xs text-slate-400">{defaults[r.key] ? 'On by default' : 'Off by default'}</span>
        </div>
    );

    return (
        <div className="ms-app flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <header className="ms-topbar">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center"><IconPlay size={18} /></span>
                        <h1 className="ms-h1 truncate">Player &amp; download settings</h1>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={factory} className="ms-btn ms-btn-ghost ms-btn-sm"><IconRefresh size={14} /><span className="hidden sm:inline">Original defaults</span></button>
                        <button type="button" onClick={save} disabled={!dirty || saving} className="ms-btn ms-btn-primary ms-btn-sm"><IconCheck size={14} /><span>{saving ? 'Saving…' : 'Save'}</span></button>
                    </div>
                </header>

                <main className="ms-main w-full max-w-5xl mx-auto space-y-5">
                    <div className="ms-card p-4 flex gap-3 text-xs text-slate-300">
                        <IconInfo size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <p>
                            These values are the <b className="text-white">default</b> for every visitor of your files. <b className="text-white">Visitors can change</b> decides whether a visitor may change that setting from the player menu.
                            When it is off, your value is always used and the option is hidden. Visitors who already picked something keep it only for settings you leave open.
                        </p>
                    </div>

                    {msg && (
                        <div className={`ms-alert ${msg.ok ? 'ms-alert-green' : 'ms-alert-red'} flex items-center gap-2 text-sm`}>
                            {msg.ok ? <IconCheck size={15} /> : <IconAlert size={15} />}<span>{msg.text}</span>
                        </div>
                    )}

                    <div className="grid gap-5 lg:grid-cols-[1fr_320px] items-start">
                        <div className="space-y-5 min-w-0">
                            <section className="ms-card p-4 sm:p-5">
                                <h2 className="ms-h2 mb-1">Look</h2>
                                {SETTING_ROWS.look.map((r) => (
                                    <Row key={r.key} title={r.label} desc={r.desc} locked={!!locked[r.key]} onLock={(v) => setLock(r.key, v)}>
                                        {r.key === 'theme' && (
                                            <Swatches value={defaults.theme} custom={defaults.customColor} onPick={(id) => setDef({ theme: id })} onCustom={(c) => setDef({ theme: 'custom', customColor: c })} />
                                        )}
                                        {r.key === 'look' && <Seg value={defaults.look} options={LOOKS} onChange={(v) => setDef({ look: v })} />}
                                        {r.key === 'loader' && <Seg value={defaults.loader} options={LOADERS} onChange={(v) => setDef({ loader: v })} />}
                                        {r.key === 'anim' && behaveToggle(r)}
                                        {r.key === 'bg' && <Seg value={defaults.bg} options={BGS} onChange={(v) => setDef({ bg: v })} />}
                                        {r.key === 'brand' && <Seg value={defaults.brand} options={BRANDS} onChange={(v) => setDef({ brand: v })} />}
                                    </Row>
                                ))}
                                <div className="py-4 space-y-2">
                                    <label htmlFor="brandName" className="text-sm font-semibold text-white block">Name on the download page</label>
                                    <p className="ms-muted text-xs">Shown next to the animated 3D logo. Only you can change it.</p>
                                    <input
                                        id="brandName"
                                        className="ms-input max-w-xs"
                                        value={defaults.brandName}
                                        maxLength={24}
                                        onChange={(e) => setDef({ brandName: e.target.value })}
                                        placeholder="MultiServer"
                                    />
                                </div>
                            </section>

                            <section className="ms-card p-4 sm:p-5">
                                <h2 className="ms-h2 mb-1">Behaviour</h2>
                                {SETTING_ROWS.behave.map((r) => (
                                    <Row key={r.key} title={r.label} desc={r.desc} locked={!!locked[r.key]} onLock={(v) => setLock(r.key, v)}>
                                        {behaveToggle(r)}
                                        {r.key === 'autoSwitch' && defaults.autoSwitch && (
                                            <div className="space-y-1.5">
                                                <p className="ms-muted text-xs">Wait before switching</p>
                                                <Seg value={defaults.autoSec} options={WAITS} onChange={(v) => setDef({ autoSec: v })} />
                                            </div>
                                        )}
                                    </Row>
                                ))}
                            </section>
                        </div>

                        <aside className="space-y-3 lg:sticky lg:top-20">
                            <h2 className="ms-h2">Preview</h2>
                            <p className="ms-muted text-xs">Download page</p>
                            <PagePreview prefs={preview} />
                            <p className="ms-muted text-xs">Player</p>
                            <Preview prefs={preview} />
                            <p className="ms-muted text-xs">The download page uses the same theme colour. Needs the SQL file <code className="ms-code">sql/4-player-config.sql</code> to be run once in Supabase.</p>
                        </aside>
                    </div>
                </main>
            </div>
        </div>
    );
}
