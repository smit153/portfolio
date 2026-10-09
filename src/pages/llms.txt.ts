// /llms.txt: a plain-text map of the site for language models (llmstxt.org), built from the posts and projects.
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { getProjects } from '../lib/projects';

export const GET: APIRoute = async ({ site }) => {
	const url = (path: string) => new URL(path, site ?? 'https://smiit.in').href;
	const posts = await getPosts();
	const projects = await getProjects();
	const text = [
		'# Smit Sojitra',
		'',
		'> Software developer at Updot. Full-stack and backend engineering, AI agents and LLM workflows, cloud infrastructure and DevOps.',
		'',
		'## Writing',
		'',
		...posts.map((p) => `- [${p.data.title}](${url(p.href)}): ${p.data.description}`),
		'',
		'## Projects',
		'',
		...projects.map((p) => `- [${p.data.title}](${url(p.href)}): ${p.data.summary}`),
		'',
		'## Pages',
		'',
		`- [Home](${url('/')}): about, experience, projects, stack, writing and contact`,
		`- [All projects](${url('/projects')})`,
		`- [All writing](${url('/blog')})`,
		'',
		'## Optional',
		'',
		`- [index.md](${url('/index.md')}): the home page as Markdown (about, experience, education, projects, writing)`,
		'',
	].join('\n');
	return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
