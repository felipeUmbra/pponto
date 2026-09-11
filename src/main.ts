import './styles.css';
import { initRouter, onRouteChange } from './router.js';
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
import {
  renderRelatorios,
  renderFechamento,
  renderCercas,
  renderConfiguracoes,
} from './views/admin/placeholders.js';

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
    case 'admin-relatorios':
      return renderAdminShell('admin-relatorios', 'Relatórios Analíticos', renderRelatorios());
    case 'admin-fechamento':
      return renderAdminShell('admin-fechamento', 'Fechamento de Folha', renderFechamento());
    case 'admin-cercas':
      return renderAdminShell('admin-cercas', 'Cercas Virtuais', renderCercas());
    case 'admin-configuracoes':
      return renderAdminShell('admin-configuracoes', 'Configurações', renderConfiguracoes());

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

// Boot
initRouter();
onRouteChange(render);