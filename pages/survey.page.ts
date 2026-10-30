import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Manage Surveys — the survey list, its row actions, and the builder behind
 * "Create Survey".
 *
 * Everything here was read off the running dev build as Principal.
 */
export type SurveyTab = 'Active' | 'Draft' | 'Archive';

/** The app offers Details where the workbook says Preview. */
export type RowAction = 'Details' | 'Rename' | 'Duplicate' | 'Archive';

export class SurveyPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly manageSurveyLink: Locator;
  readonly createSurveyButton: Locator;
  readonly searchInput: Locator;

  // The builder. Its inputs carry no label and no id — only placeholders.
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly sectionTitleInput: Locator;
  readonly selectLanguageButton: Locator;
  readonly addQuestionButton: Locator;
  readonly questionInput: Locator;
  readonly publishButton: Locator;
  readonly saveToDraftButton: Locator;

  // Dialogs
  readonly renameInput: Locator;
  readonly dialogSaveButton: Locator;
  readonly dialogArchiveButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Manage Surveys' });
    this.manageSurveyLink = page.getByRole('link', { name: 'Manage' });
    this.createSurveyButton = page.getByRole('button', { name: 'Create Survey' });
    this.searchInput = page.getByPlaceholder('Search by Survey name');

    this.titleInput = page.getByPlaceholder('Master Survey Name');
    this.descriptionInput = page.getByPlaceholder('Description (Optional)').first();
    this.sectionTitleInput = page.getByPlaceholder('Section Title');
    this.selectLanguageButton = page.getByRole('button', { name: 'Select Language' });
    this.addQuestionButton = page.getByRole('button', { name: 'Add Question' });
    this.questionInput = page.getByPlaceholder('Question').first();
    this.publishButton = page.getByRole('button', { name: 'Publish' });
    // The button renders as "Save to DraftDraft" — an icon's text runs into
    // the label — so this matches the prefix rather than the whole string.
    this.saveToDraftButton = page.getByRole('button', { name: /save to draft/i });

    this.renameInput = page.getByRole('dialog').getByPlaceholder('Survey name');
    this.dialogSaveButton = page.getByRole('dialog').getByRole('button', { name: 'Save' });
    this.dialogArchiveButton = page.getByRole('dialog').getByRole('button', { name: 'Archive' });
  }

  // --- the list ------------------------------------------------------------

  tab(name: SurveyTab): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** The row for one survey, found by its title. */
  row(title: string): Locator {
    return this.page.getByRole('row').filter({ hasText: title });
  }

  /**
   * The row holding a duplicate of `title`. The app names a copy
   * "<Survey_Name>(Copy (n))" and the bracketing varies with the copy count,
   * so this matches the original's name followed by some form of "copy".
   * `unique()` emits only letters, digits, spaces and a hyphen, so nothing in
   * a title needs escaping for the pattern.
   */
  copyRow(title: string): Locator {
    return this.page.getByRole('row').filter({ hasText: new RegExp(title + '.*copy', 'i') });
  }

  /**
   * One action in a row. These are plain buttons in the last cell, not a
   * menu — Details, Rename, Duplicate and Archive are all visible at once.
   */
  rowAction(title: string, action: RowAction): Locator {
    return this.row(title).getByRole('button', { name: action });
  }

  async goto() {
    await this.page.goto('/organisation/surveys');
    await expect(this.heading).toBeVisible();
    await this.waitForList();
  }

  /** The table renders blank skeleton rows first; this waits them out. */
  async waitForList() {
    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async openTab(name: SurveyTab) {
    await this.tab(name).click();
    await this.waitForList();
  }

  // --- the builder ---------------------------------------------------------

  async gotoBuilder() {
    await this.page.goto('/organisation/surveys/create');
    await expect(this.titleInput).toBeVisible();
  }

  /**
   * The language picker is a dropdown of checkboxes (Arabic, English,
   * French) with no accessible name, so the language is clicked by its text.
   */
  async selectLanguage(language = 'English') {
    await this.selectLanguageButton.click();
    // force: the popover never settles for Playwright's stability check, so
    // an ordinary click waits for "stable" until the test times out.
    await this.page.getByText(language, { exact: true }).click({ force: true });
    await this.page.keyboard.press('Escape');
  }

  /**
   * Title, description, language, section and one question. Stops before
   * Publish or Save to Draft, so both cases share it.
   *
   * Publish refuses without a language ("Language is required") and without
   * two options on a multiple-choice question ("Please add at least two
   * options."), so both are filled in here.
   */
  async buildSurvey(title: string) {
    await this.gotoBuilder();

    await this.titleInput.fill(title);
    await this.descriptionInput.fill('Created by the automated suite. Safe to delete.');
    await this.selectLanguage();
    await this.sectionTitleInput.fill('Section 1');

    await this.addQuestionButton.click();
    await this.questionInput.fill('How clear was the training session?');
    // Multiple choice is the default answer type and needs two options.
    await this.page.getByPlaceholder('Option 1').fill('Very clear');
    await this.page.getByPlaceholder('Option 2').fill('Unclear');
  }

  /** Publish and Save to Draft both redirect to the list once the API confirms. */
  private async waitForRedirectToList() {
    await this.page.waitForURL('**/organisation/surveys', { timeout: 30_000 });
    await this.waitForList();
  }

  async createPublishedSurvey(title: string) {
    await this.buildSurvey(title);
    await this.publishButton.click();
    await this.waitForRedirectToList();
  }

  async createDraftSurvey(title: string) {
    await this.buildSurvey(title);
    await this.saveToDraftButton.click();
    await this.waitForRedirectToList();
  }

  // --- row actions ---------------------------------------------------------

  /** Opens the confirm dialog and archives. */
  async archive(title: string) {
    await this.rowAction(title, 'Archive').click();
    await this.dialogArchiveButton.click();
    await this.waitForList();
  }

  async duplicate(title: string) {
    await this.rowAction(title, 'Duplicate').click();
    await this.waitForList();
  }

  /** Opens the Rename Survey dialog, types the new name and saves. */
  async rename(title: string, newTitle: string) {
    await this.rowAction(title, 'Rename').click();
    await this.renameInput.fill(newTitle);
    await this.dialogSaveButton.click();
    await this.waitForList();
  }
}
