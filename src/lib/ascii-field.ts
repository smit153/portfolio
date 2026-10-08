// A slowly drifting ASCII terrain, after the hero banner on griffin.com: a few layered sine waves make a smooth
// height field, cells near its contour lines are drawn brighter, and the brightness picks the character.
// On the strip that's the desk cat's home (data-pet-home), where it lands a ring ripples out, and the cells under it
// glow a little.

const CELL_W = 12;
const CELL_H = 14;
const FONT_SIZE = 12;
const TERRAIN_SCALE = 0.13; // terrain units per cell
const CONTOUR = 0.08; // height between contour lines
const SPEED = 0.9;
const FRAME_SKIP = 2; // draw every other frame (~30fps); the drift is slow enough not to need more

// brightness (0-255) thresholds, darkest first
const LEVELS = [
	{ min: 15, char: '·', color: '#1a1a1b' },
	{ min: 50, char: '/', color: '#2a2b2b' },
	{ min: 100, char: '+', color: '#5a5a5a' },
	{ min: 160, char: '#', color: '#8d8d8d' },
];

// ripple rings from a landing
const RING_SPEED = 170; // px/s
const RING_WIDTH = 16; // px
const RING_LIFE = 1.6; // s
// glow under the cat while it's on the strip
const GLOW_RADIUS = 46; // px
const GLOW = 70; // brightness added at the centre

function wave(x: number, y: number, t: number) {
	let a = Math.sin(0.8 * x + 0.3 * t) * Math.cos(0.6 * y + 0.2 * t) * 0.5;
	a += 0.25 * Math.sin(1.6 * x + 1.2 * y + 0.15 * t);
	a += Math.sin(0.3 * x - 0.4 * t) * Math.cos(0.4 * y + 0.25 * t) * 0.6;
	a += 0.3 * Math.sin(0.5 * (x + y) + 0.35 * t);
	a += Math.sin(2.5 * x + 0.1 * t) * Math.cos(2.8 * y - 0.12 * t) * 0.15;
	return a;
}

/** brightness 0-255 of the terrain at (x, y) in terrain units, time t */
function brightness(x: number, y: number, t: number) {
	const n = wave(x, y, t) + 0.4 * wave(2.2 * x, 2.2 * y, 0.7 * t) + 0.15 * wave(4.5 * x, 4.5 * y, 0.4 * t);
	const h = Math.max(0, Math.min(1, (n + 1.8) / 3.6));
	const s = (h % CONTOUR) / CONTOUR;
	if (s > 0.12 && s < 0.88) return 140 * h;
	// on a contour line: brighter, and brighter still where the terrain is steep
	const dx = wave(x + 0.01, y, t) - wave(x - 0.01, y, t);
	const dy = wave(x, y + 0.01, t) - wave(x, y - 0.01, t);
	const steep = 12 * Math.hypot(dx, dy);
	return Math.min(255, 200 * h + 55 + (steep > 0.5 ? 40 * steep : 0));
}

export function startAsciiField(root: HTMLElement) {
	const canvas = root.querySelector('canvas')!;
	const ctx = canvas.getContext('2d')!;
	const reduce = matchMedia('(prefers-reduced-motion: reduce)');
	const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sohne-mono').trim() || 'monospace';
	let w = 0;
	let h = 0;
	let frame = 0;
	let raf = 0;
	let visible = false;
	const start = performance.now();

	const rings: { x: number; at: number; force: number }[] = [];
	let cat: number | null = null; // the cat's x in canvas pixels while it's standing on the strip

	function resize() {
		const dpr = Math.min(devicePixelRatio || 1, 2);
		w = canvas.clientWidth;
		h = canvas.clientHeight;
		canvas.width = Math.max(1, Math.floor(w * dpr));
		canvas.height = Math.max(1, Math.floor(h * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function draw(now: number) {
		const t = ((now - start) / 1000) * SPEED;
		const sec = now / 1000;
		const cols = Math.ceil(w / CELL_W) + 1;
		const rows = Math.ceil(h / CELL_H) + 1;
		while (rings.length && sec - rings[0].at > RING_LIFE) rings.shift();

		const buckets: number[][] = LEVELS.map(() => []);
		for (let r = 0; r < rows; r++) {
			const py = r * CELL_H + CELL_H / 2;
			for (let c = 0; c < cols; c++) {
				const px = c * CELL_W + CELL_W / 2;
				let v = brightness((c + 0.5) * TERRAIN_SCALE, (r + 0.5) * TERRAIN_SCALE, t);
				for (const ring of rings) {
					const age = sec - ring.at;
					const off = Math.hypot(px - ring.x, py) - age * RING_SPEED;
					v += 150 * ring.force * Math.exp(-((off / RING_WIDTH) ** 2)) * (1 - age / RING_LIFE);
				}
				if (cat !== null) {
					const d = Math.hypot((px - cat) / GLOW_RADIUS, py / (GLOW_RADIUS * 0.6));
					if (d < 1) v += GLOW * (1 - d * d);
				}
				for (let i = LEVELS.length - 1; i >= 0; i--)
					if (v >= LEVELS[i].min) {
						buckets[i].push(px, py);
						break;
					}
			}
		}

		ctx.clearRect(0, 0, w, h);
		ctx.font = `400 ${FONT_SIZE}px ${family}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		LEVELS.forEach((level, i) => {
			const cells = buckets[i];
			ctx.fillStyle = level.color;
			for (let j = 0; j < cells.length; j += 2) ctx.fillText(level.char, cells[j], cells[j + 1]);
		});
	}

	function loop(now: number) {
		raf = 0;
		if (!visible || reduce.matches) return;
		if (frame++ % FRAME_SKIP === 0) draw(now);
		raf = requestAnimationFrame(loop);
	}
	function wake() {
		if (reduce.matches) draw(start); // a still frame
		else if (visible && !raf) raf = requestAnimationFrame(loop);
	}

	new ResizeObserver(() => {
		resize();
		draw(performance.now());
	}).observe(canvas);
	new IntersectionObserver(([e]) => {
		visible = e.isIntersecting;
		wake();
	}).observe(root);
	reduce.addEventListener('change', wake);
	// the font loads after first paint; redraw once it's in so a still frame doesn't keep the fallback
	document.fonts?.ready.then(() => draw(performance.now()));

	// the desk cat reports where it is (page coordinates) and when it lands; only its home strip listens
	if (!root.hasAttribute('data-pet-home')) return;
	const local = (pageX: number) => pageX - (canvas.getBoundingClientRect().left + scrollX);
	document.addEventListener('pet:land', (e) => {
		const { x, force } = (e as CustomEvent<{ x: number; force: number }>).detail;
		if (!reduce.matches) rings.push({ x: local(x), at: performance.now() / 1000, force });
	});
	document.addEventListener('pet:pos', (e) => {
		const { x } = (e as CustomEvent<{ x: number | null }>).detail;
		cat = x === null ? null : local(x);
		if (reduce.matches) draw(start);
	});
}
