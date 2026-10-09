// Builds the favicons from the header's pixel initials (the `initials` grid in src/lib/pixel-icons.ts): white "SS"
// on the site's ink, always at a whole number of pixels per square so it stays crisp.
// Run with `node scripts/build-favicon.mjs`; it writes public/favicon.svg, favicon.ico (16, 32, 48) and
// apple-touch-icon.png (180).
import fs from 'node:fs';
import sharp from 'sharp';

const INK = [9, 9, 11];
const WHITE = [255, 255, 255];

// read the grid straight out of the TypeScript source, so the favicon can't drift from the logo
const src = fs.readFileSync('src/lib/pixel-icons.ts', 'utf8');
const rows = JSON.parse(src.match(/initials: (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const gw = rows[0].length;
const gh = rows.length;

// a size x size square with the grid at `scale` pixels per square, centred (an odd leftover pixel goes right/bottom)
function png(size, scale) {
	const buf = Buffer.alloc(size * size * 3);
	for (let i = 0; i < size * size; i++) buf.set(INK, i * 3);
	const ox = Math.floor((size - gw * scale) / 2);
	const oy = Math.floor((size - gh * scale) / 2);
	rows.forEach((row, y) =>
		[...row].forEach((c, x) => {
			if (c !== '#') return;
			for (let dy = 0; dy < scale; dy++)
				for (let dx = 0; dx < scale; dx++) buf.set(WHITE, ((oy + y * scale + dy) * size + ox + x * scale + dx) * 3);
		}),
	);
	return sharp(buf, { raw: { width: size, height: size, channels: 3 } }).png({ palette: true }).toBuffer();
}

// an .ico is a small directory of PNGs
function ico(images) {
	const header = Buffer.alloc(6 + images.length * 16);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	let offset = header.length;
	images.forEach(({ size, data }, i) => {
		const e = 6 + i * 16;
		header.writeUInt8(size, e);
		header.writeUInt8(size, e + 1);
		header.writeUInt16LE(1, e + 4);
		header.writeUInt16LE(32, e + 6);
		header.writeUInt32LE(data.length, e + 8);
		header.writeUInt32LE(offset, e + 12);
		offset += data.length;
	});
	return Buffer.concat([header, ...images.map((im) => im.data)]);
}

// the svg: one unit per square on a 15 grid (a square of padding either side, four above and below), corners rounded a little
const d = rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `M${x + 1} ${y + 4}h1v1h-1z` : ''))).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15" shape-rendering="crispEdges"><rect width="15" height="15" rx="2" fill="#09090b"/><path fill="#fff" d="${d}"/></svg>\n`;
fs.writeFileSync('public/favicon.svg', svg);

const sizes = [
	{ size: 16, scale: 1 },
	{ size: 32, scale: 2 },
	{ size: 48, scale: 3 },
];
const images = await Promise.all(sizes.map(async ({ size, scale }) => ({ size, data: await png(size, scale) })));
fs.writeFileSync('public/favicon.ico', ico(images));
fs.writeFileSync('public/apple-touch-icon.png', await png(180, 12));
console.log('wrote public/favicon.svg, favicon.ico, apple-touch-icon.png');
