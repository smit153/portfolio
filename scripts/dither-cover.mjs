// Turns a photo into a blog cover in the site's style: black and white, ordered (Bayer) dither in 2px dots.
// Run with `node scripts/dither-cover.mjs <input.png> <slug>`; it writes src/assets/blog/<slug>.png.
// The originals live next to each post in ~/blogs/<slug>/images/cover-original.png.
import fs from 'node:fs';
import sharp from 'sharp';

const [input, slug] = process.argv.slice(2);
if (!input || !slug) throw new Error('usage: node scripts/dither-cover.mjs <input.png> <slug>');

const W = 1280; // output size; the dither is worked out at half that and scaled up, so each dot is 2x2
const H = 720;
const DOT = 2;
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];

const w = W / DOT;
const h = H / DOT;
// greyscale, stretched to the full range, with the shadows lifted a little: these photos are mostly dark,
// and an ordered dither turns dark greys into solid black
const { data } = await sharp(input)
	.resize(w, h, { fit: 'cover' })
	.greyscale()
	.normalise()
	.gamma(1.6)
	.raw()
	.toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(w * h);
for (let y = 0; y < h; y++)
	for (let x = 0; x < w; x++) {
		const v = data[y * w + x] / 255;
		out[y * w + x] = v > (BAYER[(y % 8) * 8 + (x % 8)] + 0.5) / 64 ? 255 : 0;
	}

fs.mkdirSync('src/assets/blog', { recursive: true });
await sharp(out, { raw: { width: w, height: h, channels: 1 } })
	.resize(W, H, { kernel: 'nearest' })
	.png({ palette: true, colours: 2, compressionLevel: 9 })
	.toFile(`src/assets/blog/${slug}.png`);
console.log(`src/assets/blog/${slug}.png`);
