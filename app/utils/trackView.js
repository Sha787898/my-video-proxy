// Counts one visit of a public page (embed player or download page). Fire-and-forget; never blocks the page.
// The same browser is counted at most once per file and kind every 30 minutes, so a refresh does not inflate the numbers.
export function trackView(fileId, kind) {
    try {
        if (!fileId || typeof window === 'undefined') return;
        const k = `ms_seen_${kind}_${fileId}`;
        const last = Number(localStorage.getItem(k) || 0);
        if (Date.now() - last < 30 * 60 * 1000) return;
        localStorage.setItem(k, String(Date.now()));
    } catch (e) { /* storage blocked: count it */ }
    try {
        let ref = '';
        try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { /* ignore */ }
        const body = JSON.stringify({ id: fileId, kind, ref });
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/track', new Blob([body], { type: 'text/plain' }));
        } else {
            fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
        }
    } catch (e) { /* ignore */ }
}
