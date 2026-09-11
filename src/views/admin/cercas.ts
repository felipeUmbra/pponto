/**
 * Cercas Virtuais (Geofencing) — admin (Stitch #13).
 *
 * - Vector-styled map with radial zones
 * - List of configured perimeters (CRUD)
 * - Parameter editor: radius slider + outside-radius policy toggle
 */
import {
  deleteGeofence,
  insertGeofence,
  listAllGeofences,
  toggleGeofence,
  updateGeofence,
} from '../../api/data.js';
import type { Geofence } from '../../types.js';
import { getCurrentUser } from '../../core/store.js';
import { esc } from '../../utils/dom.js';
import { showToast } from '../../components/toast.js';
import { showModal } from '../../components/modal.js';

export async function renderCercas(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Carregando dados…</p>';

  const user = getCurrentUser();
  const companyId = user?.company_id ?? 'cmp-001';

  try {
    const fences = await listAllGeofences(companyId);
    el.innerHTML = '';
    el.appendChild(renderMapCard(fences));
    el.appendChild(renderList(fences, companyId));
    el.appendChild(renderEditor(fences, companyId));
  } catch (err) {
    el.innerHTML = `<p class="text-caption text-ruby-danger text-center py-8">Erro ao carregar: ${String(err)}</p>`;
  }

  return el;
}

