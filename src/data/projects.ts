// Projects, shared by the home section (featured ones only) and /projects (all of them).
// TODO: replace the [bracketed] placeholders. `icon` is one of the pixel icons in src/lib/pixel-icons.ts.
import type { PixelIconName } from '../lib/pixel-icons';

export interface Project {
	name: string;
	icon: PixelIconName;
	/** one short line, shown while the entry is closed */
	tagline: string;
	/** one or two lines on what the project is and what you did, shown when it's open */
	summary: string;
	points: string[];
	skills: string[];
	repo?: string;
	live?: string;
	status: 'shipped' | 'in progress' | 'archived';
	/** featured projects show on the home page, with a star */
	featured?: boolean;
}

export const projects: Project[] = [
	{
		name: '[project-one]',
		icon: 'cat',
		tagline: '[One short line on what it is]',
		summary: '[One or two lines on what the project is and what you did]',
		points: ['[What you built]', '[A technical challenge you solved]', '[The outcome]'],
		skills: ['[Skill]', '[Skill]', '[Skill]'],
		repo: '#',
		live: '#',
		status: 'shipped',
		featured: true,
	},
	{
		name: '[project-two]',
		icon: 'record',
		tagline: '[One short line on what it is]',
		summary: '[One or two lines on what the project is and what you did]',
		points: ['[What you built]', '[A technical challenge you solved]', '[The outcome]'],
		skills: ['[Skill]', '[Skill]'],
		repo: '#',
		status: 'shipped',
		featured: true,
	},
	{
		name: '[project-three]',
		icon: 'nib',
		tagline: '[One short line on what it is]',
		summary: '[One or two lines on what the project is and what you did]',
		points: ['[What you built]', '[A technical challenge you solved]', '[The outcome]'],
		skills: ['[Skill]', '[Skill]'],
		repo: '#',
		status: 'in progress',
		featured: true,
	},
	{
		name: '[project-four]',
		icon: 'queue',
		tagline: '[One short line on what it is]',
		summary: '[One or two lines on what the project is and what you did]',
		points: ['[What you built]', '[A technical challenge you solved]', '[The outcome]'],
		skills: ['[Skill]'],
		repo: '#',
		status: 'archived',
	},
];

export const featuredProjects = projects.filter((p) => p.featured);
