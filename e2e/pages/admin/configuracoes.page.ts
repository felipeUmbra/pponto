import { expect, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Admin configurações page — feature flags, RBAC, reminders.
 */
export class AdminConfiguracoesPage extends BasePage {
  /** Feature flag labels expected in the view. */
  private readonly featureFlags = [
    'Geofencing',
    'Captura de Foto',
    'Biometria Facial',
    'Sincronização Offline',
    'Lembretes',
    'RBAC',
  ] as const;

  constructor(page: Page) {
    super(page);
  }

  /** Navigate and wait for the view to load. */
  async open(): Promise<void> {
    await this.gotoHash('/#/admin/configuracoes');
    await this.waitForHeading('Configurações');
  }

  /** Assert all feature flags are visible. */
  async expectFeatureFlags(): Promise<void> {
    for (const flag of this.featureFlags) {
      await this.waitForText(flag, 5_000);
    }
  }
}
