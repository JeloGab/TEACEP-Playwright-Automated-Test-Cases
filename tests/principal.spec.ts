import { expect, test } from '../fixtures/base-test';
import { AUDIENCE_GROUP, missingUserReason, unique, user } from '../config';
import { LoginPage } from '../pages/login.page';
import { AudiencePage } from '../pages/audience.page';
import { ConfigureSurveyPage } from '../pages/configure-survey.page';
import { SurveyPage } from '../pages/survey.page';

const BLOCKED = `Needs an audience group. None exists in dev; set E2E_AUDIENCE_GROUP (currently "${AUDIENCE_GROUP}") once one does.`;

/**
 * Everything Principal can do.
 *
 * One file per role, so a role's whole story reads top to bottom: it signs
 * in, then it works. The Test Case IDs come straight from the workbook —
 * Principal is number 4 in the role column on every survey sheet.
 *
 * Principal also carries the Configure & Run and Audience cases. Both are
 * blocked on dev having no audience group; see the notes further down.
 *
 * Each test builds the survey it acts on, so nothing depends on what is
 * already in the environment and the roles can run in parallel.
 */

// --- Auth and Login sheet ---------------------------------------------------

test('TCP - LGN - 004 · Principal · Logging into a Registered Account', async ({ page }) => {
  const account = user('PRINCIPAL');
  test.skip(!account, missingUserReason('PRINCIPAL'));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account!.email, account!.password);

  // Expected output: logged in and redirected away from the login screen.
  // Sign-in can take well over the default 10s expect timeout on dev.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(loginPage.errorMessage).toBeHidden();
});

// --- Manage Survey sheet ----------------------------------------------------

test('TCP - CRT - 004 · Principal · Create a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Survey');

  await surveyPage.createPublishedSurvey(title);

  // Expected output: under Active, with its row actions. The app offers
  // Details where the workbook says Preview.
  await surveyPage.openTab('Active');
  await expect(surveyPage.row(title)).toBeVisible();

  for (const action of ['Details', 'Rename', 'Duplicate', 'Archive'] as const) {
    await expect(surveyPage.rowAction(title, action)).toBeVisible();
  }
});

test('TCP - DRFT - 004 · Principal · Draft a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Draft');

  await surveyPage.createDraftSurvey(title);

  // Expected output: under Draft, and under neither Active nor Archive.
  await surveyPage.openTab('Draft');
  await expect(surveyPage.row(title)).toBeVisible();

  await surveyPage.openTab('Active');
  await expect(surveyPage.row(title)).toBeHidden();

  await surveyPage.openTab('Archive');
  await expect(surveyPage.row(title)).toBeHidden();
});

test('TCP - ARCV - 004 · Principal · Archive a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Survey');

  await surveyPage.createPublishedSurvey(title);
  await surveyPage.archive(title);

  // Expected output: in Archive, gone from Active.
  await surveyPage.openTab('Archive');
  await expect(surveyPage.row(title)).toBeVisible();

  await surveyPage.openTab('Active');
  await expect(surveyPage.row(title)).toBeHidden();
});

test('TCP - DUP - 004 · Principal · Duplicate a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Survey');

  await surveyPage.createPublishedSurvey(title);
  await surveyPage.duplicate(title);

  // Expected output: a copy under Active named "<Survey_Name>(Copy (n))".
  await surveyPage.openTab('Active');
  await expect(surveyPage.copyRow(title).first()).toBeVisible();

  // And the original is still there. Matched on the exact name cell, because
  // the copy's row also contains the original's title.
  await expect(page.getByRole('cell', { name: title, exact: true })).toBeVisible();
});

test('TCP - RNM - 004 · Principal · Rename a Survey', async ({ page, loggedInPrincipal }) => {
  const surveyPage = new SurveyPage(page);
  const title = unique('Survey');
  const newTitle = unique('Renamed');

  await surveyPage.createPublishedSurvey(title);
  await surveyPage.rename(title, newTitle);

  // Expected output: the new name replaces the old one — not both.
  await surveyPage.openTab('Active');
  await expect(surveyPage.row(newTitle)).toBeVisible();
  await expect(surveyPage.row(title)).toBeHidden();
});

// --- Configure Survey sheet -------------------------------------------------
//
// Both cases are BLOCKED, not forgotten. The sheet lists an audience group as
// a pre-existing condition, and dev has none — the Audience page reports "No
// audience groups found". Configure is a multi-step wizard whose later steps
// ask for that group, so they cannot be driven, let alone asserted.
//
// To unblock: create a group, point E2E_AUDIENCE_GROUP at it, then fill in
// the rest of ConfigureSurveyPage from the live wizard.

test.fixme(`TCP - RSRVY - 004 · Principal · Run a Survey — ${BLOCKED}`, async () => {});

test.fixme(
  `TCP - DRFT - 004 · Principal · Configure a Drafted Survey — ${BLOCKED}`,
  async () => {},
);

// What does work today: the wizard opens and takes a run name. This guards
// the route and step one, so the blocked cases above start from solid ground.
test('Configure & Run opens the Run Survey wizard', async ({ page, loggedInPrincipal }) => {
  const configure = new ConfigureSurveyPage(page);
  const runName = unique('Run');

  await configure.goto();
  await configure.startRun(runName);

  await expect(configure.runNameInput).toHaveValue(runName);
  await expect(configure.nextButton).toBeVisible();
});

// --- Audience sheet ---------------------------------------------------------
//
// Step 5 of the case is "Select Group", so a group has to exist already. Dev
// has none, so the test skips with that reason rather than failing red.

test('TCP - CRM - 002 · Principal · Create a Member', async ({ page, loggedInPrincipal }) => {
  const audience = new AudiencePage(page);
  const newMember = {
    firstName: 'E2E',
    lastName: unique('Member').replace(/\s+/g, '-'),
    email: `e2e.member.${Date.now()}@example.invalid`,
  };

  await audience.goto();
  await audience.openTab('Group');

  const groupExists = await audience
    .row(AUDIENCE_GROUP)
    .isVisible()
    .catch(() => false);
  test.skip(
    !groupExists,
    `No audience group named "${AUDIENCE_GROUP}". Create one and set E2E_AUDIENCE_GROUP in .env.`,
  );

  await audience.createMember(newMember, AUDIENCE_GROUP);

  // Expected output: the member is in the group that was chosen.
  await audience.openTab('Member');
  await expect(audience.row(newMember.email)).toBeVisible();
  await expect(audience.row(newMember.email)).toContainText(AUDIENCE_GROUP);
});
