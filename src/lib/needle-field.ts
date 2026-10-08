// The footer's needle field: a full-width grid of short lines that all turn to point at the pointer. The lines
// inside the name stay at right angles to the rest, so the name shows up through their direction.
// With the pointer away the field sways slowly (still, for reduced motion). It only draws while on screen.

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

const MAX_PITCH = 12; // px between needles on wide screens
const MIN_PITCH = 5; // packed tighter on narrow ones, so the whole name still fits
const MARGIN_ROWS = 3; // empty rows above and below the name

export function startNeedleField(canvas: HTMLCanvasElement, text: string) {
	const ctx = canvas.getContext('2d')!;
	const name = bitmap(text);
	const nameW = name[0].length;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)');
	let w = 0, h = 0, pitch = MAX_PITCH, scale = 1, cols = 0, rows = 0;
	let mx = 0, my = 0, pointer = false;
	let raf = 0, visible = false;

	// the size of the field follows the width: pick a pitch and scale that fit the name, then a height to match
	function size() {
		w = canvas.clientWidth;
		pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, Math.floor((w * 0.92) / nameW)));
		cols = Math.floor(w / pitch);
		scale = Math.max(1, Math.floor((cols * 0.92) / nameW));
		rows = NAME_ROWS * scale + MARGIN_ROWS * 2;
		h = rows * pitch;
		canvas.style.height = `${h}px`;
		const dpr = Math.min(devicePixelRatio || 1, 2);
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	const inName = (x: number, y: number) => {
		const ox = Math.floor((cols - nameW * scale) / 2);
		const oy = Math.floor((rows - NAME_ROWS * scale) / 2);
		const bx = Math.floor((x - ox) / scale);
		const by = Math.floor((y - oy) / scale);
		return by >= 0 && by < NAME_ROWS && bx >= 0 && bx < nameW && name[by][bx];
	};

	function draw(now: number) {
		const t = reduce.matches ? 0 : now / 1000;
		const len = pitch * 0.32; // half-length of a needle
		const ox = (w - cols * pitch) / 2 + pitch / 2;
		ctx.clearRect(0, 0, w, h);
		ctx.lineCap = 'square';
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < cols; x++) {
				const px = ox + x * pitch;
				const py = pitch / 2 + y * pitch;
				const on = inName(x, y);
				// toward the pointer, or a slow sway when it's away
				let a = pointer
					? Math.atan2(my - py, mx - px)
					: Math.sin(t * 0.6 + x * 0.05) * 0.6 + Math.cos(t * 0.4 + y * 0.2) * 0.4;
				if (on) a += Math.PI / 2;
				const near = pointer ? Math.max(0, 1 - Math.hypot(px - mx, py - my) / 220) : 0;
				const c = Math.round(on ? 150 + 100 * near : 44 + 40 * near);
				const l = on ? len * 1.2 : len;
				ctx.strokeStyle = `rgb(${c},${c},${c})`;
				ctx.lineWidth = on ? 1.8 : 1.2;
				ctx.beginPath();
				ctx.moveTo(px - Math.cos(a) * l, py - Math.sin(a) * l);
				ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l);
				ctx.stroke();
			}
	}

	function loop(now: number) {
		raf = 0;
		if (!visible) return;
		draw(now);
		// still for reduced motion: only redraw when the pointer moves
		if (!reduce.matches) raf = requestAnimationFrame(loop);
	}
	const kick = () => {
		if (visible && !raf) raf = requestAnimationFrame(loop);
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
	new IntersectionObserver(([e]) => {
		visible = e.isIntersecting;
		kick();
	}).observe(canvas);
	new ResizeObserver(() => {
		size();
		kick();
	}).observe(canvas);
	reduce.addEventListener('change', kick);
	size();
}
