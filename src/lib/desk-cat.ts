// The desk cat: a pixel cat that lives on the page's horizontal lines.
// Floors are elements marked `data-pet-floor` (their top edge; `="bottom"` for the bottom edge); the one that also
// has `data-pet-home` is where it starts. On the site that's only the ASCII strip at the bottom (AsciiField). Pressing
// the cat picks it up by the scruff: it dangles from the pointer (its feet may dip into the floor it was picked up from),
// can't be lowered past where it was picked up, and drops when let go.
// It walks side-on and faces the screen whenever it stops.
// It tells the page where it is with `pet:pos` ({ x } in page px, or null when off the ground) and `pet:land`
// ({ x, force }) events, which the ASCII strip turns into a glow and a ripple.
// Pose changes (sitting, lying down, landing, being picked up) get a springy squash instead of transition
// frames, which PixelLab couldn't draw without flicker.
import sheetUrl from '../assets/cat/cat.png?url';
import meta from '../assets/cat/cat.json';
import { play, purring } from './cat-sound';

type AnimName = keyof typeof meta.anims;
type Mode = 'ground' | 'held' | 'fall';
interface Floor {
	el: HTMLElement;
	y: number;
	left: number;
	right: number;
	home: boolean;
}

const SCALE = 2;
const [CW, CH] = meta.cell;
const FPS: Record<AnimName, number> = { walk: 10, idle: 6, sit: 1, sleep: 1, held: 7 };
// side views and which way they face in the sheet; flipped to face the way it's going. The rest face the screen.
const SIDE: Partial<Record<AnimName, 1 | -1>> = { walk: 1, sit: 1, sleep: 1 };
const WALK = 46; // px/s on screen
const DASH = 120;
const GRAVITY = 2400;
const GRIP = meta.anims.held.top + 21; // where it's held: the scruff, just under the chin (sprite rows)
const HANG = (meta.anims.held.base - GRIP) * SCALE; // from the hand down to the dangling feet, in page px
const SINK = 12; // px the dangling feet may dip into the lowest floor when carried down to it
const HOLD = 180; // ms a press is held before it picks the cat up; shorter is a click
const STORE = 'desk-cat-v1';
// it prefers the page column but the strip runs edge to edge: these odds let it stray into the margins now and then
const ROAM_OUT = 0.2; // chance a wander heads anywhere along the strip instead of within the column
// on phones the column is the whole screen: the cat starts in the middle and wanders near it, never off the edge
const NARROW = 640;
const NARROW_ROAM = 0.22; // how far either side of the middle it wanders on phones, as a share of the screen width
const narrow = () => document.documentElement.clientWidth < NARROW;
const COME_BACK = 0.75; // chance, each time it decides what to do while out in a margin, that it walks back in

class Interrupt extends Error {}
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(weighted: [T, number][]) => {
	let r = Math.random() * weighted.reduce((s, [, w]) => s + w, 0);
	for (const [v, w] of weighted) if ((r -= w) <= 0) return v;
	return weighted[0][0];
};

export function startDeskCat() {
	if (document.querySelector('[data-desk-cat]')) return;
	// the speech bubble's handwriting is only preloaded on wide screens (Layout.astro): fetch it now so the first
	// bubble doesn't swap fonts while it's showing
	const caveat = getComputedStyle(document.documentElement).getPropertyValue('--font-caveat');
	if (caveat) document.fonts.load(`20px ${caveat}`).catch(() => {});
	const sheet = new Image();
	sheet.src = sheetUrl;
	sheet.decode().then(
		() => new DeskCat(sheet),
		() => {},
	);
}

class DeskCat {
	readonly cv = document.createElement('canvas');
	readonly ctx: CanvasRenderingContext2D;
	readonly reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

	// sprite
	anim: AnimName = 'idle';
	frame = 0;
	acc = 0;
	fps = FPS.idle;

	// body
	mode: Mode = 'fall';
	x = 0;
	y = 0; // feet line, or the hand position while held
	vx = 0;
	vy = 0;
	facing = 1;
	sy = 1; // vertical squash (1 = none), springing back to 1
	syv = 0;
	floor: Floor | null = null;
	moveTo: number | null = null;
	speed = WALK;

