// CSS + behaviour of our own player (kept as plain strings: no backticks / template placeholders inside)
export const DIRECT_CSS = String.raw`.dp { position:absolute; inset:0; background:#000; display:none; user-select:none; -webkit-user-select:none; font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif; color:#f1f5f9; overflow:hidden; }
.dp.on { display:block; }
.dp video { width:100%; height:100%; object-fit:contain; background:#000; display:block; outline:none; }
.dp.fill video { object-fit:cover; }
.dp video::cue { background:rgba(0,0,0,.7); color:#fff; font-size:1.15em; }
.dp svg { width:20px; height:20px; fill:currentColor; display:block; pointer-events:none; }
.dp-shade { position:absolute; left:0; right:0; bottom:0; height:140px; background:linear-gradient(transparent,rgba(0,0,0,.85)); pointer-events:none; opacity:0; transition:opacity .25s; }
.dp-top { position:absolute; left:0; right:0; top:0; height:70px; background:linear-gradient(rgba(0,0,0,.6),transparent); pointer-events:none; opacity:0; transition:opacity .25s; }
.dp-bar { position:absolute; left:0; right:0; bottom:0; padding:0 12px calc(6px + env(safe-area-inset-bottom)); opacity:0; transition:opacity .25s; z-index:3; }
.dp.ui .dp-bar, .dp.ui .dp-shade, .dp.ui .dp-top, .dp.paused .dp-bar, .dp.paused .dp-shade, .dp.paused .dp-top { opacity:1; }
.dp.hide { cursor:none; }
.dp-seek { position:relative; height:20px; display:flex; align-items:center; cursor:pointer; touch-action:none; }
.dp-track { position:relative; width:100%; height:4px; border-radius:4px; background:rgba(255,255,255,.25); transition:height .12s; }
.dp-seek:hover .dp-track, .dp-seek.drag .dp-track { height:6px; }
.dp-buf, .dp-fill { position:absolute; left:0; top:0; bottom:0; border-radius:4px; width:0; }
.dp-buf { background:rgba(255,255,255,.35); }
.dp-fill { background:var(--accent-color,#ef4444); }
.dp-knob { position:absolute; top:50%; left:0; width:14px; height:14px; margin:-7px 0 0 -7px; border-radius:50%; background:#fff; transform:scale(0); transition:transform .12s; box-shadow:0 1px 6px rgba(0,0,0,.6); }
.dp-seek:hover .dp-knob, .dp-seek.drag .dp-knob { transform:scale(1); }
@media (hover:none) { .dp-knob { transform:scale(1); } }
.dp-tip { position:absolute; bottom:24px; transform:translateX(-50%); background:rgba(15,23,42,.96); color:#fff; font-size:11px; font-weight:700; padding:3px; border-radius:8px; display:none; pointer-events:none; text-align:center; }
.dp-tip span { display:block; padding:2px 6px; }
.dp-th { display:none; border-radius:5px; background-repeat:no-repeat; margin-bottom:2px; }
.dp-seek:hover .dp-tip, .dp-seek.drag .dp-tip { display:block; }
.dp-row { display:flex; align-items:center; gap:2px; height:40px; }
.dp-b { background:none; border:0; color:#f1f5f9; width:38px; height:38px; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; padding:0; -webkit-tap-highlight-color:transparent; }
.dp-b:hover { background:rgba(255,255,255,.14); }
.dp-b:active { transform:scale(.92); }
.dp-time { font-size:12px; font-weight:600; color:#e2e8f0; padding:0 8px; white-space:nowrap; font-variant-numeric:tabular-nums; }
.dp-sp { flex:1; }
.dp-vwrap { display:inline-flex; align-items:center; }
.dp-vol { width:0; opacity:0; transition:width .2s,opacity .2s; accent-color:var(--accent-color,#ef4444); height:4px; cursor:pointer; }
.dp-vwrap:hover .dp-vol, .dp-vol:focus { width:72px; opacity:1; margin-right:8px; }
.dp-big { position:absolute; left:50%; top:50%; width:68px; height:68px; margin:-34px 0 0 -34px; border-radius:50%; background:rgba(0,0,0,.55); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); color:#fff; display:none; align-items:center; justify-content:center; z-index:2; border:1px solid rgba(255,255,255,.18); cursor:pointer; padding:0; }
.dp-big svg { width:30px; height:30px; margin-left:3px; }
.dp.paused:not(.wait):not(.err) .dp-big { display:flex; }
.dp-load { position:absolute; left:50%; top:50%; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; border:3px solid rgba(255,255,255,.15); border-top-color:var(--accent-color,#ef4444); animation:spin .8s linear infinite; display:none; z-index:2; pointer-events:none; }
.dp.wait .dp-load { display:block; }
.dp-toast { position:absolute; top:14px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,.94); border:1px solid rgba(255,255,255,.12); color:#e2e8f0; font-size:12px; font-weight:600; padding:7px 14px; border-radius:999px; z-index:8; opacity:0; transition:opacity .25s; pointer-events:none; max-width:90%; text-align:center; }
.dp-toast.show { opacity:1; }
.dp-menu { position:absolute; right:12px; bottom:64px; background:rgba(10,15,29,.97); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:6px; min-width:190px; max-height:70%; overflow:auto; z-index:7; display:none; box-shadow:0 16px 40px rgba(0,0,0,.8); }
.dp-menu.open { display:block; }
.dp-menu h4 { font-size:10px; text-transform:uppercase; color:#64748b; padding:8px 10px 4px; letter-spacing:.6px; margin:0; font-weight:700; }
.dp-menu button { display:flex; width:100%; align-items:center; justify-content:space-between; gap:12px; background:none; border:0; color:#cbd5e1; font:600 13px/1.2 inherit; font-family:inherit; padding:9px 10px; border-radius:8px; cursor:pointer; text-align:left; }
.dp-menu button:hover { background:rgba(255,255,255,.08); color:#fff; }
.dp-menu button.on { color:var(--accent-color,#ef4444); }
.dp-menu button.on::after { content:''; width:8px; height:8px; border-radius:50%; background:currentColor; flex:none; }
.dp-stats { position:absolute; left:12px; top:58px; background:rgba(0,0,0,.75); color:#cbd5e1; font:11px/1.6 ui-monospace,Menlo,monospace; padding:8px 10px; border-radius:8px; z-index:6; display:none; pointer-events:none; }
.dp-stats.show { display:block; }
.dp-flash { position:absolute; top:50%; width:92px; height:92px; margin-top:-46px; border-radius:50%; background:rgba(255,255,255,.18); color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; z-index:2; }
.dp-flash.l { left:10%; } .dp-flash.r { right:10%; }
.dp-flash.go { animation:dpf .55s ease; }
@keyframes dpf { 0%{opacity:0;transform:scale(.7)} 30%{opacity:1} 100%{opacity:0;transform:scale(1.1)} }
.dp-note { position:absolute; left:12px; right:12px; bottom:76px; z-index:7; display:none; background:rgba(15,23,42,.96); border:1px solid rgba(245,158,11,.45); border-radius:14px; padding:12px 14px; font-size:12.5px; line-height:1.45; max-width:460px; margin:0 auto; }
.dp-note.show { display:block; }
.dp-note b { color:#fbbf24; }
.dp-note .row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.dp-note button { background:rgba(255,255,255,.1); border:0; color:#fff; font:700 12px inherit; font-family:inherit; padding:8px 12px; border-radius:8px; cursor:pointer; }
.dp-note button.pri { background:var(--accent-color,#ef4444); }
.dp-err { position:absolute; inset:0; z-index:9; display:none; align-items:center; justify-content:center; flex-direction:column; gap:10px; background:rgba(0,0,0,.78); text-align:center; padding:20px; }
.dp.err .dp-err { display:flex; }
.dp-err p { margin:0; font-size:14px; font-weight:600; max-width:420px; }
.dp-err small { color:#94a3b8; font-size:12px; max-width:420px; }
.dp-err .row { display:flex; gap:8px; margin-top:6px; }
.dp-err button { background:var(--accent-color,#ef4444); border:0; color:#fff; font:700 13px inherit; font-family:inherit; padding:10px 16px; border-radius:10px; cursor:pointer; }
.dp-err button.alt { background:rgba(255,255,255,.12); }
@media (max-width:600px) {
  .dp-vwrap { display:none; } .dp-pip { display:none; }
  .dp-b { width:36px; height:36px; } .dp-time { font-size:11px; padding:0 4px; }
  .dp-bar { padding-left:6px; padding-right:6px; }
  .dp-menu { left:8px; right:8px; bottom:62px; min-width:0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

export const DIRECT_JS = String.raw`(function () {
  var box = document.getElementById('directPlayer');
  if (!box) return;
  var v = box.querySelector('video');
  var $ = function (s) { return box.querySelector(s); };
  var ID = box.getAttribute('data-id');
  var ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6.5 12 11V8c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" fill="#000" stroke="none">10</text></svg>',
    fwd: '<svg viewBox="0 0 24 24"><path d="M12 5V2l5 4.5L12 11V8c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6h2c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8z"/><text x="12" y="16.5" font-size="7" font-weight="700" text-anchor="middle" fill="#000" stroke="none">10</text></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6L7 10H3zm13.6 2 2.4-2.4-1.4-1.4-2.4 2.4-2.4-2.4-1.4 1.4 2.4 2.4-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4z"/></svg>',
    cog: '<svg viewBox="0 0 24 24"><path d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.2h-4l-.4 2.7c-.6.2-1.2.6-1.7 1l-2.5-1-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.8 1.7 1l.4 2.7h4l.4-2.7c.6-.2 1.2-.6 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    pip: '<svg viewBox="0 0 24 24"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
    fsx: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
  };
  function put(sel, name) { var e = $(sel); if (e) e.innerHTML = ICON[name]; }
  put('.dp-big', 'play'); put('.dp-pp', 'play'); put('.dp-back', 'back'); put('.dp-fwd', 'fwd'); put('.dp-mute', 'vol'); put('.dp-cog', 'cog'); put('.dp-pip', 'pip'); put('.dp-fs', 'fs');

  var seek = $('.dp-seek'), fill = $('.dp-fill'), buf = $('.dp-buf'), knob = $('.dp-knob'), tip = $('.dp-tip');
  var tipT = tip.querySelector('span'), th = tip.querySelector('.dp-th');
  var tcur = $('.dp-cur'), tdur = $('.dp-dur'), toast = $('.dp-toast'), menu = $('.dp-menu'), stats = $('.dp-stats'), note = $('.dp-note'), errBox = $('.dp-err');
  var vol = $('.dp-vol');
  var key = 'ms_pos_' + ID;
  var hideT, toastT, drag = false, started = false, wantFallback = null, mediaTry = 0, hls = null, cues = [], base = '', isHls = false, audioChecked = false, lastSave = 0;

  function fmt(t) { if (!isFinite(t)) return '0:00'; t = Math.max(0, Math.floor(t)); var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function say(msg, ms) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, ms || 2200); }
  function ui() { box.classList.add('ui'); box.classList.remove('hide'); clearTimeout(hideT); if (!v.paused && !menu.classList.contains('open')) hideT = setTimeout(function () { box.classList.remove('ui'); box.classList.add('hide'); }, 3000); }
  function toggle() { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
  function skip(d) { if (!v.duration) return; v.currentTime = Math.min(Math.max(0, v.currentTime + d), v.duration); }
  function store(k, val) { try { localStorage.setItem(k, String(val)); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function tellParent(why) { try { window.parent.postMessage({ msPlayer: 'fail', why: why || '' }, '*'); } catch (e) {} }

  // ---------- thumbnails (HLS) ----------
  function parseVtt(txt, root) {
    var out = [], re = /(\d+):(\d\d):(\d\d\.\d+)\s*-->\s*(\d+):(\d\d):(\d\d\.\d+)\s*\n(\S+)#xywh=(\d+),(\d+),(\d+),(\d+)/g, m;
    var sec = function (h, mi, s) { return +h * 3600 + +mi * 60 + parseFloat(s); };
    while ((m = re.exec(txt))) out.push({ a: sec(m[1], m[2], m[3]), b: sec(m[4], m[5], m[6]), u: root + m[7], x: +m[8], y: +m[9], w: +m[10], h: +m[11] });
    return out;
  }
  function thumbAt(t) {
    if (!cues.length) return;
    var c = cues[cues.length - 1];
    for (var i = 0; i < cues.length; i++) if (t >= cues[i].a && t < cues[i].b) { c = cues[i]; break; }
    th.style.display = 'block'; th.style.width = c.w + 'px'; th.style.height = c.h + 'px';
    th.style.backgroundImage = 'url(' + c.u + ')'; th.style.backgroundPosition = '-' + c.x + 'px -' + c.y + 'px';
  }
  function destroyHls() { if (hls) { try { hls.destroy(); } catch (e) {} hls = null; } cues = []; th.style.display = 'none'; }

  // ---------- load / stop ----------
  window.msDirect = {
    load: function (url, onFail) {
      destroyHls();
      wantFallback = onFail; started = false; mediaTry = 0; audioChecked = false;
      box.classList.remove('err'); note.classList.remove('show');
      box.classList.add('on', 'wait', 'paused');
      isHls = /\.m3u8(\?|$)/.test(url);
      if (isHls) v.crossOrigin = 'anonymous'; else v.removeAttribute('crossorigin');
      var sp = parseFloat(load('ms_rate')); if (sp > 0) v.playbackRate = sp;
      var vv = parseFloat(load('ms_vol')); if (vv >= 0 && vv <= 1) v.volume = vv;
      if (isHls && window.Hls && window.Hls.isSupported()) {
        base = url.replace(/[^\/]*$/, '');
        hls = new window.Hls({ maxBufferLength: 40, enableWorker: true, startLevel: -1 });
        var E = window.Hls.Events;
        hls.on(E.MANIFEST_PARSED, drawMenu); hls.on(E.AUDIO_TRACKS_UPDATED, drawMenu); hls.on(E.SUBTITLE_TRACKS_UPDATED, drawMenu); hls.on(E.LEVEL_SWITCHED, drawMenu);
        hls.on(E.ERROR, function (e, d) {
          if (!d.fatal) return;
          if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaTry++ < 2) { hls.recoverMediaError(); return; }
          if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR && mediaTry++ < 2) { hls.startLoad(); return; }
          fail('The adaptive stream could not be played');
        });
        hls.loadSource(url); hls.attachMedia(v);
        fetch(base + 'thumbs/thumbs.vtt').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (t) cues = parseVtt(t, base + 'thumbs/'); }).catch(function () {});
      } else { v.src = url; v.load(); }
      drawMenu();
    },
    stop: function () { destroyHls(); box.classList.remove('on'); try { v.pause(); } catch (e) {} v.removeAttribute('src'); try { v.load(); } catch (e) {} }
  };

  // ---------- media events ----------
  v.addEventListener('loadedmetadata', function () {
    tdur.textContent = fmt(v.duration);
    var p = parseFloat(load(key)); if (p > 15 && v.duration && p < v.duration - 30) { v.currentTime = p; say('Resumed from ' + fmt(p)); }
    // no picture = a video codec this browser cannot decode (HEVC / AV1 / 10-bit)
    setTimeout(function () { if (!isHls && v.videoWidth === 0 && v.readyState >= 1 && v.duration) fail('This video format cannot be played by your browser'); }, 1800);
  });
  v.addEventListener('canplay', function () { started = true; box.classList.remove('wait'); });
  v.addEventListener('playing', function () { started = true; box.classList.remove('wait', 'paused'); $('.dp-pp').innerHTML = ICON.pause; ui(); });
  v.addEventListener('pause', function () { box.classList.add('paused'); $('.dp-pp').innerHTML = ICON.play; ui(); });
  v.addEventListener('waiting', function () { if (!v.paused) box.classList.add('wait'); });
  v.addEventListener('seeking', function () { box.classList.add('wait'); });
  v.addEventListener('seeked', function () { box.classList.remove('wait'); });
  v.addEventListener('error', function () { fail(started ? 'Playback stopped' : 'This file could not be loaded'); });
  v.addEventListener('volumechange', function () { vol.value = v.muted ? 0 : v.volume; $('.dp-mute').innerHTML = (v.muted || v.volume === 0) ? ICON.mute : ICON.vol; store('ms_vol', v.volume); });
  v.addEventListener('ratechange', function () { store('ms_rate', v.playbackRate); });
  v.addEventListener('progress', function () { try { var b = v.buffered; if (b.length && v.duration) buf.style.width = (b.end(b.length - 1) / v.duration * 100) + '%'; } catch (e) {} });
  v.addEventListener('timeupdate', function () {
    if (!drag && v.duration) { var p = v.currentTime / v.duration * 100; fill.style.width = p + '%'; knob.style.left = p + '%'; }
    tcur.textContent = fmt(v.currentTime);
    var n = Date.now();
    if (n - lastSave > 5000 && v.currentTime > 5) { lastSave = n; store(key, v.currentTime); }
    if (stats.classList.contains('show')) paintStats();
    if (!audioChecked && !isHls && v.currentTime > 3 && !v.paused) { audioChecked = true; checkAudio(); }
  });
  v.addEventListener('ended', function () { try { localStorage.removeItem(key); } catch (e) {} });

  // The picture plays but there is no sound: the audio track is a format browsers cannot decode (AC3 / EAC3 / DTS / TrueHD)
  function checkAudio() {
    if (v.muted || v.volume === 0) return;
    var silent = false;
    if (typeof v.webkitAudioDecodedByteCount === 'number') silent = v.webkitAudioDecodedByteCount === 0;
    else if (typeof v.mozHasAudio === 'boolean') silent = v.mozHasAudio === false;
    else if (v.audioTracks && typeof v.audioTracks.length === 'number') silent = v.audioTracks.length === 0;
    if (!silent) return;
    note.innerHTML = '<b>No sound?</b> This file\'s audio format (AC3 / EAC3 / DTS) is not supported by your browser, so only the picture plays. ' +
      'The <b>HLS</b> server (if listed) or another server will have sound.<div class="row"><button class="pri" data-n="next">Try another server</button><button data-n="close">Keep watching</button></div>';
    note.classList.add('show');
  }
  note.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.n === 'next') tellParent('audio'); note.classList.remove('show'); });

  function fail(msg) {
    box.classList.remove('wait'); box.classList.add('err');
    errBox.querySelector('p').textContent = msg;
    if (wantFallback) { var f = wantFallback; wantFallback = null; setTimeout(f, 1200); }
  }
  errBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'retry') { var s = v.currentSrc || v.src; box.classList.remove('err'); box.classList.add('wait'); if (hls) { hls.startLoad(); } else { v.load(); } }
    if (b.dataset.a === 'next') tellParent('manual');
  });

  // ---------- seek bar ----------
  function at(e) { var r = seek.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); }
  function move(e) { var f = at(e); fill.style.width = (f * 100) + '%'; knob.style.left = (f * 100) + '%'; tcur.textContent = fmt(f * (v.duration || 0)); }
  seek.addEventListener('pointerdown', function (e) { drag = true; seek.classList.add('drag'); try { seek.setPointerCapture(e.pointerId); } catch (x) {} move(e); });
  seek.addEventListener('pointermove', function (e) { var f = at(e); tip.style.left = Math.min(92, Math.max(8, f * 100)) + '%'; tipT.textContent = fmt(f * (v.duration || 0)); thumbAt(f * (v.duration || 0)); if (drag) move(e); });
  seek.addEventListener('pointerup', function (e) { if (drag && v.duration) v.currentTime = at(e) * v.duration; drag = false; seek.classList.remove('drag'); });
  seek.addEventListener('pointercancel', function () { drag = false; seek.classList.remove('drag'); });

  // ---------- buttons ----------
  $('.dp-pp').onclick = toggle; $('.dp-big').onclick = toggle;
  $('.dp-back').onclick = function () { skip(-10); }; $('.dp-fwd').onclick = function () { skip(10); };
  $('.dp-mute').onclick = function () { v.muted = !v.muted; };
  vol.oninput = function () { v.volume = parseFloat(vol.value); v.muted = v.volume === 0; };
  function fsToggle() {
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    var el = box; var p = (el.requestFullscreen || el.webkitRequestFullscreen || v.webkitEnterFullscreen);
    if (!p) return;
    var r = p.call(p === v.webkitEnterFullscreen ? v : el);
    if (r && r.then) r.then(function () { try { if (screen.orientation && screen.orientation.lock && v.videoWidth > v.videoHeight) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }).catch(function () {});
  }
  $('.dp-fs').onclick = fsToggle;
  document.addEventListener('fullscreenchange', function () { $('.dp-fs').innerHTML = document.fullscreenElement ? ICON.fsx : ICON.fs; });
  var pip = $('.dp-pip'); if (!document.pictureInPictureEnabled) pip.style.display = 'none';
  pip.onclick = function () { if (document.pictureInPictureElement) document.exitPictureInPicture(); else if (v.requestPictureInPicture) v.requestPictureInPicture().catch(function () {}); };
  $('.dp-cog').onclick = function (e) { e.stopPropagation(); drawMenu(); menu.classList.toggle('open'); ui(); };
  menu.onclick = function (e) { e.stopPropagation(); };

  // ---------- settings menu ----------
  var speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function drawMenu() {
    var h = '', i;
    if (hls && hls.levels && hls.levels.length > 1) {
      var cur = hls.currentLevel > -1 && hls.levels[hls.currentLevel] ? ' (' + hls.levels[hls.currentLevel].height + 'p)' : '';
      h += '<h4>Quality</h4><button data-q="-1" class="' + (hls.autoLevelEnabled ? 'on' : '') + '"><span>Auto' + (hls.autoLevelEnabled ? cur : '') + '</span></button>';
      for (i = hls.levels.length - 1; i >= 0; i--) h += '<button data-q="' + i + '" class="' + (!hls.autoLevelEnabled && hls.currentLevel === i ? 'on' : '') + '"><span>' + hls.levels[i].height + 'p</span></button>';
    }
    if (hls && hls.audioTracks && hls.audioTracks.length > 1) {
      h += '<h4>Audio</h4>';
      hls.audioTracks.forEach(function (t, n) { h += '<button data-au="' + n + '" class="' + (hls.audioTrack === n ? 'on' : '') + '"><span>' + esc(t.name) + '</span></button>'; });
    } else if (!isHls && v.audioTracks && v.audioTracks.length > 1) {
      h += '<h4>Audio</h4>';
      for (i = 0; i < v.audioTracks.length; i++) h += '<button data-na="' + i + '" class="' + (v.audioTracks[i].enabled ? 'on' : '') + '"><span>' + esc(v.audioTracks[i].label || v.audioTracks[i].language || ('Track ' + (i + 1))) + '</span></button>';
    }
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length) {
      h += '<h4>Subtitles</h4><button data-su="-1" class="' + (hls.subtitleTrack === -1 ? 'on' : '') + '"><span>Off</span></button>';
      hls.subtitleTracks.forEach(function (t, n) { h += '<button data-su="' + n + '" class="' + (hls.subtitleTrack === n ? 'on' : '') + '"><span>' + esc(t.name) + '</span></button>'; });
    }
    h += '<h4>Speed</h4>';
    speeds.forEach(function (s) { h += '<button data-s="' + s + '" class="' + (v.playbackRate === s ? 'on' : '') + '"><span>' + (s === 1 ? 'Normal' : s + 'x') + '</span></button>'; });
    h += '<h4>View</h4><button data-a="fit"><span>' + (box.classList.contains('fill') ? 'Fit to screen' : 'Fill screen') + '</span></button>';
    h += '<button data-a="stats"><span>Stats for nerds</span></button><button data-a="dl"><span>Download page</span></button>';
    menu.innerHTML = h;
  }
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var d = b.dataset, keep = false;
    if (d.q !== undefined && hls) { hls.currentLevel = +d.q; say(+d.q < 0 ? 'Quality: Auto' : 'Quality: ' + hls.levels[+d.q].height + 'p', 1500); keep = true; }
    if (d.au !== undefined && hls) { hls.audioTrack = +d.au; say('Audio: ' + hls.audioTracks[+d.au].name, 1500); keep = true; }
    if (d.na !== undefined) { for (var i = 0; i < v.audioTracks.length; i++) v.audioTracks[i].enabled = i === +d.na; keep = true; }
    if (d.su !== undefined && hls) { hls.subtitleTrack = +d.su; say(+d.su < 0 ? 'Subtitles off' : 'Subtitles: ' + hls.subtitleTracks[+d.su].name, 1500); keep = true; }
    if (d.s) { v.playbackRate = parseFloat(d.s); say('Speed ' + d.s + 'x', 1200); }
    if (d.a === 'fit') box.classList.toggle('fill');
    if (d.a === 'stats') stats.classList.toggle('show');
    if (d.a === 'dl') window.open(location.origin + '/file/' + ID, '_blank');
    drawMenu(); if (!keep) menu.classList.remove('open');
  });
  function paintStats() {
    var q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : {}, b = 0;
    try { var r = v.buffered; if (r.length) b = r.end(r.length - 1) - v.currentTime; } catch (e) {}
    var lv = hls && hls.currentLevel > -1 ? hls.levels[hls.currentLevel] : null;
    stats.innerHTML = 'Mode: ' + (isHls ? 'HLS adaptive' : 'Direct') + '<br>Resolution: ' + v.videoWidth + 'x' + v.videoHeight + '<br>Buffer: ' + b.toFixed(1) + 's<br>Dropped: ' + (q.droppedVideoFrames || 0) + ' / ' + (q.totalVideoFrames || 0) + '<br>Speed: ' + v.playbackRate + 'x' + (lv ? '<br>Level: ' + lv.height + 'p @ ' + Math.round(lv.bitrate / 1000) + ' kbps<br>Bandwidth: ' + (Math.round((hls.bandwidthEstimate || 0) / 1e5) / 10) + ' Mbps' : '');
  }

  // ---------- gestures + keyboard ----------
  var lastTap = 0, tapT;
  function flash(side, txt) { var f = $('.dp-flash.' + side); f.textContent = txt; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  v.addEventListener('click', function (e) {
    var now = Date.now(), r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (menu.classList.contains('open')) { menu.classList.remove('open'); return; }
    if (now - lastTap < 300) {
      clearTimeout(tapT); lastTap = 0;
      if (x < 0.35) { skip(-10); flash('l', '-10s'); } else if (x > 0.65) { skip(10); flash('r', '+10s'); } else fsToggle();
      return;
    }
    lastTap = now;
    var touch = e.pointerType === 'touch' || (window.matchMedia && window.matchMedia('(hover:none)').matches);
    tapT = setTimeout(function () { if (touch && !box.classList.contains('ui') && !v.paused) ui(); else toggle(); }, 300);
  });
  box.addEventListener('mousemove', ui); box.addEventListener('touchstart', ui, { passive: true });
  document.addEventListener('click', function () { menu.classList.remove('open'); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('on') || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    var k = e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'ArrowRight') { skip(5); flash('r', '+5s'); } else if (k === 'ArrowLeft') { skip(-5); flash('l', '-5s'); }
    else if (k === 'j') { skip(-10); flash('l', '-10s'); } else if (k === 'l') { skip(10); flash('r', '+10s'); }
    else if (k === 'ArrowUp') { e.preventDefault(); v.muted = false; v.volume = Math.min(1, v.volume + 0.1); say('Volume ' + Math.round(v.volume * 100) + '%', 900); }
    else if (k === 'ArrowDown') { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); say('Volume ' + Math.round(v.volume * 100) + '%', 900); }
    else if (k === 'm') v.muted = !v.muted; else if (k === 'f') fsToggle(); else if (k === 'i') stats.classList.toggle('show');
    else if (k === '>') { v.playbackRate = Math.min(2, v.playbackRate + 0.25); say(v.playbackRate + 'x', 900); }
    else if (k === '<') { v.playbackRate = Math.max(0.25, v.playbackRate - 0.25); say(v.playbackRate + 'x', 900); }
    else if (/^[0-9]$/.test(k) && v.duration) v.currentTime = v.duration * (+k) / 10;
    ui();
  });
  box.classList.add('paused');
})();
`;
