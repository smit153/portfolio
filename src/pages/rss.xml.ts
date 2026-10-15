// /rss.xml: the posts, newest first, for feed readers. Linked from every page's <head>.
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';

export const GET: APIRoute = async ({ site }) => {
	const posts = await getPosts();
	return rss({
		title: "Smit Sojitra's writing",
		description: 'Articles by Smit Sojitra on AI, LLMs, databases and building software, most with interactive demos.',
		site: site ?? 'https://smiit.in',
		trailingSlash: true,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: post.href,
			categories: post.data.tags,
			author: 'smit.sojitra.dev@gmail.com (Smit Sojitra)',
		})),
		customData: '<language>en</language>',
	});
};
