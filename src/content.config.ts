// Content collections: blog posts (MDX, with interactive components dropped in) and projects (Markdown case studies).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { pixelIcons } from './lib/pixel-icons';

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

const projects = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/projects' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			/** one or two sentences: what it is and who it's for */
			summary: z.string(),
			/** one short line for the closed row in the project tree */
			tagline: z.string(),
			/** three short points for the tree's NOTES.md */
			notes: z.array(z.string()),
			type: z.string(),
			role: z.string().optional(),
			/** quarters, e.g. "Q3 2024" */
			built: z.string(),
			updated: z.string(),
			live: z.url().optional(),
			source: z.url().optional(),
			stack: z.array(z.string()),
			status: z.enum(['shipped', 'in progress', 'archived']),
			metric: z.string().optional(),
			icon: z.enum(Object.keys(pixelIcons) as [keyof typeof pixelIcons, ...(keyof typeof pixelIcons)[]]),
			/** featured projects show on the home page, with a star */
			featured: z.boolean().default(false),
			/** position in the lists, lowest first */
			order: z.number(),
			/** until a project has a cover, its page shows its pixel icon large instead */
			cover: image().optional(),
			coverAlt: z.string().optional(),
		}),
});

export const collections = { blog, projects };
