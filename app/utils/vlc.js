// Hand a video link to the VLC app (it lists every audio track and subtitle of the file).
//   Android : opens VLC straight away          iPhone / iPad : opens VLC straight away
//   computer: downloads a tiny .m3u playlist, opening it starts VLC
// Returns a short text the caller can show ("" when the app was opened directly).
export function openInVlc(url, name) {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    const title = String(name || 'video').replace(/\.[a-z0-9]{1,4}$/i, '').slice(0, 60) || 'video';
    if (/Android/i.test(ua)) {
        const https = /^https:/i.test(url);
        window.location.href = `intent:${url.replace(/^https?:\/\//i, '//')}#Intent;scheme=${https ? 'https' : 'http'};package=org.videolan.vlc;type=video/*;end`;
        return '';
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
        window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`;
        return '';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`#EXTM3U\n#EXTINF:-1,${title.replace(/[\r\n]/g, ' ')}\n${url}\n`], { type: 'audio/x-mpegurl' }));
    a.download = `${title.replace(/[^\w .-]+/g, '_')}.m3u`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'Open the downloaded .m3u file with VLC.';
}

export const VLC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ff8800" d="M12 2.5c-.7 0-1.2.4-1.5 1.1L6.2 17.2h11.6L13.5 3.6c-.3-.7-.8-1.1-1.5-1.1z"/><path fill="#fff" d="M9.3 11.4h5.4l.9 2.9H8.4zM7.4 15.2h9.2l.8 2.4H6.6z" opacity=".95"/><path fill="#ff8800" d="M4.5 18.4c0-.5.4-.9.9-.9h13.2c.5 0 .9.4.9.9v.9c0 1.1-.9 2-2 2H6.5c-1.1 0-2-.9-2-2z"/></svg>';
