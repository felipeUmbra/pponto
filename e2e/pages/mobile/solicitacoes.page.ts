import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Mobile solicitações (requests) page — atestados + ajustes.
 */
export class MobileSolicitacoesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate to the solicitações view. */
  async open(): Promise<void> {
    await this.gotoHash('/#/solicitacoes');
    await this.waitForHeading('Solicitações');
  }

  /** Assert the atestados and ajustes tabs are visible. */
  async expectTabsVisible(): Promise<void> {
    await this.waitForText('Atestados');
    await this.waitForText('Ajustes');
  }
}
