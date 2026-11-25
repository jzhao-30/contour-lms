import { ROLES } from "@/lib/roles";
import { AdminDashboard } from "@/components/consultations/admin-dashboard";
import { requirePageRole } from "@/lib/auth/session";

export const metadata = { title: "All consultations · Mini LMS" };

/** Admin view. requirePageRole redirects other roles. */
export default async function AdminPage() {
  await requirePageRole(ROLES.admin);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">All consultations</h1>
      <AdminDashboard />
    </div>
  );
}
