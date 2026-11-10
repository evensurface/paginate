import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Provider } from "@/components/provider";
import "./global.css";
import { metadata, structuredData } from "@/lib/metadata";

const inter = Inter({
  subsets: ["latin"],
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export { metadata };

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.className} ${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is static metadata owned by this app.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
