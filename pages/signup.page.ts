import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The signup screen (/signup).
 *
 * Locators were read off the running dev build. The Title dropdown offers
 * MASTER TEACHER, COACH, PRINCIPAL, DISTRICT SUPERVISOR, DIVISION OFFICER,
 * ORG ADMIN and SUPPORT — there is no TEACHER option.
 */
export interface SignupDetails {
  firstName: string;
  lastName: string;
  /** As written in the dropdown, e.g. 'COACH'. */
  title: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export class SignupPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly titleSelect: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly passwordInput: Locator;
  readonly signUpButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Sign up' });
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.titleSelect = page.locator('select').first();
    this.emailInput = page.locator('#email');
    this.phoneInput = page.locator('#phoneNumber');
    this.passwordInput = page.locator('#password');
    this.signUpButton = page.getByRole('button', { name: 'Sign up' });
    this.errorMessage = page.getByText(/already|exists|taken|invalid|error/i).first();
  }

  async goto() {
    await this.page.goto('/signup');
    await expect(this.heading).toBeVisible();
  }

  /** Fills whichever fields are given. Does not submit. */
  async fill(details: Partial<SignupDetails>) {
    if (details.firstName !== undefined) await this.firstNameInput.fill(details.firstName);
    if (details.lastName !== undefined) await this.lastNameInput.fill(details.lastName);
    if (details.title !== undefined) await this.titleSelect.selectOption({ label: details.title });
    if (details.email !== undefined) await this.emailInput.fill(details.email);
    if (details.phoneNumber !== undefined) await this.phoneInput.fill(details.phoneNumber);
    if (details.password !== undefined) await this.passwordInput.fill(details.password);
  }

  /** Fills everything and submits. */
  async signUp(details: SignupDetails) {
    await this.fill(details);
    await this.signUpButton.click();
  }

  /**
   * Whether the browser considers the email field valid.
   *
   * The form does NOT disable Sign up for a malformed address — it leans on
   * the email input's own constraint validation — so this is how the
   * invalid-format case checks the address was rejected.
   */
  async isEmailValid(): Promise<boolean> {
    return this.emailInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
  }
}