function renderMapCard(fences: Geofence[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card border border-border-subtle rounded-xl p-5 shadow-sm';
  const first = fences[0];

  // Scale: map is 320×320 CSS px; radius meters → px (cap at 140px)
  const radPx = first ? Math.min(140, Math.max(24, first.radius_meters * 0.9)) : 70;
  // Center marker at the first active fence
  const center = first
    ? { lat: first.latitude, lng: first.longitude }
    : { lat: -23.5912, lng: -46.683 };

  section.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-secondary">map</span>
        <h2 class="text-headline-sm text-on-surface">Cercas Virtuais (Geofencing)</h2>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-0.5 rounded-full text-badge-label bg-emerald-50 text-teal-success border border-emerald-200 flex items-center gap-1 font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-light animate-pulse"></span>
          Precisão GPS: ±4 metros
        </span>
      </div>
    </div>
    <!-- Vector map canvas -->
    <div class="relative w-full h-80 rounded-lg overflow-hidden bg-slate-100 border border-border-subtle flex items-center justify-center select-none shadow-inner">
      <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(#94A3B8 1px, transparent 1px); background-size: 24px 24px;"></div>
      <svg class="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 800 400" preserveAspectRatio="none" aria-hidden="true">
        <path d="M -50,160 L 800,160" stroke="#CBD5E1" stroke-width="32"></path>
        <path d="M -50,160 L 800,160" stroke="#FFFFFF" stroke-width="26"></path>
        <path d="M 320,-50 L 320,400" stroke="#CBD5E1" stroke-width="24"></path>
        <path d="M 320,-50 L 320,400" stroke="#FFFFFF" stroke-width="18"></path>
        <path d="M 120,-50 L 120,400" stroke="#E2E8F0" stroke-width="12"></path>
        <path d="M 520,-50 L 520,400" stroke="#E2E8F0" stroke-width="14"></path>
        <path d="M -20,320 L 700,40" stroke="#E2E8F0" stroke-dasharray="6,4" stroke-width="16"></path>
        <rect fill="#E2E8F0" height="100" rx="4" width="160" x="140" y="40"></rect>
        <rect fill="#E2E8F0" height="100" rx="4" width="160" x="340" y="40"></rect>
        <rect fill="#E2E8F0" height="120" rx="4" width="160" x="140" y="180"></rect>
        <rect fill="#E2E8F0" height="120" rx="4" width="160" x="340" y="180"></rect>
      </svg>
      <div class="relative z-10 flex items-center justify-center">
        <div class="absolute w-64 h-64 rounded-full bg-emerald-light/15 border border-teal-success/40 animate-ping" style="animation-duration: 3s;"></div>
        <div class="w-56 h-56 rounded-full bg-teal-success/15 border-2 border-dashed border-teal-success flex items-center justify-center shadow-lg" style="width: ${radPx * 2}px; height: ${radPx * 2}px;">
          <div class="w-32 h-32 rounded-full border border-teal-success/30 flex items-center justify-center">
            <span class="text-[10px] font-tabular-time text-teal-success font-bold bg-neutral-card/90 px-2 py-0.5 rounded shadow-sm">Raio: ${first?.radius_meters ?? 70}m</span>
          </div>
        </div>
        <div class="absolute flex flex-col items-center pointer-events-none -translate-y-5">
          <div class="w-9 h-9 rounded-full bg-blue-vibrant border-2 border-neutral-card shadow-md flex items-center justify-center text-neutral-card">
            <span class="material-symbols-outlined text-lg">corporate_fare</span>
          </div>
          <div class="w-2.5 h-2.5 bg-blue-vibrant rotate-45 -mt-1 shadow-sm"></div>
          <div class="mt-1 bg-navy-deep text-neutral-card text-caption px-2 py-0.5 rounded shadow-md font-semibold whitespace-nowrap">${esc(first?.name ?? 'Nenhuma cerca')}</div>
        </div>
      </div>
      <div class="absolute top-3 right-3 bg-neutral-card/95 border border-border-subtle rounded-lg shadow-sm p-1 flex flex-col gap-1 z-20">
        <button class="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-low rounded text-sm font-bold" type="button">+</button>
        <div class="h-px bg-border-subtle w-full"></div>
        <button class="w-7 h-7 flex items-center justify-center text-on-surface hover:bg-surface-container-low rounded text-sm font-bold" type="button">−</button>
      </div>
      <div class="absolute bottom-2 left-2 right-2 bg-neutral-card/95 backdrop-blur-sm border border-border-subtle rounded-lg px-3 py-2 flex items-center justify-between text-caption shadow-sm z-20">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-teal-success text-base">verified</span>
          <span class="text-on-surface font-medium">Coordenadas: <span class="font-tabular-time text-on-surface-variant">${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</span></span>
        </div>
        <span class="text-on-surface-variant font-medium">${fences.filter((f) => f.active === 1).length} cerca(s) ativa(s)</span>
      </div>
    </div>`;

  return section;
}

function renderList(fences: Geofence[], companyId: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'mt-5';

  const icons = ['domain', 'warehouse', 'location_city', 'storefront', 'home_work'];
  let items = '';
  for (let i = 0; i < fences.length; i += 1) {
    const f = fences[i]!;
    const active = f.active === 1;
    items += `
      <div class="p-3.5 rounded-lg border ${active ? 'border-blue-vibrant/60 bg-surface-container-low/50' : 'border-border-subtle bg-neutral-card'} transition-all" data-fence="${f.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg ${active ? 'bg-secondary text-neutral-card' : 'bg-surface-container-highest text-secondary'} flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-lg">${icons[i % icons.length]}</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-headline-sm text-on-surface">${esc(f.name)}</span>
                <span class="px-2 py-0.5 rounded text-badge-label ${active ? 'bg-emerald-100 text-teal-success' : 'bg-slate-100 text-outline'} font-semibold">${active ? 'Tolerância Ativa' : 'Inativa'}</span>
              </div>
              <p class="text-body-sm text-on-surface-variant mt-0.5 font-mono">${f.latitude.toFixed(6)}, ${f.longitude.toFixed(6)}</p>
              <div class="flex items-center gap-4 mt-2 text-caption text-on-surface-variant">
                <span class="flex items-center gap-1 font-semibold text-on-surface">
                  <span class="material-symbols-outlined text-sm text-secondary">radar</span>
                  Raio: ${f.radius_meters}m
                </span>
                <span class="text-outline flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">schedule</span>
                  ${new Date(f.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button class="p-1.5 text-on-surface-variant hover:text-secondary rounded hover:bg-neutral-card transition-colors btn-toggle" title="${active ? 'Desativar' : 'Ativar'}" data-id="${f.id}">
              <span class="material-symbols-outlined text-lg">${active ? 'toggle_on' : 'toggle_off'}</span>
            </button>
            <button class="p-1.5 text-on-surface-variant hover:text-ruby-danger rounded hover:bg-neutral-card transition-colors btn-delete" title="Excluir Perímetro" data-id="${f.id}">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  section.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <span class="text-headline-sm text-on-surface">Locais Autorizados Cadastrados</span>
      <span class="text-caption text-on-surface-variant font-medium">${fences.length} unidade(s) mapeadas</span>
    </div>
    <div class="space-y-3">${items || '<p class="text-caption text-outline text-center py-6">Nenhuma cerca cadastrada ainda.</p>'}</div>`;

  section.querySelectorAll('.btn-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      void handleToggle(id, fences, companyId);
    });
  });
  section.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      void handleDelete(id, fences, companyId);
    });
  });

  return section;
}

function renderEditor(fences: Geofence[], companyId: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'bg-neutral-card border border-border-subtle rounded-xl p-5 shadow-sm';

  // Default: first fence or a new blank
  const editing = fences[0];
  const name = editing?.name ?? '';
  const lat = editing?.latitude ?? -23.5912;
  const lng = editing?.longitude ?? -46.683;
  const radius = editing?.radius_meters ?? 70;

  section.innerHTML = `
    <div class="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-secondary">tune</span>
        <h3 class="text-headline-sm text-on-surface">Editor de Parâmetros de Perímetro</h3>
      </div>
      <span class="text-caption text-on-surface-variant">Modo: <strong>${editing ? 'Edição' : 'Novo'}</strong></span>
    </div>
    <form class="space-y-4 fence-form">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-caption font-semibold text-on-surface mb-1.5" for="gf-name">Nome da Cerca</label>
          <input id="gf-name" class="w-full px-3 py-2 text-body-md border border-border-subtle rounded-lg focus:ring-1 focus:ring-blue-vibrant focus:border-blue-vibrant text-on-surface bg-neutral-card" type="text" value="${esc(name)}" placeholder="Ex.: Matriz São Paulo">
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-caption font-semibold text-on-surface mb-1.5" for="gf-lat">Latitude</label>
            <input id="gf-lat" class="w-full px-3 py-2 text-body-md border border-border-subtle rounded-lg focus:ring-1 focus:ring-blue-vibrant focus:border-blue-vibrant text-on-surface font-tabular-time" type="number" step="any" value="${lat}">
          </div>
          <div>
            <label class="block text-caption font-semibold text-on-surface mb-1.5" for="gf-lng">Longitude</label>
            <input id="gf-lng" class="w-full px-3 py-2 text-body-md border border-border-subtle rounded-lg focus:ring-1 focus:ring-blue-vibrant focus:border-blue-vibrant text-on-surface font-tabular-time" type="number" step="any" value="${lng}">
          </div>
        </div>
      </div>

      <div class="p-3.5 bg-surface-container-low rounded-lg border border-border-subtle">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="text-body-md font-semibold text-on-surface">Raio de Tolerância de Batida</span>
            <span class="text-caption text-on-surface-variant">(Recomendado MTE: 50m a 100m)</span>
          </div>
          <span class="font-tabular-time text-body-md font-bold text-secondary bg-neutral-card px-2.5 py-0.5 rounded border border-border-subtle" id="radius-display">${radius} metros</span>
        </div>
        <input id="gf-radius" class="w-full h-2 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-blue-vibrant" max="500" min="30" step="5" type="range" value="${radius}">
        <div class="flex justify-between text-[11px] text-on-surface-variant mt-1.5">
          <span>30 metros (Ultra-restrito)</span><span>100 metros</span><span>250 metros</span><span>500 metros (Área Ampla)</span>
        </div>
      </div>

      <div class="p-3.5 bg-surface-container-low rounded-lg border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="space-y-0.5">
          <span class="text-body-md font-semibold text-on-surface">Status da Cerca</span>
          <p class="text-caption text-on-surface-variant">Registro de ponto digital permitido apenas dentro do perímetro (Portaria 671 MTE - REP-P).</p>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input id="gf-active" type="checkbox" class="w-4 h-4 accent-blue-vibrant" ${editing?.active === 1 ? 'checked' : 'checked'}>
          <span class="text-body-sm font-medium text-on-surface">Cerca ativa</span>
        </label>
      </div>

      <div class="flex items-center gap-2 pt-1">
        <button class="px-4 py-2 rounded-lg bg-blue-vibrant hover:bg-secondary text-white text-body-sm font-semibold shadow-sm transition-colors flex items-center gap-1.5" type="submit">
          <span class="material-symbols-outlined text-lg">save</span>
          <span>${editing ? 'Salvar Alterações' : 'Criar Cerca'}</span>
        </button>
        <button class="px-4 py-2 rounded-lg border border-border-subtle bg-neutral-card text-on-surface text-body-sm font-medium hover:bg-surface-container-low transition-colors" type="button" id="gf-reset">Limpar</button>
      </div>
    </form>`;

  const radiusInput = section.querySelector<HTMLInputElement>('#gf-radius')!;
  const radiusDisplay = section.querySelector<HTMLElement>('#radius-display')!;
  radiusInput.addEventListener('input', () => {
    radiusDisplay.textContent = `${radiusInput.value} metros`;
  });

  section.querySelector('#gf-reset')?.addEventListener('click', () => {
    const form = section.querySelector('form')!;
    (form.elements.namedItem('gf-name') as HTMLInputElement).value = '';
    (form.elements.namedItem('gf-lat') as HTMLInputElement).value = String(-23.5912);
    (form.elements.namedItem('gf-lng') as HTMLInputElement).value = String(-46.683);
    radiusInput.value = '70';
    radiusDisplay.textContent = '70 metros';
  });

  section.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const get = (id: string): string => (form.elements.namedItem(id) as HTMLInputElement).value;
    const active = (form.elements.namedItem('gf-active') as HTMLInputElement).checked ? 1 : 0;
    void handleSave({
      id: editing?.id ?? null,
      name: get('gf-name'),
      latitude: Number(get('gf-lat')),
      longitude: Number(get('gf-lng')),
      radiusMeters: Number(radiusInput.value),
      active,
      companyId,
    });
  });

  return section;
}

async function handleToggle(id: string, fences: Geofence[], companyId: string): Promise<void> {
  const f = fences.find((x) => x.id === id);
  if (!f) return;
  const next = f.active === 1 ? 0 : 1;
  try {
    await toggleGeofence(id, next);
    showToast(next === 1 ? 'Cerca ativada' : 'Cerca desativada', `${f.name} ${next === 1 ? 'voltou a validar geofence.' : 'não valida mais registros.'}`);
    await reload(fences, companyId);
  } catch (err) {
    showToast('Erro ao atualizar', String(err), { tone: 'danger' });
  }
}

async function handleDelete(id: string, fences: Geofence[], companyId: string): Promise<void> {
  const f = fences.find((x) => x.id === id);
  if (!f) return;
  const { confirmed } = await showModal({
    title: 'Excluir perímetro',
    message: `Remover "${f.name}"? Essa ação não pode ser desfeita.`,
    confirmLabel: 'Excluir',
    danger: true,
  });
  if (!confirmed) return;
  try {
    await deleteGeofence(id);
    showToast('Cerca excluída', `${f.name} removida com sucesso.`);
    await reload(fences, companyId);
  } catch (err) {
    showToast('Erro ao excluir', String(err), { tone: 'danger' });
  }
}

async function handleSave(input: {
  id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: number;
  companyId: string;
}): Promise<void> {
  if (!input.name.trim()) {
    showToast('Nome obrigatório', 'Informe um nome para a cerca.', { tone: 'warning' });
    return;
  }
  try {
    if (input.id) {
      await updateGeofence(input.id, {
        name: input.name.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        active: input.active,
      });
      showToast('Cerca atualizada', `${input.name} salva com sucesso.`);
    } else {
      await insertGeofence({
        companyId: input.companyId,
        name: input.name.trim(),
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
        active: input.active,
      });
      showToast('Cerca criada', `${input.name} adicionada aos perímetros.`);
    }
    // Re-render via custom event (main.ts listens and re-renders)
    window.dispatchEvent(new CustomEvent('pponto:refresh'));
  } catch (err) {
    showToast('Erro ao salvar', String(err), { tone: 'danger' });
  }
}

async function reload(fences: Geofence[], companyId: string): Promise<void> {
  // Simple optimistic re-render — view re-fetches on next custom event.
  // For immediate feedback, swap the list section via a full re-render.
  const fresh = await listAllGeofences(companyId).catch(() => fences);
  window.dispatchEvent(new CustomEvent('pponto:refresh', { detail: { fences: fresh } }));
}