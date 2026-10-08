// Tiny UUID helpers for the UUIDv7 post's demos. Browser only: they use crypto.getRandomValues.

const toUuid = (b: Uint8Array) => {
	const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export function uuid4() {
	const b = random(16);
	b[6] = (b[6] & 0x0f) | 0x40;
	b[8] = (b[8] & 0x3f) | 0x80;
	return toUuid(b);
}

// keep v7s from this page strictly increasing, even when made in the same millisecond
let lastTs = 0;
export function uuid7() {
	const b = random(16);
	let ts = Date.now();
	if (ts <= lastTs) ts = lastTs + 1;
	lastTs = ts;
	// the 48-bit millisecond timestamp, big-endian, in the first six bytes
	for (let i = 5, t = ts; i >= 0; i--, t = Math.floor(t / 256)) b[i] = t % 256;
	b[6] = (b[6] & 0x0f) | 0x70;
	b[8] = (b[8] & 0x3f) | 0x80;
	return toUuid(b);
}

export function parseUuid(s: string) {
	const hex = s.trim().replace(/^urn:uuid:/i, '').replace(/[{}-]/g, '').toLowerCase();
	if (!/^[0-9a-f]{32}$/.test(hex)) return null;
	return {
		hex,
		ver: parseInt(hex[12], 16),
		variantOk: parseInt(hex[16], 16) >> 2 === 2,
		ts: parseInt(hex.slice(0, 12), 16),
	};
}
