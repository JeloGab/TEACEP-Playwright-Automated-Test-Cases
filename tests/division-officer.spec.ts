import { expect, test } from '../fixtures/base-test';
import { missingUserReason, unique, user } from '../config';
import { LoginPage } from '../pages/login.page';
import { SurveyPage } from '../pages/survey.page';

/**
 * Everything Division Officer can do.
 *
 * One file per role, so a role's whole story reads top to bottom: it signs
 * in, then it works. The Test Case IDs come straight from the workbook —
 * Division Officer is number 2 in the role column on every survey sheet.
 *
 * Division Officer has no credentials in .env yet, so every test here skips
 * with a message naming the keys. Set E2E_DEV_DIVISION_OFFICER_EMAIL and
 * E2E_DEV_DIVISION_OFFICER_PASSWORD and they run with no code change —
 * verified by supplying a working account through the environment.
 *
 * Each test builds the survey it acts on, so nothing depends on what is
 * already in the environment and the roles can run in parallel.
 */

// --- Auth and Login sheet ---------------------------------------------------

test('TCP - LGN - 002 · Division Officer · Logging into a Registered Account', async ({ page }) => {
  const account = user('DIVISION_OFFICER');
  test.skip(!account, missingUserReason('DIVISION_OFFICER'));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account!.email, account!.password);

  // Expected output: logged in and redirected away from the login screen.
  // Sign-in can take well over the default 10s expect timeout on dev.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(loginPage.errorMessage).toBeHidden();
});

// --- Manage Survey sheet ----------------------------------------------------

test('TCP - CRT - 002 · Division Officer · Create a Survey', async ({ page, loggedInDivisionOfficer }) => {
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

test('TCP - DRFT - 002 · Division Officer · Draft a Survey', async ({ page, loggedInDivisionOfficer }) => {
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

test('TCP - ARCV - 002 · Division Officer · Archive a Survey', async ({ page, loggedInDivisionOfficer }) => {
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

test('TCP - DUP - 002 · Division Officer · Duplicate a Survey', async ({ page, loggedInDivisionOfficer }) => {
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

test('TCP - RNM - 002 · Division Officer · Rename a Survey', async ({ page, loggedInDivisionOfficer }) => {
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
