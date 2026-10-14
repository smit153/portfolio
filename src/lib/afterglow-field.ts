// The footer's name in solid pixel blocks. Blocks heat up white as the pointer passes over them and cool back to
// grey slowly, like phosphor, so you can paint the name and watch it fade. On screens too narrow for the name on
// one line, it stacks into two. Nothing runs at rest: it only draws while some block is still warm.

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

/** the words stacked, each line centred, a row of space between them: for screens too narrow for one line */
function stacked(text: string) {
	const lines = text.split(' ').map(bitmap);
	const width = Math.max(...lines.map((l) => l[0].length));
	const out: boolean[][] = [];
	lines.forEach((l, i) => {
		if (i) out.push(Array(width).fill(false));
		const pad = Math.floor((width - l[0].length) / 2);
		for (const row of l) out.push([...Array(pad).fill(false), ...row, ...Array(width - pad - row.length).fill(false)]);
	});
	return out;
}

const BASE_BLOCK = 12; // css px per block on wide screens; very wide ones get a whole multiple of it
const MIN_ONE_LINE = 7; // below this the name stacks into two lines
const MARGIN_ROWS = 3; // empty rows above and below the name, in base blocks
const REST = 70; // grey of a cold block
const HOT = 255; // a block right under the pointer
const REACH = 4.5; // how far the pointer warms blocks, in blocks
const COOL = 0.55; // heat lost per second, so a fully hot block takes about two seconds to go cold

type Block = { x: number; y: number; cx: number; cy: number; heat: number };

const smooth = (e0: number, e1: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return t * t * (3 - 2 * t);
};

export function startAfterglowField(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext('2d')!;
	const oneLine = bitmap(text);
	const twoLines = stacked(text);
	let blocks: Block[] = [];
	let w = 0, h = 0, size = BASE_BLOCK;
	let mx = 0, my = 0, pointer = false;
	let raf = 0, last = 0;

	function layout() {
		w = canvas.clientWidth;
		const fit = (bm: boolean[][]) => Math.floor((w * 0.92) / bm[0].length);
		let name = oneLine;
		let s = fit(name);
		if (s < MIN_ONE_LINE) {
			name = twoLines;
			s = Math.max(3, Math.min(BASE_BLOCK, fit(name)));
		} else if (s > BASE_BLOCK) s = Math.floor(s / BASE_BLOCK) * BASE_BLOCK;
		size = s;
		const margin = MARGIN_ROWS * Math.min(size, BASE_BLOCK);
		h = name.length * size + margin * 2;
		const ox = Math.floor((w - name[0].length * size) / 2);
		canvas.style.height = `${h}px`;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		// keep the warmth of blocks that survive a resize, so the name doesn't go cold mid-stroke
		const old = blocks;
		blocks = [];
		name.forEach((row, y) =>
			row.forEach((on, x) => {
				if (!on) return;
				const bx = ox + x * size, by = margin + y * size;
				blocks.push({ x: bx, y: by, cx: bx + size / 2, cy: by + size / 2, heat: old[blocks.length]?.heat ?? 0 });
			}),
		);
	}

	function draw() {
		ctx.clearRect(0, 0, w, h);
		// a thin gap between blocks keeps the name reading as pixels
		const gap = Math.max(1, Math.round(size * 0.12));
		const s = size - gap;
		for (const b of blocks) {
			const g = Math.round(REST + (HOT - REST) * b.heat);
			// the hottest blocks bloom
			const glow = b.heat * b.heat;
			if (glow > 0.02) {
				ctx.shadowColor = `rgba(255,255,255,${0.85 * glow})`;
				ctx.shadowBlur = 22 * glow;
			}
			ctx.fillStyle = `rgb(${g},${g},${g})`;
			ctx.fillRect(b.x, b.y, s, s);
			if (glow > 0.02) ctx.shadowBlur = 0;
		}
	}

	function frame(now: number) {
		const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
		last = now;
		const reach = size * REACH;
		let warm = false;
		for (const b of blocks) {
			if (pointer) b.heat = Math.max(b.heat, 1 - smooth(0, reach, Math.hypot(b.cx - mx, b.cy - my)));
			b.heat = Math.max(0, b.heat - dt * COOL);
			if (b.heat > 0) warm = true;
		}
		draw();
		if (warm || pointer) raf = requestAnimationFrame(frame);
		else {
			raf = 0;
			last = 0;
		}
	}
	const kick = () => {
		if (!raf) raf = requestAnimationFrame(frame);
	};

	const track = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		mx = e.clientX - r.left;
		my = e.clientY - r.top;
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
		layout();
		draw();
	}).observe(canvas);
	layout();
	draw();
}
