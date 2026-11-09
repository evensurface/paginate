# Next.js demo

This workspace app imports `@evensurface/paginate-drizzle` directly from the monorepo and exercises
it in a Next.js server component backed by Drizzle ORM and a local SQLite database.

From the repository root, run:

```bash
pnpm install
pnpm demo
```

Then open <http://localhost:3000>. The command runs both the package build watcher and Next.js, so
changes to the package can be tested here without publishing it.

`pnpm demo` automatically applies the schema and seeds 47 products before starting. The generated
database lives at `demo/data/demo.db` and is ignored by Git. Copy `.env.example` to `.env`
and set an absolute `PAGINATE_DEMO_DATABASE_PATH` when launching Next.js from another directory.

`pnpm start` does not mutate the database. Run `db:setup` as an explicit deployment step before
starting the production server.

Useful database commands:

```bash
pnpm --filter @evensurface/paginate-demo db:setup
pnpm --filter @evensurface/paginate-demo db:push
pnpm --filter @evensurface/paginate-demo db:seed
```
