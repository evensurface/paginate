import { HomeLayout } from "fumadocs-ui/layouts/home";
import { CustomHomeNavbar } from "@/components/custom-navbar";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout {...baseOptions()} slots={{ header: CustomHomeNavbar }}>
      {children}
    </HomeLayout>
  );
}
