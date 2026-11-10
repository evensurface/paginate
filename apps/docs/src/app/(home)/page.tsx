import { ArrowRight, Braces, Gauge, ListOrdered } from "lucide-react";
import Link from "next/link";
import { InstallSection } from "./install";

const modes = [
  {
    title: "Numbered pages",
    description:
      "Count records, clamp out-of-range pages, and return complete navigation metadata.",
    href: "/docs/guides/page-pagination",
    icon: ListOrdered,
  },
  {
    title: "Native offsets",
    description:
      "Preserve an exact zero-based offset for APIs that expose offset and limit directly.",
    href: "/docs/guides/offset-pagination",
    icon: Braces,
  },
  {
    title: "Keyset cursors",
    description:
      "Traverse large ordered datasets without counts or increasingly expensive deep offsets.",
    href: "/docs/guides/cursor-pagination",
    icon: Gauge,
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 overflow-hidden bg-fd-background text-fd-foreground">
      <section className="border-b bg-[linear-gradient(180deg,var(--color-fd-muted)/0.28,transparent_55%)]">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-sm border bg-fd-secondary/75 px-2 py-1 text-xs font-medium text-fd-muted-foreground">
              Framework independent
            </span>
            <span className="rounded-sm border bg-fd-secondary/75 px-2 py-1 text-xs font-medium text-fd-muted-foreground">
              TypeScript first
            </span>
            <span className="rounded-sm border bg-fd-secondary/75 px-2 py-1 text-xs font-medium text-fd-muted-foreground">
              ORM agnostic
            </span>
          </div>

          <h1 className="mt-8 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Pagination that fits your data source.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-fd-muted-foreground sm:text-lg sm:leading-8">
            One small, typed API for page, offset, and forward cursor pagination
            in Node.js and TypeScript.
          </p>

          <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/docs/getting-started/quick-start"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-600/90 sm:text-base"
            >
              Get started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/docs/getting-started/choosing-a-strategy"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-fd-secondary/60 px-5 text-sm font-medium transition-colors hover:bg-fd-secondary sm:text-base"
            >
              Choose a strategy
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl border-x border-b">
        <div className="border-b px-4 py-10 text-center sm:px-6 sm:py-12">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Three pagination modes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-fd-muted-foreground">
            Use a consistent result shape while keeping query execution inside
            your adapter.
          </p>
        </div>
        <div className="grid md:grid-cols-3">
          {modes.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group border-b p-6 transition-colors hover:bg-fd-muted/40 md:border-b-0 md:border-r md:last:border-r-0 lg:p-8"
            >
              <div className="flex size-11 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 flex items-center text-xl font-semibold">
                {title}
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </h3>
              <p className="mt-2 leading-7 text-fd-muted-foreground">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <InstallSection />
    </main>
  );
}