	// control
	token = 0;
	waits: { token: number; done: () => boolean; resolve: () => void; reject: (e: Error) => void }[] = [];
	napping = false;
	floors: Floor[] = [];
	bubble: HTMLElement | null = null;
	last = performance.now();
	visible = true;
	/** something moved it (a resize, a floor shifting, a new bubble): draw once even if it's off screen */
	dirty = true;
	/** each animation's opaque area in the cell (x0, y0, x1, y1), the only part that takes clicks */
	solid = {} as Record<AnimName, [number, number, number, number]>;
	clip = '';

	constructor(readonly sheet: HTMLImageElement) {
		const { cv } = this;
		cv.width = CW;
		cv.height = CH;
		cv.dataset.deskCat = '';
		cv.setAttribute('aria-hidden', 'true');
		Object.assign(cv.style, {
			position: 'absolute',
			left: '0',
			top: '0',
			width: `${CW * SCALE}px`,
			height: `${CH * SCALE}px`,
			imageRendering: 'pixelated',
			filter: 'contrast(1.25) brightness(1.05)',
			zIndex: '50',
			cursor: 'grab',
			touchAction: 'none',
			willChange: 'transform',
		});
		this.ctx = cv.getContext('2d')!;
		document.body.append(cv);
		this.measure();

		this.refreshFloors();
		this.place();
		this.bindPointer();
		addEventListener('resize', () => this.resize());
		setInterval(() => this.refreshFloors(), 1000); // layout shifts (e.g. collapsing sections) move the floors
		document.addEventListener('visibilitychange', () => (this.last = performance.now()));
		new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(cv);

		requestAnimationFrame((t) => this.tick(t));
		this.think();
	}

	// ---------- floors ----------
	refreshFloors() {
		const home = document.querySelector<HTMLElement>('[data-pet-home]');
		this.floors = [...document.querySelectorAll<HTMLElement>('[data-pet-floor]')].map((el) => {
			const r = el.getBoundingClientRect();
			return {
				el,
				y: (el.dataset.petFloor === 'bottom' ? r.bottom - 2 : r.top) + scrollY,
				left: r.left + scrollX,
				right: r.right + scrollX,
				home: el === home,
			};
		});
		const same = this.floor && this.floors.find((f) => f.el === this.floor!.el);
		if (same) {
			this.floor = same;
			if (this.mode === 'ground' && this.y !== same.y) {
				this.y = same.y;
				this.dirty = true;
			}
		}
	}
	/** the window changed size: keep the cat at the same spot along its floor, on screen, and redraw it now */
	resize() {
		const f = this.floor;
		const fx = f ? (this.x - f.left) / Math.max(1, f.right - f.left) : 0.5;
		this.refreshFloors();
		if (this.floor && this.mode === 'ground') {
			// phones keep it in the middle, as on load
			const at = narrow() ? 0.5 : Math.min(1, Math.max(0, fx));
			this.x = this.clampWide(this.floor.left + (this.floor.right - this.floor.left) * at);
			this.y = this.floor.y;
			this.moveTo = null;
		}
		this.dirty = true;
	}
	get home() {
		return this.floors.find((f) => f.home) ?? this.floors.at(-1) ?? null;
	}
	/** keep x inside the floor's column (on phones, the whole sprite stays on screen) */
	clampX(x: number, f = this.floor) {
		const pad = (CW * SCALE) / (narrow() ? 2 : 2.5);
		return f ? Math.min(f.right - pad, Math.max(f.left + pad, x)) : x;
	}
	/** keep x on screen: the floors are full-bleed lines. On the left the sprite's empty margin may hang off the edge;
	 *  on the right the whole canvas stays inside, since anything past the right edge widens the page */
	clampWide(x: number) {
		const pad = (CW * SCALE) / (narrow() ? 2 : 2.5);
		return Math.min(document.documentElement.clientWidth - (CW * SCALE) / 2, Math.max(pad, x));
	}
	floorBelow(y: number) {
		return this.floors.filter((f) => f.y >= y).sort((a, b) => a.y - b.y)[0];
	}

