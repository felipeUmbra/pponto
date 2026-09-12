import './styles.css';
import { initRouter, onRouteChange, rerender } from './router.js';
import type { MatchedRoute } from './types.js';
import { renderLogin } from './views/login.js';
import { renderMobileShell } from './views/mobile/shell.js';
import { renderAdminShell } from './views/admin/shell.js';
import { renderPonto } from './views/mobile/punch.js';
import { renderEspelho } from './views/mobile/espelho.js';
import { renderSolicitacoes } from './views/mobile/solicitacoes.js';
import { renderAjuste } from './views/mobile/ajuste.js';
import { renderDashboard } from './views/admin/dashboard.js';
import { renderPontoWeb } from './views/admin/ponto-web.js';
import { renderTratamento } from './views/admin/tratamento.js';
import { renderHomologacao } from './views/admin/homologacao.js';
import { renderAprovacao } from './views/admin/aprovacao.js';
import { renderRelatorios } from './views/admin/relatorios.js';
import { renderFechamento } from './views/admin/fechamento.js';
import { renderCercas } from './views/admin/cercas.js';
import { renderOffline } from './views/admin/offline.js';
import { renderConfiguracoes } from './views/admin/configuracoes.js';

const app = document.querySelector<HTMLDivElement>('#app');

function clearApp(): void {
  if (app) app.innerHTML = '';
}

function viewForRoute(matched: MatchedRoute): HTMLElement {
  switch (matched.route.name) {
    case 'login':
      return renderLogin();

    // Mobile
    case 'ponto':
      return renderMobileShell('ponto', 'Bate-Ponto', renderPonto());
    case 'espelho':
      return renderMobileShell('espelho', 'Espelho de Ponto', renderEspelho());
    case 'solicitacoes':
      return renderMobileShell('solicitacoes', 'Solicitações', renderSolicitacoes());
    case 'ajuste':
      return renderMobileShell('ajuste', 'Solicitação de Ajuste', renderAjuste());

    // Admin (async — attach to shell asynchronously)
    case 'admin': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderDashboard().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin', 'Dashboard', content);
    }
    case 'admin-ponto-web': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderPontoWeb().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-ponto-web', 'Registrar Ponto Web', content);
    }
    case 'admin-tratamento': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderTratamento().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-tratamento', 'Tratamento de Ponto', content);
    }
    case 'admin-homologacao': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderHomologacao().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-homologacao', 'Homologação de Atestados', content);
    }
    case 'admin-aprovacao': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderAprovacao().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-aprovacao', 'Aprovação de Ajustes', content);
    }
    case 'admin-relatorios': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderRelatorios().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-relatorios', 'Relatórios Analíticos', content);
    }
    case 'admin-fechamento': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderFechamento().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-fechamento', 'Fechamento de Folha', content);
    }
    case 'admin-cercas': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderCercas().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-cercas', 'Cercas Virtuais', content);
    }
    case 'admin-offline':
      return renderAdminShell('admin-offline', 'Contingência Offline', renderOffline());
    case 'admin-configuracoes': {
      const content = document.createElement('div');
      content.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando…</p>';
      void renderConfiguracoes().then((v) => {
        content.replaceWith(v);
      }).catch(() => { /* view handles errors */ });
      return renderAdminShell('admin-configuracoes', 'Configurações', content);
    }

    default:
      return renderLogin();
  }
}

function render(matched: MatchedRoute | null): void {
  clearApp();
  if (!matched || !app) return;
  const view = viewForRoute(matched);
  app.appendChild(view);
}

// Re-render on custom refresh (after fechamento/cercas/config actions).
// Views dispatch `pponto:refresh` after mutations so the current route
// re-renders with fresh data.
window.addEventListener('pponto:refresh', () => {
  rerender();
});

// Boot
onRouteChange(render);
initRouter();

// Auto-drain the offline queue when the app boots online.
// Uses a dynamic import to keep the boot path lean, and only runs
// when the sync queue is enabled (non-crucial — best-effort).
void import('./core/offline.js').then(async ({ syncQueue, getQueueCount }) => {
  try {
    if (typeof navigator === 'undefined') return;
    if (!navigator.onLine) return;
    const pending = await getQueueCount();
    if (pending === 0) return;
    const { insertPunch } = await import('./api/data.js');
    const synced = await syncQueue(async (item) => {
      await insertPunch({
        userId: item.userId,
        type: item.type as import('./types.js').PunchType,
        timestamp: item.timestamp,
        photoUrl: item.photoUrl,
        latitude: item.latitude,
        longitude: item.longitude,
        gpsAccuracy: item.gpsAccuracy,
        geofenceId: null,
        source: 'mobile',
      });
    });
    if (synced > 0) {
      console.info(`[pponto] Offline queue drained: ${synced} punch(es) synced.`);
    }
  } catch {
    // best-effort; retried on next online event or manual sync
  }
});