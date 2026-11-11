// Reads a file's format from its name (and, when known, a MIME type) and formats the "added on" date.
// Pure functions, safe to import anywhere.

// ext -> [short label, long name, mime, kind, note]
const FORMATS = {
    mkv: ['MKV', 'Matroska', 'video/x-matroska', 'Video', 'Flexible container: many audio tracks and subtitles'],
    mk3d: ['MK3D', 'Matroska 3D', 'video/x-matroska-3d', 'Video', '3D Matroska'],
    mka: ['MKA', 'Matroska Audio', 'audio/x-matroska', 'Audio', 'Matroska audio-only'],
    mks: ['MKS', 'Matroska Subtitles', 'application/x-matroska', 'Subtitle', 'Subtitles only'],
    mp4: ['MP4', 'MPEG-4 Part 14', 'video/mp4', 'Video', 'Plays almost everywhere'],
    m4v: ['M4V', 'iTunes Video (MPEG-4)', 'video/x-m4v', 'Video', 'MP4 variant from Apple'],
    mov: ['MOV', 'QuickTime Movie', 'video/quicktime', 'Video', 'Apple QuickTime container'],
    webm: ['WEBM', 'WebM', 'video/webm', 'Video', 'Open web video (VP8/VP9/AV1)'],
    avi: ['AVI', 'Audio Video Interleave', 'video/x-msvideo', 'Video', 'Older Microsoft container'],
    wmv: ['WMV', 'Windows Media Video', 'video/x-ms-wmv', 'Video', 'Microsoft video'],
    asf: ['ASF', 'Advanced Systems Format', 'video/x-ms-asf', 'Video', 'Microsoft streaming container'],
    flv: ['FLV', 'Flash Video', 'video/x-flv', 'Video', 'Legacy Flash video'],
    f4v: ['F4V', 'Flash MP4 Video', 'video/x-f4v', 'Video', 'Flash video in MP4 form'],
    ts: ['TS', 'MPEG Transport Stream', 'video/mp2t', 'Video', 'Broadcast / HLS segment'],
    m2ts: ['M2TS', 'Blu-ray MPEG-2 TS', 'video/mp2t', 'Video', 'Blu-ray disc stream'],
    mts: ['MTS', 'AVCHD Video', 'video/mp2t', 'Video', 'Camcorder video'],
    mpg: ['MPG', 'MPEG-1/2 Video', 'video/mpeg', 'Video', 'Classic MPEG video'],
    mpeg: ['MPEG', 'MPEG Video', 'video/mpeg', 'Video', 'Classic MPEG video'],
    vob: ['VOB', 'DVD Video Object', 'video/dvd', 'Video', 'DVD movie data'],
    '3gp': ['3GP', '3GPP Mobile Video', 'video/3gpp', 'Video', 'Old phone video'],
    '3g2': ['3G2', '3GPP2 Mobile Video', 'video/3gpp2', 'Video', 'Old phone video'],
    ogv: ['OGV', 'Ogg Video', 'video/ogg', 'Video', 'Open Ogg video'],
    ogm: ['OGM', 'Ogg Media', 'video/ogg', 'Video', 'Ogg media container'],
    rmvb: ['RMVB', 'RealMedia Variable Bitrate', 'application/vnd.rn-realmedia-vbr', 'Video', 'Legacy RealMedia'],
    rm: ['RM', 'RealMedia', 'application/vnd.rn-realmedia', 'Video', 'Legacy RealMedia'],
    divx: ['DIVX', 'DivX Video', 'video/divx', 'Video', 'DivX codec file'],
    xvid: ['XVID', 'Xvid Video', 'video/x-xvid', 'Video', 'Xvid codec file'],
    hevc: ['HEVC', 'H.265 Raw Stream', 'video/hevc', 'Video', 'Raw H.265 bitstream'],
    h264: ['H264', 'H.264 Raw Stream', 'video/h264', 'Video', 'Raw H.264 bitstream'],
    mxf: ['MXF', 'Material Exchange Format', 'application/mxf', 'Video', 'Professional broadcast'],
    mp3: ['MP3', 'MPEG Audio Layer III', 'audio/mpeg', 'Audio', 'Common lossy audio'],
    m4a: ['M4A', 'MPEG-4 Audio', 'audio/mp4', 'Audio', 'AAC / ALAC audio'],
    aac: ['AAC', 'Advanced Audio Coding', 'audio/aac', 'Audio', 'Lossy audio'],
    flac: ['FLAC', 'Free Lossless Audio', 'audio/flac', 'Audio', 'Lossless audio'],
    wav: ['WAV', 'Waveform Audio', 'audio/wav', 'Audio', 'Uncompressed audio'],
    ogg: ['OGG', 'Ogg Vorbis', 'audio/ogg', 'Audio', 'Open audio'],
    opus: ['OPUS', 'Opus Audio', 'audio/opus', 'Audio', 'Modern low-latency audio'],
    ac3: ['AC3', 'Dolby Digital', 'audio/ac3', 'Audio', 'Surround audio'],
    eac3: ['EAC3', 'Dolby Digital Plus', 'audio/eac3', 'Audio', 'Surround audio'],
    dts: ['DTS', 'DTS Audio', 'audio/vnd.dts', 'Audio', 'Surround audio'],
    srt: ['SRT', 'SubRip Subtitles', 'application/x-subrip', 'Subtitle', 'Plain text subtitles'],
    ass: ['ASS', 'Advanced SubStation Alpha', 'text/x-ssa', 'Subtitle', 'Styled subtitles'],
    ssa: ['SSA', 'SubStation Alpha', 'text/x-ssa', 'Subtitle', 'Styled subtitles'],
    vtt: ['VTT', 'WebVTT Subtitles', 'text/vtt', 'Subtitle', 'Web subtitles'],
    sub: ['SUB', 'Subtitles', 'text/plain', 'Subtitle', 'Subtitles'],
    zip: ['ZIP', 'ZIP Archive', 'application/zip', 'Archive', 'Compressed archive'],
    rar: ['RAR', 'RAR Archive', 'application/vnd.rar', 'Archive', 'Compressed archive'],
    '7z': ['7Z', '7-Zip Archive', 'application/x-7z-compressed', 'Archive', 'Compressed archive'],
    iso: ['ISO', 'Disc Image', 'application/x-iso9660-image', 'Disc image', 'Optical disc copy'],
    pdf: ['PDF', 'PDF Document', 'application/pdf', 'Document', 'Portable document'],
    apk: ['APK', 'Android Package', 'application/vnd.android.package-archive', 'App', 'Android app'],
    exe: ['EXE', 'Windows Program', 'application/vnd.microsoft.portable-executable', 'App', 'Windows program'],
    jpg: ['JPG', 'JPEG Image', 'image/jpeg', 'Image', 'Photo'], jpeg: ['JPEG', 'JPEG Image', 'image/jpeg', 'Image', 'Photo'],
    png: ['PNG', 'PNG Image', 'image/png', 'Image', 'Lossless image'], webp: ['WEBP', 'WebP Image', 'image/webp', 'Image', 'Web image'],
    gif: ['GIF', 'GIF Animation', 'image/gif', 'Image', 'Animated image'],
};

