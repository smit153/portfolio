// Number formatting and tiny SVG helpers shared by the long-session-cost demos.

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const big = (n: number) =>
	n >= 1e12 ? `${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `${(n / 1e9).toFixed(1)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : fmt(n);

export const money = (x: number) => (x >= 10 ? '$' + x.toFixed(2) : x >= 0.01 ? '$' + x.toFixed(3) : '$' + x.toFixed(4));

const NS = 'http://www.w3.org/2000/svg';

export function el(tag: string, attrs: Record<string, string | number>, parent?: Element) {
	const e = document.createElementNS(NS, tag);
	for (const k in attrs) e.setAttribute(k, String(attrs[k]));
	parent?.append(e);
	return e;
}

export function txt(parent: Element, x: number, y: number, s: string, attrs: Record<string, string | number> = {}) {
	const t = el('text', { x, y, ...attrs }, parent);
	t.textContent = s;
	return t;
}

// a chart's drawing width follows its box, between 300 and 640 units
export const chartWidth = (host: HTMLElement) => Math.round(Math.min(640, Math.max(300, host.clientWidth || 640)));
