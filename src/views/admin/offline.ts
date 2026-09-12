/**
 * Contingência Offline — status da fila de sincronização (Stitch #14).
 *
 * Mobile-styled card showing the local sync queue, with a manual
 * "Tentar Sincronizar Agora" action and automatic background sync
 * (listens to the online event).
 */
import {
  getQueueCount,
  getQueuedPunches,
  syncQueue,
} from '../../core/offline.js';
import type { OfflinePunch } from '../../core/offline.js';
import { insertPunch } from '../../api/data.js';
import type { Punch } from '../../types.js';
import { formatSeconds } from '../../utils/time.js';
import { showToast } from '../../components/toast.js';
import { createAdminPageSkeleton } from '../../components/skeleton.js';
import { createEmptyState } from '../../components/empty-state.js';

export function renderOffline(): HTMLElement {
  const el = document.createElement('div');
  // Show skeleton while loading (though this view loads fast)
  el.appendChild(createAdminPageSkeleton());
  el.className = 'space-y-4 max-w-2xl';
  el.innerHTML = `
    <section class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h2 class="text-headline-sm text-on-surface">Resiliência Offline</h2>
          <p class="text-caption text-on-surface-variant mt-0.5">Registros offline têm validade jurídica imediata e são sincronizados automaticamente (background sync).</p>
        </div>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold bg-blue-50 text-blue-vibrant border border-blue-200">
          <span class="material-symbols-outlined text-sm">security</span>
          RSA-2048
        </span>
      </div>

      <div class="bg-neutral-canvas rounded-lg p-3 border border-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined ${isOnline() ? 'text-teal-success' : 'text-amber-warning'}">${isOnline() ? 'cloud_done' : 'cloud_off'}</span>
          <div>
            <div class="text-body-sm font-semibold text-on-surface">${isOnline() ? 'Conectado à nuvem' : 'Offline — fila local ativa'}</div>
            <div class="text-caption text-on-surface-variant" id="offline-count">Verificando fila…</div>
          </div>
        </div>
        <span class="material-symbols-outlined text-outline" id="sync-pocket-icon">${isOnline() ? 'task_alt' : 'pending'}</span>
      </div>

      <div class="mt-3 flex flex-col gap-2">
        <button class="w-full py-2.5 px-4 rounded-lg border border-border-subtle bg-neutral-card hover:bg-surface-container-low text-navy-deep font-semibold flex items-center justify-center gap-2 text-body-sm transition-all active:scale-[0.99]" id="btn-sync" type="button">
          <span class="material-symbols-outlined text-[18px] text-blue-vibrant" id="sync-icon">sync</span>
          <span id="sync-text">Tentar Sincronizar Agora</span>
        </button>
        <div class="flex items-start gap-2 pt-1 text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px] text-teal-success shrink-0 mt-0.5">security</span>
          <p class="text-caption leading-tight"><strong>Fique tranquilo:</strong> o envio para o servidor do RH ocorre em segundo plano assim que a conexão for restabelecida.</p>
        </div>
      </div>
    </section>

    <section class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-warning"></span>
          <h3 class="text-headline-sm text-on-surface font-semibold text-[15px]">Fila de Sincronização Pendente</h3>
        </div>
        <span class="text-badge-label bg-amber-soft/10 text-amber-warning font-bold px-2 py-0.5 rounded-full border border-amber-soft/30" id="queue-badge">0 registros</span>
      </div>
      <div id="queue-list" class="space-y-2"></div>
    </section>
  `;

  // Bind actions after first render
  void initOffline(el);
  return el;
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

async function initOffline(root: HTMLElement): Promise<void> {
  const btn = root.querySelector<HTMLButtonElement>('#btn-sync');
  const syncIcon = root.querySelector<HTMLElement>('#sync-icon');
  const syncText = root.querySelector<HTMLElement>('#sync-text');
  const countEl = root.querySelector<HTMLElement>('#offline-count');
  const badge = root.querySelector<HTMLElement>('#queue-badge');
  const listEl = root.querySelector<HTMLElement>('#queue-list');

  const refresh = async (): Promise<void> => {
    const count = await getQueueCount();
    const queued = await getQueuedPunches();
    if (badge) badge.textContent = `${count} registro${count === 1 ? '' : 's'}`;
    if (countEl) countEl.textContent = `${count} pendente${count === 1 ? '' : 's'} de sincronização`;
    if (listEl) {
      listEl.innerHTML = queued.length
        ? queued.map(renderQueuedItem).join('')
        : createEmptyState({
            icon: 'cloud_done',
            title: 'Tudo sincronizado',
            subtitle: 'Nenhum registro pendente de sincronização 🎉',
          }).outerHTML;
    }
  };

  const doSync = async (): Promise<void> => {
    if (btn) btn.disabled = true;
    if (syncIcon) syncIcon.classList.add('animate-spin');
    if (syncText) syncText.textContent = 'Verificando conectividade…';

    try {
      const synced = await syncQueue(async (item: OfflinePunch) => {
        await insertPunch({
          userId: item.userId,
          type: item.type as Punch['type'],
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
        showToast('Sincronização concluída', `${synced} registro(s) enviados para a nuvem.`);
      } else {
        showToast('Nada pendente', 'Todos os registros já estão na nuvem.', { tone: 'warning', icon: 'task_alt' });
      }
    } catch {
      showToast('Sem rede', 'Falha ao sincronizar — mantido no cache seguro.', { tone: 'offline', icon: 'cloud_off' });
    } finally {
      if (btn) btn.disabled = false;
      if (syncIcon) syncIcon.classList.remove('animate-spin');
      if (syncText) syncText.textContent = isOnline() ? 'Tentar Sincronizar Agora' : 'Sem rede. Mantido no cache seguro';
      await refresh();
    }
  };

  btn?.addEventListener('click', () => void doSync());
  window.addEventListener('online', () => void doSync());
  window.addEventListener('pponto:refresh', () => void refresh());
  await refresh();
}

function renderQueuedItem(item: OfflinePunch): string {
  const labels: Record<string, string> = {
    entry: 'Ponto de Entrada',
    break_start: 'Saída Intervalo',
    break_end: 'Retorno Intervalo',
    exit: 'Saída Final',
  };
  return `
    <div class="p-3 bg-neutral-canvas rounded-lg border border-border-subtle flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="material-symbols-outlined text-amber-warning text-[20px]">pending</span>
        <div>
          <div class="text-body-sm font-semibold text-on-surface">${labels[item.type] ?? item.type} • ${formatSeconds(item.timestamp)}</div>
          <div class="text-caption text-on-surface-variant font-mono">#${item.id.slice(0, 8)}</div>
        </div>
      </div>
      <span class="material-symbols-outlined text-outline text-[18px]">cloud_sync</span>
    </div>`;
}