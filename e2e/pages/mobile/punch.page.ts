import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Mobile punch (bate-ponto) page.
 * Handles punch registration and punch button interactions.
 */
export class MobilePunchPage extends BasePage {
  private readonly heading = 'h1:has-text("Bate-Ponto")';
  private readonly punchBtn = '[data-role="punch-btn"]';
  private readonly toast = 'text=Ponto Registrado';

  constructor(page: Page) {
    super(page);
  }

  /** Wait until the punch view is fully loaded. */
  async waitForLoad(): Promise<void> {
    await expect(this.page.locator(this.heading)).toBeVisible();
    await expect(this.page.locator(this.punchBtn)).toBeEnabled({ timeout: 10_000 });
  }

  /** Get the punch button locator. */
  get punchButton(): Locator {
    return this.page.locator(this.punchBtn);
  }

  /** Register a punch and assert the success toast. */
  async registerPunch(): Promise<void> {
    await this.punchButton.click();
    await expect(this.page.locator(this.toast)).toBeVisible({ timeout: 10_000 });
  }
}
