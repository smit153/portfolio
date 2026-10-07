// Last-year GitHub contribution calendar, fetched at build time (and once per dev-server session).
// Uses the official GraphQL API when GITHUB_TOKEN is set, otherwise the public, unofficial
// github-contributions-api.jogruber.de mirror, which needs no token.

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type ContributionCalendar = { total: number; days: ContributionDay[] };

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 } as const;

async function fromGraphQL(login: string, token: string): Promise<ContributionCalendar> {
	const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
		totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }`;
	const res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, variables: { login } }),
	});
	if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
	const json = await res.json();
	const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
	if (!cal) throw new Error(`GitHub GraphQL: ${JSON.stringify(json.errors ?? 'no calendar')}`);
	return {
		total: cal.totalContributions,
		days: cal.weeks.flatMap((w: { contributionDays: Array<Record<string, string | number>> }) =>
			w.contributionDays.map((d) => ({
				date: d.date as string,
				count: d.contributionCount as number,
				level: LEVELS[d.contributionLevel as keyof typeof LEVELS],
			})),
		),
	};
}

async function fromPublicApi(login: string): Promise<ContributionCalendar> {
	const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${login}?y=last`);
	if (!res.ok) throw new Error(`contributions API ${res.status}`);
	const json = await res.json();
	return { total: json.total.lastYear, days: json.contributions };
}

const cache = new Map<string, Promise<ContributionCalendar | null>>();

/** Returns null if both sources fail, so the page still builds. */
export function getContributions(login: string): Promise<ContributionCalendar | null> {
	if (!cache.has(login)) {
		const token = import.meta.env.GITHUB_TOKEN;
		cache.set(
			login,
			(token ? fromGraphQL(login, token) : Promise.reject(new Error('no GITHUB_TOKEN')))
				.catch(() => fromPublicApi(login))
				.catch((err) => {
					console.warn(`[github] contributions unavailable for ${login}:`, err);
					return null;
				}),
		);
	}
	return cache.get(login)!;
}
