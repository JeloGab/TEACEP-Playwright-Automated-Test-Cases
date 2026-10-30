import { expect, test } from '../fixtures/base-test';
import { TITLE_OPTION, user } from '../config';
import { LoginPage } from '../pages/login.page';
import { SignupPage } from '../pages/signup.page';

/**
 * Everything that needs no account.
 *
 * The other spec files are one per role. These cases belong to no role — the
 * workbook's User column says "Any User" — so they live together here. They
 * run on a machine with an empty .env, which makes this the file to run first
 * when something looks broken.
 *
 * TCP - LGN - 001 (the Org Admin's MFA sign-in) and the whole Reset Password
 * group are marked Manual, so they are not here.
 */

const STRONG_PASSWORD = 'E2ePassw0rd!23';

const validSignup = () => ({
  firstName: 'E2E',
  lastName: 'Tester',
  title: TITLE_OPTION.COACH!,
  email: `e2e.signup.${Date.now()}@example.invalid`,
  phoneNumber: '9171234567',
  password: STRONG_PASSWORD,
});

// --- the login page ---------------------------------------------------------
// Not workbook cases. Kept because they need no account and they catch a
// broken login page in two seconds.

test.describe('the login page', () => {
  test('shows its form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  });

  test('the sign-up link goes to the signup page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.signUpLink.click();
    await expect(page).toHaveURL(/signup/);
  });

  test('the sign-in button is disabled until both fields are filled', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.signInButton).toBeDisabled();
    await loginPage.emailInput.fill('qa.e2e@example.invalid');
    await loginPage.passwordInput.fill('AnyPassword123!');
    await expect(loginPage.signInButton).toBeEnabled();
  });
});

// --- Auth and Login sheet ---------------------------------------------------

test('TCP - LGN - 008 · Any User · Log in with Incorrect Credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  await loginPage.login('nobody.e2e@example.invalid', 'DefinitelyWrong123!');

  await expect(loginPage.errorMessage).toBeVisible();
  // Still on /login — a rejected attempt must not get anyone in.
  await expect(page).toHaveURL(/\/login/);
});

// Signup: all negative cases. None of them completes a signup, so none
// creates a record.

test('TCP - SGUP - 002 · Any User · Sign up with an Already Registered Email', async ({ page }) => {
  // The one case that needs a known-registered address: an existing account's.
  const account = user('PRINCIPAL');
  test.skip(!account, 'Needs one registered account. Set E2E_DEV_PRINCIPAL_* in .env.');

  const signupPage = new SignupPage(page);
  await signupPage.goto();

  await signupPage.signUp({ ...validSignup(), email: account!.email });

  await expect(signupPage.errorMessage).toBeVisible();
  await expect(page).toHaveURL(/signup/);
});

test('TCP - SGUP - 003 · Any User · Sign up with an Invalid Email Format', async ({ page }) => {
  const signupPage = new SignupPage(page);
  await signupPage.goto();

  await signupPage.fill({ ...validSignup(), email: 'not-an-email' });

  // The form leaves Sign up enabled here and relies on the email input's own
  // validation to stop the submit. So that is what gets asserted.
  expect(await signupPage.isEmailValid()).toBe(false);

  await signupPage.signUpButton.click();
  await expect(page).toHaveURL(/signup/);
  await expect(signupPage.heading).toBeVisible();
});

test('TCP - SGUP - 004 · Any User · Sign up with a Password Below the Minimum', async ({ page }) => {
  const signupPage = new SignupPage(page);
  await signupPage.goto();

  await signupPage.fill({ ...validSignup(), password: 'short' });
  await expect(signupPage.signUpButton).toBeDisabled();

  // A long enough one lets the form through, so the check above is really
  // about the password and not some other empty field.
  await signupPage.passwordInput.fill(STRONG_PASSWORD);
  await expect(signupPage.signUpButton).toBeEnabled();
});

test('TCP - SGUP - 005 · Any User · Sign up with Required Fields Left Empty', async ({ page }) => {
  const signupPage = new SignupPage(page);
  await signupPage.goto();

  await expect(signupPage.signUpButton).toBeDisabled();

  // Clicking it changes nothing: still on /signup, still empty.
  await signupPage.signUpButton.click({ force: true });
  await expect(page).toHaveURL(/signup/);
  await expect(signupPage.emailInput).toHaveValue('');
});

test.fixme(
  'TCP - CMPR - 008 · Any User · Submit the Profile Form with Required Fields Empty',
  async () => {
    // Blocked, not forgotten. The complete-profile screen only appears for an
    // account that has verified its email but has NOT yet filled in its
    // profile. Every account in .env is past that point, so there is nothing
    // to drive. Seed one account that stops after verification and this
    // becomes a few lines.
  },
);
