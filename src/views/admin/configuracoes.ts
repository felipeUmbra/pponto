/**
 * Configurações — company settings, feature flags & RBAC (Phase 4).
 *
 * - Company profile card (from demo/seed)
 * - Feature toggles: geofencing, photo, biometric, offline sync, reminders
 * - Reminder lead-time selector
 * - RBAC role matrix
 */
import {
  getCompanySettings,
  listAdminUsers,
  listDepartments,
  updateCompanySettings,
} from '../../api/data.js';
import type { CompanySettings } from '../../types.js';
import { getCurrentUser } from '../../core/store.js';
import { esc } from '../../utils/dom.js';
import { showToast } from '../../components/toast.js';
import { createAdminPageSkeleton } from '../../components/skeleton.js';

export async function renderConfiguracoes(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  // Show skeleton while loading
  el.appendChild(createAdminPageSkeleton());

  const user = getCurrentUser();
  const companyId = user?.company_id ?? 'cmp-001';
  const isAdmin = user?.role === 'admin';

  try {
    const [settings, users, departments] = await Promise.all([
      getCompanySettings(companyId),
      listAdminUsers(),
      listDepartments(companyId),
    ]);
    el.innerHTML = '';

    // ── Header ──
    const header = document.createElement('section');
    header.className = 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm';
    header.innerHTML = `
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Configurações</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-secondary border border-blue-200">Empresa</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">Políticas de ponto, recursos biométricos e permissões de acesso.</p>
      </div>`;
    el.appendChild(header);

    // ── Company card ──
    el.appendChild(renderCompanyCard());

    // ── Feature toggles ──
    el.appendChild(renderToggles(settings, companyId, isAdmin));

    // ── Reminder config ──
    el.appendChild(renderReminder(settings, companyId, isAdmin));

    // ── RBAC matrix ──
    el.appendChild(renderRbac(users, departments));
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderCompanyCard(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm';
  section.innerHTML = `
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl bg-navy-deep text-white flex items-center justify-center font-bold text-sm">pP</div>
        <div>
          <h2 class="text-headline-sm text-on-surface">Umbran Digital Ltda</h2>
          <p class="text-body-sm text-on-surface-variant mt-0.5">CNPJ: 45.928.110/0001-92 • Av. Paulista, 1000 — Bela Vista, São Paulo/SP</p>
          <p class="text-caption text-outline mt-0.5">Plano: REP-P Cloud • Portaria 671 MTE homologado</p>
        </div>
      </div>
      <span class="px-2.5 py-0.5 rounded-full text-caption font-semibold bg-emerald-light/10 text-teal-success border border-emerald-light/20 flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-light animate-pulse"></span>Ativo
      </span>
    </div>`;
  return section;
}

function renderToggles(settings: CompanySettings, companyId: string, isAdmin: boolean): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm';

  const toggles: Array<{
    key: keyof Pick<CompanySettings, 'geofencing_enabled' | 'photo_capture_enabled' | 'biometric_enabled' | 'offline_sync_enabled' | 'reminders_enabled'>;
    icon: string;
    title: string;
    desc: string;
  }> = [
    { key: 'geofencing_enabled', icon: 'location_on', title: 'Geofencing', desc: 'Valida a localização do colaborador dentro das cercas virtuais antes do registro.' },
    { key: 'photo_capture_enabled', icon: 'camera_front', title: 'Captura de Foto', desc: 'Exige fotografia no momento da batida (prova anti-fraude / anti-proxy).' },
    { key: 'biometric_enabled', icon: 'fingerprint', title: 'Biometria Facial', desc: 'Habilita a validação de vivacidade facial no Bate-Ponto.' },
    { key: 'offline_sync_enabled', icon: 'cloud_sync', title: 'Sincronização Offline', desc: 'Permite registrar ponto sem internet e sincronizar automaticamente.' },
    { key: 'reminders_enabled', icon: 'notifications_active', title: 'Lembretes', desc: 'Notifica o colaborador antes do início da jornada.' },
  ];

  section.innerHTML = `
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-headline-sm text-on-surface">Recursos &amp; Políticas</h2>
        <p class="text-caption text-outline">Alterações afetam todos os colaboradores imediatamente.</p>
      </div>
      <button class="px-3 py-1.5 rounded-lg bg-blue-vibrant hover:bg-secondary text-white text-body-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5 btn-save-toggles ${isAdmin ? '' : 'opacity-40 pointer-events-none'}">
        <span class="material-symbols-outlined text-[18px]">save</span>Salvar
      </button>
    </div>
    <div class="flex flex-col divide-y divide-border-subtle">
      ${toggles.map((t) => `
        <label class="py-3 flex items-center justify-between gap-4 cursor-pointer">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-surface-container text-secondary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">${t.icon}</span>
            </div>
            <div>
              <span class="text-body-md font-semibold text-on-surface">${t.title}</span>
              <p class="text-caption text-on-surface-variant">${t.desc}</p>
            </div>
          </div>
          <div class="relative inline-flex items-center">
            <input type="checkbox" data-key="${t.key}" class="peer sr-only toggle" ${settings[t.key] === 1 ? 'checked' : ''} ${isAdmin ? '' : 'disabled'}>
            <div class="w-11 h-6 bg-border-subtle rounded-full peer-checked:bg-blue-vibrant after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
          </div>
        </label>`).join('')}
    </div>`;

  section.querySelector('.btn-save-toggles')?.addEventListener('click', () => {
    const patch: Partial<Omit<CompanySettings, 'company_id'>> = {};
    section.querySelectorAll<HTMLInputElement>('.toggle').forEach((input) => {
      const key = input.dataset.key as keyof Omit<CompanySettings, 'company_id'>;
      patch[key] = input.checked ? 1 : 0;
    });
    void updateCompanySettings(companyId, patch)
      .then(() => showToast('Configurações salvas', 'Políticas atualizadas para todos os colaboradores.'))
      .catch((err) => showToast('Erro ao salvar', String(err), { tone: 'danger' }));
  });

  return section;
}

function renderReminder(settings: CompanySettings, companyId: string, isAdmin: boolean): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm';

  section.innerHTML = `
    <div class="mb-4">
      <h2 class="text-headline-sm text-on-surface">Lembrete de Início de Jornada</h2>
      <p class="text-caption text-outline">Antecedência para notificar o colaborador antes do horário programado.</p>
    </div>
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <select id="reminder-lead" class="flex-1 px-3 py-2 bg-neutral-canvas border border-border-subtle rounded-lg text-body-sm font-medium text-on-surface focus:ring-1 focus:ring-blue-vibrant focus:border-blue-vibrant ${isAdmin ? '' : 'opacity-50 pointer-events-none'}" ${isAdmin ? '' : 'disabled'}>
        <option value="5" ${settings.reminder_lead_minutes === 5 ? 'selected' : ''}>5 minutos antes</option>
        <option value="10" ${settings.reminder_lead_minutes === 10 ? 'selected' : ''}>10 minutos antes</option>
        <option value="15" ${settings.reminder_lead_minutes === 15 ? 'selected' : ''}>15 minutos antes</option>
        <option value="30" ${settings.reminder_lead_minutes === 30 ? 'selected' : ''}>30 minutos antes</option>
        <option value="60" ${settings.reminder_lead_minutes === 60 ? 'selected' : ''}>1 hora antes</option>
      </select>
      <button class="px-4 py-2 rounded-lg bg-navy-deep hover:bg-navy-surface text-white text-body-sm font-semibold transition-colors flex items-center gap-1.5 ${isAdmin ? '' : 'opacity-40 pointer-events-none'} btn-save-lead">
        <span class="material-symbols-outlined text-[18px]">schedule</span>Aplicar
      </button>
    </div>`;

  section.querySelector('.btn-save-lead')?.addEventListener('click', () => {
    const minutes = Number((section.querySelector('#reminder-lead') as HTMLSelectElement).value);
    void updateCompanySettings(companyId, { reminder_lead_minutes: minutes })
      .then(() => showToast('Lembrete atualizado', `Notificações enviadas ${minutes} min antes da jornada.`))
      .catch((err) => showToast('Erro ao salvar', String(err), { tone: 'danger' }));
  });

  return section;
}

