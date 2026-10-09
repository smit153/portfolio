// The footer's torch: a full-width field that's dark until the pointer lights it. Light falls off from the pointer
// in an 8x8 ordered dither of square pixels, and the name is the one thing it can't light: a faint white grain in
// the dark that becomes a black cut-out under the beam. It only redraws when the pointer moves (or leaves, or the
// size changes), so there's no animation running.

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

// 8x8 Bayer thresholds, 0 to 1
const BAYER = [
	0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3,
	35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
].map((v) => (v + 0.5) / 64);

const PX = 3; // css pixels per dither pixel
const MAX_PITCH = 12; // css px per name square on wide screens (a multiple of PX)
const MIN_PITCH = 6; // smaller on narrow ones, so the whole name still fits
const MARGIN_ROWS = 3; // empty name-squares above and below the name
const AMBIENT = 0.03; // the faint dots that keep the dark from being empty
const FIELD = 120; // grey of a lit field pixel
const NAME = 235; // white of the name's grain

export function startTorchField(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext('2d')!;
	const name = bitmap(text);
	const nameW = name[0].length;
	// the dither is drawn at one canvas pixel per dither pixel, then scaled up with no smoothing
	const off = document.createElement('canvas');
	const octx = off.getContext('2d')!;
	let img: ImageData;
	let w = 0, h = 0, pitch = MAX_PITCH, cols = 0, rows = 0, scale = 1, offX = 0, nx = 0, ny = 0;
	let mx = 0, my = 0, pointer = false, queued = 0;

	function size() {
		w = canvas.clientWidth;
		pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, Math.floor((w * 0.92) / nameW / PX) * PX));
		cols = Math.floor(w / pitch);
		scale = Math.max(1, Math.floor((cols * 0.92) / nameW));
		rows = NAME_ROWS * scale + MARGIN_ROWS * 2;
		h = rows * pitch;
		offX = Math.floor((w - cols * pitch) / 2);
		nx = Math.floor((cols - nameW * scale) / 2);
		ny = Math.floor((rows - NAME_ROWS * scale) / 2);
		canvas.style.height = `${h}px`;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		off.width = Math.ceil(w / PX);
		off.height = Math.ceil(h / PX);
		img = octx.createImageData(off.width, off.height);
	}

	const inName = (px: number, py: number) => {
		const bx = Math.floor((Math.floor((px - offX) / pitch) - nx) / scale);
		const by = Math.floor((Math.floor(py / pitch) - ny) / scale);
		return by >= 0 && by < NAME_ROWS && bx >= 0 && bx < nameW && name[by][bx];
	};

	function draw() {
		queued = 0;
		const d = img.data;
		d.fill(0);
		const radius = Math.max(220, h * 0.9);
		for (let by = 0; by < off.height; by++) {
			const py = (by + 0.5) * PX;
			for (let bx = 0; bx < off.width; bx++) {
				const px = (bx + 0.5) * PX;
				const light = pointer ? Math.pow(Math.max(0, 1 - Math.hypot(px - mx, py - my) / radius), 1.6) * 1.05 + AMBIENT : AMBIENT;
				const threshold = BAYER[(bx & 7) + (by & 7) * 8];
				let c = 0;
				// the name: a faint grain in the dark that the light can't reach, so it goes black under the beam
				if (inName(px, py)) c = light < 0.3 && 0.32 - light * 0.6 > threshold ? NAME : 0;
				else c = light > threshold ? FIELD : 0;
				if (!c) continue;
				const i = (by * off.width + bx) * 4;
				d[i] = d[i + 1] = d[i + 2] = c;
				d[i + 3] = 255;
			}
		}
		octx.putImageData(img, 0, 0);
		ctx.clearRect(0, 0, w, h);
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(off, 0, 0, off.width * PX, off.height * PX);
	}
	const redraw = () => {
		if (!queued) queued = requestAnimationFrame(draw);
	};

	const track = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		mx = e.clientX - r.left;
		my = e.clientY - r.top;
		pointer = true;
		redraw();
	};
	canvas.addEventListener('pointermove', track);
	canvas.addEventListener('pointerdown', track);
	canvas.addEventListener('pointerleave', () => {
		pointer = false;
		redraw();
	});
	new ResizeObserver(() => {
		size();
		redraw();
	}).observe(canvas);
	size();
	draw();
}
