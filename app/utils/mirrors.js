// ==========================================================================
// সব সার্ভারের লিংক বানানোর একটাই জায়গা.
// ডাটাবেজে শুধু code সেভ হয় (url নয়); লিংক বানানো হয় দেখানোর সময়,
// বর্তমান ডোমেইন সেটিং দিয়ে। তাই Manage Sites-এ ডোমেইন বদলালেই
// আগের সব ফাইলের লিংক নিজে থেকে নতুন ডোমেইনে হয়ে যায়।
// ==========================================================================

// এই ৫টা সার্ভার Worker-এ PDLink দিয়ে যায় (আলাদা key লাগে না)
export const PDLINK_SERVERS = ['gofile', 'pixeldrain', 'vikingfile', 'buzzheavier', 'mega'];

// PDLink-এর শেয়ার লিংক: https://pdlk.site/g/<share_id>
export const PDLINK_SHARE_BASE = 'https://pdlk.site/g/';

// {c} = Worker থেকে পাওয়া code/id
//   type 'stream'   => প্লেয়ার/embed হয়
//   type 'download' => শুধু ডাউনলোড/স্টোরেজ লিংক
// ✅ = নিশ্চিত, ⚠️ = আন্দাজ (সার্ভারের ড্যাশবোর্ডে নিজের embed লিংক দেখে মিলিয়ে নিন)
export const SERVERS = {
    vidmoly:     { name: 'Vidmoly',      type: 'stream',   host: 'https://vidmoly.org',        view: '/w/{c}', embed: '/embed-{c}.html' }, // ✅
    abyss:       { name: 'Abyss',        type: 'stream',   host: 'https://player.abyssplayer.com', view: '/{c}', embed: '/{c}' },          // ✅
    voe:         { name: 'VOE',          type: 'stream',   host: 'https://voe.sx',             view: '/{c}',   embed: '/e/{c}' },          // ✅
    mixdrop:     { name: 'MixDrop',      type: 'stream',   host: 'https://mixdrop.ag',         view: '/f/{c}', embed: '/e/{c}' },          // ✅
    streamhg:    { name: 'StreamHG',     type: 'stream',   host: 'https://streamhg.com',       view: '/{c}',   embed: '/embed-{c}.html' }, // ⚠️
    earnvids:    { name: 'EarnVids',     type: 'stream',   host: 'https://earnvids.com',       view: '/{c}',   embed: '/embed-{c}.html' }, // ⚠️
    dropload:    { name: 'DropLoad',     type: 'stream',   host: 'https://dropload.io',        view: '/{c}',   embed: '/embed-{c}.html' }, // ⚠️
    ruby:        { name: 'Ruby',         type: 'stream',   host: 'https://streamruby.com',     view: '/{c}',   embed: '/embed-{c}.html' }, // ⚠️
    byse:        { name: 'Byse',         type: 'stream',   host: 'https://byse.sx',            view: '/{c}',   embed: '/e/{c}' },          // ⚠️
    turboviplay: { name: 'TurboViPlay',  type: 'stream',   host: 'https://turboviplay.com',    view: '/{c}',   embed: '/embed/{c}' },      // ⚠️
    pixeldrain:  { name: 'Pixeldrain',   type: 'download', host: 'https://pixeldrain.com',     view: '/u/{c}' },                           // ✅
    gofile:      { name: 'GoFile',       type: 'download', host: 'https://gofile.io',          view: '/d/{c}' },                           // ✅
    vikingfile:  { name: 'VikingFile',   type: 'download', host: 'https://vikingfile.com',     view: '/f/{c}' },                           // ⚠️
    buzzheavier: { name: 'BuzzHeavier',  type: 'download', host: 'https://buzzheavier.com',    view: '/{c}' },                             // ⚠️
    sendnow:     { name: 'Send.now',     type: 'download', host: 'https://send.now',           view: '/{c}' },                             // ⚠️
    mega:        { name: 'MEGA',         type: 'download', host: '',                           view: '{c}' },
    gcloud:      { name: 'Google Cloud', type: 'download', host: '',                           view: '{c}' },
    vidara:      { name: 'Vidara',       type: 'stream',   host: 'https://vidara.so',          view: '/v/{c}', embed: '/v/{c}' },      // ✅ view (docs), ⚠️ embed
    filepress:   { name: 'Filepress',    type: 'download', host: 'https://filebee.xyz',        view: '/file/{c}' },                        // ⚠️

    // type 'task' = রিমোট-আপলোড শুরু হয়েছে, Worker শুধু task id পায়; চূড়ান্ত ভিডিও লিংক হোস্টের স্ট্যাটাস API দিয়ে পরে আনতে হয়
    streamp2p:   { name: 'StreamP2P',    type: 'task',     host: 'https://streamp2p.com',      view: '' },
    player4me:   { name: 'Player4Me',    type: 'task',     host: 'https://player4me.com',      view: '' },
    upnshare:    { name: 'UpnShare',     type: 'task',     host: 'https://upnshare.com',       view: '' },
    rpmshare:    { name: 'RPMShare',     type: 'task',     host: 'https://rpmshare.com',       view: '' },
    streamtape:  { name: 'Streamtape',   type: 'task',     host: 'https://streamtape.com',     view: '' },
};

