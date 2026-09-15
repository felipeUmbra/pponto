import { expect, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Public home page object (SPA shell).
 */
export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the application root. */
  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /** Assert the browser title matches the app. */
  async expectTitle(pattern: RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(pattern);
  }
}