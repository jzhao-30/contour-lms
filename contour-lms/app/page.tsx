import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { homePathFor, ROUTES } from "@/lib/routes";

/** "/" only redirects: signed out to login, students to /dashboard, admins to /admin. */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  redirect(homePathFor(user.role));
}
