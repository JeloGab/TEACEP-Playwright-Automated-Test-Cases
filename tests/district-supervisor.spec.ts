import { expect, test } from '../fixtures/base-test';
import { missingUserReason, unique, user } from '../config';
import { LoginPage } from '../pages/login.page';
import { SurveyPage } from '../pages/survey.page';

/**
 * Everything District Supervisor can do.
 *
 * One file per role, so a role's whole story reads top to bottom: it signs
 * in, then it works. The Test Case IDs come straight from the workbook —
 * District Supervisor is number 3 in the role column on every survey sheet.
 *
 * Checked against dev: District Supervisor sees the same Manage Surveys page
 * as Principal, Coach and Master Teacher — same Create Survey button, same
 * Active/Draft/Archive tabs, same row actions.
 *
 * Each test builds the survey it acts on, so nothing depends on what is
 * already in the environment and the roles can run in parallel.
 */

// --- Auth and Login sheet ---------------------------------------------------

test('TCP - LGN - 003 · District Supervisor · Logging into a Registered Account', async ({ page }) => {
  const account = user('DISTRICT_SUPERVISOR');
  test.skip(!account, missingUserReason('DISTRICT_SUPERVISOR'));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account!.email, account!.password);

  // Expected output: logged in and redirected away from the login screen.
  // Sign-in can take well over the default 10s expect timeout on dev.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(loginPage.errorMessage).toBeHidden();
});

// --- Manage Survey sheet ----------------------------------------------------

test('TCP - CRT - 003 · District Supervisor · Create a Survey', async ({ page, loggedInDistrictSupervisor }) => {
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

test('TCP - DRFT - 003 · District Supervisor · Draft a Survey', async ({ page, loggedInDistrictSupervisor }) => {
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

test('TCP - ARCV - 003 · District Supervisor · Archive a Survey', async ({ page, loggedInDistrictSupervisor }) => {
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

test('TCP - DUP - 003 · District Supervisor · Duplicate a Survey', async ({ page, loggedInDistrictSupervisor }) => {
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

test('TCP - RNM - 003 · District Supervisor · Rename a Survey', async ({ page, loggedInDistrictSupervisor }) => {
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
