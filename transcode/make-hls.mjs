#!/usr/bin/env node
// make-hls.mjs <input> <outDir> [--max-height 1080] [--preset veryfast] [--crf 23] [--audio-kbps 128]
// Makes an adaptive HLS package with ffmpeg: several video qualities, one AAC stream per audio language,
// WebVTT subtitles (text subtitles only), seek-bar thumbnails and a master.m3u8 that ties it together.
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const [input, outDir] = argv;
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i > -1 ? argv[i + 1] : d; };
if (!input || !outDir) { console.error('usage: make-hls.mjs <input> <outDir> [--max-height N]'); process.exit(2); }
const MAXH = +opt('max-height', 1080), PRESET = opt('preset', 'veryfast'), CRF = opt('crf', '23'), AK = +opt('audio-kbps', 128);

const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', input], { encoding: 'utf8', maxBuffer: 1 << 28 }).stdout || '{}');
const streams = probe.streams || [];
const vid = streams.find((s) => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
if (!vid) { console.error('no video stream'); process.exit(3); }
const dur = +(probe.format && probe.format.duration) || 0;
const srcH = vid.height || 720, srcW = vid.width || 1280;
const audios = streams.filter((s) => s.codec_type === 'audio');
const TEXT_SUBS = new Set(['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'mov_text', 'text']);
const subs = streams.filter((s) => s.codec_type === 'subtitle' && TEXT_SUBS.has(s.codec_name));
const fps = (() => { const [a, b] = String(vid.avg_frame_rate || '24/1').split('/').map(Number); return b ? a / b : 24; })();
const gop = Math.max(24, Math.round(fps * 6)); // one keyframe per 6 s segment

const LADDER = [[1080, 5000], [720, 2800], [480, 1200], [360, 700]];
let rungs = LADDER.filter(([h]) => h <= MAXH && h <= srcH + 8);
if (!rungs.length) rungs = [[Math.min(srcH, MAXH) - (Math.min(srcH, MAXH) % 2), 1500]];
// source taller than the biggest rung we keep: still make that biggest one
fs.mkdirSync(outDir, { recursive: true });

const run = (args) => new Promise((res, rej) => {
  console.log('ffmpeg', args.join(' ').slice(0, 220) + '...');
  const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
});
const hlsOut = (dir, name = 'index.m3u8') => ['-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_flags', 'independent_segments', '-hls_segment_filename', path.join(dir, 'seg%05d.ts'), path.join(dir, name)];
const mk = (d) => { fs.mkdirSync(path.join(outDir, d), { recursive: true }); return path.join(outDir, d); };
const lang3 = (s) => (s.tags && (s.tags.language || s.tags.LANGUAGE)) || 'und';
const title = (s, fb) => (s.tags && (s.tags.title || s.tags.TITLE)) || fb;
const LANGS = { eng: 'English', hin: 'Hindi', ben: 'Bengali', tam: 'Tamil', tel: 'Telugu', mal: 'Malayalam', kan: 'Kannada', jpn: 'Japanese', kor: 'Korean', zho: 'Chinese', chi: 'Chinese', spa: 'Spanish', fre: 'French', fra: 'French', ger: 'German', deu: 'German', ara: 'Arabic', rus: 'Russian', por: 'Portuguese', ita: 'Italian', tur: 'Turkish', und: 'Unknown' };
const label = (s, i, kind) => { const l = lang3(s); const n = LANGS[l] || l; const t = title(s, ''); return (t && t.length < 40 ? t : n) + (kind === 'a' && s.channels > 2 ? ' (' + (s.channels === 6 ? '5.1' : s.channels + 'ch') + ')' : ''); };

const master = ['#EXTM3U', '#EXT-X-VERSION:6', '#EXT-X-INDEPENDENT-SEGMENTS'];

// 1) audio: one AAC stereo rendition per source audio track
const aOut = [];
for (let i = 0; i < audios.length; i++) {
  const d = mk('a' + i);
  await run(['-i', input, '-map', `0:${audios[i].index}`, '-vn', '-sn', '-c:a', 'aac', '-b:a', AK + 'k', '-ac', '2', '-ar', '48000', ...hlsOut(d)]);
  aOut.push({ i, name: label(audios[i], i, 'a'), lang: lang3(audios[i]) });
}
// 2) video renditions (video only, so audio can be switched freely)
const vOut = [];
for (const [h, kbps] of rungs) {
  const d = mk('v' + h);
  const w = Math.round((srcW / srcH) * h / 2) * 2;
  const needScale = h < srcH - 8;
  await run(['-i', input, '-map', `0:${vid.index}`, '-an', '-sn', ...(needScale ? ['-vf', `scale=-2:${h}`] : ['-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2']),
    '-c:v', 'libx264', '-preset', PRESET, '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p', '-crf', CRF, '-maxrate', kbps + 'k', '-bufsize', kbps * 2 + 'k',
    '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0', ...hlsOut(d)]);
  vOut.push({ h, w: needScale ? w : srcW - (srcW % 2), kbps });
}
// 3) subtitles -> WebVTT (+ one-segment playlist each)
const sOut = [];
for (let i = 0; i < subs.length; i++) {
  const d = mk('s' + i);
  try {
    await run(['-i', input, '-map', `0:${subs[i].index}`, '-c:s', 'webvtt', path.join(d, 'sub.vtt')]);
    fs.writeFileSync(path.join(d, 'index.m3u8'), `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:${Math.ceil(dur) || 7200}\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:${(dur || 7200).toFixed(3)},\nsub.vtt\n#EXT-X-ENDLIST\n`);
    sOut.push({ i, name: label(subs[i], i, 's'), lang: lang3(subs[i]) });
  } catch (e) { console.warn('skip subtitle', i, e.message); }
}
// 4) seek-bar thumbnails: a sprite sheet + a VTT that maps time -> tile
let thumbs = false;
try {
  const td = mk('thumbs'), every = dur > 3600 ? 10 : 5, TW = 160, TH = Math.round(TW * srcH / srcW / 2) * 2, COLS = 10;
  const count = Math.max(1, Math.floor(dur / every));
  await run(['-i', input, '-an', '-sn', '-vf', `fps=1/${every},scale=${TW}:${TH},tile=${COLS}x${Math.ceil(count / COLS)}`, '-frames:v', '1', '-q:v', '5', path.join(td, 'sprite.jpg')]);
  const t = (x) => { const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = (x % 60).toFixed(3); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + s.padStart(6, '0'); };
  let v = 'WEBVTT\n\n';
  for (let n = 0; n < count; n++) v += `${t(n * every)} --> ${t((n + 1) * every)}\nsprite.jpg#xywh=${(n % COLS) * TW},${Math.floor(n / COLS) * TH},${TW},${TH}\n\n`;
  fs.writeFileSync(path.join(td, 'thumbs.vtt'), v);
  thumbs = true;
} catch (e) { console.warn('thumbnails skipped:', e.message); }

// 5) master playlist
aOut.forEach((a, n) => master.push(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="${a.name.replace(/"/g, '')}",LANGUAGE="${a.lang}",DEFAULT=${n === 0 ? 'YES' : 'NO'},AUTOSELECT=YES,URI="a${a.i}/index.m3u8"`));
sOut.forEach((s) => master.push(`#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${s.name.replace(/"/g, '')}",LANGUAGE="${s.lang}",DEFAULT=NO,AUTOSELECT=NO,URI="s${s.i}/index.m3u8"`));
for (const v of vOut) {
  master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${(v.kbps + AK) * 1000},RESOLUTION=${v.w}x${v.h},CODECS="avc1.640029${aOut.length ? ',mp4a.40.2' : ''}",NAME="${v.h}p"` + (aOut.length ? ',AUDIO="aud"' : '') + (sOut.length ? ',SUBTITLES="subs"' : ''));
  master.push(`v${v.h}/index.m3u8`);
}
fs.writeFileSync(path.join(outDir, 'master.m3u8'), master.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ duration: dur, heights: vOut.map((v) => v.h), audio: aOut, subs: sOut, thumbs, made: new Date().toISOString() }));
console.log('done', outDir);
