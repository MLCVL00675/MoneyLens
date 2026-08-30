import { MainLayoutClient } from "@/components/layout/main-layout-client";
import { checkUser } from "@/actions/user";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sync user to DB on every authenticated page load
  await checkUser();

  return <MainLayoutClient>{children}</MainLayoutClient>;
}
