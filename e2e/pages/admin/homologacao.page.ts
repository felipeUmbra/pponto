import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin homologação de atestados page — medical certificate approval queue.
 */
export class AdminHomologacaoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/homologacao');
    await this.waitForHeading('Homologação de Atestados');
  }

  /** Assert the certificate approval queue is visible. */
  async expectCertificateQueue(): Promise<void> {
    await expect(this.page.locator('.btn-approve').first()).toBeVisible({ timeout: 10_000 });
  }
}
