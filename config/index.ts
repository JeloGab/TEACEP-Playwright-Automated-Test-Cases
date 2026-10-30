import 'dotenv/config';

/**
 * WHERE we test and WHO we test as.
 *
 * Nothing here touches a browser. It answers three questions:
 *   - which URL are we hitting,
 *   - which roles exist and how are they written,
 *   - which of them have credentials in .env right now.
 */

/** dev (the default) or production. Set TEST_ENV to switch. */
export const ENVIRONMENT = process.env.TEST_ENV === 'production' ? 'production' : 'dev';

/**
 * The app's root. Resolved once, here, so no spec ever hardcodes a host.
 * It throws rather than guess — a bare `npm test` can never accidentally
 * point at production.
 */
export const BASE_URL =
  process.env.BASE_URL ||
  (ENVIRONMENT === 'production' ? process.env.PROD_BASE_URL : process.env.DEV_BASE_URL) ||
  '';

if (!BASE_URL) {
  throw new Error('No base URL. Set DEV_BASE_URL in .env, or BASE_URL to override it for one run.');
}

export const ROLES = [
  'ORG_ADMIN',
  'DIVISION_OFFICER',
  'DISTRICT_SUPERVISOR',
  'PRINCIPAL',
  'COACH',
  'MASTER_TEACHER',
  'TEACHER',
  'SUPPORT',
] as const;

export type Role = (typeof ROLES)[number];

/** How the role reads in a test title, matching the workbook's wording. */
export const ROLE_LABEL: Record<Role, string> = {
  ORG_ADMIN: 'Org Admin',
  DIVISION_OFFICER: 'Division Officer',
  DISTRICT_SUPERVISOR: 'District Supervisor',
  PRINCIPAL: 'Principal',
  COACH: 'Coach',
  MASTER_TEACHER: 'Master Teacher',
  TEACHER: 'Teacher',
  SUPPORT: 'Support',
};

/**
 * How the role is written in the Title dropdown on /signup.
 *
 * TEACHER is absent on purpose: the dropdown has no option for it, so a
 * Teacher account cannot be self-registered — it has to be invited.
 */
export const TITLE_OPTION: Partial<Record<Role, string>> = {
  ORG_ADMIN: 'ORG ADMIN',
  DIVISION_OFFICER: 'DIVISION OFFICER',
  DISTRICT_SUPERVISOR: 'DISTRICT SUPERVISOR',
  PRINCIPAL: 'PRINCIPAL',
  COACH: 'COACH',
  MASTER_TEACHER: 'MASTER TEACHER',
  SUPPORT: 'SUPPORT',
};

export interface User {
  email: string;
  password: string;
}

/** E2E_DEV_PRINCIPAL_… on dev, E2E_PROD_PRINCIPAL_… on production. */
function envPrefix(role: Role): string {
  return `E2E_${ENVIRONMENT === 'production' ? 'PROD' : 'DEV'}_${role}`;
}

/**
 * Reads one account out of .env.
 * undefined means the keys are blank, which is how a role opts out.
 */
export function user(role: Role): User | undefined {
  const email = process.env[`${envPrefix(role)}_EMAIL`]?.trim();
  const password = process.env[`${envPrefix(role)}_PASSWORD`]?.trim();
  return email && password ? { email, password } : undefined;
}

/** The skip message, naming the exact keys to fill in. */
export function missingUserReason(role: Role): string {
  const prefix = envPrefix(role);
  return `No credentials for ${ROLE_LABEL[role]}. Set ${prefix}_EMAIL and ${prefix}_PASSWORD in .env to run this.`;
}

/**
 * An audience group that already exists in the environment. The sheet lists
 * one as a pre-existing condition for the configure-and-run cases.
 */
export const AUDIENCE_GROUP = process.env.E2E_AUDIENCE_GROUP || 'E2E Audience';

/**
 * A name nothing else will have, so tests can run in parallel and in any
 * order without fighting over the same row. Everything the suite creates is
 * prefixed E2E and is safe to delete.
 */
export function unique(label: string): string {
  return `E2E ${label} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
