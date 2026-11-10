# Documentation site

This Fumadocs site is exported as static HTML, CSS, JavaScript, and JSON. It does not require a
Node.js server, Cloudflare Workers, OpenNext, or Wrangler in production.

## Local development

From the repository root:

```bash
pnpm --filter docs dev
```

## Build and preview

```bash
pnpm --filter docs build
pnpm --filter docs start
```

The production export is written to `apps/docs/out`. The preview command serves that directory
locally.

Search remains entirely static. During the build, Fumadocs pre-renders `/api/search` as JSON; the
browser downloads that generated index and searches it locally. There is no production API server.

## Cloudflare Pages

Create a Pages project using Git integration and use these settings:

| Setting                | Value                      |
| ---------------------- | -------------------------- |
| Framework preset       | None                       |
| Root directory         | `/`                        |
| Build command          | `pnpm --filter docs build` |
| Build output directory | `apps/docs/out`            |
| Production branch      | `main`                     |

Add the build environment variable `NODE_VERSION=22.18.0` (or a newer Node 22 release). The
repository's `packageManager` field pins pnpm 11.15.0, so Cloudflare can install the workspace with
Corepack.

`NEXT_PUBLIC_SITE_URL` is optional and defaults to `https://paginate.evensurface.com`. Set it to the final
site origin, without a path, before the first production build so canonical URLs, sitemap entries,
and Open Graph URLs use the correct domain.

After the first deployment, open the Pages project, choose **Custom domains**, select **Set up a
domain**, and follow Cloudflare's DNS prompts. Rebuild after changing `NEXT_PUBLIC_SITE_URL`.