	place() {
		let saved: { i: number; fx: number } | null = null;
		try {
			saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
		} catch {}
		const f = (saved && this.floors[saved.i]) || this.home;
		// phones always start it in the middle of the screen
		const fx = narrow() ? 0.5 : (saved?.fx ?? 0.5);
		if (f) this.land(f, f.left + (f.right - f.left) * fx, false);
	}
	save() {
		if (!this.floor) return;
		const i = this.floors.findIndex((f) => f.el === this.floor!.el);
		const fx = (this.x - this.floor.left) / (this.floor.right - this.floor.left);
		try {
			localStorage.setItem(STORE, JSON.stringify({ i, fx }));
		} catch {}
	}
	land(f: Floor, x: number, bounce = true) {
		this.floor = f;
		this.mode = 'ground';
		this.y = f.y;
		// a harder drop lands louder, and ripples further
		if (bounce) {
			const force = Math.min(1, Math.max(0.3, this.vy / 1400));
			play('thump', force);
			document.dispatchEvent(new CustomEvent('pet:land', { detail: { x, force } }));
		}
		// the lines run edge to edge, so it can land outside the column; it usually walks back in on its own (see act)
		const half = (CW * SCALE) / 2;
		this.x = Math.min(document.documentElement.clientWidth - half, Math.max(half, x));
		this.vx = this.vy = 0;
		this.set('idle');
		if (bounce) this.squash(0.78);
		this.save();
	}

	// ---------- sprite ----------
	/** find each animation's opaque box, so the transparent corners of the canvas don't block what's under them */
	measure() {
		const c = document.createElement('canvas');
		c.width = this.sheet.width;
		c.height = this.sheet.height;
		const g = c.getContext('2d', { willReadFrequently: true })!;
		g.drawImage(this.sheet, 0, 0);
		for (const name of Object.keys(meta.anims) as AnimName[]) {
			const a = meta.anims[name];
			const { data } = g.getImageData(0, a.row * CH, a.frames * CW, CH);
			const box: [number, number, number, number] = [CW, CH, 0, 0];
			for (let y = 0; y < CH; y++)
				for (let x = 0; x < a.frames * CW; x++)
					if (data[(y * a.frames * CW + x) * 4 + 3] > 20) {
						const cx = x % CW;
						box[0] = Math.min(box[0], cx);
						box[1] = Math.min(box[1], y);
						box[2] = Math.max(box[2], cx + 1);
						box[3] = Math.max(box[3], y + 1);
					}
			this.solid[name] = box;
		}
	}

