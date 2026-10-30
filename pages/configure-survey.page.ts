import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Configure & Run — turning a built survey into a run that people answer.
 *
 * Route, heading and the first step of the wizard ✅ read off the dev build.
 * Clicking Configure opens "Run Survey" → "Run Survey Details" with a Next
 * button, so this is a multi-step flow; ⚠️ everything past step one is
 * unverified, because the dev environment has no audience group to pick.
 *
 * The shareable link and searching runs are marked Manual.
 */
export class ConfigureSurveyPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly configureButton: Locator;
  readonly searchInput: Locator;

  // Step 1 — Run Survey Details
  readonly runSurveyHeading: Locator;
  readonly runNameInput: Locator;
  readonly descriptionInput: Locator;
  readonly uploadLogoButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Configure Survey' });
    this.configureButton = page.getByRole('button', { name: 'Configure' });
    this.searchInput = page.getByPlaceholder('Search by Survey name');

    this.runSurveyHeading = page.getByRole('heading', { name: 'Run Survey Details' });
    this.runNameInput = page.getByPlaceholder('Survey Run Name');
    this.descriptionInput = page.getByPlaceholder('Description (Optional)').first();
    this.uploadLogoButton = page.getByRole('button', { name: 'Upload Logo' });
    this.nextButton = page.getByRole('button', { name: 'Next' });
  }

  /** The row for one run, found by its name. */
  row(runName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: runName });
  }

  /** The status cell of a run's row. */
  status(runName: string): Locator {
    return this.row(runName)
      .getByText(/open|closed|draft/i)
      .first();
  }

  /** ⚠️ Never seen — the run list was empty when probed. */
  rowActions(runName: string): Locator {
    return this.row(runName).getByRole('button', { name: /action|more|menu/i });
  }

  async goto() {
    await this.page.goto('/organisation/configure-run');
    await expect(this.heading).toBeVisible();
  }

  /** ✅ Opens the wizard and fills step one. */
  async startRun(runName: string) {
    await this.configureButton.click();
    await expect(this.runSurveyHeading).toBeVisible();
    await this.runNameInput.fill(runName);
  }

  /**
   * ⚠️ The rest of the wizard — picking the survey, picking the audience,
   * and the final Run or Save to Draft — is not modelled yet. Probe it with
   * an audience group in place, then fill this in.
   */
}
