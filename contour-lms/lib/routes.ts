import { ROLES, type UserRole } from "@/lib/roles";

/** Every URL lives here, so a rename is a one-line change. Safe to import on server and client. */

/** Page routes. */
export const ROUTES = {
  home: "/",
  login: "/auth/login",
  signUp: "/auth/sign-up",
  signUpSuccess: "/auth/sign-up-success",
  forgotPassword: "/auth/forgot-password",
  authError: "/auth/error",
  dashboard: "/dashboard", // student
  admin: "/admin", // admin
} as const;

/** Prefixes the proxy uses to decide what needs a session. */
export const PATH_PREFIXES = {
  auth: "/auth", // public: login, sign-up, ...
  api: "/api", // returns 401 JSON, no redirect
} as const;

/** REST endpoints. */
export const API = {
  health: "/api/health",
  consultations: "/api/consultations",
  consultation: (id: string) => `/api/consultations/${id}`,
  adminConsultations: "/api/admin/consultations",
} as const;

/** Where each role lands after signing in. */
export const homePathFor = (role: UserRole) =>
  role === ROLES.admin ? ROUTES.admin : ROUTES.dashboard;
