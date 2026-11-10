import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
    Note,
    Warning,
    Callout,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

import type { ReactNode } from "react";

type CalloutVariant = "note" | "warning";

type CalloutProps = {
  children: ReactNode;
  title?: string;
  variant: CalloutVariant;
};

const variants = {
  note: {
    container:
      "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    defaultTitle: "Note",
  },
  warning: {
    container:
      "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    defaultTitle: "Warning",
  },
} satisfies Record<
  CalloutVariant,
  {
    container: string;
    icon: string;
    defaultTitle: string;
  }
>;

export function Callout({ children, title, variant }: CalloutProps) {
  const styles = variants[variant];

  return (
    <aside
      className={`my-6 flex gap-3 rounded-lg border px-4 py-3 ${styles.container}`}
      role={variant === "warning" ? "alert" : "note"}
    >
      <div className={`mt-0.5 shrink-0 ${styles.icon}`} aria-hidden="true">
        {variant === "warning" ? <WarningIcon /> : <NoteIcon />}
      </div>

      <div className="min-w-0 text-sm leading-6">
        <p className="mb-1.5 mt-0 font-semibold">
          {title ?? styles.defaultTitle}
        </p>

        <div className="[&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </aside>
  );
}

export function Note({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <Callout variant="note" title={title}>
      {children}
    </Callout>
  );
}

export function Warning({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <Callout variant="warning" title={title}>
      {children}
    </Callout>
  );
}

function NoteIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
