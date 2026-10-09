# smiit.in

My portfolio and notes, live at [smiit.in](https://smiit.in). A greyscale, pixel-art site built with Astro: an
interactive desk you can type on, a cat that lives on the page, projects as a file tree, and blog posts with
interactive demos.

## What's on it

- **The desk** (`src/components/RiveHero.astro`): a [Rive](https://rive.app) scene. Type on your keyboard and it types
  on the monitor, drop the needle on the record player, open the book, drag the notes. It starts after the first
  paint and shows a still of its first frame until then, so it never holds up the page.
- **The cat** (`src/lib/desk-cat.ts`): a PixelLab sprite that walks, sits and naps on the ASCII strip at the bottom.
  Click it for a meow, press and hold to pick it up by the scruff.
- **Projects** (`src/content/projects`): each one opens into a small file tree (README, NOTES, stack, links), with a
  case-study page per project.
- **Writing** (`src/content/blog`): MDX posts with live demos, a reading-progress pill and a meta block per post.
- **GitHub graph**: the last year of contributions, fetched at build time and rebuilt daily.
- **Machine-readable versions**: [`/index.md`](https://smiit.in/index.md) and [`/llms.txt`](https://smiit.in/llms.txt).

## Stack

[Astro 7](https://astro.build) with MDX, Tailwind CSS 4, Rive, Embla for the blog carousel and Mermaid for the
project diagrams. Deployed as a Cloudflare Worker serving static assets; every page is prerendered and images are
processed at build time with sharp. All fonts are self-hosted: Söhne Mono, Grape Nuts, and Caveat (fetched from
Google Fonts at build time).

## Running it

Needs Node 22.12+ and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # fetches the GitHub graph, then builds to ./dist
pnpm preview      # serves the build locally
```

`pnpm build` runs `scripts/fetch-github.mjs` first, which needs `GITHUB_TOKEN` in the environment. Without it the
build keeps the last saved snapshot in `src/data/github-contributions.json`, so it still succeeds.
`pnpm github` runs the fetch on its own.

## Layout

```text
src/
  pages/          index, /blog, /projects, their [slug] pages, index.md and llms.txt
  components/     page sections (Header, RiveHero, Experience, Projects, Stacks, Blogs, ...)
    blog/         post furniture (Demo, PostMeta, SectionPill) and each post's demos
    project/      case-study pieces (diagrams, meta)
  content/        blog posts (MDX) and projects (Markdown), see content.config.ts
  data/           profile (jobs, education, about), GitHub snapshot, keyboard map for the desk
  lib/            the cat, the footer's dot-matrix lens, pixel icons, post and project helpers
  assets/         fonts, covers, logos, icons, the cat sprite and the Rive scene
scripts/          one-off build helpers (below)
workers/
  daily-rebuild/  a cron Worker that triggers a rebuild every morning, so the GitHub graph stays current
```

## Scripts

| Script | What it does |
| --- | --- |
| `scripts/fetch-github.mjs` | Saves the last year of GitHub contributions (runs before every build) |
| `scripts/dither-cover.mjs <in.png> <slug>` | Turns a photo into a dithered black-and-white blog cover |
| `scripts/fetch-stack-logos.mjs` | Downloads the Stacks logos from Simple Icons, recoloured to the site's grey |
| `scripts/build-favicon.mjs` | Builds the favicons from the header's pixel initials |
| `scripts/build-cat-sprite.mjs` | Packs the PixelLab cat frames into one sprite sheet |

Run any of them with `node scripts/<name>.mjs`.

## Deploying

Cloudflare Workers Builds deploys every push to `main`: build command `pnpm build`, deploy command
`npx wrangler deploy` (see `wrangler.jsonc`). `GITHUB_TOKEN` is set as a build variable there.

The daily rebuild lives in `workers/daily-rebuild`. Deploy it from that folder with `npx wrangler deploy`, then set
its deploy hook with `npx wrangler secret put DEPLOY_HOOK_URL`.

## License

[MIT](LICENSE) © Smit Sojitra
