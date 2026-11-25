import { ROLES } from "@/lib/roles";
import { StudentDashboard } from "@/components/consultations/student-dashboard";
import { requirePageRole } from "@/lib/auth/session";

export const metadata = { title: "My consultations · Mini LMS" };

/** Student dashboard. requirePageRole redirects other roles. */
export default async function DashboardPage() {
  const user = await requirePageRole(ROLES.student);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">My consultations</h1>
      {/* Profile name is passed down only to pre-fill the booking form. */}
      <StudentDashboard firstName={user.first_name} lastName={user.last_name} />
    </div>
  );
}
