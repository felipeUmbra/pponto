import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin contingência offline page — sync queue status.
 */
export class AdminOfflinePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/offline');
    await this.waitForHeading('Resiliência Offline');
  }

  /** Assert the sync button is visible. */
  async expectSyncButton(): Promise<void> {
    await expect(this.page.locator('button:has-text("Tentar Sincronizar Agora")')).toBeVisible();
  }
}
