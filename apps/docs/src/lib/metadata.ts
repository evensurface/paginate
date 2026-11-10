import type { Metadata } from "next";
import { appName, docsImageRoute, gitConfig, packageName } from "./shared";

const fallbackSiteUrl = "https://paginate.evensurface.com";
export const repositoryUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
export const npmPackageUrl = `https://www.npmjs.com/package/${packageName}`;

export const siteTitle = "Paginate - Typed page, offset, and cursor pagination";
export const siteDescription =
  "Framework-independent page, offset, and keyset cursor pagination for Node.js and TypeScript.";
export const siteKeywords = [
  "pagination",
  packageName,
  "TypeScript pagination",
  "cursor pagination",
  "keyset pagination",
  "offset pagination",
  "page pagination",
  "Node.js pagination",
  "ORM agnostic pagination",
];

function createSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl;

  try {
    const url = new URL(rawUrl);
    const isLocalUrl = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

    if (process.env.NODE_ENV === "production" && isLocalUrl)
      return new URL(fallbackSiteUrl);
    return new URL(url.origin);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export const siteUrl = createSiteUrl();
export const siteBaseUrl = siteUrl.origin;
export const ogImageUrl = new URL(`${docsImageRoute}/image.png`, siteUrl);

export function toAbsoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export function createPageTitle(title: string) {
  return `${title} | ${appName}`;
}

export function createPageDescription(title: string, description?: string) {
  return description ?? `${title} documentation for ${packageName}.`;
}

export function createPageKeywords(title: string) {
  return [title, `${packageName} ${title}`, ...siteKeywords];
}

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: siteTitle, template: `%s | ${appName}` },
  description: siteDescription,
  keywords: siteKeywords,
  authors: [{ name: "Shivam Gupta", url: "https://github.com/shivamrun" }],
  creator: "Shivam Gupta",
  publisher: "Even Surface",
  applicationName: appName,
  category: "Developer tools",
  icons: {
    icon: "/paginate.svg",
    shortcut: "/paginate.svg",
    apple: "/paginate.svg",
  },
  alternates: {
    canonical: siteBaseUrl,
    types: { "text/markdown": toAbsoluteUrl("/llms.txt") },
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteBaseUrl,
    siteName: appName,
    type: "website",
    locale: "en_US",
    images: [
      { url: ogImageUrl.toString(), width: 1200, height: 630, alt: siteTitle },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@shivamrun",
    images: [ogImageUrl.toString()],
  },
  robots: { index: true, follow: true },
  other: {
    "npm:package": packageName,
    "github:repository": `${gitConfig.user}/${gitConfig.repo}`,
    "docs:llms": toAbsoluteUrl("/llms.txt"),
  },
};

const organization = {
  "@type": "Organization",
  "@id": `${siteBaseUrl}/#organization`,
  name: "Even Surface",
  url: "https://evensurface.com",
};

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteBaseUrl}/#website`,
      name: appName,
      url: siteBaseUrl,
      description: siteDescription,
      publisher: organization,
    },
    organization,
    {
      "@type": "SoftwareSourceCode",
      "@id": `${siteBaseUrl}/#source-code`,
      name: packageName,
      url: siteBaseUrl,
      codeRepository: repositoryUrl,
      sameAs: [repositoryUrl, npmPackageUrl],
      description: siteDescription,
      license: `${repositoryUrl}/blob/${gitConfig.branch}/LICENSE`,
      programmingLanguage: "TypeScript",
      runtimePlatform: "Node.js >=18.18",
      applicationCategory: "DeveloperTool",
      isAccessibleForFree: true,
      keywords: siteKeywords,
    },
  ],
};

export function createDocsPageStructuredData(input: {
  title: string;
  description?: string;
  url: string;
  imageUrl: string;
}) {
  const title = createPageTitle(input.title);
  const description = createPageDescription(input.title, input.description);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${input.url}#article`,
        headline: title,
        description,
        url: input.url,
        image: input.imageUrl,
        isPartOf: { "@id": `${siteBaseUrl}/#website` },
        about: { "@id": `${siteBaseUrl}/#source-code` },
        publisher: { "@id": `${siteBaseUrl}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Documentation",
            item: toAbsoluteUrl("/docs"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: input.title,
            item: input.url,
          },
        ],
      },
    ],
  };
}
