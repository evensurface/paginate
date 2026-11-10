import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { CustomDocsNavbar } from "@/components/custom-navbar";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      slots={{ header: CustomDocsNavbar }}
    >
      {children}
    </DocsLayout>
  );
}
