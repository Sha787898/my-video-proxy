'use client';

import { useEffect, useRef } from 'react';

// ==========================================================================
// 3D background scenes (plain canvas 2D + own perspective maths, no libraries) and the animated brand mark.
//   <Bg3D kind="grid|cubes|warp|globe|aurora|none" rgb="229,56,59" animate />
//   <BrandMark name="MultiServer" anim="shine|flip|tilt|glow|glitch|none" />
// Colours come from the `rgb` prop ("r,g,b"), so a theme change recolours the scene.
// ==========================================================================

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeScene(kind, ctx, W, H, col) {
    const [R, G, B] = col;
    const rgba = (a) => `rgba(${R},${G},${B},${a})`;
    const small = Math.min(W, H) < 560;

    // ---------- grid: synthwave floor + sun glow + stars ----------
    if (kind === 'grid') {
        const stars = Array.from({ length: small ? 40 : 90 }, () => ({ x: Math.random(), y: Math.random() * 0.45, p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.2 }));
        return (t, m) => {
            const hz = H * 0.46 + m.y * 8;
            const vx = W / 2 + m.x * 36;
            const g = ctx.createRadialGradient(vx, hz, 0, vx, hz, Math.max(W, H) * 0.7);
            g.addColorStop(0, rgba(0.32));
            g.addColorStop(0.35, rgba(0.1));
            g.addColorStop(1, rgba(0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            // stars
            stars.forEach((s) => {
                const a = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.8 + s.p));
                ctx.fillStyle = `rgba(255,255,255,${a * 0.7})`;
                ctx.fillRect(s.x * W + m.x * 6 * s.s, s.y * H, s.s, s.s);
            });
            // sun
            ctx.fillStyle = rgba(0.16);
            ctx.beginPath();
            ctx.arc(vx, hz, Math.min(W, H) * 0.11, Math.PI, 0);
            ctx.fill();
            // floor
            ctx.lineWidth = 1;
            const rows = 16;
            for (let k = 0; k < rows; k++) {
                const z = (k + ((t * 0.55) % 1)) / rows;
                const y = hz + (H - hz) * Math.pow(z, 2.3);
                ctx.strokeStyle = rgba(0.06 + z * 0.4);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }
            const cols = 15;
            for (let i = -cols; i <= cols; i++) {
                ctx.strokeStyle = rgba(0.22);
                ctx.beginPath();
                ctx.moveTo(vx + i * 6, hz);
                ctx.lineTo(vx + i * W * 0.1, H);
                ctx.stroke();
            }
            // horizon line
            ctx.strokeStyle = rgba(0.55);
            ctx.beginPath();
            ctx.moveTo(0, hz);
            ctx.lineTo(W, hz);
            ctx.stroke();
        };
    }

    // ---------- cubes: floating wireframe cubes ----------
    if (kind === 'cubes') {
        const N = small ? 9 : 16;
        const cubes = Array.from({ length: N }, () => ({
            x: (Math.random() - 0.5) * 3.2, y: (Math.random() - 0.5) * 2.4, z: 1.1 + Math.random() * 2.4,
            s: 0.07 + Math.random() * 0.14, ax: Math.random() * 6.28, ay: Math.random() * 6.28,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, up: 0.05 + Math.random() * 0.07,
        }));
        const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        const f = Math.min(W, H) * 1.05;
        let last = 0;
        return (t, m) => {
            const dt = clamp(t - last, 0, 0.05);
            last = t;
            cubes.forEach((c) => {
                c.ax += c.vx * dt;
                c.ay += c.vy * dt;
                c.y -= c.up * dt;
                if (c.y < -1.5) c.y = 1.5;
            });
            const order = [...cubes].sort((a, b) => b.z - a.z);
            order.forEach((c) => {
                const cx = Math.cos(c.ax), sx = Math.sin(c.ax), cy = Math.cos(c.ay), sy = Math.sin(c.ay);
                const pts = V.map(([x, y, z]) => {
                    let X = x * c.s, Y = y * c.s, Z = z * c.s;
                    let t1 = Y * cx - Z * sx; Z = Y * sx + Z * cx; Y = t1;
                    t1 = X * cy + Z * sy; Z = -X * sy + Z * cy; X = t1;
                    const zz = c.z + Z;
                    const k = f / zz;
                    return [W / 2 + (c.x + X - m.x * 0.12 * c.z) * k, H / 2 + (c.y + Y - m.y * 0.08 * c.z) * k];
                });
                const depth = clamp(1.2 - c.z / 3.2, 0.15, 1);
                ctx.strokeStyle = rgba(0.12 + depth * 0.55);
                ctx.lineWidth = 0.6 + depth * 1.2;
                ctx.beginPath();
                E.forEach(([a, b]) => { ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); });
                ctx.stroke();
            });
        };
    }

    // ---------- warp: 3D star tunnel ----------
    if (kind === 'warp') {
        const N = small ? 190 : 420;
        const mk = (s) => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: s ? Math.random() : 1, w: Math.random() < 0.25 });
        const stars = Array.from({ length: N }, () => mk(true));
        const f = Math.max(W, H) * 0.6;
        let last = 0;
        return (t, m) => {
            const dt = clamp(t - last, 0, 0.05);
            last = t;
            const sp = 0.22 + 0.1 * Math.sin(t * 0.4);
            ctx.lineCap = 'round';
            stars.forEach((s) => {
                const pz = s.z;
                s.z -= sp * dt;
                if (s.z <= 0.02) { Object.assign(s, mk(false)); return; }
                const x1 = W / 2 + (s.x - m.x * 0.1) * f / pz, y1 = H / 2 + (s.y - m.y * 0.1) * f / pz;
                const x2 = W / 2 + (s.x - m.x * 0.1) * f / s.z, y2 = H / 2 + (s.y - m.y * 0.1) * f / s.z;
                if (x2 < -50 || x2 > W + 50 || y2 < -50 || y2 > H + 50) { Object.assign(s, mk(false)); return; }
                const a = clamp(1 - s.z, 0.05, 1);
                ctx.strokeStyle = s.w ? `rgba(255,255,255,${a * 0.8})` : rgba(a * 0.9);
                ctx.lineWidth = 0.5 + a * 1.6;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
        };
    }

    // ---------- globe: rotating dotted sphere + orbit rings + satellites ----------
    if (kind === 'globe') {
        const N = small ? 260 : 520;
        const pts = Array.from({ length: N }, (_, i) => {
            const y = 1 - (i / (N - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const th = i * 2.399963;
            return [Math.cos(th) * r, y, Math.sin(th) * r];
        });
        const rings = [{ tilt: 0.5, r: 1.35, sp: 0.5 }, { tilt: -0.9, r: 1.6, sp: -0.35 }, { tilt: 1.2, r: 1.2, sp: 0.7 }];
        return (t, m) => {
            const cx = W * 0.5, cy = H * 0.46;
            const R0 = Math.min(W, H) * (small ? 0.3 : 0.34);
            const ry = t * 0.18 + m.x * 0.5, rx = 0.38 + m.y * 0.25;
            const cyaw = Math.cos(ry), syaw = Math.sin(ry), cp = Math.cos(rx), sp2 = Math.sin(rx);
            const g = ctx.createRadialGradient(cx, cy, R0 * 0.2, cx, cy, R0 * 1.9);
            g.addColorStop(0, rgba(0.2));
            g.addColorStop(1, rgba(0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            const proj = (x, y, z) => {
                let X = x * cyaw + z * syaw, Z = -x * syaw + z * cyaw, Y = y;
                const Y2 = Y * cp - Z * sp2; Z = Y * sp2 + Z * cp; Y = Y2;
                const k = 3.2 / (3.2 + Z * 0.55);
                return [cx + X * R0 * k, cy + Y * R0 * k, Z];
            };
            // back half of the rings, sphere dots, front half of the rings
            const ringPts = (rg, ph) => {
                const out = [];
                for (let a = 0; a < 64; a++) {
                    const th = (a / 64) * 6.2832;
                    let x = Math.cos(th) * rg.r, z = Math.sin(th) * rg.r, y = 0;
                    const yy = y * Math.cos(rg.tilt) - z * Math.sin(rg.tilt); z = y * Math.sin(rg.tilt) + z * Math.cos(rg.tilt); y = yy;
                    out.push(proj(x, y, z));
                }
                return out;
            };
            const drawRing = (rg, front) => {
                const p = ringPts(rg);
                ctx.strokeStyle = rgba(front ? 0.5 : 0.16);
                ctx.lineWidth = 1;
                ctx.beginPath();
                let pen = false;
                for (let i = 0; i <= 64; i++) {
                    const q = p[i % 64];
                    const isFront = q[2] > 0;
                    if (isFront === front) { if (!pen) { ctx.moveTo(q[0], q[1]); pen = true; } else ctx.lineTo(q[0], q[1]); } else pen = false;
                }
                ctx.stroke();
            };
            rings.forEach((rg) => drawRing(rg, false));
            pts.forEach(([x, y, z]) => {
                const [px, py, pz] = proj(x, y, z);
                const a = clamp(0.5 + pz * 0.5, 0.08, 1);
                ctx.fillStyle = rgba(a * 0.85);
                ctx.fillRect(px - 0.9, py - 0.9, 1.8, 1.8);
            });
            rings.forEach((rg) => drawRing(rg, true));
            rings.forEach((rg) => {
                const th = t * rg.sp;
                let x = Math.cos(th) * rg.r, z = Math.sin(th) * rg.r, y = 0;
                const yy = y * Math.cos(rg.tilt) - z * Math.sin(rg.tilt); z = y * Math.sin(rg.tilt) + z * Math.cos(rg.tilt); y = yy;
                const [px, py, pz] = proj(x, y, z);
                ctx.fillStyle = `rgba(255,255,255,${pz > 0 ? 0.95 : 0.4})`;
                ctx.beginPath();
                ctx.arc(px, py, pz > 0 ? 3 : 2, 0, 6.2832);
                ctx.fill();
                ctx.fillStyle = rgba(0.25);
                ctx.beginPath();
                ctx.arc(px, py, 8, 0, 6.2832);
                ctx.fill();
            });
        };
    }

    // ---------- terrain: rolling wireframe mountains (hidden-line ridges) ----------
    if (kind === 'terrain') {
        const NX = small ? 26 : 40, NZ = small ? 16 : 24;
        const zn = 0.35, zf = 4.4, dz = (zf - zn) / NZ;
        const hgt = (x, z) => 0.3 * Math.sin(x * 1.2 + z * 0.9) + 0.17 * Math.sin(x * 2.6 - z * 1.6 + 1.3) + 0.1 * Math.sin(z * 3.1 + x * 0.7);
        return (t, m) => {
            const hz = H * 0.36 + m.y * 10;
            const f = H * 0.78;
            const cam = t * 0.5;
            const g = ctx.createRadialGradient(W / 2, hz, 0, W / 2, hz, Math.max(W, H) * 0.65);
            g.addColorStop(0, rgba(0.3));
            g.addColorStop(1, rgba(0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
            const n0 = Math.ceil((cam + zn) / dz);
            ctx.lineJoin = 'round';
            for (let k = NZ; k >= 0; k--) {
                const n = n0 + k;
                const z = n * dz - cam;
                if (z < zn * 0.6) continue;
                const pts = [];
                for (let i = 0; i <= NX; i++) {
                    const x = (i / NX - 0.5) * 7;
                    const y = hgt(x, n * dz) * (0.55 + 0.45 * Math.min(1, Math.abs(x) / 1.4)); // calmer valley in the middle
                    pts.push([W / 2 + (x - m.x * 0.5) * f / z, hz + (0.62 - y) * f / z]);
                }
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i <= NX; i++) ctx.lineTo(pts[i][0], pts[i][1]);
                ctx.lineTo(W + 20, H + 20);
                ctx.lineTo(-20, H + 20);
                ctx.closePath();
                ctx.fillStyle = 'rgba(8,12,20,0.96)';
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(pts[0][0], pts[0][1]);
                for (let i = 1; i <= NX; i++) ctx.lineTo(pts[i][0], pts[i][1]);
                ctx.strokeStyle = rgba(clamp(1.05 - z / zf, 0.08, 1) * 0.85);
                ctx.lineWidth = clamp(1.8 / z, 0.6, 2);
                ctx.stroke();
            }
        };
    }

    // ---------- helix: double helix with rungs ----------
    if (kind === 'helix') {
        const N = small ? 46 : 74;
        const D = Math.max(W, H) * 1.2;
        const drawHelix = (cx, cy, R, len, t, lean, phase, m) => {
            const cl = Math.cos(lean), sl = Math.sin(lean);
            const tilt = 0.5 + m.y * 0.3, ct = Math.cos(tilt), st = Math.sin(tilt);
            const strands = [[], []];
            for (let i = 0; i < N; i++) {
                const u = i / (N - 1);
                const y0 = (u - 0.5) * len;
                const ang = u * 11 + t * 0.9 + phase;
                for (let s2 = 0; s2 < 2; s2++) {
                    const a = ang + s2 * Math.PI;
                    let x = Math.cos(a) * R, y = y0, z = Math.sin(a) * R;
                    const xr = x * cl - y * sl; const yr = x * sl + y * cl; x = xr; y = yr;
                    const yt = y * ct - z * st; z = y * st + z * ct; y = yt;
                    const k = D / (D - z);
                    strands[s2].push([cx + x * k, cy + y * k, z / R, k]);
                }
            }
            for (let i = 0; i < N; i += 3) {
                const a = strands[0][i], b = strands[1][i];
                ctx.strokeStyle = rgba(0.18 + 0.2 * clamp((a[2] + b[2]) / 2 + 0.5, 0, 1));
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(a[0], a[1]);
                ctx.lineTo(b[0], b[1]);
                ctx.stroke();
            }
            strands.forEach((st2, si) => {
                ctx.strokeStyle = rgba(si ? 0.5 : 0.75);
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                st2.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
                ctx.stroke();
                st2.forEach((p, i) => {
                    if (i % 2) return;
                    const a = clamp(0.45 + p[2] * 0.5, 0.15, 1);
                    ctx.fillStyle = si ? rgba(a) : `rgba(255,255,255,${a * 0.9})`;
                    ctx.beginPath();
                    ctx.arc(p[0], p[1], 2.2 * p[3], 0, 6.2832);
                    ctx.fill();
                });
            });
        };
        return (t, m) => {
            const R = Math.min(W, H) * 0.13;
            const len = H * 1.15;
            if (small) drawHelix(W / 2, H / 2, R, len, t, 0.45 + m.x * 0.15, 0, m);
            else {
                drawHelix(W * 0.22, H / 2, R, len, t, 0.4 + m.x * 0.12, 0, m);
                drawHelix(W * 0.78, H / 2, R, len, t, -0.4 + m.x * 0.12, 2, m);
            }
        };
    }

    // ---------- tunnel: twisting square tunnel you fly through ----------
    if (kind === 'tunnel') {
        const NF = small ? 14 : 22;
        const zmin = 0.25, zmax = 5;
        const f = Math.min(W, H) * 0.55;
        const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        return (t, m) => {
            const frames = [];
            for (let k = 0; k < NF; k++) {
                const u = (((k / NF) - t * 0.09) % 1 + 1) % 1;
                const z = zmin + u * u * (zmax - zmin);
                const ang = z * 0.5 + t * 0.22 + m.x * 0.35;
                const ca = Math.cos(ang), sa = Math.sin(ang);
                const cx = W / 2 + (m.x * 60) / (z + 0.5), cy = H / 2 + (m.y * 40) / (z + 0.5);
                frames.push({
                    z, pts: C.map(([x, y]) => [cx + (x * ca - y * sa) * f / z, cy + (x * sa + y * ca) * f / z]),
                });
            }
            frames.sort((a, b) => b.z - a.z);
            ctx.lineJoin = 'round';
            for (let i = 0; i < frames.length; i++) {
                const fr = frames[i];
                const a = clamp(1 - fr.z / zmax, 0, 1);
                if (i > 0) {
                    const pv = frames[i - 1];
                    ctx.strokeStyle = rgba(0.06 + a * 0.2);
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    for (let c = 0; c < 4; c++) { ctx.moveTo(pv.pts[c][0], pv.pts[c][1]); ctx.lineTo(fr.pts[c][0], fr.pts[c][1]); }
                    ctx.stroke();
                }
                ctx.strokeStyle = rgba(0.12 + a * 0.75);
                ctx.lineWidth = clamp(2.4 / fr.z, 0.6, 3.2);
                ctx.beginPath();
                fr.pts.forEach((p, c) => { if (c) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
                ctx.closePath();
                ctx.stroke();
            }
        };
    }

    // ---------- aurora: soft moving light blobs ----------
    const blobs = [
        { sx: 0.13, sy: 0.17, ox: 0.3, oy: 0.35, r: 0.5, a: 0.3, c: [R, G, B] },
        { sx: 0.19, sy: 0.11, ox: 0.7, oy: 0.3, r: 0.42, a: 0.2, c: [Math.min(255, R + 70), Math.min(255, G + 70), Math.min(255, B + 70)] },
        { sx: 0.1, sy: 0.22, ox: 0.5, oy: 0.75, r: 0.55, a: 0.22, c: [R, G, B] },
        { sx: 0.24, sy: 0.14, ox: 0.2, oy: 0.8, r: 0.36, a: 0.16, c: [255, 255, 255] },
    ];
    return (t, m) => {
        ctx.globalCompositeOperation = 'lighter';
        blobs.forEach((b, i) => {
            const x = (b.ox + Math.sin(t * b.sx * 3 + i) * 0.22 + m.x * 0.03 * (i + 1)) * W;
            const y = (b.oy + Math.cos(t * b.sy * 3 + i * 2) * 0.2 + m.y * 0.03 * (i + 1)) * H;
            const r = b.r * Math.max(W, H) * 0.7;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.a * 0.6})`);
            g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        });
        ctx.globalCompositeOperation = 'source-over';
    };
}

export const BG_KINDS = ['grid', 'cubes', 'warp', 'globe', 'aurora', 'terrain', 'helix', 'tunnel'];

export function Bg3D({ kind = 'grid', rgb = '229,56,59', animate = true, contained = false }) {
    const ref = useRef(null);

    useEffect(() => {
        const cv = ref.current;
        if (!cv || !BG_KINDS.includes(kind)) return undefined;
        const ctx = cv.getContext('2d');
        if (!ctx) return undefined;
        const col = String(rgb).split(',').map((n) => clamp(parseInt(n, 10) || 0, 0, 255));
        if (col.length !== 3) col.splice(0, col.length, 229, 56, 59);

        let W = 0, H = 0, raf = 0, draw = null, running = true;
        const m = { x: 0, y: 0, tx: 0, ty: 0 };
        const reduce = !animate || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const start = performance.now();

        const setup = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = cv.clientWidth;
            H = cv.clientHeight;
            if (!W || !H) return;
            cv.width = Math.round(W * dpr);
            cv.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw = makeScene(kind, ctx, W, H, col);
            frame(reduce ? 4 : (performance.now() - start) / 1000);
        };

        const frame = (t) => {
            if (!draw) return;
            m.x += (m.tx - m.x) * 0.06;
            m.y += (m.ty - m.y) * 0.06;
            ctx.clearRect(0, 0, W, H);
            draw(t, m);
        };

        const loop = () => {
            if (!running) return;
            frame((performance.now() - start) / 1000);
            raf = requestAnimationFrame(loop);
        };

        const onMove = (e) => {
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            m.tx = (x / (window.innerWidth || 1)) * 2 - 1;
            m.ty = (y / (window.innerHeight || 1)) * 2 - 1;
        };
        const onVis = () => {
            if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!reduce && !running) { running = true; loop(); }
        };

        setup();
        let ro;
        if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(setup); ro.observe(cv); } else window.addEventListener('resize', setup);
        if (!reduce) {
            window.addEventListener('pointermove', onMove, { passive: true });
            document.addEventListener('visibilitychange', onVis);
            loop();
        }
        return () => {
            running = false;
            cancelAnimationFrame(raf);
            if (ro) ro.disconnect(); else window.removeEventListener('resize', setup);
            window.removeEventListener('pointermove', onMove);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [kind, rgb, animate]);

    if (!BG_KINDS.includes(kind)) return null;
    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            style={{ position: contained ? 'absolute' : 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block' }}
        />
    );
}

export const BRAND_ANIMS = ['shine', 'flip', 'tilt', 'glow', 'glitch'];

const BRAND_CSS = `
.b3 { display: inline-flex; align-items: center; gap: 12px; max-width: 100%; padding: 3px 0; }
.b3-stage { display: block; perspective: 360px; flex-shrink: 0; }
.b3-cube { --s: 30px; display: block; position: relative; width: var(--s); height: var(--s); transform-style: preserve-3d; animation: b3-spin 10s linear infinite; }
.b3-cube i { position: absolute; top: 0; left: 0; width: var(--s); height: var(--s); display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 11px; font-weight: 900; color: #fff; letter-spacing: .02em; border: 1.5px solid rgba(var(--ac-rgb, 229,56,59), .95); background: rgba(var(--ac-rgb, 229,56,59), .18); box-shadow: inset 0 0 12px rgba(var(--ac-rgb, 229,56,59), .45); }
.b3-cube i:nth-child(1) { transform: translateZ(calc(var(--s) / 2)); }
.b3-cube i:nth-child(2) { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
.b3-cube i:nth-child(3) { transform: rotateY(90deg) translateZ(calc(var(--s) / 2)); }
.b3-cube i:nth-child(4) { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
.b3-cube i:nth-child(5) { transform: rotateX(90deg) translateZ(calc(var(--s) / 2)); }
.b3-cube i:nth-child(6) { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }
@keyframes b3-spin { from { transform: rotateX(-24deg) rotateY(0deg); } to { transform: rotateX(-24deg) rotateY(360deg); } }
.b3-name { position: relative; display: inline-block; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; color: #fff; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.b3-a-shine { background: linear-gradient(100deg, #fff 0%, #fff 38%, var(--ac-hi, #ff6b73) 50%, #fff 62%, #fff 100%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: b3-shine 3.2s linear infinite; }
@keyframes b3-shine { from { background-position: 150% 0; } to { background-position: -100% 0; } }
.b3-a-glow { text-shadow: 0 0 8px rgba(var(--ac-rgb, 229,56,59), .9), 0 0 22px rgba(var(--ac-rgb, 229,56,59), .6); animation: b3-glow 2.2s ease-in-out infinite; }
@keyframes b3-glow { 50% { text-shadow: 0 0 3px rgba(var(--ac-rgb, 229,56,59), .5), 0 0 8px rgba(var(--ac-rgb, 229,56,59), .25); } }
.b3-a-tilt { overflow: visible; transform-origin: 50% 50%; animation: b3-tilt 4.5s ease-in-out infinite; text-shadow: 0 6px 18px rgba(var(--ac-rgb, 229,56,59), .55); }
@keyframes b3-tilt { 0%, 100% { transform: perspective(500px) rotateY(-24deg) rotateX(6deg); } 50% { transform: perspective(500px) rotateY(24deg) rotateX(-6deg); } }
.b3-a-flip { overflow: visible; }
.b3-a-flip .ch { display: inline-block; transform-origin: 50% 60%; animation: b3-flip 3.6s ease-in-out infinite; animation-delay: calc(var(--n) * 70ms); }
@keyframes b3-flip { 0%, 60%, 100% { transform: perspective(300px) rotateX(0); } 75% { transform: perspective(300px) rotateX(-180deg); color: var(--ac-tint, #ffc2c4); } 90% { transform: perspective(300px) rotateX(-360deg); } }
.b3-a-glitch::before, .b3-a-glitch::after { content: attr(data-text); position: absolute; top: 0; left: 0; width: 100%; overflow: hidden; }
.b3-a-glitch::before { color: var(--ac-hi, #ff6b73); animation: b3-g1 2.6s infinite steps(1); clip-path: inset(0 0 55% 0); }
.b3-a-glitch::after { color: #5eead4; animation: b3-g2 2.6s infinite steps(1); clip-path: inset(55% 0 0 0); }
@keyframes b3-g1 { 0%, 88%, 100% { transform: none; opacity: 0; } 90% { transform: translate(-3px, 0); opacity: .9; } 94% { transform: translate(3px, 0); opacity: .9; } 97% { transform: translate(-2px, 0); opacity: .9; } }
@keyframes b3-g2 { 0%, 88%, 100% { transform: none; opacity: 0; } 91% { transform: translate(3px, 0); opacity: .9; } 95% { transform: translate(-3px, 0); opacity: .9; } 98% { transform: translate(2px, 0); opacity: .9; } }
.b3-still .b3-cube, .b3-still .b3-name, .b3-still .b3-a-flip .ch, .b3-still .b3-a-glitch::before, .b3-still .b3-a-glitch::after { animation: none !important; }
.b3-still .b3-cube { transform: rotateX(-24deg) rotateY(35deg); }
@media (prefers-reduced-motion: reduce) { .b3-cube, .b3-name, .b3-a-flip .ch, .b3-a-glitch::before, .b3-a-glitch::after { animation: none !important; } }
`;

export function BrandMark({ name = 'MultiServer', anim = 'shine', animate = true, size = 30, fontSize = 15, mark = 'MS' }) {
    const a = BRAND_ANIMS.includes(anim) ? anim : 'none';
    const text = String(name || 'MultiServer');
    return (
        <span className={`b3 ${animate ? '' : 'b3-still'}`}>
            <style>{BRAND_CSS}</style>
            <span className="b3-stage" aria-hidden="true" style={{ width: size, height: size }}>
                <span className="b3-cube" style={{ '--s': `${size}px` }}>
                    <i>{mark}</i><i>{mark}</i><i /><i /><i /><i />
                </span>
            </span>
            <span className={`b3-name b3-a-${a}`} data-text={text} style={{ fontSize }} aria-label={text}>
                {a === 'flip'
                    ? Array.from(text).map((ch, i) => <span key={i} className="ch" style={{ '--n': i }}>{ch === ' ' ? ' ' : ch}</span>)
                    : text}
            </span>
        </span>
    );
}
