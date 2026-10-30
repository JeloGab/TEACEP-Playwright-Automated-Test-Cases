import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The login screen (/login).
 *
 * Locators were read off the running dev build, not guessed.
 */
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpLink: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Sign in' });
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.signUpLink = page.getByRole('link', { name: 'Sign up' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
    // The exact banner the app shows for a rejected email/password pair.
    this.errorMessage = page.getByText('Invalid email or password');
  }

  async goto() {
    // Relative: resolved against baseURL, so the same test runs on dev or
    // production without changing a line here.
    await this.page.goto('/login');
    await expect(this.heading).toBeVisible();
  }

  /** Types credentials in and submits. Does not check the outcome. */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
