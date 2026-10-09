// The footer's lens: the name as a dot matrix, a small dot in the middle of every square of the name and a fainter
// one in every empty square. Hovering brings in a magnifier that grows the dots into full blocks: the name turns
// solid white, the empty squares become a dim checkerboard, and a ring of half-size blocks sits at the rim.
// Nothing runs at rest: it only draws while the lens follows the pointer and eases in or out.

// 5x7 pixel letters for the name
const GLYPH: Record<string, string[]> = {
	S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
	M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
	I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
	T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
	O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
	J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
	R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
	A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
	' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
const NAME_ROWS = 7;

/** the text as one bitmap, a column of space between letters */
function bitmap(text: string) {
	const rows: boolean[][] = Array.from({ length: NAME_ROWS }, () => []);
	[...text].forEach((ch, i) =>
		GLYPH[ch].forEach((r, y) => {
			if (i) rows[y].push(false);
			rows[y].push(...[...r].map((c) => c === '#'));
		}),
	);
	return rows;
}

const PX = 3; // css pixels per pixel
const MAX_PITCH = 12; // css px per square on wide screens (a multiple of PX)
const MIN_PITCH = 6; // smaller on narrow ones, so the whole name still fits
const MARGIN_ROWS = 3; // empty squares above and below the name
const RADIUS = 110; // the lens, in css px
const DOT = 175; // grey of a name dot at rest
const FAINT = 34; // grey of an empty square's dot
const SOLID = 245; // the name under the lens

export function startLensField(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext('2d')!;
	const name = bitmap(text);
	const nameW = name[0].length;
	// drawn at one canvas pixel per pixel, then scaled up with no smoothing so every pixel stays square
	const off = document.createElement('canvas');
	const octx = off.getContext('2d')!;
	let img: ImageData;
	let rest: Uint8Array; // the resting dot matrix, one grey per pixel
	let mask: Uint8Array; // 1 where a pixel is inside the name
	let w = 0, h = 0, bw = 0, bh = 0, cell = 4, oX = 0;
	let mx = 0, my = 0, pointer = false;
	let lx = 0, ly = 0, a = 0; // where the lens is, and how far it has grown in (0 to 1)
	let raf = 0;

	function size() {
		w = canvas.clientWidth;
		const pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, Math.floor((w * 0.92) / nameW / PX) * PX));
		const cols = Math.floor(w / pitch);
		const scale = Math.max(1, Math.floor((cols * 0.92) / nameW));
		const rows = NAME_ROWS * scale + MARGIN_ROWS * 2;
		h = rows * pitch;
		cell = pitch / PX;
		// the squares start on a whole pixel, so the lens blocks line up with the letters
		oX = Math.floor((w - cols * pitch) / 2 / PX);
		const nx = Math.floor((cols - nameW * scale) / 2);
		const ny = Math.floor((rows - NAME_ROWS * scale) / 2);
		canvas.style.height = `${h}px`;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		bw = Math.ceil(w / PX);
		bh = Math.ceil(h / PX);
		off.width = bw;
		off.height = bh;
		img = octx.createImageData(bw, bh);
		mask = new Uint8Array(bw * bh);
		rest = new Uint8Array(bw * bh);
		// the dot sits in the middle of its square: 2x2 pixels in a 4x4 square, 1 pixel in smaller ones
		const lo = Math.floor((cell - 1) / 2);
		const hi = Math.ceil((cell - 1) / 2);
		for (let by = 0; by < bh; by++)
			for (let bx = 0; bx < bw; bx++) {
				const sx = Math.floor((bx - oX) / cell);
				const sy = Math.floor(by / cell);
				const gx = Math.floor((sx - nx) / scale);
				const gy = Math.floor((sy - ny) / scale);
				const i = by * bw + bx;
				mask[i] = gy >= 0 && gy < NAME_ROWS && gx >= 0 && gx < nameW && name[gy][gx] ? 1 : 0;
				const ix = bx - oX - sx * cell;
				const iy = by - sy * cell;
				if (ix >= lo && ix <= hi && iy >= lo && iy <= hi) rest[i] = mask[i] ? DOT : FAINT;
			}
	}

	const put = (x: number, y: number, c: number) => {
		const d = img.data;
		const k = (y * bw + x) * 4;
		d[k] = d[k + 1] = d[k + 2] = c;
		d[k + 3] = c ? 255 : 0;
	};

	function draw() {
		for (let i = 0; i < rest.length; i++) put(i % bw, (i / bw) | 0, rest[i]);
		const r = RADIUS * a;
		if (r > 2) {
			const t0x = Math.floor((lx / PX - oX - r / PX) / cell), t1x = Math.ceil((lx / PX - oX + r / PX) / cell);
			const t0y = Math.max(0, Math.floor((ly / PX - r / PX) / cell)), t1y = Math.ceil((ly / PX + r / PX) / cell);
			for (let ty = t0y; ty <= t1y; ty++)
				for (let tx = t0x; tx <= t1x; tx++) {
					const x0 = oX + tx * cell;
					const y0 = ty * cell;
					if (x0 >= bw || y0 >= bh || x0 + cell <= 0) continue;
					const d = Math.hypot((x0 + cell / 2) * PX - lx, (y0 + cell / 2) * PX - ly);
					if (d > r) continue;
					// whole-square blocks in the middle, half-square blocks at the rim
					const b = d < r * 0.6 ? cell : Math.max(1, Math.floor(cell / 2));
					for (let oy = 0; oy < cell; oy += b)
						for (let ox = 0; ox < cell; ox += b) {
							const sx = Math.min(bw - 1, Math.max(0, x0 + ox + (b >> 1)));
							const sy = Math.min(bh - 1, y0 + oy + (b >> 1));
							const checker = ((tx * cell + ox) / b + (y0 + oy) / b) & 1;
							const c = mask[sy * bw + sx] ? SOLID : checker ? Math.round(26 + 34 * (1 - d / r)) : 0;
							for (let y = y0 + oy; y < Math.min(bh, y0 + oy + b); y++)
								for (let x = Math.max(0, x0 + ox); x < Math.min(bw, x0 + ox + b); x++) put(x, y, c);
						}
				}
		}
		octx.putImageData(img, 0, 0);
		ctx.clearRect(0, 0, w, h);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(off, 0, 0, bw * PX, bh * PX);
	}

	function loop() {
		raf = 0;
		const target = pointer ? 1 : 0;
		a += (target - a) * 0.2;
		lx += (mx - lx) * 0.35;
		ly += (my - ly) * 0.35;
		const settling = Math.abs(target - a) > 0.01 || Math.hypot(mx - lx, my - ly) > 0.5;
		if (!pointer && !settling) a = 0;
		draw();
		if (pointer || settling) raf = requestAnimationFrame(loop);
	}
	const kick = () => {
		if (!raf) raf = requestAnimationFrame(loop);
	};

	const track = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		mx = e.clientX - r.left;
		my = e.clientY - r.top;
		// a lens appearing from nothing starts where the pointer is, instead of sliding in from the last spot
		if (a < 0.01) {
			lx = mx;
			ly = my;
		}
		pointer = true;
		kick();
	};
	canvas.addEventListener('pointermove', track);
	canvas.addEventListener('pointerdown', track);
	canvas.addEventListener('pointerleave', () => {
		pointer = false;
		kick();
	});
	new ResizeObserver(() => {
		size();
		draw();
	}).observe(canvas);
	size();
	draw();
}
