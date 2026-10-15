// wawoff2 ships no types; the OG cards (src/pages/og/[slug].png.ts) only unpack WOFF2 fonts with it
declare module 'wawoff2' {
	export function decompress(data: Uint8Array): Promise<Uint8Array>;
}
