// Fetches the last year of GitHub contributions from the official GraphQL API and saves them to
// src/data/github-contributions.json, which is all the site reads (no calls when a page renders).
// Runs before every build (`pnpm build`); run it alone with `pnpm github`. Needs GITHUB_TOKEN in the environment
// (on Cloudflare, a build variable). Without a token, or if GitHub fails, it keeps the last saved snapshot so the
// build still succeeds, and says so.
import fs from 'node:fs';

const LOGIN = 'smit153';
const OUT = 'src/data/github-contributions.json';
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const keep = (why) => {
	const has = fs.existsSync(OUT);
	console.warn(`[github] ${why}; ${has ? `keeping the saved snapshot in ${OUT}` : `no snapshot yet, the graph will show as unavailable`}`);
};

const token = process.env.GITHUB_TOKEN;
if (!token) {
	keep('GITHUB_TOKEN is not set');
	process.exit(0);
}

const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
	totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }`;

try {
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'smiit.in build' },
		body: JSON.stringify({ query, variables: { login: LOGIN } }),
	});
	if (!res.ok) throw new Error(`GitHub GraphQL answered ${res.status}`);
	const json = await res.json();
	const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
	if (!cal) throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors ?? 'no calendar')}`);
	const data = {
		login: LOGIN,
		fetchedAt: new Date().toISOString(),
		total: cal.totalContributions,
		days: cal.weeks.flatMap((w) =>
			w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] })),
		),
	};
	fs.writeFileSync(OUT, JSON.stringify(data) + '\n');
	console.log(`[github] saved ${data.total} contributions over ${data.days.length} days to ${OUT}`);
} catch (err) {
	keep(err.message);
}
