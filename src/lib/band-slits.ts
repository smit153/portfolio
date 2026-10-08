// Bands as slits: each band's middle shows a slice of one still piece of ASCII art that sits pinned behind the page.
// The art (the footer strip's contour terrain, frozen at one moment) is drawn once per viewport size onto an
// offscreen canvas; on scroll each visible band copies the slice that's behind it right now. This is the same as a
// `background-attachment: fixed` background, but it also works on iOS, which ignores that.
import { wave } from './ascii-field';

const CELL_W = 12;
const CELL_H = 14;
const SCALE = 0.13; // terrain units per cell
const CONTOUR = 0.08;
const MOMENT = 7; // the terrain's time, frozen
const RAMP = [' ', '·', ':', '/', '+', '*', '#', '%', '@']; // dim to bright

/** brightness 0-1: the terrain's height, much brighter on its contour lines */
function contours(x: number, y: number) {
	const X = (x / CELL_W) * SCALE;
	const Y = (y / CELL_H) * SCALE;
	const t = MOMENT;
	const n = wave(X, Y, t) + 0.4 * wave(2.2 * X, 2.2 * Y, 0.7 * t) + 0.15 * wave(4.5 * X, 4.5 * Y, 0.4 * t);
	const v = Math.max(0, Math.min(1, (n + 1.8) / 3.6));
	const s = (v % CONTOUR) / CONTOUR;
	return s < 0.12 || s > 0.88 ? 0.55 + 0.45 * v : 0.45 * v;
}

export function startBandSlits() {
	const slits = [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-band-slit]')];
	if (!slits.length) return;
	const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sohne-mono').trim() || 'monospace';
	const art = document.createElement('canvas');
	const visible = new Set<HTMLCanvasElement>();
	let dpr = 1;
	let queued = 0;

	// the art covers exactly one viewport, since it's pinned to the screen
	function paint() {
		dpr = Math.min(devicePixelRatio || 1, 2);
		const w = innerWidth;
		const h = innerHeight;
		art.width = Math.ceil(w * dpr);
		art.height = Math.ceil(h * dpr);
		const g = art.getContext('2d')!;
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.fillStyle = '#000';
		g.fillRect(0, 0, w, h);
		g.font = `400 12px ${family}`;
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		for (let y = CELL_H / 2; y < h + CELL_H; y += CELL_H)
			for (let x = CELL_W / 2; x < w + CELL_W; x += CELL_W) {
				const v = contours(x, y);
				const i = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
				if (!i) continue;
				const grey = Math.round(40 + 170 * v);
				g.fillStyle = `rgb(${grey},${grey},${grey})`;
				g.fillText(RAMP[i], x, y);
			}
		for (const s of slits) {
			s.width = Math.ceil(s.clientWidth * dpr);
			s.height = Math.ceil(s.clientHeight * dpr);
		}
		show(slits);
	}

	// copy into each slit the part of the art that's behind it on screen
	function show(which: Iterable<HTMLCanvasElement>) {
		for (const s of which) {
			const r = s.getBoundingClientRect();
			const ctx = s.getContext('2d')!;
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, s.width, s.height);
			ctx.drawImage(art, r.left * dpr, r.top * dpr, r.width * dpr, r.height * dpr, 0, 0, s.width, s.height);
		}
	}
	const queue = () => {
		queued ||= requestAnimationFrame(() => {
			queued = 0;
			show(visible);
		});
	};

	const io = new IntersectionObserver((entries) => {
		for (const e of entries) {
			const s = e.target as HTMLCanvasElement;
			if (e.isIntersecting) visible.add(s);
			else visible.delete(s);
		}
		queue();
	});
	slits.forEach((s) => io.observe(s));
	addEventListener('scroll', queue, { passive: true });
	let resizing = 0;
	addEventListener('resize', () => {
		clearTimeout(resizing);
		resizing = window.setTimeout(paint, 100);
	});
	paint();
	// the art uses the site font; repaint once it has loaded so it doesn't keep the fallback
	document.fonts?.ready.then(paint);
}
