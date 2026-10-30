import { expect, test } from '../fixtures/base-test';
import { missingUserReason, unique, user } from '../config';
import { LoginPage } from '../pages/login.page';
import { SurveyPage } from '../pages/survey.page';

/**
 * Everything Master Teacher can do.
 *
 * One file per role, so a role's whole story reads top to bottom: it signs
 * in, then it works. The Test Case IDs come straight from the workbook —
 * Master Teacher is number 6 in the role column on every survey sheet.
 *
 * Checked against dev: Master Teacher sees the same Manage Surveys page as
 * the other survey roles.
 *
 * Each test builds the survey it acts on, so nothing depends on what is
 * already in the environment and the roles can run in parallel.
 */

// --- Auth and Login sheet ---------------------------------------------------

test('TCP - LGN - 006 · Master Teacher · Logging into a Registered Account', async ({ page }) => {
  const account = user('MASTER_TEACHER');
  test.skip(!account, missingUserReason('MASTER_TEACHER'));

  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(account!.email, account!.password);

  // Expected output: logged in and redirected away from the login screen.
  // Sign-in can take well over the default 10s expect timeout on dev.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(loginPage.errorMessage).toBeHidden();
});

// --- Manage Survey sheet ----------------------------------------------------

test('TCP - CRT - 006 · Master Teacher · Create a Survey', async ({ page, loggedInMasterTeacher }) => {
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

test('TCP - DRFT - 006 · Master Teacher · Draft a Survey', async ({ page, loggedInMasterTeacher }) => {
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

test('TCP - ARCV - 006 · Master Teacher · Archive a Survey', async ({ page, loggedInMasterTeacher }) => {
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

test('TCP - DUP - 006 · Master Teacher · Duplicate a Survey', async ({ page, loggedInMasterTeacher }) => {
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

test('TCP - RNM - 006 · Master Teacher · Rename a Survey', async ({ page, loggedInMasterTeacher }) => {
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
