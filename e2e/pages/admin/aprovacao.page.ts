import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin aprovação de ajustes page — adjustment request approval queue.
 */
export class AdminAprovacaoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/aprovacao');
    await this.waitForHeading('Aprovação de Ajustes');
  }

  /** Assert the adjustment approval queue is visible. */
  async expectAdjustmentQueue(): Promise<void> {
    await expect(this.page.locator('.btn-approve').first()).toBeVisible({ timeout: 10_000 });
  }
}
