import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin fechamento de folha page — payroll export (AFD, AFDT, ACJEF).
 */
export class AdminFechamentoPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/fechamento');
    await this.waitForHeading('Fechamento de Ponto');
  }

  /** Assert all export cards are visible. */
  async expectExportCards(): Promise<void> {
    await this.waitForText('Arquivo Fonte de Dados (AFD)');
    await this.waitForText('Arquivo Fonte Tratado (AFDT)');
    await this.waitForText('Controle de Jornada (ACJEF)');
  }
}
