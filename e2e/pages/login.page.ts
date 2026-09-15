import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the login screen.
 * Handles PIN-based authentication for all roles.
 */
export class LoginPage extends BasePage {
  private readonly userSelect = '#login-user';
  private readonly submitBtn = 'button:has-text("Entrar")';

  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the login page. */
  async open(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.page.locator(this.userSelect)).toBeVisible();
  }

  /** Select a user from the dropdown by display label. */
  async selectUser(label: string): Promise<void> {
    await this.page.selectOption(this.userSelect, { label });
  }

  /** Click the submit button. */
  async submit(): Promise<void> {
    await this.page.click(this.submitBtn);
  }

  /** Full login flow: open → select user → submit → assert redirect. */
  async loginAs(
    label: string,
    redirectPattern: RegExp,
  ): Promise<void> {
    await this.open();
    await this.selectUser(label);
    await this.submit();
    await expect(this.page).toHaveURL(redirectPattern);
  }
}
