import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin cercas virtuais page — geofencing map + CRUD.
 */
export class AdminCercasPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/cercas');
    await this.waitForHeading('Cercas Virtuais');
  }

  /** Assert the vector map SVG is visible. */
  async expectGeofenceMap(): Promise<void> {
    await expect(this.page.locator('svg').first()).toBeVisible({ timeout: 10_000 });
  }
}
