import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin tratamento de ponto page — employee list + occurrence management.
 */
export class AdminTratamentoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/tratamento');
    await this.waitForHeading('Tratamento de Ponto');
  }

  /** Assert the employee table is visible. */
  async expectEmployeeTable(): Promise<void> {
    await expect(this.page.locator('table')).toBeVisible({ timeout: 10_000 });
  }
}
