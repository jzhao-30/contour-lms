import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  // same "@/..." alias as the app
  plugins: [tsconfigPaths()],
  test: {
    include: ["tests/**/*.test.ts"],
    // make .env.local available to tests like Next does; "" loads all variables, not only VITE_ ones
    env: loadEnv(mode, process.cwd(), ""),
    // the DB tests do real sign-ins and queries
    testTimeout: 15_000,
    // api.test.ts may boot next dev first
    hookTimeout: 120_000,
    // run files one at a time, the DB tests share the seed users
    fileParallelism: false,
  },
}));
