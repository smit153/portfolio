// Rebuilds the site once a day, so the GitHub graph (fetched at build time) stays fresh. On its cron it POSTs to
// the Cloudflare Pages deploy hook, which starts a normal build: scripts/fetch-github.mjs runs, then astro build.
// DEPLOY_HOOK_URL is a secret (`wrangler secret put DEPLOY_HOOK_URL`), never in the repo.
export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(rebuild(env, `cron ${controller.cron}`));
	},
};

async function rebuild(env, why) {
	if (!env.DEPLOY_HOOK_URL) throw new Error('DEPLOY_HOOK_URL is not set');
	const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
	if (!res.ok) throw new Error(`deploy hook answered ${res.status}: ${await res.text()}`);
	console.log(`rebuild started (${why})`);
}
