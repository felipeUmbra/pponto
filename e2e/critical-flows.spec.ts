import { test, expect } from '@playwright/test';

/**
 * Mobile employee flow: Login → Punch → Espelho → Solicitações
 */
test.describe('Mobile employee flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee (Ana Beatriz Souza)
    await page.goto('/login');
    await page.selectOption('#login-user', { label: 'Ana Beatriz Souza (employee)' });
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/ponto/);
  });

  test('should register a punch and see it in espelho', async ({ page }) => {
    // Wait for punch view to load
    await expect(page.locator('h1:has-text("Bate-Ponto")')).toBeVisible();
    // Punch button should become enabled once state loads
    const punchBtn = page.locator('[data-role="punch-btn"]');
    await expect(punchBtn).toBeEnabled({ timeout: 10000 });

    // Register the entry punch
    await punchBtn.click();
    await expect(page.locator('text=Ponto Registrado')).toBeVisible({ timeout: 10000 });

    // Navigate to Espelho de Ponto (hash router)
    await page.goto('/#/espelho');
    await expect(page.locator('h1:has-text("Espelho de Ponto")')).toBeVisible();
  });

  test('should open solicitações and see atestados list', async ({ page }) => {
    await page.goto('/#/solicitacoes');
    await expect(page.locator('h1:has-text("Solicitações")')).toBeVisible();
    // Should show tabs for atestados/ajustes
    await expect(page.locator('text=Atestados')).toBeVisible();
    await expect(page.locator('text=Ajustes')).toBeVisible();
  });
});

/**
 * Admin flow: Dashboard → Tratamento → Homologação → Aprovação
 */
test.describe('Admin dashboard flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (Pedro Augusto)
    await page.goto('/login');
    await page.selectOption('#login-user', { label: 'Pedro Augusto (admin)' });
    await page.click('button:has-text("Entrar")');
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('should show dashboard KPI cards and side nav', async ({ page }) => {
    // Dashboard content h1 is "Tratamento de Ponto & Ocorrências"
    await expect(page.locator('h1:has-text("Tratamento de Ponto")')).toBeVisible();
    // KPI cards
    await expect(page.locator('text=Presentes Hoje')).toBeVisible();
    await expect(page.locator('text=Atestados Pendentes').first()).toBeVisible();
    await expect(page.locator('text=Ajustes Pendentes').first()).toBeVisible();
    await expect(page.locator('text=Divergências').first()).toBeVisible();
    // Side nav items
    await expect(page.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('a:has-text("Tratamento de Ponto")')).toBeVisible();
    await expect(page.locator('a:has-text("Homologação de Atestados")')).toBeVisible();
    await expect(page.locator('a:has-text("Aprovação de Ajustes")')).toBeVisible();
    await expect(page.locator('a:has-text("Relatórios & Banco de Horas")')).toBeVisible();
    await expect(page.locator('a:has-text("Fechamento de Folha")')).toBeVisible();
    await expect(page.locator('a:has-text("Cercas Virtuais")')).toBeVisible();
    await expect(page.locator('a:has-text("Contingência Offline")')).toBeVisible();
    await expect(page.locator('a:has-text("Configurações")')).toBeVisible();
  });

  test('should navigate to tratamento and show employee list', async ({ page }) => {
    await page.click('a:has-text("Tratamento de Ponto")');
    await expect(page).toHaveURL(/.*\/admin\/tratamento/);
    await expect(page.locator('h1:has-text("Tratamento de Ponto")')).toBeVisible();
    // Should show employee rows
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to homologacao and show certificates', async ({ page }) => {
    await page.click('a:has-text("Homologação de Atestados")');
    await expect(page).toHaveURL(/.*\/admin\/homologacao/);
    await expect(page.locator('h1:has-text("Homologação de Atestados")')).toBeVisible();
    // Certificate queue is a card grid — with pending demo data, expect approve buttons
    await expect(page.locator('.btn-approve').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to aprovacao and show adjustments', async ({ page }) => {
    await page.click('a:has-text("Aprovação de Ajustes")');
    await expect(page).toHaveURL(/.*\/admin\/aprovacao/);
    await expect(page.locator('h1:has-text("Aprovação de Ajustes")')).toBeVisible();
    // Adjustment queue is a card grid
    await expect(page.locator('.btn-approve').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to relatorios and show KPI bento', async ({ page }) => {
    await page.click('a:has-text("Relatórios & Banco de Horas")');
    await expect(page).toHaveURL(/.*\/admin\/relatorios/);
    await expect(page.locator('h1:has-text("Relatórios Gerenciais")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Saldo Geral do Banco')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Horas Extras Totais')).toBeVisible();
  });

  test('should navigate to fechamento and show export cards', async ({ page }) => {
    await page.click('a:has-text("Fechamento de Folha")');
    await expect(page).toHaveURL(/.*\/admin\/fechamento/);
    await expect(page.locator('h1:has-text("Fechamento de Ponto")')).toBeVisible();
    await expect(page.locator('text=Arquivo Fonte de Dados (AFD)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Arquivo Fonte Tratado (AFDT)')).toBeVisible();
    await expect(page.locator('text=Controle de Jornada (ACJEF)')).toBeVisible();
  });

  test('should navigate to cercas and show geofence map', async ({ page }) => {
    await page.click('a:has-text("Cercas Virtuais")');
    await expect(page).toHaveURL(/.*\/admin\/cercas/);
    await expect(page.locator('h2:has-text("Cercas Virtuais")')).toBeVisible();
    // Vector map canvas is an SVG
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to offline and show sync status', async ({ page }) => {
    await page.click('a:has-text("Contingência Offline")');
    await expect(page).toHaveURL(/.*\/admin\/offline/);
    await expect(page.locator('h2:has-text("Resiliência Offline")')).toBeVisible();
    await expect(page.locator('button:has-text("Tentar Sincronizar Agora")')).toBeVisible();
  });

  test('should navigate to configuracoes and show feature flags', async ({ page }) => {
    await page.click('a:has-text("Configurações")');
    await expect(page).toHaveURL(/.*\/admin\/configuracoes/);
    await expect(page.locator('h1:has-text("Configurações")')).toBeVisible();
    await expect(page.locator('text=Geofencing')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Captura de Foto')).toBeVisible();
    await expect(page.locator('text=Biometria Facial')).toBeVisible();
    await expect(page.locator('text=Sincronização Offline')).toBeVisible();
    await expect(page.locator('text=Lembretes')).toBeVisible();
    await expect(page.locator('text=RBAC')).toBeVisible();
  });
});