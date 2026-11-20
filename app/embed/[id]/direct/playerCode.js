// Generated from the standalone player: CSS + behaviour (no backticks / template placeholders inside)
export const DIRECT_CSS = String.raw`
.dp { position:absolute; inset:0; background:#000; display:none; user-select:none; -webkit-user-select:none; }
.dp.on { display:block; }
.dp video { width:100%; height:100%; object-fit:contain; background:#000; display:block; }
.dp.fill video { object-fit:cover; }
.dp-shade { position:absolute; left:0; right:0; bottom:0; height:150px; background:linear-gradient(transparent,rgba(0,0,0,.82)); pointer-events:none; opacity:0; transition:opacity .25s; }
.dp-bar { position:absolute; left:0; right:0; bottom:0; padding:0 12px 8px; opacity:0; transition:opacity .25s; z-index:3; }
.dp.ui .dp-bar, .dp.ui .dp-shade, .dp.paused .dp-bar, .dp.paused .dp-shade { opacity:1; }
.dp.hide { cursor:none; }
.dp-seek { position:relative; height:18px; display:flex; align-items:center; cursor:pointer; touch-action:none; }
.dp-track { position:relative; width:100%; height:4px; border-radius:4px; background:rgba(255,255,255,.22); transition:height .12s; }
.dp-seek:hover .dp-track, .dp-seek.drag .dp-track { height:6px; }
.dp-buf, .dp-fill { position:absolute; left:0; top:0; bottom:0; border-radius:4px; }
.dp-buf { background:rgba(255,255,255,.32); }
.dp-fill { background:var(--accent-color); }
.dp-knob { position:absolute; top:50%; width:13px; height:13px; margin:-6.5px 0 0 -6.5px; border-radius:50%; background:#fff; transform:scale(0); transition:transform .12s; }
.dp-seek:hover .dp-knob, .dp-seek.drag .dp-knob { transform:scale(1); }
.dp-tip { position:absolute; bottom:22px; transform:translateX(-50%); background:rgba(15,23,42,.95); color:#fff; font-size:11px; font-weight:700; padding:3px; border-radius:8px; display:none; pointer-events:none; text-align:center; }
.dp-tip span { display:block; padding:2px 6px; }
.dp-th { display:none; border-radius:5px; background-repeat:no-repeat; margin-bottom:2px; }
.dp-seek:hover .dp-tip { display:block; }
.dp-row { display:flex; align-items:center; gap:4px; height:38px; }
.dp-b { background:none; border:0; color:#f1f5f9; width:36px; height:36px; border-radius:8px; cursor:pointer; font-size:15px; display:inline-flex; align-items:center; justify-content:center; }
.dp-b:hover { background:rgba(255,255,255,.14); }
.dp-time { font-size:11.5px; font-weight:700; color:#e2e8f0; padding:0 6px; white-space:nowrap; font-variant-numeric:tabular-nums; }
.dp-sp { flex:1; }
.dp-vol { width:0; opacity:0; transition:width .2s,opacity .2s; accent-color:var(--accent-color); height:4px; cursor:pointer; }
.dp-vwrap:hover .dp-vol { width:70px; opacity:1; margin-right:6px; }
.dp-big { position:absolute; left:50%; top:50%; width:64px; height:64px; margin:-32px 0 0 -32px; border-radius:50%; background:rgba(0,0,0,.55); backdrop-filter:blur(8px); color:#fff; font-size:24px; display:none; align-items:center; justify-content:center; z-index:2; border:0; cursor:pointer; }
.dp.paused .dp-big { display:flex; }
.dp.wait .dp-big { display:none; }
.dp-load { position:absolute; left:50%; top:50%; width:46px; height:46px; margin:-23px 0 0 -23px; border-radius:50%; border:3px solid rgba(255,255,255,.15); border-top-color:var(--accent-color); animation:spin .8s linear infinite; display:none; z-index:2; }
.dp.wait .dp-load { display:block; }
.dp-toast { position:absolute; top:14px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,.92); border:1px solid rgba(255,255,255,.12); color:#e2e8f0; font-size:11.5px; font-weight:600; padding:7px 14px; border-radius:999px; z-index:6; opacity:0; transition:opacity .25s; pointer-events:none; max-width:90%; text-align:center; }
.dp-toast.show { opacity:1; }
.dp-menu { max-height:70%; overflow:auto; position:absolute; right:12px; bottom:62px; background:rgba(10,15,29,.96); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:6px; min-width:170px; z-index:7; display:none; box-shadow:0 16px 40px rgba(0,0,0,.8); }
.dp-menu.open { display:block; }
.dp-menu h4 { font-size:9.5px; text-transform:uppercase; color:#64748b; padding:5px 8px; letter-spacing:.5px; }
.dp-menu button { display:flex; width:100%; justify-content:space-between; gap:12px; background:none; border:0; color:#cbd5e1; font:600 12px inherit; font-family:inherit; padding:7px 8px; border-radius:8px; cursor:pointer; }
.dp-menu button:hover { background:rgba(255,255,255,.08); color:#fff; }
.dp-menu button.on { color:var(--accent-color); }
.dp-stats { position:absolute; left:12px; top:52px; background:rgba(0,0,0,.72); color:#cbd5e1; font:11px/1.6 ui-monospace,monospace; padding:8px 10px; border-radius:8px; z-index:6; display:none; }
.dp-stats.show { display:block; }
.dp-flash { position:absolute; top:50%; width:90px; height:90px; margin-top:-45px; border-radius:50%; background:rgba(255,255,255,.18); color:#fff; font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; opacity:0; pointer-events:none; z-index:2; }
.dp-flash.l { left:12%; } .dp-flash.r { right:12%; }
.dp-flash.go { animation:dpf .5s ease; }
@keyframes dpf { 0%{opacity:0;transform:scale(.7)} 30%{opacity:1} 100%{opacity:0;transform:scale(1.1)} }
@media (max-width:560px){ .dp-vwrap,.dp-pip{display:none} .dp-b{width:34px} .dp-time{font-size:10.5px;padding:0 2px} .dp-bar{padding:0 8px 4px} }

@keyframes spin { to { transform: rotate(360deg); } }
`;

