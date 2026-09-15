import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Mobile espelho de ponto (punch clock mirror) page.
 */
export class MobileEspelhoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the espelho view. */
  async open(): Promise<void> {
    await this.gotoHash('/#/espelho');
    await this.waitForHeading('Espelho de Ponto');
  }
}