// the MIME types some sources give us ("x-matroska", "video/mp4"...) -> extension
const MIME_TO_EXT = {
    'x-matroska': 'mkv', 'video/x-matroska': 'mkv', 'audio/x-matroska': 'mka', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
    'video/x-msvideo': 'avi', 'video/x-ms-wmv': 'wmv', 'video/x-flv': 'flv', 'video/mp2t': 'ts', 'video/mpeg': 'mpg', 'video/3gpp': '3gp',
    'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/flac': 'flac', 'audio/wav': 'wav', 'audio/ogg': 'ogg', 'application/zip': 'zip',
};

// "Movie.2024.1080p.WEB-DL.mkv", "Movie.mkv [1.2 GB]", "movie.MKV.part", "episode.mp4?download=1" -> "mkv" / "mp4"
export function extOf(name) {
    let n = String(name || '').trim();
    if (!n) return '';
    n = n.replace(/[?#].*$/, '').replace(/\s*[[(][^\])]*[\])]\s*$/g, '').replace(/\.(part|crdownload|tmp|download)$/i, '').trim();
    const m = n.match(/\.([a-z0-9]{2,5})$/i);
    if (m && FORMATS[m[1].toLowerCase()]) return m[1].toLowerCase();
    // a known extension somewhere near the end ("name.mkv.torrent-copy")
    const parts = n.toLowerCase().split('.').slice(1).reverse();
    const hit = parts.find((p) => FORMATS[p]);
    return hit || (m ? m[1].toLowerCase() : '');
}

// { ext, label, long, mime, kind, note, known }   (any of it may be empty when nothing is known)
export function parseFormat(name, mime) {
    let ext = extOf(name);
    const mm = String(mime || '').toLowerCase().trim();
    if (!FORMATS[ext] && mm) ext = MIME_TO_EXT[mm] || MIME_TO_EXT[mm.replace(/^[a-z]+\//, '')] || ext;
    const f = FORMATS[ext];
    if (f) return { ext, label: f[0], long: f[1], mime: mm || f[2], kind: f[3], note: f[4], known: true };
    if (ext) return { ext, label: ext.toUpperCase(), long: '', mime: mm, kind: '', note: '', known: false };
    if (mm) return { ext: '', label: mm.replace(/^.*\//, '').replace(/^x-/, '').toUpperCase(), long: '', mime: mm, kind: mm.split('/')[0] === 'video' ? 'Video' : '', note: '', known: false };
    return { ext: '', label: '', long: '', mime: '', kind: '', note: '', known: false };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "November 11 at 9:52 AM" in the visitor's own time zone (adds the year when it is not this year). Date-only values show just the day.
export function formatAdded(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const d = dateOnly ? new Date(`${raw}T00:00:00`) : new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const yr = d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : '';
    const day = `${MONTHS[d.getMonth()]} ${d.getDate()}${yr}`;
    if (dateOnly) return day;
    let h = d.getHours(); const mi = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${day} at ${h}:${mi} ${ap}`;
}

// "3 hours ago", "yesterday", "2 months ago"
export function timeAgo(value) {
    if (!value) return '';
    const raw = String(value).trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00`) : new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 0) return '';
    if (s < 60) return 'just now';
    const u = [[60, 'minute'], [3600, 'hour'], [86400, 'day'], [2592000, 'month'], [31536000, 'year']];
    let div = 60; let name = 'minute';
    for (let i = 0; i < u.length; i++) { if (s >= u[i][0]) { div = u[i][0]; name = u[i][1]; } }
    const n = Math.floor(s / div);
    if (name === 'day' && n === 1) return 'yesterday';
    return `${n} ${name}${n === 1 ? '' : 's'} ago`;
}
