import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { ViewOptionsPopover } from "@/components/view-options-popover";
import {
  createDocsPageStructuredData,
  createPageDescription,
  createPageKeywords,
  createPageTitle,
  siteBaseUrl,
  toAbsoluteUrl,
} from "@/lib/metadata";
import { getPageImage, getPageMarkdownUrl, source } from "@/lib/source";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    return notFound();
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const pageUrl = toAbsoluteUrl(page.url);
  const imageUrl = toAbsoluteUrl(getPageImage(page).url);
  const structuredData = createDocsPageStructuredData({
    title: page.data.title,
    description: page.data.description,
    url: pageUrl,
    imageUrl,
  });

  return (
    <DocsPage
      className="pb-16 sm:pb-20"
      toc={page.data.toc}
      full={page.data.full}
      footer={{ enabled: true }}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DocsTitle className="mb-0">{page.data.title}</DocsTitle>
        <ViewOptionsPopover
          className="shrink-0"
          markdownUrl={markdownUrl}
          pageUrl={pageUrl}
        />
      </div>
      <DocsDescription className="mb-0 text-base">
        {page.data.description}
      </DocsDescription>
      <div className="border-b pb-6" />
      <DocsBody className="pb-10 sm:pb-12">
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is static metadata derived from MDX frontmatter.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    return notFound();
  }
  const image = getPageImage(page);
  const title = createPageTitle(page.data.title);
  const description = createPageDescription(
    page.data.title,
    page.data.description,
  );
  const pageUrl = toAbsoluteUrl(page.url);
  const imageUrl = toAbsoluteUrl(image.url);

  return {
    title,
    description,
    keywords: createPageKeywords(page.data.title),
    alternates: {
      canonical: pageUrl,
      types: {
        "text/markdown": toAbsoluteUrl(getPageMarkdownUrl(page).url),
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Paginate",
      type: "article",
      locale: "en_US",
      authors: ["Shivam Gupta"],
      publishedTime: "2026-07-21T00:00:00.000Z",
      modifiedTime: new Date().toISOString(),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${page.data.title} - Paginate documentation`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@shivamrun",
      images: [imageUrl],
    },
    other: {
      "docsearch:language": "en",
      "docsearch:version": "latest",
      "og:see_also": siteBaseUrl,
    },
  };
}
