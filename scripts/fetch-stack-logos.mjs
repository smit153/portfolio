// Downloads the brand logos for the Stacks section from Simple Icons (CC0, one-colour SVGs), recoloured to the
// site's light grey, into src/assets/stack/. Skills without a brand logo use pixel icons instead (see Stacks.astro).
// Run with `node scripts/fetch-stack-logos.mjs` after adding a slug below; https://simpleicons.org lists them.
import fs from 'node:fs';

const VERSION = '15.22.0';
const FILL = '#d4d4d4';
const OUT = 'src/assets/stack';

const SLUGS = [
	// backend
	'nodedotjs', 'express', 'nestjs', 'hono', 'deno', 'fastapi', 'pydantic', 'graphql', 'trpc', 'socketdotio', 'stripe', 'payloadcms', 'strapi', 'celery',
	// data & cloud
	'postgresql', 'mongodb', 'redis', 'supabase', 'prisma', 'elasticsearch', 'docker', 'kubernetes', 'terraform', 'nginx', 'googlecloud', 'githubactions', 'meilisearch', 'prometheus', 'sentry', 'opentelemetry', 'neo4j',
	// gen ai
	'langchain', 'langgraph', 'vercel', 'modelcontextprotocol',
	// frontend
	'react', 'nextdotjs', 'expo', 'vuedotjs', 'nuxt', 'tailwindcss', 'shadcnui', 'framer', 'threedotjs', 'gsap', 'reactquery', 'solid', 'reactrouter', 'astro', 'svelte',
	// languages
	'typescript', 'javascript', 'python', 'go', 'openjdk', 'cplusplus',
];

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const slug of SLUGS) {
	const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${VERSION}/icons/${slug}.svg`);
	if (!res.ok) {
		console.warn(`missing: ${slug} (${res.status})`);
		continue;
	}
	// simple icons are a single path with no fill: give the svg the site's grey
	const svg = (await res.text()).replace('<svg ', `<svg fill="${FILL}" `);
	fs.writeFileSync(`${OUT}/${slug}.svg`, svg);
	n++;
}
console.log(`saved ${n} of ${SLUGS.length} logos to ${OUT}`);
