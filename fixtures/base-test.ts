import { expect, test as base, type Page, type TestInfo } from '@playwright/test';
import { missingUserReason, user, type Role } from '../config';
import { LoginPage } from '../pages/login.page';

/**
 * The `test` every spec imports, instead of Playwright's own.
 *
 * It adds one fixture per role. Asking for `loggedInPrincipal` means the test
 * body starts on a signed-in page — the login happened behind the scenes:
 *
 *     test('...', async ({ page, loggedInPrincipal }) => {
 *       const surveyPage = new SurveyPage(page);
 *     });
 *
 * A role whose .env keys are blank skips the test with a message naming the
 * exact keys to fill in. A skip is a missing precondition, never a failure.
 */
type Fixtures = {
  loggedInOrgAdmin: void;
  loggedInDivisionOfficer: void;
  loggedInDistrictSupervisor: void;
  loggedInPrincipal: void;
  loggedInCoach: void;
  loggedInMasterTeacher: void;
  loggedInSupport: void;
};

/** The one place a sign-in happens. Every fixture below is two lines of this. */
async function signIn(page: Page, role: Role, testInfo: TestInfo) {
  const account = user(role);
  testInfo.skip(!account, missingUserReason(role));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account!.email, account!.password);

  // Signed in means the app has taken us off /login. Sign-in can take well
  // over the default 10s expect timeout on dev, so this one waits longer.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

export const test = base.extend<Fixtures>({
  loggedInOrgAdmin: async ({ page }, use, testInfo) => {
    await signIn(page, 'ORG_ADMIN', testInfo);
    await use();
  },

  loggedInDivisionOfficer: async ({ page }, use, testInfo) => {
    await signIn(page, 'DIVISION_OFFICER', testInfo);
    await use();
  },

  loggedInDistrictSupervisor: async ({ page }, use, testInfo) => {
    await signIn(page, 'DISTRICT_SUPERVISOR', testInfo);
    await use();
  },

  loggedInPrincipal: async ({ page }, use, testInfo) => {
    await signIn(page, 'PRINCIPAL', testInfo);
    await use();
  },

  loggedInCoach: async ({ page }, use, testInfo) => {
    await signIn(page, 'COACH', testInfo);
    await use();
  },

  loggedInMasterTeacher: async ({ page }, use, testInfo) => {
    await signIn(page, 'MASTER_TEACHER', testInfo);
    await use();
  },

  loggedInSupport: async ({ page }, use, testInfo) => {
    await signIn(page, 'SUPPORT', testInfo);
    await use();
  },
});

export { expect } from '@playwright/test';