	set(name: AnimName, fps = FPS[name]) {
		if (this.anim !== name) {
			this.frame = 0;
			this.acc = 0;
		}
		this.anim = name;
		this.fps = fps;
	}
	squash(to: number) {
		if (this.reduce) return;
		this.sy = to;
		this.syv = 0;
	}
	stepAnim(dt: number) {
		this.acc += dt * this.fps * (this.reduce && this.mode === 'ground' && this.anim !== 'walk' ? 0 : 1);
		while (this.acc >= 1) {
			this.acc -= 1;
			this.frame = (this.frame + 1) % meta.anims[this.anim].frames;
		}
		// damped spring back to 1
		this.syv += (1 - this.sy) * 260 * dt;
		this.syv *= Math.pow(0.0015, dt);
		this.sy += this.syv * dt;
	}
	draw() {
		const { ctx } = this;
		const a = meta.anims[this.anim];
		ctx.clearRect(0, 0, CW, CH);
		ctx.imageSmoothingEnabled = false;
		ctx.save();
		const drawn = SIDE[this.anim];
		if (drawn && drawn !== this.facing) {
			ctx.translate(CW, 0);
			ctx.scale(-1, 1);
		}
		ctx.drawImage(this.sheet, this.frame * CW, a.row * CH, CW, CH, 0, 0, CW, CH);
		ctx.restore();
		// clip-path also limits hit-testing: only the cat's own box takes the pointer
		const [x0, y0, x1, y1] = this.solid[this.anim];
		const [l, r] = drawn && drawn !== this.facing ? [CW - x1, x0] : [x0, CW - x1];
		const clip = `inset(${y0}px ${r}px ${CH - y1}px ${l}px)`.replace(/(\d+)px/g, (_, n) => `${n * SCALE}px`);
		if (clip !== this.clip) this.cv.style.clipPath = this.clip = clip;

		// squash keeps the volume by widening as it flattens; it's only ever a short burst after a pose change,
		// since continuous fractional scaling makes pixel art shimmer
		const sy = this.sy;
		const sx = 1 + (1 - this.sy) * 0.6;
		const held = this.mode === 'held';
		// held: hang from the chest under the pointer; otherwise stand the feet on the line
		const anchor = held ? GRIP : a.base;
		const left = this.x - (CW * SCALE) / 2;
		const top = this.y - anchor * SCALE;
		this.dirty = false;
		this.cv.style.transformOrigin = `50% ${(anchor / CH) * 100}%`;
		this.cv.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
		if (this.bubble) {
			this.bubble.style.transform = `translate(${this.x.toFixed(0)}px, ${(top + (a.top - 2) * SCALE).toFixed(0)}px) translate(-50%, -100%)`;
		}
	}

	// ---------- main loop ----------
	tick(t: number) {
		const dt = Math.min(0.05, (t - this.last) / 1000);
		this.last = t;
		if (!document.hidden) {
			this.physics(dt);
			this.stepAnim(dt);
			this.resolveWaits();
			if (this.visible || this.dirty || this.mode !== 'ground') this.draw();
			this.report();
		}
		requestAnimationFrame((n) => this.tick(n));
	}

	/** tell the page where it stands, only when that changes */
	reported: number | null = null;
	report() {
		const x = this.mode === 'ground' ? Math.round(this.x) : null;
		if (x === this.reported) return;
		this.reported = x;
		document.dispatchEvent(new CustomEvent('pet:pos', { detail: { x } }));
	}

	physics(dt: number) {
		if (this.mode === 'ground' && this.moveTo !== null) {
			const d = this.moveTo - this.x;
			this.facing = Math.sign(d) || this.facing;
			const step = this.speed * dt;
			if (Math.abs(d) <= step) {
				this.x = this.moveTo;
				this.moveTo = null;
			} else this.x += Math.sign(d) * step;
		} else if (this.mode === 'fall') {
			const prev = this.y;
			this.vy += GRAVITY * dt;
			this.y += this.vy * dt;
			this.x += this.vx * dt;
			this.vx *= 0.98;
			// a throw stays on screen: soft bounce off the sides, and no higher than the top of the window
			const wide = this.clampWide(this.x);
			if (wide !== this.x) {
				this.x = wide;
				this.vx *= -0.3;
			}
			const ceiling = scrollY + 8 + meta.anims[this.anim].base * SCALE;
			if (this.y < ceiling) {
				this.y = ceiling;
				this.vy = Math.max(0, this.vy);
			}
			const under = this.floors
				.filter((f) => f.y >= prev - 1 && f.y <= this.y) // floors are full-bleed lines, so any x lands
				.sort((a, b) => a.y - b.y)[0];
			if (under) this.touchDown(under);
			else if (this.reduce) {
				const f = this.floorBelow(prev) ?? this.home;
				if (f) this.touchDown(f);
			} else if (this.y > document.documentElement.scrollHeight) {
				const h = this.home;
				if (h) this.touchDown(h, (h.left + h.right) / 2);
			}
		}
	}
	touchDown(f: Floor, x = this.x) {
		this.land(f, x);
		this.interrupt();
	}