export const DIRECT_JS = String.raw`
(function () {
  var box = document.getElementById('directPlayer');
  if (!box) return;
  var v = box.querySelector('video');
  var $ = function (s) { return box.querySelector(s); };
  var seek = $('.dp-seek'), fill = $('.dp-fill'), buf = $('.dp-buf'), knob = $('.dp-knob'), tip = $('.dp-tip');
  var tcur = $('.dp-cur'), tdur = $('.dp-dur'), toast = $('.dp-toast'), menu = $('.dp-menu'), stats = $('.dp-stats');
  var tipT = tip.querySelector('span'), th = tip.querySelector('.dp-th'), cues = [], base = '', hls = null;
  var vol = $('.dp-vol'), key = 'ms_pos_' + box.getAttribute('data-id');
  var hideT, toastT, drag = false, started = false, wantFallback = null, mediaTry = 0;

  function fmt(t) { if (!isFinite(t)) return '0:00'; t = Math.max(0, Math.floor(t)); var h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function say(msg, ms) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, ms || 2200); }
  function ui() { box.classList.add('ui'); box.classList.remove('hide'); clearTimeout(hideT); if (!v.paused) hideT = setTimeout(function () { box.classList.remove('ui'); box.classList.add('hide'); menu.classList.remove('open'); }, 2800); }
  function toggle() { if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); }
  function skip(d) { v.currentTime = Math.min(Math.max(0, v.currentTime + d), v.duration || 1e9); }
  function icon(el, c) { el.innerHTML = '<i class="fas ' + c + '"></i>'; }

  function parseVtt(txt, root) {
    var out = [], re = /(\d+):(\d\d):(\d\d\.\d+)\s*-->\s*(\d+):(\d\d):(\d\d\.\d+)\s*\n(\S+)#xywh=(\d+),(\d+),(\d+),(\d+)/g, m;
    var sec = function (h, mi, s) { return +h * 3600 + +mi * 60 + parseFloat(s); };
    while ((m = re.exec(txt))) out.push({ a: sec(m[1], m[2], m[3]), b: sec(m[4], m[5], m[6]), u: root + m[7], x: +m[8], y: +m[9], w: +m[10], h: +m[11] });
    return out;
  }
  function thumbAt(t) {
    if (!cues.length) return;
    var c = null; for (var i = 0; i < cues.length; i++) if (t >= cues[i].a && t < cues[i].b) { c = cues[i]; break; }
    if (!c) c = cues[cues.length - 1];
    th.style.display = 'block'; th.style.width = c.w + 'px'; th.style.height = c.h + 'px';
    th.style.backgroundImage = 'url(' + c.u + ')'; th.style.backgroundPosition = '-' + c.x + 'px -' + c.y + 'px';
  }
  function destroyHls() { if (hls) { try { hls.destroy(); } catch (e) {} hls = null; } cues = []; th.style.display = 'none'; }

  window.msDirect = {
    load: function (url, onFail) {
      destroyHls();
      wantFallback = onFail; started = false; mediaTry = 0;
      box.classList.add('on', 'wait');
      var isHls = /\.m3u8(\?|$)/.test(url);
      if (isHls && window.Hls && window.Hls.isSupported()) {
        base = url.replace(/[^\/]*$/, '');
        hls = new window.Hls({ maxBufferLength: 40, capLevelToPlayerSize: false, enableWorker: true });
        hls.on(window.Hls.Events.MANIFEST_PARSED, function () { drawMenu(); });
        hls.on(window.Hls.Events.AUDIO_TRACKS_UPDATED, drawMenu);
        hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, drawMenu);
        hls.on(window.Hls.Events.LEVEL_SWITCHED, function () { drawMenu(); });
        hls.on(window.Hls.Events.ERROR, function (e, d) {
          if (!d.fatal) return;
          if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaTry++ < 2) { hls.recoverMediaError(); return; }
          if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR && mediaTry++ < 2) { hls.startLoad(); return; }
          fail('Stream error');
        });
        hls.loadSource(url); hls.attachMedia(v);
        fetch(base + 'thumbs/thumbs.vtt').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (t) cues = parseVtt(t, base + 'thumbs/'); }).catch(function () {});
      } else { v.src = url; v.load(); }
    },
    stop: function () { destroyHls(); box.classList.remove('on'); try { v.pause(); } catch (e) {} v.removeAttribute('src'); v.load(); }
  };

  v.addEventListener('loadedmetadata', function () {
    tdur.textContent = fmt(v.duration);
    try { var p = parseFloat(localStorage.getItem(key)); if (p > 15 && p < v.duration - 30) { v.currentTime = p; say('Resumed from ' + fmt(p)); } } catch (e) {}
    // video track missing = codec the browser cannot decode (HEVC/AV1/10-bit on some devices)
    setTimeout(function () { if (v.videoWidth === 0 && v.readyState >= 1 && v.duration) { fail('This video uses a codec your browser cannot play'); } }, 1500);
  });
  v.addEventListener('canplay', function () { started = true; box.classList.remove('wait'); });
  v.addEventListener('playing', function () { started = true; box.classList.remove('wait'); box.classList.remove('paused'); icon($('.dp-pp'), 'fa-pause'); ui(); });
  v.addEventListener('pause', function () { box.classList.add('paused'); icon($('.dp-pp'), 'fa-play'); ui(); });
  v.addEventListener('waiting', function () { box.classList.add('wait'); });
  v.addEventListener('seeking', function () { box.classList.add('wait'); });
  v.addEventListener('seeked', function () { box.classList.remove('wait'); });
  v.addEventListener('error', function () { fail(started ? 'Playback error' : 'Direct stream unavailable'); });
  v.addEventListener('volumechange', function () { vol.value = v.muted ? 0 : v.volume; icon($('.dp-mute'), v.muted || v.volume === 0 ? 'fa-volume-xmark' : 'fa-volume-high'); });
  v.addEventListener('progress', function () { try { var b = v.buffered; if (b.length) buf.style.width = (b.end(b.length - 1) / v.duration * 100) + '%'; } catch (e) {} });
  var lastSave = 0;
  v.addEventListener('timeupdate', function () {
    if (!drag && v.duration) { var p = v.currentTime / v.duration * 100; fill.style.width = p + '%'; knob.style.left = p + '%'; }
    tcur.textContent = fmt(v.currentTime);
    var n = Date.now();
    if (n - lastSave > 5000 && v.currentTime > 5) { lastSave = n; try { localStorage.setItem(key, String(v.currentTime)); } catch (e) {} }
    if (stats.classList.contains('show')) paintStats();
  });
  v.addEventListener('ended', function () { try { localStorage.removeItem(key); } catch (e) {} });

  function fail(msg) {
    box.classList.remove('wait');
    if (wantFallback) { var f = wantFallback; wantFallback = null; say(msg + ' - switching server...', 3000); setTimeout(f, 900); }
    else say(msg, 3500);
  }

  // seek bar (mouse + touch)
  function at(e) { var r = seek.getBoundingClientRect(); var x = (e.touches ? e.touches[0].clientX : e.clientX); return Math.min(1, Math.max(0, (x - r.left) / r.width)); }
  seek.addEventListener('pointerdown', function (e) { drag = true; seek.classList.add('drag'); seek.setPointerCapture(e.pointerId); move(e); });
  seek.addEventListener('pointermove', function (e) { var f = at(e); tip.style.left = Math.min(92, Math.max(8, f * 100)) + '%'; tipT.textContent = fmt(f * (v.duration || 0)); thumbAt(f * (v.duration || 0)); if (drag) move(e); });
  seek.addEventListener('pointerup', function (e) { if (drag) { move(e); v.currentTime = at(e) * v.duration; } drag = false; seek.classList.remove('drag'); });
  function move(e) { var f = at(e); fill.style.width = (f * 100) + '%'; knob.style.left = (f * 100) + '%'; tcur.textContent = fmt(f * v.duration); }

  // buttons
  $('.dp-pp').onclick = toggle; $('.dp-big').onclick = toggle;
  $('.dp-back').onclick = function () { skip(-10); };
  $('.dp-fwd').onclick = function () { skip(10); };
  $('.dp-mute').onclick = function () { v.muted = !v.muted; };
  vol.oninput = function () { v.volume = parseFloat(vol.value); v.muted = v.volume === 0; };
  $('.dp-fs').onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else (box.requestFullscreen || box.webkitRequestFullscreen).call(box); };
  var pip = $('.dp-pip'); if (!document.pictureInPictureEnabled) pip.style.display = 'none';
  pip.onclick = function () { if (document.pictureInPictureElement) document.exitPictureInPicture(); else v.requestPictureInPicture().catch(function () {}); };
  $('.dp-cog').onclick = function (e) { e.stopPropagation(); menu.classList.toggle('open'); };
  menu.onclick = function (e) { e.stopPropagation(); };

  // settings menu: speed, fit, stats
  var speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  function drawMenu() {
    var h = '';
    if (hls && hls.levels && hls.levels.length > 1) {
      h += '<h4>Quality</h4><button data-q="-1" class="' + (hls.autoLevelEnabled ? 'on' : '') + '"><span>Auto' + (hls.autoLevelEnabled && hls.currentLevel > -1 && hls.levels[hls.currentLevel] ? ' (' + hls.levels[hls.currentLevel].height + 'p)' : '') + '</span></button>';
      for (var i = hls.levels.length - 1; i >= 0; i--) h += '<button data-q="' + i + '" class="' + (!hls.autoLevelEnabled && hls.currentLevel === i ? 'on' : '') + '"><span>' + hls.levels[i].height + 'p</span></button>';
    }
    if (hls && hls.audioTracks && hls.audioTracks.length > 1) {
      h += '<h4>Audio</h4>';
      hls.audioTracks.forEach(function (t, i) { h += '<button data-au="' + i + '" class="' + (hls.audioTrack === i ? 'on' : '') + '"><span>' + t.name + '</span></button>'; });
    }
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length) {
      h += '<h4>Subtitles</h4><button data-su="-1" class="' + (hls.subtitleTrack === -1 ? 'on' : '') + '"><span>Off</span></button>';
      hls.subtitleTracks.forEach(function (t, i) { h += '<button data-su="' + i + '" class="' + (hls.subtitleTrack === i ? 'on' : '') + '"><span>' + t.name + '</span></button>'; });
    }
    h += '<h4>Speed</h4>';
    speeds.forEach(function (s) { h += '<button data-s="' + s + '" class="' + (v.playbackRate === s ? 'on' : '') + '"><span>' + (s === 1 ? 'Normal' : s + 'x') + '</span></button>'; });
    h += '<h4>View</h4><button data-a="fit"><span>' + (box.classList.contains('fill') ? 'Fit to screen' : 'Fill screen') + '</span></button>';
    h += '<button data-a="stats"><span>Stats for nerds</span></button><button data-a="dl"><span>Download</span></button>';
    menu.innerHTML = h;
  }
  drawMenu();
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q !== undefined && hls) { hls.currentLevel = +b.dataset.q; say(+b.dataset.q < 0 ? 'Quality: Auto' : 'Quality: ' + hls.levels[+b.dataset.q].height + 'p', 1500); }
    if (b.dataset.au !== undefined && hls) { hls.audioTrack = +b.dataset.au; say('Audio: ' + hls.audioTracks[+b.dataset.au].name, 1500); }
    if (b.dataset.su !== undefined && hls) { hls.subtitleTrack = +b.dataset.su; say(+b.dataset.su < 0 ? 'Subtitles off' : 'Subtitles: ' + hls.subtitleTracks[+b.dataset.su].name, 1500); }
    if (b.dataset.s) { v.playbackRate = parseFloat(b.dataset.s); say('Speed ' + b.dataset.s + 'x', 1200); }
    if (b.dataset.a === 'fit') box.classList.toggle('fill');
    if (b.dataset.a === 'stats') stats.classList.toggle('show');
    if (b.dataset.a === 'dl') { window.open(location.origin + '/file/' + box.getAttribute('data-id'), '_blank'); }
    drawMenu(); if (!b.dataset.q) menu.classList.remove('open');
  });

  function paintStats() {
    var q = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : {};
    var buffered = 0; try { var b = v.buffered; if (b.length) buffered = b.end(b.length - 1) - v.currentTime; } catch (e) {}
    stats.innerHTML = 'Resolution: ' + v.videoWidth + 'x' + v.videoHeight + '<br>Buffer: ' + buffered.toFixed(1) + 's<br>Dropped: ' + (q.droppedVideoFrames || 0) + ' / ' + (q.totalVideoFrames || 0) + '<br>Speed: ' + v.playbackRate + 'x' + (hls && hls.currentLevel > -1 && hls.levels[hls.currentLevel] ? '<br>Level: ' + hls.levels[hls.currentLevel].height + 'p @ ' + Math.round(hls.levels[hls.currentLevel].bitrate / 1000) + ' kbps<br>Bandwidth: ' + Math.round((hls.bandwidthEstimate || 0) / 1e6 * 10) / 10 + ' Mbps' : '');
  }

  // gestures: tap = show UI, double tap sides = seek, double tap centre = fullscreen
  var lastTap = 0, tapT;
  function flash(side, txt) { var f = $('.dp-flash.' + side); f.textContent = txt; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  v.addEventListener('click', function (e) {
    var now = Date.now(), r = box.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (now - lastTap < 300) {
      clearTimeout(tapT);
      if (x < 0.35) { skip(-10); flash('l', '-10s'); } else if (x > 0.65) { skip(10); flash('r', '+10s'); } else $('.dp-fs').click();
      lastTap = 0; return;
    }
    lastTap = now;
    tapT = setTimeout(function () { if (e.pointerType === 'touch' && !box.classList.contains('ui')) ui(); else toggle(); }, 300);
  });
  box.addEventListener('mousemove', ui); box.addEventListener('touchstart', ui, { passive: true });
  document.addEventListener('click', function () { menu.classList.remove('open'); });

  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('on') || /INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
    var k = e.key;
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'ArrowRight') { skip(5); flash('r', '+5s'); } else if (k === 'ArrowLeft') { skip(-5); flash('l', '-5s'); }
    else if (k === 'j') skip(-10); else if (k === 'l') skip(10);
    else if (k === 'ArrowUp') { e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); }
    else if (k === 'ArrowDown') { e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); }
    else if (k === 'm') v.muted = !v.muted; else if (k === 'f') $('.dp-fs').click();
    else if (k === 'i') stats.classList.toggle('show');
    else if (k === '>' ) { v.playbackRate = Math.min(2, v.playbackRate + 0.25); say(v.playbackRate + 'x', 1000); }
    else if (k === '<' ) { v.playbackRate = Math.max(0.25, v.playbackRate - 0.25); say(v.playbackRate + 'x', 1000); }
    else if (/^[0-9]$/.test(k) && v.duration) v.currentTime = v.duration * (+k) / 10;
    ui();
  });
  box.classList.add('paused');
})();
`;
