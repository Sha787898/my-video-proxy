// Reads the quality tags (resolution, bit depth, HDR / Dolby Vision, codec, source) out of a file name.
// Same logic as the "link formatter" script, with these fixes:
//  - tags are searched whole-word only, so "DVD", "Adventure", "Mad Max", "It" or "Stan" in a TITLE are not read as DV, MAX, iT or STAN
//  - only the part of the name AFTER the year / SxxExx is searched, so words in the title never count
//  - nothing is guessed: a missing codec or source stays empty (the old code always said AVC H.264 and AMZN)
const T = (src, flags = 'i') => new RegExp(`(?<![A-Za-z0-9])(?:${src})(?![A-Za-z0-9])`, flags);
const YEAR = /(?<!\d)(?:19|20)\d{2}(?!\d)/;
const EP = /(?<![A-Za-z0-9])S\d{1,2}(?:E\d{1,3})?(?![A-Za-z0-9])/i;

// the tag part of a release name: everything after the year or the SxxExx marker
export function tagPart(name) {
    const s = String(name || '');
    let idx = -1;
    [YEAR, EP].forEach((re) => {
        const m = re.exec(s);
        if (m && (idx === -1 || m.index < idx)) idx = m.index;
    });
    return idx > 0 ? s.slice(idx) : s;
}

// [label, regex] in priority order
const SOURCES = [
    ['BluRay • REMUX', T('REMUX')],
    ['BluRay', T('BluRay|Blu-Ray|BDRip|BRRip|BDRemux')],
    ['CR', T('CR|CRUNCHYROLL')],
    ['SONY', T('SONY|SONYLIV')],
    ['iT', T('iT|iTunes|ITUNES', '')],
    ['iQIYI', T('IQIYI|IQ')],
    ['BILI', T('BILI|BILIBILI')],
    ['ZEE5', T('ZEE5')],
    ['NF', T('NF|NETFLIX')],
    ['AMZN', T('AMZN|AMAZON')],
    ['DSNP', T('DSNP|DISNEY|HOTSTAR|HS')],
    ['ATVP', T('ATVP|APPLE')],
    ['MAX', T('MAX|HMAX|HBOMAX|HBO')],
    ['HULU', T('HULU')],
    ['VOOT', T('VOOT')],
    ['JIO', T('JIO|JIOCINEMA')],
    ['AHA', T('AHA')],
    ['PMTP', T('PMTP|PARAMOUNT')],
    ['PCOK', T('PCOK|PEACOCK')],
    ['STAN', T('STAN')],
    ['TVER', T('TVER')],
    ['HOICHOI', T('HOICHOI')],
    ['KLICK', T('KLICK')],
    ['U-NEXT', T('U-?NEXT')],
];

export function parseQuality(name) {
    const tags = tagPart(name);

    let res = '';
    if (T('2160p|4K|UHD').test(tags)) res = '2160p';
    else if (T('1440p').test(tags)) res = '1440p';
    else if (T('1080[pi]').test(tags)) res = '1080p';
    else if (T('720p').test(tags)) res = '720p';
    else if (T('576p').test(tags)) res = '576p';
    else if (T('480p').test(tags)) res = '480p';
    else if (T('360p').test(tags)) res = '360p';

    const bit = T('10[ .-]?bit|Hi10P?').test(tags) ? '10bit' : '';

    const dovi = T('DV|DoVi|DOVI|Dolby[ .-]?Vision').test(tags);
    const hdr10p = T('HDR10(?:\\+|Plus)').test(tags);
    const hdrAny = T('HDR(?:10)?').test(tags);
    let hdr = '';
    if (dovi) hdr = hdr10p ? 'DoVi HDR10+' : hdrAny ? 'DoVi HDR' : 'DoVi';
    else if (hdr10p) hdr = 'HDR10+';
    else if (hdrAny) hdr = 'HDR';
    else if (res === '2160p' || T('SDR').test(tags)) hdr = 'SDR';

    let codec = '';
    if (T('AV1').test(tags)) codec = 'AV1';
    else if (T('x265').test(tags)) codec = 'HEVC (x265)';
    else if (T('H[ .]?265|HEVC').test(tags)) codec = 'HEVC (H.265)';
    else if (T('x264').test(tags)) codec = 'AVC (x264)';
    else if (T('H[ .]?264|AVC').test(tags)) codec = 'AVC (H.264)';

    let source = '';
    for (const [label, re] of SOURCES) {
        if (re.test(tags)) { source = String(label); break; }
    }
    if (!source) {
        if (T('WEB-?DL').test(tags)) source = 'WEB-DL';
        else if (T('WEB-?Rip').test(tags)) source = 'WEBRip';
        else if (T('HDTV').test(tags)) source = 'HDTV';
    }

    const video = [res, bit, hdr, codec].filter(Boolean).join(' ');
    const label = [video, source].filter(Boolean).join(' • ');
    return { res, bit, hdr, codec, source, label, found: !!(res || bit || hdr || codec || source) };
}
