import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import { brandIconPath, gitConfig, packageName } from "./shared";

function GitHubIcon() {
  return (
    <svg role="img" viewBox="0 0 24 24" fill="currentColor">
      <title>GitHub</title>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M0 0v24h24V0H0Zm4.8 4.8h14.4v14.4H12V9.6H9.6v9.6H4.8V4.8Z" />
    </svg>
  );
}

function BrandTitle() {
  return (
    <span className="inline-flex items-center gap-2">
      <Image
        src={brandIconPath}
        alt=""
        width={28}
        height={28}
        className="rounded-md"
        aria-hidden="true"
      />
      <span className="truncate text-base lowercase font-medium">
        {gitConfig.repo}
      </span>
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: <BrandTitle />,
    },
    links: [
      {
        type: "icon",
        label: "GitHub",
        text: "GitHub",
        icon: <GitHubIcon />,
        url: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
        external: true,
      },
      {
        type: "icon",
        label: `View ${packageName} on npm`,
        text: "npm",
        icon: <NpmIcon />,
        url: `https://www.npmjs.com/package/${packageName}`,
        external: true,
      },
    ],
  };
}