function renderRbac(
  users: Awaited<ReturnType<typeof listAdminUsers>>,
  departments: Awaited<ReturnType<typeof listDepartments>>,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card rounded-xl p-5 border border-border-subtle shadow-sm';

  const rolePill = (role: string): string => {
    const map: Record<string, string> = {
      admin: 'bg-error-container text-ruby-danger',
      rh: 'bg-purple-subtle text-purple-bank',
      manager: 'bg-blue-50 text-blue-vibrant',
      employee: 'bg-surface-container text-secondary',
    };
    const label: Record<string, string> = { admin: 'Admin', rh: 'RH', manager: 'Gestor', employee: 'Colaborador' };
    return `<span class="px-2 py-0.5 rounded-full text-caption font-semibold ${map[role] ?? 'bg-surface-container text-secondary'}">${label[role] ?? role}</span>`;
  };

  section.innerHTML = `
    <div class="mb-4">
      <h2 class="text-headline-sm text-on-surface">Controle de Acesso (RBAC)</h2>
      <p class="text-caption text-outline">${departments.map((d) => esc(d.name)).join(' • ')}</p>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-border-subtle text-caption text-outline uppercase tracking-wider">
            <th class="py-2.5 px-3 font-semibold">Colaborador</th>
            <th class="py-2.5 px-3 font-semibold">Departamento</th>
            <th class="py-2.5 px-3 font-semibold">Função</th>
            <th class="py-2.5 px-3 font-semibold text-right">Acesso</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle text-body-sm">
          ${users.map((u) => `
            <tr class="hover:bg-neutral-canvas">
              <td class="py-2.5 px-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-surface-container text-secondary flex items-center justify-center font-bold text-caption">${esc(u.user.name.charAt(0))}</div>
                  <span class="font-medium text-on-surface">${esc(u.user.name)}</span>
                </div>
              </td>
              <td class="py-2.5 px-3 text-on-surface-variant">${departments.find((d) => d.id === u.user.department_id)?.name ?? '—'}</td>
              <td class="py-2.5 px-3">${rolePill(u.user.role)}</td>
              <td class="py-2.5 px-3 text-right">
                <span class="text-caption ${u.user.role === 'admin' || u.user.role === 'rh' ? 'text-teal-success' : 'text-outline'}">${u.user.role === 'admin' || u.user.role === 'rh' ? 'Painel Admin' : u.user.role === 'manager' ? 'Admin limitado' : 'App mobile'}</span>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  return section;
}