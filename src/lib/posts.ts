// The blog posts, newest first, with what the cards and post pages show: link, word count, reading time.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'> & {
	href: string;
	words: number;
	minutes: number;
};

/** words a reader actually reads: the Markdown text without imports, components, code or URLs */
function countWords(body = '') {
	const text = body
		.replace(/^import .*$/gm, '')
		.replace(/```[\s\S]*?```/g, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\]\([^)]*\)/g, ']')
		.replace(/[#>*_|`[\]-]/g, ' ');
	return text.split(/\s+/).filter((w) => /\w/.test(w)).length;
}

export async function getPosts(): Promise<Post[]> {
	const entries = await getCollection('blog');
	return entries
		.map((entry) => {
			const words = countWords(entry.body);
			// about 220 words a minute, plus a little time for the demos
			return { ...entry, href: `/blog/${entry.id}`, words, minutes: Math.max(1, Math.round(words / 220) + 1) };
		})
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** "08 oct 2026" */
export const formatDate = (d: Date) =>
	d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toLowerCase();
