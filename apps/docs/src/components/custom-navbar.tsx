"use client";

import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { useHomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, FC, ReactNode } from "react";
import { useState } from "react";
import { appName, brandIconPath, gitConfig } from "@/lib/shared";
import { GithubLogo } from "./logo";

const githubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/getting-started/quick-start", label: "Quick start" },
  { href: "/docs/guides/cursor-pagination", label: "Cursor" },
  { href: "/docs/api-reference", label: "API Ref." },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function CustomNavbarBrand() {
  return (
    <Link
      href="/"
      className="inline-flex min-w-0 items-center gap-2.5 text-fd-foreground transition-colors hover:text-fd-primary"
    >
      <Image
        src={brandIconPath}
        alt=""
        width={28}
        height={28}
        className="rounded-sm"
        aria-hidden="true"
      />
      <span
        className="truncate text-base lowercase font-medium"
        style={{ fontFamily: "var(--font-geist)" }}
      >
        {appName.replace(" ", "-")}
      </span>
    </Link>
  );
}

function NavbarShell({
  className,
  variant,
  showSidebarTrigger = false,
  slots,
  navChildren,
  ...props
}: ComponentProps<"header"> & {
  variant: "home" | "docs";
  showSidebarTrigger?: boolean;
  slots: {
    navTitle?: FC<ComponentProps<"a">> | false;
    searchTrigger?:
      | {
          sm: FC<{ hideIfDisabled?: boolean; className?: string }>;
          full: FC<{ hideIfDisabled?: boolean; className?: string }>;
        }
      | false;
    sidebar?: {
      trigger: FC<{ className?: string; children?: ReactNode }>;
    };
  };
  navChildren?: ReactNode;
}) {
  const searchTrigger = slots.searchTrigger || undefined;
  const SearchSmall = searchTrigger?.sm;
  const SidebarTrigger = slots.sidebar?.trigger;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      {...props}
      className={cx(
        "sticky top-0 z-40 border-b bg-fd-background/85 backdrop-blur-md",
        variant === "home" && "h-16",
        variant === "docs" &&
          "h-14 md:hidden [grid-area:header] top-(--fd-docs-row-1) max-md:layout:[--fd-header-height:--spacing(14)]",
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {showSidebarTrigger && SidebarTrigger ? (
          <SidebarTrigger className="md:hidden">
            <Menu className="size-4" aria-hidden="true" />
          </SidebarTrigger>
        ) : null}

        <CustomNavbarBrand />

        {navChildren}

        <nav className="ml-2 hidden items-center gap-0.5 text-sm text-fd-muted-foreground sm:flex">
          {navLinks.map((link) => (
            <Link
              href={link.href}
              style={{ fontFamily: "var(--font-geist)" }}
              className="rounded-sm px-2.5 h-10 flex items-center text-base lowercase transition-colors hover:text-fd-accent-foreground"
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5">
          {SearchSmall ? (
            <SearchSmall
              hideIfDisabled
              className="size-8 rounded-md border bg-black/[0.03] transition-colors hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] cursor-pointer"
            />
          ) : null}
          <Link
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            style={{ fontFamily: "var(--font-geist)" }}
            className="group hidden md:inline-flex h-8 items-center gap-x-0.5 rounded-md border bg-neutral-900 px-3 text-base text-white shadow-sm transition-[background-color,color,box-shadow,transform] hover:bg-neutral-800 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring dark:bg-white dark:font-medium dark:text-black dark:hover:bg-neutral-200"
          >
            <span className="max-[360px]:hidden">github</span>
            <ArrowUpRight
              strokeWidth={2}
              className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            style={{ fontFamily: "var(--font-geist)" }}
            className="group inline-flex md:hidden size-8 items-center justify-center gap-x-0.5 rounded-md border bg-neutral-900 text-base text-white shadow-sm transition-[background-color,color,box-shadow,transform] hover:bg-neutral-800 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring dark:bg-white dark:font-medium dark:text-black dark:hover:bg-neutral-200"
          >
            <GithubLogo size={18} />
          </Link>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-black/[0.03] transition-colors hover:bg-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring sm:hidden dark:bg-white/[0.06] dark:hover:bg-white/[0.12]"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <X className="size-4" aria-hidden="true" />
            ) : (
              <Menu className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div
        className={cx(
          "absolute inset-x-0 top-full border-b bg-fd-background/95 px-4 py-3 shadow-lg backdrop-blur-md sm:hidden",
          mobileMenuOpen ? "block" : "hidden",
        )}
      >
        <nav className="grid gap-1 text-sm text-fd-muted-foreground">
          {navLinks.map((link) => (
            <Link
              href={link.href}
              style={{ fontFamily: "var(--font-geist)" }}
              className="flex h-10 items-center rounded-md px-3 text-base lowercase transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              key={link.href}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function CustomHomeNavbar(props: ComponentProps<"header">) {
  const { props: layoutProps, slots } = useHomeLayout();

  return (
    <NavbarShell
      {...props}
      variant="home"
      slots={slots}
      navChildren={layoutProps.nav?.children}
    />
  );
}

export function CustomDocsNavbar(props: ComponentProps<"header">) {
  const { props: layoutProps, slots } = useDocsLayout();

  return (
    <NavbarShell
      {...props}
      variant="docs"
      slots={slots}
      navChildren={layoutProps.nav?.children}
      showSidebarTrigger
    />
  );
}
