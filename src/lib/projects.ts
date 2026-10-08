// The projects in list order, with the link to each one's page. Shared by the home tree, /projects and the
// project pages.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'> & { href: string };

export async function getProjects(): Promise<Project[]> {
	const entries = await getCollection('projects');
	return entries.map((entry) => ({ ...entry, href: `/projects/${entry.id}` })).sort((a, b) => a.data.order - b.data.order);
}
