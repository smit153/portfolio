// Packs the PixelLab cat frames into one greyscale sprite sheet.
// The source frames live in the git-ignored portfolio/pixellab folder (pass another path as the first argument).
// Run with `node scripts/build-cat-sprite.mjs`; it writes src/assets/cat/{cat.png,cat.json}.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2] ?? 'portfolio/pixellab';
const OUT = 'src/assets/cat';

const dir = (d) =>
	fs
		.readdirSync(path.join(SRC, d))
		.sort()
		.map((f) => path.join(d, f));

// Only animations whose frames hold steady made it in: PixelLab's template output for sitting, licking,
// stretching, running and standing up redraws the cat a little differently every frame, which flickers.
// Walking, sitting (a loaf) and sleeping are side views facing right (flipped in code for left); idle and being
// held face the screen. The loaf was edited from the side-view rotation and the sleep pose from the loaf.
const ANIMS = {
	walk: dir('anim/walk-8-frames'),
	idle: dir('anim/idle-front'),
	sit: ['loaf/loaf-a.png'], // paws tucked, head up
	sleep: ['sleep/curl-c.png'], // the same loaf with its head down on its paws, eyes closed
	// picked up under the front legs, arms up, struggling: the base pose, then each hind leg kicking in turn (made below)
	held: ['held/armpit-1.png', 'struggle:left', 'held/armpit-1.png', 'struggle:right'],
};

// Struggle frames are cut from the held pose rather than generated, so the head and body stay pixel-identical
// and only the hind legs and tail move. Ranges are measured from armpit-1.png; the tail curls one column further
// right at its tip, so it's two boxes (the upper one stops short of the right leg's outline).
const STRUGGLE = {
	src: 'held/armpit-1.png',
	legs: { left: [35, 42], right: [49, 56], rows: [62, 73] },
	tail: [
		{ cols: [43, 48], rows: [62, 73] },
		{ cols: [43, 49], rows: [74, 79] },
	],
};
async function struggleFrame(side) {
	const { data, info } = await sharp(path.join(SRC, STRUGGLE.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const out = Buffer.from(data);
	const at = (x, y) => (y * info.width + x) * 4;
	// shift pixels in a box by dx/dy: clear the box, then paste only its opaque pixels at the offset.
	// `stretch` skips the clear, so the part grows by the offset instead of leaving a gap behind it.
	const move = ([x0, x1], [y0, y1], dx, dy, stretch = false) => {
		if (!stretch) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out[at(x, y) + 3] = 0;
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const s = at(x, y);
				if (data[s + 3] < 20) continue;
				data.copy(out, at(x + dx, y + dy), s, s + 4);
			}
	};
	const [up, down] = side === 'left' ? [STRUGGLE.legs.left, STRUGGLE.legs.right] : [STRUGGLE.legs.right, STRUGGLE.legs.left];
	for (const t of STRUGGLE.tail) move(t.cols, t.rows, side === 'left' ? -2 : 2, 0); // tail flicks into the space the kick leaves
	move(down, STRUGGLE.legs.rows, 0, 1, true); // the other leg hangs a little lower
	move(up, STRUGGLE.legs.rows, 0, -4); // kicking leg pulls up (and looks bent)
	return sharp(out, { raw: info }).png().toBuffer();
}

const source = async (file) => (file.startsWith('struggle:') ? struggleFrame(file.slice(9)) : path.join(SRC, file));
const grey = async (file) => sharp(await source(file)).ensureAlpha().greyscale().toColourspace('b-w');

// bounding box of opaque pixels
async function bounds(file) {
	const { data, info } = await sharp(await source(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const b = { x0: info.width, y0: info.height, x1: 0, y1: 0 };
	for (let y = 0; y < info.height; y++)
		for (let x = 0; x < info.width; x++)
			if (data[(y * info.width + x) * 4 + 3] > 20) {
				b.x0 = Math.min(b.x0, x);
				b.y0 = Math.min(b.y0, y);
				b.x1 = Math.max(b.x1, x + 1);
				b.y1 = Math.max(b.y1, y + 1);
			}
	return b;
}

// crop every frame to the union of all opaque pixels so animations line up; each animation keeps its own
// ground line (`base`, the lowest opaque row) and top (`top`, the highest), since poses sit differently in the frame
const all = { x0: Infinity, y0: Infinity, x1: 0, y1: 0 };
const box = {};
for (const [name, files] of Object.entries(ANIMS)) {
	box[name] = { top: Infinity, base: 0 };
	for (const f of files) {
		const b = await bounds(f);
		all.x0 = Math.min(all.x0, b.x0);
		all.y0 = Math.min(all.y0, b.y0);
		all.x1 = Math.max(all.x1, b.x1);
		all.y1 = Math.max(all.y1, b.y1);
		box[name].top = Math.min(box[name].top, b.y0);
		box[name].base = Math.max(box[name].base, b.y1);
	}
}
const crop = { left: all.x0, top: all.y0, width: all.x1 - all.x0, height: all.y1 - all.y0 };

fs.mkdirSync(OUT, { recursive: true });
const meta = { cell: [crop.width, crop.height], anims: {} };
const composites = [];
const names = Object.keys(ANIMS);
for (const [row, name] of names.entries()) {
	for (const [col, f] of ANIMS[name].entries())
		composites.push({ input: await (await grey(f)).extract(crop).png().toBuffer(), left: col * crop.width, top: row * crop.height });
	meta.anims[name] = {
		row,
		frames: ANIMS[name].length,
		top: box[name].top - crop.top,
		base: box[name].base - crop.top,
	};
}
const cols = Math.max(...names.map((n) => meta.anims[n].frames));

await sharp({
	create: { width: cols * crop.width, height: names.length * crop.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
	.composite(composites)
	.png({ palette: true })
	.toFile(path.join(OUT, 'cat.png'));
fs.writeFileSync(path.join(OUT, 'cat.json'), JSON.stringify(meta, null, '\t') + '\n');

console.log(`cat.png ${cols}×${names.length} cells of ${crop.width}×${crop.height}`, meta.anims);
