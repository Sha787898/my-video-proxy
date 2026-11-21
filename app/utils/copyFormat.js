import { mascotSay } from './mascotSay';
// One place that decides what "Copy title / embed / download / all" puts on the clipboard.
//   files: [{ name, size, id }]   links(f) -> { page, embed }
export const COPY_KINDS = [
    ['title', 'Title'],
    ['embed', 'Embed'],
    ['page', 'File'],
    ['titleEmbed', 'Title + Embed'],
    ['all', 'All'],
];

// extra formats for the File Manager "Copy" menu
export const COPY_MORE = [
    ['titleFile', 'Title + Download page'],
    ['iframe', 'Embed iframe code'],
    ['servers', 'All server links'],
    ['markdown', 'Markdown list'],
    ['csv', 'CSV table'],
];

export function buildCopy(kind, files, links) {
    const blocks = files.map((f) => {
        const l = links(f);
        const title = f.name || 'Untitled';
        if (kind === 'titleFile') return `${title}${f.size ? ` [${f.size}]` : ''}\n${l.page}`;
        if (kind === 'iframe') return `<iframe src="${l.embed}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
        if (kind === 'servers') return [title, ...((l.servers || []).map((s) => `${s.name}: ${s.url}`))].join('\n');
        if (kind === 'markdown') return `- [${title}](${l.page})${f.size ? ` (${f.size})` : ''}`;
        if (kind === 'csv') return [title, f.size || '', l.embed, l.page].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',');
        if (kind === 'title') return title;
        if (kind === 'embed') return l.embed;
        if (kind === 'page') return l.page;
        if (kind === 'titleEmbed') return `${title}${f.size ? ` [${f.size}]` : ''}\n${l.embed}`; // Name.mkv [1.17 GB]  +  embed link
        const lines = [title];
        if (f.size) lines.push(`Size: ${f.size}`);
        lines.push(`Embed: ${l.embed}`);
        lines.push(`Download: ${l.page}`);
        return lines.join('\n');
    });
    const head = kind === 'csv' ? '"Title","Size","Embed","Download page"\n' : '';
    return head + blocks.join(kind === 'all' || kind === 'titleEmbed' || kind === 'servers' ? '\n\n' : '\n');
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        mascotSay('wink', 'Copied! 📋', {});
        return true;
    } catch (e) {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e2) {
            return false;
        }
    }
}
