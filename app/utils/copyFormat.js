// One place that decides what "Copy title / embed / download / all" puts on the clipboard.
//   files: [{ name, size, id }]   links(f) -> { page, embed }
export const COPY_KINDS = [
    ['title', 'Title'],
    ['embed', 'Embed'],
    ['page', 'File'],
    ['titleEmbed', 'Title + Embed'],
    ['all', 'All'],
];

export function buildCopy(kind, files, links) {
    const blocks = files.map((f) => {
        const l = links(f);
        const title = f.name || 'Untitled';
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
    return blocks.join(kind === 'all' || kind === 'titleEmbed' ? '\n\n' : '\n');
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
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
