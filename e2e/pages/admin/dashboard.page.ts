import { expect, type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin dashboard / landing page after login.
 * Shows KPI cards and side navigation.
 */
export class AdminDashboardPage extends BasePage {
  /** KPI label texts shown on the dashboard. */
  private readonly kpiLabels = [
    'Presentes Hoje',
    'Atestados Pendentes',
    'Ajustes Pendentes',
    'Divergências',
  ] as const;

  /** Side navigation link labels. */
  private readonly navLinks = [
    'Dashboard',
    'Tratamento de Ponto',
    'Homologação de Atestados',
    'Aprovação de Ajustes',
    'Relatórios & Banco de Horas',
    'Fechamento de Folha',
    'Cercas Virtuais',
    'Contingência Offline',
    'Configurações',
  ] as const;

  constructor(page: Page) {
    super(page);
  }

  /** Wait until the admin shell is visible with KPIs. */
  async waitForLoad(): Promise<void> {
    await this.waitForHeading('Tratamento de Ponto');
  }

  /** Assert all KPI cards are visible. */
  async expectKpiCards(): Promise<void> {
    for (const label of this.kpiLabels) {
      await this.waitForText(label);
    }
  }

  /** Assert all sidebar navigation links are visible. */
  async expectSideNavLinks(): Promise<void> {
    for (const label of this.navLinks) {
      await expect(this.page.locator(`a:has-text("${label}")`)).toBeVisible();
    }
  }

  /** Click a sidebar navigation link by label. */
  async navigateTo(label: string): Promise<void> {
    await this.page.click(`a:has-text("${label}")`);
  }
}
