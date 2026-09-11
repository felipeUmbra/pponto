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
import {
  renderTratamento,
  renderHomologacao,
  renderAprovacao,
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

    // Admin
    case 'admin':
      return renderAdminShell('admin', 'Dashboard', renderDashboard());
    case 'admin-tratamento':
      return renderAdminShell('admin-tratamento', 'Tratamento de Ponto', renderTratamento());
    case 'admin-homologacao':
      return renderAdminShell('admin-homologacao', 'Homologação de Atestados', renderHomologacao());
    case 'admin-aprovacao':
      return renderAdminShell('admin-aprovacao', 'Aprovação de Ajustes', renderAprovacao());
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