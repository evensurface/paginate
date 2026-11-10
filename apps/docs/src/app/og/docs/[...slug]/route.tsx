import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { appName, packageName } from "@/lib/shared";
import { getPageImage, source } from "@/lib/source";

export const revalidate = false;

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));

  if (!page) return notFound();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: "linear-gradient(135deg, #020617, #0f2f68)",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 18,
            background: "#2563eb",
            fontSize: 44,
            fontWeight: 800,
          }}
        >
          P
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{appName}</div>
          <div style={{ color: "#bfdbfe", fontSize: 22 }}>{packageName}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            maxWidth: 980,
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {page.data.title}
        </div>
        <div
          style={{
            maxWidth: 900,
            color: "#dbeafe",
            fontSize: 30,
            lineHeight: 1.35,
          }}
        >
          {page.data.description}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#93c5fd",
          fontSize: 22,
        }}
      >
        <div>Page · Offset · Cursor</div>
        <div>TypeScript pagination</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
