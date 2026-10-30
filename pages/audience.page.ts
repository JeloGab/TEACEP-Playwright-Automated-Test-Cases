import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Audience — the Member tab and creating a member in a group.
 *
 * Route, heading, tabs and buttons ✅ read off the dev build. The Create
 * Member form itself is ⚠️ unverified: the dev environment has no audience
 * group, so the form could not be opened.
 *
 * Import and Invite Member are marked Manual in the sheet.
 */
export interface MemberDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export class AudiencePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createGroupButton: Locator;
  readonly createMemberButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Audience' });
    this.createGroupButton = page.getByRole('button', { name: 'Create Group' });
    this.createMemberButton = page.getByRole('button', { name: 'Create Member' });
  }

  /** The tabs are singular in the app: "Group" and "Member". */
  tab(name: 'Group' | 'Member'): Locator {
    return this.page.getByRole('tab', { name });
  }

  /** A member row, found by name or email. */
  row(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  async goto() {
    await this.page.goto('/organisation/audience');
    await expect(this.heading).toBeVisible();
  }

  async openTab(name: 'Group' | 'Member') {
    await this.tab(name).click();
  }

  /** ⚠️ The form's fields are unverified — see the note at the top. */
  async createMember(details: MemberDetails, groupName: string) {
    await this.openTab('Member');
    await this.createMemberButton.click();

    await this.page.getByLabel(/first name/i).fill(details.firstName);
    await this.page.getByLabel(/last name/i).fill(details.lastName);
    await this.page.getByLabel(/email/i).fill(details.email);

    const group = this.page.getByLabel(/group/i).first();
    try {
      await group.selectOption({ label: groupName });
    } catch {
      await group.click();
      await this.page.getByRole('option', { name: groupName }).click();
    }

    await this.page.getByRole('button', { name: 'Create Member' }).click();
  }
}
