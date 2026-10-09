// The last year of GitHub contributions, read from the snapshot that scripts/fetch-github.mjs saves before each
// build (official GraphQL API). Nothing here touches the network.
import snapshot from '../data/github-contributions.json';

export type ContributionDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };
export type ContributionCalendar = { total: number; days: ContributionDay[]; fetchedAt: string };

/** null when there's no snapshot for this login yet, so the page still builds */
export function getContributions(login: string): ContributionCalendar | null {
	if (snapshot.login !== login || !snapshot.days.length) return null;
	return { total: snapshot.total, days: snapshot.days as ContributionDay[], fetchedAt: snapshot.fetchedAt };
}