const isUrl = (s) => /^https?:\/\//i.test(String(s || ''));

// "vidmoly.org", "https://vidmoly.org/" যেকোনোটা => "https://vidmoly.org"
export function normDomain(d) {
    let x = String(d || '').trim().replace(/\/+$/, '');
    if (!x) return '';
    if (!/^https?:\/\//i.test(x)) x = 'https://' + x;
    return x;
}

// settings-এর সারি [{key,value}] থেকে { vidmoly_domain: '...', ... } বানায়
export function domainsFromSettings(rows) {
    const out = {};
    for (const r of rows || []) {
        if (r && typeof r.key === 'string' && r.key.endsWith('_domain') && r.value) out[r.key] = r.value;
    }
    return out;
}

// ডাটাবেজে রাখার জন্য: শুধু id/name/type/code (কোনো url নয়). ব্যর্থ হলে null
export function buildMirror(serverId, rawCode) {
    const cfg = SERVERS[serverId];
    if (!cfg) return null;
    if (rawCode === null || rawCode === undefined) return null;
    const code = String(rawCode).trim();
    if (!code || code.startsWith('Failed')) return null;
    return { id: serverId, name: cfg.name, type: cfg.type, code };
}

// দেখানোর জন্য: বর্তমান ডোমেইন দিয়ে url ও embed বানায়
export function resolveMirror(m, domains = {}) {
    const code = String(m.code ?? '').trim();

    if (m.id === 'pdlink') {
        const custom = normDomain(domains.pdlink_domain);
        const base = custom ? `${custom}/g/` : PDLINK_SHARE_BASE;
        return { ...m, url: isUrl(code) ? code : `${base}${code}`, embed: null };
    }

    const cfg = SERVERS[m.id];
    if (!cfg) return { ...m, url: m.url || code, embed: m.embed || null };

    const custom = normDomain(domains[`${m.id}_domain`]);
    const host = custom || cfg.host || '';
    const embedHost = custom || cfg.embedHost || cfg.host || '';
    const fill = (tpl) => tpl.replace('{c}', code);

    if (cfg.type === 'task') {
        return { ...m, name: `${cfg.name} (⏳ task ${code})`, url: host, embed: null };
    }

    return {
        ...m,
        url: isUrl(code) ? code : `${host}${fill(cfg.view)}`,
        embed: cfg.type === 'stream' && cfg.embed && !isUrl(code) ? `${embedHost}${fill(cfg.embed)}` : null,
    };
}

export function resolveMirrors(list, domains = {}) {
    return (Array.isArray(list) ? list : []).map((m) => resolveMirror(m, domains));
}
