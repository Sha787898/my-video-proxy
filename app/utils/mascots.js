// The mascot characters: plain data, so the admin page, the download page and the mascot itself can share it.
// Every character is drawn in code (SVG), so there are no image files to upload.
export const GIRLS = [
    // grown-up characters (20+): tall, slim, elegant
    { id: 'aria', name: 'Aria', adult: true, style: 'long', top: 'blouse', acc: 'clip', skin: '#ffe9dc', hair: '#e7e9f6', hairDark: '#a9b0d4', eye: '#2f8fe8', outfit: '#fbfbff', outfitDark: '#cfd4ea', skirt: '#26316b', accent: '#e5384f', shoe: '#1b2150' },
    { id: 'rena', name: 'Rena', adult: true, style: 'wave', top: 'dress', acc: 'pins', skin: '#fde2d0', hair: '#8a2346', hairDark: '#4d1226', eye: '#e0a030', outfit: '#1d1d25', outfitDark: '#0f0f14', skirt: '#1d1d25', accent: '#e5383b', shoe: '#0f0f14' },
    { id: 'mio', name: 'Mio', adult: true, style: 'pony', top: 'sweater', acc: 'bow', skin: '#fbdcc8', hair: '#c47a52', hairDark: '#7e4328', eye: '#2fa36b', outfit: '#f6ead7', outfitDark: '#e0cfb2', skirt: '#3d5a80', accent: '#f78fb8', shoe: '#5a3a2a' },
    { id: 'yuki', name: 'Yuki', style: 'long', acc: 'ribbon', top: 'uniform', skin: '#ffeade', hair: '#eef0fa', hairDark: '#aeb6d6', eye: '#2f8fe8', outfit: '#25306b', outfitDark: '#171f4d', accent: '#8fc4ff' },
    { id: 'mika', name: 'Mika', style: 'twin', acc: 'cat', top: 'hoodie', skin: '#ffe3d1', hair: '#e5383b', hairDark: '#b3262e', eye: '#7a1f2b', outfit: '#2a2a31', outfitDark: '#17171b', accent: '#ff6b73' },
    { id: 'luna', name: 'Luna', style: 'bob', acc: 'star', top: 'sweater', skin: '#ffe6d6', hair: '#d9dbea', hairDark: '#a9adc9', eye: '#7c5cf0', outfit: '#2c3a6b', outfitDark: '#1d2750', accent: '#ffd166' },
    { id: 'sora', name: 'Sora', style: 'long', acc: 'phones', top: 'jacket', skin: '#fde0cc', hair: '#4f9cf5', hairDark: '#2f6fc9', eye: '#1f6f8b', outfit: '#f2f4f8', outfitDark: '#cdd3df', accent: '#22c5b0' },
    { id: 'hana', name: 'Hana', style: 'bun', acc: 'bow', top: 'dress', skin: '#ffe4d4', hair: '#f78fb8', hairDark: '#d4608f', eye: '#8a3d63', outfit: '#fff1dc', outfitDark: '#f3d9b5', accent: '#e5383b' },
    { id: 'rin', name: 'Rin', style: 'pony', acc: 'glasses', top: 'tee', skin: '#f9d9c2', hair: '#2fbf71', hairDark: '#1f8f53', eye: '#b8791c', outfit: '#1c1c20', outfitDark: '#0e0e11', accent: '#2fbf71' },
];

// ---- your own sticker characters (optional) ----
// Put a file (.webm with transparency, .webp, .png or .gif) into the folder  public/mascots/  and add one line here:
//   { id: 'my1', name: 'My sticker', src: '/mascots/my1.webm' },
// It then shows up in the Mascot picker (admin page, download page menu and the mascot's own swap button) next to the drawn
// characters. Use only artwork you made or have the right to use: a public site showing someone else's characters can be taken down.
export const STICKERS = [
];
export const MASCOTS = [...GIRLS, ...STICKERS];
export const MASCOT_IDS = MASCOTS.map((m) => m.id);
export const mascotById = (id) => MASCOTS.find((m) => m.id === id) || MASCOTS[0];
