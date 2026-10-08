// Blog posts, shared by the home carousel and /blog.
// TODO: real posts. The images are the ASCII-art placeholders from the Figma file.
import type { ImageMetadata } from 'astro';
import placeholder1 from '../assets/images/blog/placeholder-1.png';
import placeholder2 from '../assets/images/blog/placeholder-2.png';

export interface Post {
	title: string;
	excerpt: string;
	href: string;
	image: ImageMetadata;
	/** shown in the meta block on /blog */
	date: string;
	minutes: number;
	words: number;
	tags: string[];
	revision: string;
}

const post = (image: ImageMetadata): Post => ({
	title: '[Post title]',
	excerpt: '[One-line summary of the post]',
	href: '#',
	image,
	date: '[dd mmm yyyy]',
	minutes: 5,
	words: 1200,
	tags: ['[tag]', '[tag]'],
	revision: 'r1',
});

export const posts: Post[] = [post(placeholder1), post(placeholder2), post(placeholder1), post(placeholder2)];
