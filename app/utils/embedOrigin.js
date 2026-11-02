// Optional separate (sub)domain that serves ONLY the player pages (/embed/...).
// Set NEXT_PUBLIC_EMBED_ORIGIN=https://player.example.com in Vercel to turn it on.
// Not set -> everything keeps using the main site's own origin (nothing changes).
export const EMBED_ORIGIN = (process.env.NEXT_PUBLIC_EMBED_ORIGIN || '').trim().replace(/\/+$/, '');
export const embedBase = (fallbackOrigin) => EMBED_ORIGIN || fallbackOrigin || '';