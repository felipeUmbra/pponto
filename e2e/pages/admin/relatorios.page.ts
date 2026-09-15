import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin relatórios page — analytics KPIs, banco de horas.
 */
export class AdminRelatoriosPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/relatorios');
    await this.waitForHeading('Relatórios Gerenciais');
  }

  /** Assert the main KPI bento grid is visible. */
  async expectKpiBento(): Promise<void> {
    await this.waitForText('Saldo Geral do Banco');
    await this.waitForText('Horas Extras Totais');
  }
}
