import { ROLES } from "@/lib/roles";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { CurrentUser } from "@/lib/auth/session";

/** Top bar: name, role and logout. */
export function AppNav({ user }: { user: CurrentUser }) {
  const name = `${user.first_name} ${user.last_name}`.trim() || user.email;
  return (
    <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
      <div className="flex w-full max-w-5xl items-center justify-between px-5 text-sm">
        <span className="font-semibold">Mini LMS</span>
        <div className="flex items-center gap-3">
          <span>{name}</span>
          <Badge variant={user.role === ROLES.admin ? "default" : "secondary"}>
            {user.role}
          </Badge>
          <ThemeSwitcher />
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
