// Bakes the art the bands' slits look through: still ASCII contours in Söhne Mono, as a seamless tile.
// The bands show it as a fixed background (see src/components/Band.astro), so it's there on the first frame.
// Run with `node scripts/build-band-art.mjs`; it writes src/assets/band-art.png.
import sharp from 'sharp';

const OUT = 'src/assets/band-art.png';
const FONT = 'src/assets/fonts/SohneMono-Buch.woff2';
const PX = 2; // drawn at 2x so it stays sharp on high-density screens
const CELL_W = 12; // css px per character cell, same grid as the footer strip
const CELL_H = 14;
const COLS = 128; // tile = 1536 x 1120 css px
const ROWS = 80;
const RAMP = ['·', ':', '/', '+', '*', '#', '%', '@']; // dim to bright (a cell can also stay empty)
// quiet greys: from the hatch line colour (--color-line) to only a little lighter, so the slits don't pop
const GREY_MIN = 31;
const GREY_MAX = 72;
const CONTOUR = 0.08; // height between contour lines

// The footer strip's terrain, rebuilt from waves that repeat a whole number of times across the tile, so the
// tile wraps with no seam. u and v run 0-1 across the tile; [fx, fy] are cycles per tile.
const TAU = Math.PI * 2;
const s = (fx, fy, u, v, p) => Math.sin(TAU * (fx * u + fy * v) + p);
const c = (fx, fy, u, v, p) => Math.cos(TAU * (fx * u + fy * v) + p);
function wave(u, v, m, p) {
	let a = s(2 * m, 0, u, v, 2.1 + p) * c(0, 1 * m, u, v, 1.4 + p) * 0.5;
	a += 0.25 * s(4 * m, 2 * m, u, v, 1.05 + p);
	a += s(1 * m, 0, u, v, -2.8 + p) * c(0, 1 * m, u, v, 1.75 + p) * 0.6;
	a += 0.3 * s(1 * m, 1 * m, u, v, 2.45 + p);
	a += s(7 * m, 0, u, v, 0.7 + p) * c(0, 5 * m, u, v, -0.84 + p) * 0.15;
	return a;
}
/** brightness 0-1 of the cell at (u, v): the terrain's height, much brighter on its contour lines */
function contours(u, v) {
	const n = wave(u, v, 1, 0) + 0.4 * wave(u, v, 2, 1.3) + 0.15 * wave(u, v, 4, 2.9);
	const h = Math.max(0, Math.min(1, (n + 1.8) / 3.6));
	const t = (h % CONTOUR) / CONTOUR;
	return t < 0.12 || t > 0.88 ? 0.55 + 0.45 * h : 0.45 * h;
}

// each glyph rendered once by Pango from the site's own font file, as an alpha mask
async function glyph(ch) {
	const { data, info } = await sharp({
		text: { text: `<span foreground="white">${ch}</span>`, font: `Söhne Mono ${12 * PX}`, fontfile: FONT, rgba: true, dpi: 72 },
	})
		.raw()
		.toBuffer({ resolveWithObject: true });
	return { w: info.width, h: info.height, alpha: (x, y) => data[(y * info.width + x) * 4 + 3] / 255 };
}
const glyphs = await Promise.all(RAMP.map(glyph));

const W = COLS * CELL_W * PX;
const H = ROWS * CELL_H * PX;
const grey = new Uint8Array(W * H); // black background; glyphs are drawn in grey on it
for (let r = 0; r < ROWS; r++)
	for (let col = 0; col < COLS; col++) {
		const b = contours(col / COLS, r / ROWS);
		const i = Math.floor(b * (RAMP.length + 1)) - 1; // the darkest band of values stays empty
		if (i < 0) continue;
		const g = glyphs[Math.min(RAMP.length - 1, i)];
		const level = GREY_MIN + (GREY_MAX - GREY_MIN) * b;
		// centre the glyph's layout box in its cell
		const x0 = Math.round((col + 0.5) * CELL_W * PX - g.w / 2);
		const y0 = Math.round((r + 0.5) * CELL_H * PX - g.h / 2);
		for (let y = 0; y < g.h; y++)
			for (let x = 0; x < g.w; x++) {
				const a = g.alpha(x, y);
				if (!a) continue;
				// wrap at the tile's edges too, so glyphs straddling the seam stay whole
				const px = (x0 + x + W) % W;
				const py = (y0 + y + H) % H;
				const k = py * W + px;
				grey[k] = Math.max(grey[k], Math.round(level * a));
			}
	}

await sharp(Buffer.from(grey), { raw: { width: W, height: H, channels: 1 } })
	.png({ palette: true, colours: 64, compressionLevel: 9 })
	.toFile(OUT);
console.log(`${OUT}: ${W}x${H} (${W / PX}x${H / PX} css px tile)`);
