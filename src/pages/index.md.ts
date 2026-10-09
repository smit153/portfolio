// /index.md: the home page as plain Markdown, for language models and anyone who wants it without the canvas.
// Built from the same data as the page (src/data/profile.ts and the posts and projects collections).
import type { APIRoute } from 'astro';
import { about, duration, education, jobs } from '../data/profile';
import { formatDate, getPosts } from '../lib/posts';
import { getProjects } from '../lib/projects';

export const GET: APIRoute = async ({ site }) => {
	const url = (path: string) => new URL(path, site ?? 'https://smiit.in').href;
	const posts = await getPosts();
	const projects = await getProjects();
	const md = [
		'# Smit Sojitra',
		'',
		'Software Developer at Updot.',
		'',
		'## About',
		'',
		...about.map((p) => `- ${p}`),
		'',
		'## Experience',
		'',
		...jobs.flatMap((j) => [
			`### ${j.role}, ${j.company}`,
			'',
			[j.type, j.location, `${j.start} to ${j.end ?? 'present'} (${duration(j.start, j.end)})`].filter(Boolean).join(' · '),
			'',
			...j.points.map((p) => `- ${p}`),
			'',
		]),
		'## Education',
		'',
		...education.flatMap((e) => [`### ${e.school}`, '', `${e.degree} · ${e.location} · ${e.start} to ${e.end}`, '']),
		'## Projects',
		'',
		...projects.flatMap(({ data: p, href }) => [
			`### [${p.title}](${url(href)})`,
			'',
			p.summary,
			'',
			`- ${p.type}, ${p.status}`,
			`- Stack: ${p.stack.join(', ')}`,
			...[p.source && `- Source: ${p.source}`, p.live && `- Live: ${p.live}`].filter(Boolean),
			'',
		]),
		'## Writing',
		'',
		...posts.map((p) => `- [${p.data.title}](${url(p.href)}) (${formatDate(p.data.date)}): ${p.data.description}`),
		'',
		'## Links',
		'',
		'- GitHub: https://github.com/smit153',
		'- LinkedIn: https://www.linkedin.com/in/smit-sojitra/',
		'- X: https://x.com/smit_sojitra153',
		`- Site map for LLMs: ${url('/llms.txt')}`,
		'',
	].join('\n');
	return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
