// /og/<post>.png: each post's link preview card (1200x630), made at build time in the same spec-sheet style as
// public/og.png: hatched bands, a framed panel with the headline, and a row of labelled cells under it.
// satori lays it out and draws the text as paths (it reads TTF, not WOFF2, so the site's fonts are unpacked first),
// and sharp turns the SVG into a PNG.
import fs from 'node:fs/promises';
import type { APIRoute, GetStaticPaths } from 'astro';
import satori from 'satori';
import sharp from 'sharp';
import { decompress } from 'wawoff2';
import { formatDate, getPosts, type Post } from '../../lib/posts';

export const getStaticPaths = (async () => {
	const posts = await getPosts();
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}) satisfies GetStaticPaths;

const font = async (file: string) => Buffer.from(await decompress(await fs.readFile(`src/assets/fonts/${file}.woff2`)));
// unpacked once for all the cards
let fonts: Promise<Parameters<typeof satori>[1]['fonts']> | undefined;
const loadFonts = () =>
	(fonts ??= Promise.all([font('SohneMono-Buch'), font('SohneMono-Kraftig'), font('GrapeNuts-Regular')]).then(([buch, kraftig, grape]) => [
		{ name: 'Sohne Mono', data: buch, weight: 400, style: 'normal' },
		{ name: 'Sohne Mono', data: kraftig, weight: 500, style: 'normal' },
		{ name: 'Grape Nuts', data: grape, weight: 400, style: 'normal' },
	]));

const INK = '#09090b';
const PANEL = '#0c0c0e';
const LINE = '#1f2020';
const MUTED = '#5a5a5a';
const W = 1200;
const H = 630;
const BAND = 44;
const SIDE = 80;

type Node = { type: string; props: Record<string, unknown> };
const h = (style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
	type: 'div',
	props: { style: { display: 'flex', ...style }, children },
});

const hatch = (top: number) =>
	h({
		position: 'absolute',
		left: 0,
		top,
		width: W,
		height: BAND,
		backgroundImage: `repeating-linear-gradient(-45deg, transparent 0px, transparent 13px, ${LINE} 13px, ${LINE} 15px)`,
	});

const cell = (label: string, value: string, first = false) =>
	h(
		{ flex: 1, flexDirection: 'column', gap: 14, padding: '34px 32px', borderLeft: first ? 'none' : `1px solid ${LINE}` },
		h({ fontSize: 16, letterSpacing: 2, color: MUTED }, label.toUpperCase()),
		h({ fontSize: 24, color: '#ffffff' }, value),
	);

function card(post: Post): Node {
	const title = post.data.title;
	const size = title.length > 60 ? 48 : 56;
	return h(
		{ position: 'relative', width: W, height: H, backgroundColor: INK, fontFamily: 'Sohne Mono' },
		hatch(0),
		hatch(H - BAND),
		// the frame: a line under and over the bands, and the column's sides
		h({ position: 'absolute', left: 0, top: BAND, width: W, height: 1, backgroundColor: LINE }),
		h({ position: 'absolute', left: 0, top: H - BAND - 1, width: W, height: 1, backgroundColor: LINE }),
		h(
			{
				position: 'absolute',
				left: SIDE,
				top: BAND + 1,
				width: W - SIDE * 2,
				height: H - BAND * 2 - 2,
				flexDirection: 'column',
				backgroundColor: PANEL,
				borderLeft: `1px solid ${LINE}`,
				borderRight: `1px solid ${LINE}`,
			},
			h(
				{ flex: 1, flexDirection: 'column', padding: '44px 40px 0' },
				h({ fontFamily: 'Grape Nuts', fontSize: 30, color: '#8d8d8d' }, 'a note on smiit.in'),
				h({ marginTop: 18, fontSize: size, fontWeight: 500, lineHeight: 1.18, letterSpacing: -1, color: '#ffffff' }, title),
			),
			h(
				{ borderTop: `1px solid ${LINE}` },
				cell('Written by', 'Smit Sojitra', true),
				cell('Filed', `${formatDate(post.data.date)} · ${post.minutes} min`),
				cell('Read it at', 'smiit.in/writing'),
			),
		),
	);
}

export const GET: APIRoute = async ({ props }) => {
	const svg = await satori(card((props as { post: Post }).post) as never, { width: W, height: H, fonts: await loadFonts() });
	const png = await sharp(Buffer.from(svg)).png().toBuffer();
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
