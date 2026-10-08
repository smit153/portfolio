// Blog posts: MDX files in src/content/blog (Markdown with interactive components dropped in).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({ pattern: '*.mdx', base: './src/content/blog' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			/** one or two lines, shown under the title and on the cards */
			description: z.string(),
			date: z.coerce.date(),
			tags: z.array(z.string()),
			revision: z.string().default('r1'),
			cover: image(),
			coverAlt: z.string(),
		}),
});

export const collections = { blog };
