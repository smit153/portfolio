// iOS fallback for the bands' slits. Everywhere else the art behind them is a `background-attachment: fixed`
// background (see Band.astro) and needs no script. iOS Safari ignores `fixed` and lets the background scroll with
// the band, so there each visible slit's background is shifted on scroll to stay put relative to the screen,
// which gives the same "looking through a gap at something still" effect.

const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function pinSlitsOnIOS() {
	if (!isIOS()) return;
	const slits = [...document.querySelectorAll<HTMLElement>('[data-band-slit]')];
	if (!slits.length) return;
	const visible = new Set<HTMLElement>();
	let queued = 0;

	const pin = () => {
		queued = 0;
		for (const s of visible) {
			const r = s.getBoundingClientRect();
			s.style.backgroundPosition = `${-Math.round(r.left)}px ${-Math.round(r.top)}px`;
		}
	};
	const queue = () => {
		queued ||= requestAnimationFrame(pin);
	};

	for (const s of slits) s.style.backgroundAttachment = 'scroll';
	const io = new IntersectionObserver((entries) => {
		for (const e of entries) {
			if (e.isIntersecting) visible.add(e.target as HTMLElement);
			else visible.delete(e.target as HTMLElement);
		}
		queue();
	});
	slits.forEach((s) => io.observe(s));
	addEventListener('scroll', queue, { passive: true });
	addEventListener('resize', queue);
}
