// The site moves between pages with Astro's client router (<ClientRouter /> in Layout.astro), so a bundled script runs
// only the first time a page that has it is shown. onPage runs `setup` on every page shown instead, the first load
// included, and aborts the signal it's given as the visitor leaves: pass it to listeners on window and document, and
// stop timers, observers and animation loops on it, so they don't pile up across visits.
export function onPage(setup: (signal: AbortSignal) => void) {
	let leave: AbortController | null = null;
	document.addEventListener('astro:page-load', () => {
		leave?.abort();
		leave = new AbortController();
		setup(leave.signal);
	});
	document.addEventListener('astro:before-swap', () => {
		leave?.abort();
		leave = null;
	});
}

/** run `stop` when the signal aborts */
export const onLeave = (signal: AbortSignal, stop: () => void) => signal.addEventListener('abort', stop, { once: true });
