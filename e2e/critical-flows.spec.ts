import { test, expect } from '@playwright/test';
import {
  LoginPage,
  MobilePunchPage,
  MobileEspelhoPage,
  MobileSolicitacoesPage,
  AdminDashboardPage,
  AdminTratamentoPage,
  AdminHomologacaoPage,
  AdminAprovacaoPage,
  AdminRelatoriosPage,
  AdminFechamentoPage,
  AdminCercasPage,
  AdminOfflinePage,
  AdminConfiguracoesPage,
} from './pages';

/**
 * Mobile employee flow: Login → Punch → Espelho → Solicitações
 */
test.describe('Mobile employee flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee (Ana Beatriz Souza)
    const login = new LoginPage(page);
    await login.loginAs('Ana Beatriz Souza (employee)', /.*\/ponto/);
  });

  test('should register a punch and see it in espelho', async ({ page }) => {
    // Wait for the punch view to fully load
    const punch = new MobilePunchPage(page);
    await punch.waitForLoad();

    // Register the entry punch
    await punch.registerPunch();

    // Navigate to Espelho de Ponto (hash router)
    const espelho = new MobileEspelhoPage(page);
    await espelho.open();
  });

  test('should open solicitações and see atestados list', async ({ page }) => {
    const solicitacoes = new MobileSolicitacoesPage(page);
    await solicitacoes.open();
    await solicitacoes.expectTabsVisible();
  });
});

/**
 * Admin flow: Dashboard → Tratamento → Homologação → Aprovação
 */
test.describe('Admin dashboard flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (Pedro Augusto)
    const login = new LoginPage(page);
    await login.loginAs('Pedro Augusto (admin)', /.*\/admin/);
  });

  test('should show dashboard KPI cards and side nav', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.waitForLoad();
    await dashboard.expectKpiCards();
    await dashboard.expectSideNavLinks();
  });

  test('should navigate to tratamento and show employee list', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Tratamento de Ponto');
    await expect(page).toHaveURL(/.*\/admin\/tratamento/);

    const tratamento = new AdminTratamentoPage(page);
    await tratamento.expectEmployeeTable();
  });

  test('should navigate to homologacao and show certificates', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Homologação de Atestados');
    await expect(page).toHaveURL(/.*\/admin\/homologacao/);

    const homologacao = new AdminHomologacaoPage(page);
    await homologacao.expectCertificateQueue();
  });

  test('should navigate to aprovacao and show adjustments', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Aprovação de Ajustes');
    await expect(page).toHaveURL(/.*\/admin\/aprovacao/);

    const aprovacao = new AdminAprovacaoPage(page);
    await aprovacao.expectAdjustmentQueue();
  });

  test('should navigate to relatorios and show KPI bento', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Relatórios & Banco de Horas');
    await expect(page).toHaveURL(/.*\/admin\/relatorios/);

    const relatorios = new AdminRelatoriosPage(page);
    await relatorios.expectKpiBento();
  });

  test('should navigate to fechamento and show export cards', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Fechamento de Folha');
    await expect(page).toHaveURL(/.*\/admin\/fechamento/);

    const fechamento = new AdminFechamentoPage(page);
    await fechamento.expectExportCards();
  });

  test('should navigate to cercas and show geofence map', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Cercas Virtuais');
    await expect(page).toHaveURL(/.*\/admin\/cercas/);

    const cercas = new AdminCercasPage(page);
    await cercas.expectGeofenceMap();
  });

  test('should navigate to offline and show sync status', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Contingência Offline');
    await expect(page).toHaveURL(/.*\/admin\/offline/);

    const offline = new AdminOfflinePage(page);
    await offline.expectSyncButton();
  });

  test('should navigate to configuracoes and show feature flags', async ({ page }) => {
    const dashboard = new AdminDashboardPage(page);
    await dashboard.navigateTo('Configurações');
    await expect(page).toHaveURL(/.*\/admin\/configuracoes/);

    const configuracoes = new AdminConfiguracoesPage(page);
    await configuracoes.expectFeatureFlags();
  });
});