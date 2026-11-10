"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GithubLogo } from "@/components/logo";

const INSTALL_COMMAND = "pnpm add @evensurface/paginate";
const COPY_RESET_DELAY = 1600;

export function InstallSection() {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, COPY_RESET_DELAY);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-7xl overflow-hidden border-x border-b">
      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <button
            type="button"
            onClick={copyCommand}
            aria-label={`Copy install command: ${INSTALL_COMMAND}`}
            className={[
              "group relative flex w-full cursor-copy items-center overflow-visible rounded-xl border px-4 py-5 text-left outline-none transition-[border-color,box-shadow,transform] duration-200 sm:px-6 sm:py-6",
              "active:scale-[0.997]",
              "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background",
              copied
                ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                : "border-blue-500/25 bg-blue-500/[0.06] hover:border-blue-500/45",
            ].join(" ")}
          >
            <div className="flex min-w-0 items-center gap-3 overflow-x-auto">
              <code
                style={{ fontFamily: "var(--font-geist-mono)" }}
                className={[
                  "whitespace-nowrap text-sm sm:text-base lg:text-lg",
                  copied ? "text-emerald-100" : "text-neutral-200",
                ].join(" ")}
              >
                {INSTALL_COMMAND}
              </code>

              {copied ? (
                <Check className="ml-auto size-4 shrink-0 text-emerald-400" />
              ) : null}
            </div>

            <span
              role="tooltip"
              className={[
                "pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium opacity-0 shadow-lg transition-all duration-150 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100",
                copied
                  ? "border-emerald-500/30 bg-emerald-950 text-emerald-300"
                  : "border-white/10 bg-neutral-950 text-neutral-300",
              ].join(" ")}
            >
              {copied ? "Copied" : "Click to copy"}

              <span
                aria-hidden="true"
                className={[
                  "absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r",
                  copied
                    ? "border-emerald-500/30 bg-emerald-950"
                    : "border-white/10 bg-neutral-950",
                ].join(" ")}
              />
            </span>
          </button>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/docs/getting-started/quick-start"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-600/90 sm:w-auto"
            >
              Quick start
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="https://github.com/evensurface/paginate"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-fd-secondary/60 px-5 text-sm font-medium text-fd-secondary-foreground transition-colors hover:bg-fd-secondary sm:w-auto"
            >
              <GithubLogo className="size-4" />
              View source
            </Link>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? "Install command copied." : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
