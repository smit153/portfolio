// What search engines read: absolute URLs and the schema.org entities (JSON-LD) the pages describe. Every entity
// has a stable @id, so a post's author, the site's publisher and the home page's Person are one and the same.
import { education, jobs } from '../data/profile';

export const SITE = 'https://smiit.in';
export const NAME = 'Smit Sojitra';
/** "<page> – Smit Sojitra" */
export const titled = (page: string) => `${page} – ${NAME}`;
export const abs = (path: string) => new URL(path, SITE).href;

export const ids = {
	person: `${SITE}/#person`,
	website: `${SITE}/#website`,
};

export const sameAs = [
	'https://github.com/smit153',
	'https://www.linkedin.com/in/smit-sojitra/',
	'https://x.com/smit_sojitra153',
	'https://dev.to/smit153',
];

type Thing = Record<string, unknown>;

/** the home page's Person; `image` is an absolute URL to a photo of me */
export function person(image: string): Thing {
	const job = jobs.find((j) => !j.end);
	return {
		'@type': 'Person',
		'@id': ids.person,
		name: NAME,
		url: `${SITE}/`,
		image,
		jobTitle: 'Software Developer & AI Engineer',
		...(job && { worksFor: { '@type': 'Organization', name: job.company } }),
		address: { '@type': 'PostalAddress', addressLocality: 'Bangalore', addressCountry: 'IN' },
		alumniOf: education.map((e) => ({ '@type': 'CollegeOrUniversity', name: e.school })),
		knowsAbout: ['TypeScript', 'Node.js', 'Python', 'AI agents', 'LLMs', 'DevOps'],
		sameAs,
	};
}

export const website: Thing = {
	'@type': 'WebSite',
	'@id': ids.website,
	url: `${SITE}/`,
	name: 'smiit.in',
	description: `${NAME}'s portfolio: projects, writing and experience.`,
	inLanguage: 'en',
	publisher: { '@id': ids.person },
};

/** Home › … › this page; the last crumb is the page itself */
export const breadcrumbs = (crumbs: { name: string; path: string }[]): Thing => ({
	'@type': 'BreadcrumbList',
	itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: c.name,
		item: abs(c.path),
	})),
});
