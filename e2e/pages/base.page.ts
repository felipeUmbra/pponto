import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Base page with shared utilities for all page objects.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to a hash route (e.g. '/#/admin/tratamento'). */
  async gotoHash(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /** Wait until a heading with the given text is visible. */
  async waitForHeading(text: string, timeout = 10_000): Promise<Locator> {
    const heading = this.page.locator(`h1:has-text("${text}"), h2:has-text("${text}")`);
    await expect(heading).toBeVisible({ timeout });
    return heading;
  }

  /** Wait until any element matching the text is visible. */
  async waitForText(text: string, timeout = 10_000): Promise<Locator> {
    const el = this.page.locator(`text=${text}`).first();
    await expect(el).toBeVisible({ timeout });
    return el;
  }

  /** Return the current URL. */
  get url(): string {
    return this.page.url();
  }
}
