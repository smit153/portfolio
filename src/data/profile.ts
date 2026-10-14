// Who I am, where I've worked and where I studied (from LinkedIn). Shared by the home page and /index.md.
import mastork from '../assets/logos/mastork.png';
import upraised from '../assets/logos/upraised.png';
import updot from '../assets/logos/updot.svg';

// From LinkedIn. Dates are "MM.YYYY"; the duration is worked out from them, counting both end months like
// LinkedIn does. A job without points shows just its headline facts; `open` decides whether one starts expanded.
export interface Job {
	company: string;
	/** without a logo, the job gets the pixel briefcase; logos are light grey on transparent */
	logo?: ImageMetadata;
	location?: string;
	role: string;
	type?: string;
	start: string;
	/** omit for a current job */
	end?: string;
	points: string[];
	open?: boolean;
}
export const jobs: Job[] = [
	{
		company: 'Updot',
		logo: updot,
		location: 'Bangalore, India',
		role: 'Software Developer',
		type: 'Full time',
		start: '06.2024',
		points: [
			'Take projects end to end, from scoping and architecture through to launch and the fixes after it.',
			'Build full-stack web apps: the frontend, the APIs behind it and the data model underneath.',
			'Set up and customise headless CMSs (Payload, Strapi, Hygraph and Sanity), shaping content so editors can run their sites without a developer.',
			'Own deployments: environments, build pipelines and releases, and keep things healthy once they are live.',
			'Work with designers and stakeholders to turn ideas into scoped features, and pick the right stack for each project.',
		],
		open: true,
	},
	{
		company: 'Upraised',
		logo: upraised,
		location: 'Remote',
		role: 'Software Developer',
		type: 'Internship',
		start: '07.2023',
		end: '01.2024',
		points: [
			'Built an AI-driven recruiting platform on the MERN stack that automates recruitment work.',
			'Worked across the frontend and backend, with React.js for the interactive interfaces.',
			'Added AI features that made candidate sourcing and selection faster.',
		],
	},
	{
		company: 'Mastork Technologies',
		logo: mastork,
		location: 'Remote',
		role: 'Software Developer',
		type: 'Internship',
		start: '01.2023',
		end: '03.2023',
		points: [
			'Started as a React Native developer, building high-quality mobile apps.',
			'Moved to the MERN stack, building web apps with MongoDB, Express.js, React.js and Node.js.',
			'Came away with hands-on experience across both mobile and web development.',
		],
	},
];

/** "06.2024" to "06.2024" is 1 month; "06.2024" to now is however long it has been */
export function duration(start: string, end?: string) {
	const [sm, sy] = start.split('.').map(Number);
	const now = new Date();
	const [em, ey] = end ? end.split('.').map(Number) : [now.getMonth() + 1, now.getFullYear()];
	const months = (ey - sy) * 12 + (em - sm) + 1;
	const y = Math.floor(months / 12);
	const m = months % 12;
	const part = (n: number, unit: string) => (n ? `${n} ${unit}${n === 1 ? '' : 's'}` : '');
	return [part(y, 'year'), part(m, 'month')].filter(Boolean).join(' ');
}

export const education = [
	{
		school: 'Amity University Jaipur',
		degree: 'B.Tech in Computer Science',
		location: 'Jaipur, India',
		start: '2020',
		end: '2024',
	},
];

// the About section's points (the page adds a last one linking the projects)
export const about = [
	"I'm Smit Sojitra, a software developer at Updot with 3+ years of building products that solve real problems.",
	'I work across full-stack and backend engineering, AI agents and LLM workflows, cloud infrastructure and DevOps.',
	'I start with the problem, pick the right tech for it, and take products from idea to production.',
	"Right now I'm building and exploring products around AI, automation and modern software systems.",
];
