import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Thank you for signing up!
              </CardTitle>
              <CardDescription>Your account has been created</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Local development: email confirmation is turned OFF in
                  supabase/config.jsonc (auth.email.enable_confirmations), so no
                  email is sent and you are already signed in. In production,
                  enable confirmations; users must then confirm by email first. */}
              <p className="text-sm text-muted-foreground">
                Email confirmation is disabled in this local setup, so no email
                will be sent and you can start using the app right away.
              </p>
              <Button asChild>
                <Link href={ROUTES.home}>Continue to the app</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