	// ---------- async behaviour ----------
	until(done: () => boolean, token: number) {
		return new Promise<void>((resolve, reject) => this.waits.push({ token, done, resolve, reject }));
	}
	resolveWaits() {
		this.waits = this.waits.filter((w) => {
			if (w.token !== this.token) w.reject(new Interrupt());
			else if (w.done()) w.resolve();
			else return true;
			return false;
		});
	}
	interrupt() {
		this.token++;
		this.moveTo = null;
		if (this.napping) this.say(null);
		this.napping = false;
		purring(false);
	}
	wait(ms: number, token: number) {
		const end = performance.now() + ms;
		return this.until(() => performance.now() >= end, token);
	}
	walk(x: number, token: number, dash = false) {
		this.moveTo = this.clampWide(x);
		this.speed = dash ? DASH : WALK;
		this.set('walk', dash ? 17 : FPS.walk);
		return this.until(() => this.moveTo === null, token);
	}
	/** switch pose with a little plop; staying in the same pose doesn't plop */
	pose(name: AnimName, plop = 0.88) {
		if (name === this.anim) return;
		this.set(name);
		this.squash(plop);
	}

	async think() {
		for (;;) {
			const token = this.token;
			try {
				await this.until(() => this.mode === 'ground', token);
				await this.act(token);
			} catch (e) {
				if (!(e instanceof Interrupt)) throw e;
				await new Promise((r) => setTimeout(r, 0));
			}
		}
	}

	async act(t: number) {
		const f = this.floor;
		if (!f) return this.wait(500, t);
		// out in a margin (dropped or strayed there): usually head back into the column first
		const inside = this.clampX(this.x);
		if (Math.abs(inside - this.x) > 1 && !this.reduce && Math.random() < COME_BACK) {
			await this.wait(rand(400, 900), t);
			await this.walk(inside, t);
			this.pose('idle', 0.94);
		}
		this.save();
		const what = this.reduce
			? pick<string>([
					['sit', 2],
					['nap', 2],
					['idle', 1],
				])
			: pick<string>([
					['wander', 5],
					['dash', 0.6],
					['idle', 3],
					['sit', 3],
					['nap', 1.2],
				]);
		switch (what) {
			case 'wander':
			case 'dash': {
				const vw = document.documentElement.clientWidth;
				const to = narrow()
					? this.clampWide(rand(vw * (0.5 - NARROW_ROAM), vw * (0.5 + NARROW_ROAM)))
					: Math.random() < ROAM_OUT
						? this.clampWide(rand(0, vw))
						: this.clampX(rand(f.left, f.right));
				if (Math.abs(to - this.x) < 30) return this.wait(rand(600, 1200), t); // too short to bother walking
				await this.walk(to, t, what === 'dash');
				this.pose('idle', 0.94);
				return this.wait(rand(900, 2200), t);
			}
			case 'idle':
				this.set('idle');
				return this.wait(rand(1800, 4500), t);
			case 'sit':
				this.pose('sit');
				await this.wait(rand(4000, 9000), t);
				this.pose('idle', 1.08);
				return this.wait(rand(600, 1400), t);
			case 'nap':
				return this.nap(t);
		}
	}

	async nap(t: number) {
		this.pose('sit');
		await this.wait(rand(1200, 2500), t);
		this.pose('sleep', 0.84);
		this.napping = true;
		purring(true);
		this.say('z z z', 0);
		await this.wait(rand(9000, 18000), t);
		this.napping = false;
		purring(false);
		this.say(null);
		this.pose('sit', 1.1);
		await this.wait(rand(800, 1600), t);
		this.pose('idle', 1.06);
	}

	say(text: string | null, ms = 1400) {
		this.bubble?.remove();
		this.bubble = null;
		if (!text) return;
		const b = document.createElement('span');
		b.setAttribute('aria-hidden', 'true');
		b.className = 'pointer-events-none absolute left-0 top-0 z-50 font-handwritten text-xl leading-none text-doodle';
		const inner = document.createElement('span');
		inner.className = 'block';
		inner.textContent = text;
		b.append(inner);
		document.body.append(b);
		this.bubble = b;
		// placed by the next draw, even if the cat is off screen (otherwise it waits in the page's top-left corner)
		this.dirty = true;
		// snoring drifts up and fades, over and over
		if (!ms && !this.reduce)
			inner.animate(
				[
					{ transform: 'translate(0, 4px)', opacity: 0 },
					{ transform: 'translate(2px, -2px)', opacity: 1, offset: 0.35 },
					{ transform: 'translate(6px, -12px)', opacity: 0 },
				],
				{ duration: 2600, iterations: Infinity, easing: 'ease-out' },
			);
		if (ms) setTimeout(() => this.bubble === b && this.say(null), ms);
	}

