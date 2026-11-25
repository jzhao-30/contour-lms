import { ROUTES } from "@/lib/routes";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth/session";

/** Shell for the signed-in pages. Signed-out visitors go to login; each page checks its own role. */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);

  return (
    <Providers>
      <AppNav user={user} />
      <main className="mx-auto w-full max-w-5xl p-5">{children}</main>
    </Providers>
  );
}
