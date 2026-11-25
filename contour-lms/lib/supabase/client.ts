import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

// typed with the generated schema (npm run db:types)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
