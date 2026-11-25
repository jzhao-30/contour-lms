/** Pagination limits. */
export const PAGINATION = {
  /** API default when page_size is missing. */
  defaultPageSize: 20,
  /** Upper bound, so nobody can ask for everything. */
  maxPageSize: 50,
  /** Rows per page in each dashboard. */
  studentPageSize: 10,
  adminPageSize: 20,
} as const;
