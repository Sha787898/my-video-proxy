// Next.js 16 "proxy" (the old middleware). Put this file in the project root, next to package.json.
//
// Vercel env (both optional; when EMBED_HOST is empty this file does nothing):
//   EMBED_HOST=player.example.com                    <- host only, no https://
//   NEXT_PUBLIC_EMBED_ORIGIN=https://player.example.com
//
// What it does when EMBED_HOST is set:
//  - player host   : serves ONLY /embed/* and the public /file/* download page (everything else is 404), so a hostile ad script that runs
//                    there can never reach the dashboard, login, file manager or any API of the site.
//  - main host     : old /embed/* links are redirected to the player host, and the site refuses to be
//                    framed by other sites (clickjacking).
import { NextResponse } from 'next/server';

export function proxy(request) {
    const embedHost = (process.env.EMBED_HOST || '').trim().toLowerCase();
    if (!embedHost) return NextResponse.next();

    const host = (request.headers.get('host') || '').toLowerCase();
    const { pathname, search } = request.nextUrl;
    const isEmbedPath = pathname === '/embed' || pathname.startsWith('/embed/');
    const isApiPath = pathname === '/api/embed-src'; // the player asks this for the real server URL
    const isFilePath = pathname.startsWith('/file/'); // public download page, safe to show on the player host too

    if (host === embedHost) {
        if (!isEmbedPath && !isFilePath && !isApiPath) return new NextResponse('Not found', { status: 404 });
        const res = NextResponse.next();
        res.headers.set('X-Content-Type-Options', 'nosniff');
        res.headers.set('Referrer-Policy', 'origin');
        res.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return res;
    }

    if (isEmbedPath) {
        return NextResponse.redirect(`https://${embedHost}${pathname}${search}`, 308);
    }

    const res = NextResponse.next();
    res.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
    res.headers.set('X-Content-Type-Options', 'nosniff');
    return res;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
