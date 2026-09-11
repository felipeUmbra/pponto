/**
 * Login view — PIN-based authentication.
 * Matches the general pPonto branding (navy + blue-vibrant).
 */
import { demoLogin } from '../core/auth.js';
import { navigate } from '../router.js';
import { listUsers } from '../api/data.js';
import { getCurrentUser } from '../core/store.js';

export function renderLogin(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex items-center justify-center bg-navy-deep p-4';

  container.innerHTML = `
    <div class="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl p-8 space-y-6">
      <div class="flex flex-col items-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-blue-vibrant flex items-center justify-center text-white shadow-lg">
          <span class="material-symbols-outlined text-3xl">fingerprint</span>
        </div>
        <h1 class="text-headline-lg font-bold text-on-surface tracking-tight">pPonto</h1>
        <p class="text-body-md text-on-surface-variant text-center">Acesse seu registro de ponto</p>
      </div>

      <form id="login-form" class="space-y-4">
        <div>
          <label class="block text-body-sm font-medium text-on-surface mb-1.5">Selecionar Usuário</label>
          <select
            id="login-user"
            class="w-full px-4 py-2.5 text-body-md bg-neutral-canvas border border-border-subtle rounded-lg focus:outline-none focus:border-blue-vibrant focus:ring-1 focus:ring-blue-vibrant text-on-surface"
          >
            <option value="">Carregando usuários...</option>
          </select>
        </div>

        <div>
          <label class="block text-body-sm font-medium text-on-surface mb-1.5">PIN</label>
          <input
            id="login-pin"
            type="password"
            maxlength="6"
            placeholder="••••••"
            class="w-full px-4 py-2.5 text-body-md bg-neutral-canvas border border-border-subtle rounded-lg focus:outline-none focus:border-blue-vibrant focus:ring-1 focus:ring-blue-vibrant text-center tracking-[0.5em] font-mono text-on-surface"
          />
        </div>

        <div id="login-error" class="hidden text-body-sm text-ruby-danger text-center"></div>

        <button
          type="submit"
          class="w-full py-3 bg-blue-vibrant hover:bg-secondary text-white font-semibold rounded-lg transition-colors shadow-sm text-body-md"
        >
          Entrar
        </button>
      </form>

      <div class="text-center">
        <p class="text-caption text-outline">Portaria 671 MTE • REP-P Nuvem</p>
      </div>
    </div>
  `;

  // Load users into dropdown
  setTimeout(async () => {
    const select = container.querySelector<HTMLSelectElement>('#login-user');
    if (!select) return;
    try {
      const users = await listUsers();
      select.innerHTML = '<option value="">Selecione...</option>';
      if (users.length === 0) {
        select.innerHTML = '<option value="">Nenhum usuário disponível</option>';
      }
      for (const u of users) {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name} (${u.role})`;
        select.appendChild(opt);
      }
    } catch {
      select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
  }, 0);

  // Form submit
  const form = container.querySelector<HTMLFormElement>('#login-form');
  const errorDiv = container.querySelector<HTMLDivElement>('#login-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = container.querySelector<HTMLSelectElement>('#login-user');
    const userId = select?.value;

    if (!userId) {
      if (errorDiv) {
        errorDiv.textContent = 'Selecione um usuário.';
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    try {
      // Demo mode: just login with the selected user (no PIN required)
      await demoLogin(userId);
      // Navigate based on role
      const user = getCurrentUser();
      const homePath = user?.role === 'employee' ? '/ponto' : '/admin';
      navigate(homePath);
    } catch (err) {
      if (errorDiv) {
        errorDiv.textContent = err instanceof Error ? err.message : 'Erro ao entrar.';
        errorDiv.classList.remove('hidden');
      }
    }
  });

  return container;
}
