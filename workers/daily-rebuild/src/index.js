// Rebuilds the site once a day, so the GitHub graph (fetched at build time) stays fresh. On its cron it POSTs to
// the site Worker's Workers Builds deploy hook, which starts a normal build: scripts/fetch-github.mjs runs, then
// astro build, then wrangler deploy.
// Secrets (`wrangler secret put …`), never in the repo:
//   DEPLOY_HOOK_URL   the deploy hook (required)
//   HEALTHCHECK_URL   optional, a healthchecks.io check: pinged when the build starts, /fail when it couldn't, so a
//                     missed or failed day emails you instead of passing silently
const ATTEMPTS = 3;

export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(run(env, `cron ${controller.cron}`));
	},
};

async function run(env, why) {
	try {
		const build = await rebuild(env);
		console.log(`rebuild started (${why}): ${build}`);
		await ping(env, '', build);
	} catch (err) {
		console.error(`rebuild failed (${why}): ${err.message}`);
		await ping(env, '/fail', err.message);
		throw err;
	}
}

// a few tries with a growing wait, for a blip in the hook or the network
async function rebuild(env) {
	if (!env.DEPLOY_HOOK_URL) throw new Error('DEPLOY_HOOK_URL is not set');
	let last;
	for (let i = 1; i <= ATTEMPTS; i++) {
		try {
			const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
			const body = await res.text();
			if (res.ok) return body;
			last = new Error(`deploy hook answered ${res.status}: ${body.slice(0, 200)}`);
		} catch (err) {
			last = err;
		}
		if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 2000 * i * i));
	}
	throw last;
}

async function ping(env, path, message) {
	if (!env.HEALTHCHECK_URL) return;
	try {
		await fetch(env.HEALTHCHECK_URL + path, { method: 'POST', body: String(message).slice(0, 1000) });
	} catch {
		// the alert service being down shouldn't count as the rebuild failing
	}
}