	// ---------- pointer: pick up, drag and click ----------
	bindPointer() {
		const { cv } = this;
		let down: { x: number; y: number } | null = null;
		let holdTimer = 0;
		let lastMove = { x: 0, y: 0, t: 0 };
		let lowest = 0; // the lowest the hand may go: where it was picked up, or just into the lowest floor

		// the lowest floor is the bottom of its world
		const bottom = () => Math.max(...this.floors.map((f) => f.y));
		// held up high it stops at the top of the window with its head on screen
		const holdY = (y: number) => Math.max(scrollY + 4 + (GRIP - meta.anims.held.top) * SCALE, Math.min(lowest, y));

		// picked up by the scruff, once the press is held for a moment or starts to drag (a click or tap is a meow)
		const pickUp = (x: number, y: number) => {
			clearTimeout(holdTimer);
			this.interrupt();
			this.say(null);
			this.mode = 'held';
			this.floor = null;
			this.vx = this.vy = 0;
			this.set('held');
			this.squash(1.14); // stretched as it's lifted
			play('pickup', 1, 1500);
			cv.style.cursor = 'grabbing';
			this.x = this.clampWide(x);
			lowest = Math.max(y, bottom() - HANG + SINK);
			this.y = holdY(y);
		};

		cv.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			cv.setPointerCapture(e.pointerId);
			down = { x: e.pageX, y: e.pageY };
			lastMove = { x: e.pageX, y: e.pageY, t: performance.now() };
			// the latest pointer position, which the hold timer picks it up at
			const at = down;
			holdTimer = window.setTimeout(() => down && pickUp(at.x, at.y), HOLD);
		});
		cv.addEventListener('pointermove', (e) => {
			if (!down) return;
			if (this.mode !== 'held') {
				down.x = e.pageX; // keep the pick-up point under the pointer while the hold timer runs
				down.y = e.pageY;
				if (Math.hypot(e.pageX - lastMove.x, e.pageY - lastMove.y) > 6) pickUp(e.pageX, e.pageY);
				else return;
			}
			const now = performance.now();
			const k = 1000 / Math.max(1, now - lastMove.t);
			this.vx = this.vx * 0.5 + (e.pageX - lastMove.x) * k * 0.5;
			this.vy = this.vy * 0.5 + (e.pageY - lastMove.y) * k * 0.5;
			lastMove = { x: e.pageX, y: e.pageY, t: now };
			this.x = this.clampWide(e.pageX);
			this.y = holdY(e.pageY);
		});
		const release = (e: PointerEvent) => {
			if (!down) return;
			down = null;
			clearTimeout(holdTimer);
			cv.style.cursor = 'grab';
			// let go before it was picked up: a click or tap (a cancelled press is neither)
			if (this.mode !== 'held') return e.type === 'pointerup' && this.meow();
			// let go: it drops from where its feet hang (feet dipped into the floor start on it), keeping a little of the throw
			this.mode = 'fall';
			this.y = Math.min(bottom(), this.y + HANG);
			this.vy = Math.max(-500, Math.min(300, this.vy * 0.25));
			this.vx = Math.max(-350, Math.min(350, this.vx * 0.25));
		};
		cv.addEventListener('pointerup', release);
		cv.addEventListener('pointercancel', release);
	}

	meow() {
		if (this.napping) {
			this.interrupt();
			this.pose('sit', 1.1);
			this.say('mrrh..?');
			return;
		}
		this.squash(0.92);
		play('meow', 1, 600);
		this.say(pick([['mrrp?', 3], ['mew', 2], ['prrr', 2], ['(=^･ω･^=)', 1]]));
	}
}
