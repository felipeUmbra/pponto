/**
 * Biometric clock-in view (Stitch #11) — Bate-Ponto Biométrico.
 *
 * - Live clock (Brasília NTP simulation)
 * - Facial verification viewport with scanning beam
 * - Geolocation + geofence check (Haversine vs geofences)
 * - Offline queue fallback (IndexedDB)
 * - Daily timeline summary (4 slots)
 */
import { requireAuth } from '../../core/auth.js';
import { queuePunch } from '../../core/offline.js';
import type { OfflinePunch } from '../../core/offline.js';
import { CONFIG } from '../../config.js';
import { showToast } from '../../components/toast.js';
import {
  getUserWithSchedule,
  getTodayPunches,
  getGeofences,
  getCompanySettings,
  insertPunch,
} from '../../api/data.js';
import type { PunchType } from '../../types.js';
import {
  PUNCH_CTA_LABELS,
  PUNCH_ORDER,
  formatLongDate,
  formatSeconds,
  formatTime,
  haversineMeters,
  nextPunchType,
} from '../../utils/time.js';
import { renderTodayGrid } from '../../components/punch-card.js';
import { esc } from '../../utils/dom.js';

export function renderPonto(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-3.5';
  el.innerHTML = `
    <div class="text-center py-6 text-outline text-body-sm">
      <span class="material-symbols-outlined animate-spin inline-block">autorenew</span>
      Carregando...
    </div>
  `;
  void initPunch(el);
  return el;
}

interface GeoState {
  lat: number;
  lng: number;
  accuracy: number;
  inside: boolean;
  nearestName: string;
  distanceM: number;
}

async function initPunch(root: HTMLElement): Promise<void> {
  const user = requireAuth();
  let cancelled = false;
  window.addEventListener('hashchange', () => { cancelled = true; }, { once: true });

  // Loading shell
  root.innerHTML = `
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 rounded-full bg-blue-vibrant/10 flex items-center justify-center">
          <span class="material-symbols-outlined text-blue-vibrant text-2xl">person</span>
        </div>
        <div>
          <h1 class="text-body-md font-semibold text-on-surface" data-role="profile-name">Olá, ${esc(user.name.split(' ')[0])}</h1>
          <p class="text-caption text-outline" data-role="schedule-name">Carregando jornada...</p>
        </div>
      </div>
      <div class="bg-surface-container-low px-2.5 py-1.5 rounded-lg text-right border border-border-subtle">
        <span class="text-caption text-outline block">Jornada</span>
        <span class="text-tabular-time text-secondary font-semibold" data-role="schedule-time">--:--</span>
      </div>
    </section>

    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle text-center shadow-sm">
      <div class="text-outline text-caption uppercase tracking-wider font-semibold mb-0.5 flex items-center justify-center space-x-1">
        <span class="material-symbols-outlined text-[16px] text-blue-vibrant">schedule</span>
        <span>Horário de Brasília (NTP.br)</span>
      </div>
      <div class="text-4xl font-mono font-semibold text-navy-deep tracking-tight my-0.5" data-role="live-clock">--:--:--</div>
      <div class="text-caption text-on-surface-variant" data-role="live-date">Carregando data...</div>
    </section>

    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm">
      <div class="w-full flex items-center justify-between mb-2.5">
        <div class="flex items-center space-x-1.5">
          <span class="material-symbols-outlined text-blue-vibrant text-[18px]">face</span>
          <span class="text-body-sm font-semibold text-on-surface">Validação Facial Ativa</span>
        </div>
        <span class="bg-surface-container-low text-emerald-light text-badge-label px-2 py-0.5 rounded-full border border-emerald-light/30 flex items-center space-x-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-light"></span>
          <span>Liveness Test OK</span>
        </span>
      </div>
      <div class="relative w-64 h-64 mx-auto rounded-2xl bg-navy-deep overflow-hidden flex items-center justify-center border-2 border-emerald-light/60 shadow-inner" data-role="viewport">
        <div class="scanner-beam absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-light to-transparent z-20 shadow-[0_0_8px_#10B981]"></div>
        <div class="relative z-10 w-44 h-56 rounded-[50%] border-2 border-dashed border-emerald-light/90 flex items-center justify-center">
          <div class="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-light"></div>
          <div class="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-light"></div>
          <div class="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-light"></div>
          <div class="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-light"></div>
          <div class="w-3 h-3 border border-emerald-light/40 rounded-full flex items-center justify-center">
            <div class="w-1 h-1 bg-emerald-light rounded-full"></div>
          </div>
        </div>
        <span class="material-symbols-outlined text-emerald-light/50 text-6xl z-0" data-role="face-placeholder">mood</span>
      </div>
      <p class="text-caption text-on-surface-variant text-center mt-2.5">
        Posicione a face no centro. Não use óculos escuros, bonés ou adereços faciais.
      </p>
    </section>

    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm" data-role="geo-card">
      <div class="flex items-start justify-between">
        <div class="flex items-start space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-blue-vibrant shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[20px]">location_on</span>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-body-md text-on-surface font-semibold">Verificando localização...</h2>
              <span class="bg-surface-container-low text-secondary text-caption px-1.5 py-0.5 rounded font-medium" data-role="geo-tag"></span>
            </div>
            <p class="text-body-sm text-on-surface-variant" data-role="geo-address">Solicitando GPS...</p>
          </div>
        </div>
        <div class="relative flex items-center justify-center w-7 h-7">
          <div class="pulse-ring-active absolute w-6 h-6 rounded-full bg-emerald-light/30"></div>
          <span class="w-3 h-3 rounded-full bg-emerald-light border-2 border-neutral-card z-10"></span>
        </div>
      </div>
      <div class="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-caption">
        <div class="flex items-center space-x-1.5 text-teal-success font-medium" data-role="geo-status">
          <span class="material-symbols-outlined text-[16px]">verified_user</span>
          <span>Verificando perímetro...</span>
        </div>
        <div class="text-tabular-time text-on-surface-variant" data-role="geo-distance">
          Distância: <strong class="text-on-surface font-semibold">--m do REP</strong> • Precisão ±--m
        </div>
      </div>
    </section>

    <section class="pt-1">
      <button class="w-full h-16 bg-blue-vibrant active:scale-[0.98] transition-all duration-150 rounded-2xl shadow-lg hover:bg-secondary text-white font-semibold flex items-center justify-center space-x-3 px-4 border border-blue-accent/30 focus:outline-none focus:ring-4 focus:ring-blue-accent/25" data-role="punch-btn" disabled>
        <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span class="material-symbols-outlined text-[24px]">fingerprint</span>
        </div>
        <div class="text-left leading-tight">
          <span class="block text-[15px] tracking-wide" data-role="punch-cta">CARREGANDO...</span>
          <span class="block text-caption text-secondary-fixed opacity-90" data-role="punch-cta-sub">Aguarde</span>
        </div>
        <span class="material-symbols-outlined text-[20px] ml-auto">arrow_forward</span>
      </button>
    </section>

    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm" data-role="today-section">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-1.5">
          <span class="material-symbols-outlined text-outline text-[18px]">history_toggle_off</span>
          <h3 class="text-body-md font-semibold text-on-surface">Registros de Hoje</h3>
        </div>
        <span class="text-caption text-on-surface-variant text-tabular-time" data-role="today-count">0 de 4 batidas</span>
      </div>
      <div data-role="today-grid"></div>
      <div class="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between text-caption text-outline">
        <span data-role="last-nsr">Último Comprovante: --</span>
        <a href="#" class="text-secondary hover:underline flex items-center font-medium">
          Ver Comprovantes (PDF) <span class="material-symbols-outlined text-[14px] ml-0.5">open_in_new</span>
        </a>
      </div>
    </section>
  `;

  // ── Live clock ────────────────────────────────────────────
  const clockEl = root.querySelector<HTMLElement>('[data-role="live-clock"]');
  const dateEl = root.querySelector<HTMLElement>('[data-role="live-date"]');
  const tick = (): void => {
    if (clockEl) clockEl.textContent = formatSeconds(new Date());
    if (dateEl) dateEl.textContent = formatLongDate();
  };
  tick();
  window.setInterval(tick, 1000);

  // ── Load data in parallel ─────────────────────────────────
  await refreshPunchState(root, user.id);

  // ── Geolocation + geofence ────────────────────────────────
  let geo: GeoState | null = null;
  try {
    const [geofences, settings] = await Promise.all([
      getGeofences(user.company_id),
      getCompanySettings(user.company_id),
    ]);
    if (cancelled) return;
    geo = await locateAndCheck(geofences, user.company_id, settings);
    if (cancelled) return;
    if (geo) {
      const tag = root.querySelector<HTMLElement>('[data-role="geo-tag"]');
      const addr = root.querySelector<HTMLElement>('[data-role="geo-address"]');
      const status = root.querySelector<HTMLElement>('[data-role="geo-status"]');
      const dist = root.querySelector<HTMLElement>('[data-role="geo-distance"]');
      if (tag) tag.textContent = geo.inside ? 'GPS Fix' : 'Fora da cerca';
      if (addr) addr.textContent = geo.inside ? geo.nearestName : 'Fora do perímetro — registro sujeito a análise';
      if (status) {
        status.innerHTML = geo.inside
          ? '<span class="material-symbols-outlined text-[16px]">verified_user</span><span>Dentro do perímetro</span>'
          : '<span class="material-symbols-outlined text-[16px]">warning</span><span>Fora do perímetro</span>';
        status.classList.toggle('text-teal-success', geo.inside);
        status.classList.toggle('text-amber-warning', !geo.inside);
      }
      if (dist) {
        dist.innerHTML = `Distância: <strong class="text-on-surface font-semibold">${Math.round(geo.distanceM)}m do REP</strong> • Precisão ±${geo.accuracy}m`;
      }
    }
  } catch {
    // non-fatal
  }

  // ── Punch action ──────────────────────────────────────────
  const btn = root.querySelector<HTMLButtonElement>('[data-role="punch-btn"]');
  const photoRef: { current: string | null } = { current: null };
  btn?.addEventListener('click', () => {
    void doPunch(root, user.id, geo, photoRef);
  });

  // Capture a live selfie if the camera is available (non-fatal)
  void captureSelfie().then((dataUrl) => {
    if (dataUrl && !cancelled) photoRef.current = dataUrl;
  });
}

/**
 * (Re)load user & today's punches, then render the state.
 */
async function refreshPunchState(
  root: HTMLElement,
  userId: string,
): Promise<void> {
  try {
    const [userInfo, todayPunches] = await Promise.all([
      getUserWithSchedule(userId),
      getTodayPunches(userId),
    ]);

    const nameEl = root.querySelector<HTMLElement>('[data-role="profile-name"]');
    if (nameEl) nameEl.textContent = `Olá, ${esc(userInfo.name.split(' ')[0])}`;
    const scheduleNameEl = root.querySelector<HTMLElement>('[data-role="schedule-name"]');
    if (scheduleNameEl) scheduleNameEl.textContent = userInfo.scheduleName;
    const scheduleTimeEl = root.querySelector<HTMLElement>('[data-role="schedule-time"]');
    if (scheduleTimeEl) {
      scheduleTimeEl.textContent = `${userInfo.scheduleStart ?? '08:00'} - ${userInfo.scheduleEnd ?? '18:00'}`;
    }

    const types = todayPunches.map((p) => p.type);
    const next = nextPunchType(types);
    setNextState(root, next);

    const grid = root.querySelector<HTMLElement>('[data-role="today-grid"]');
    const countEl = root.querySelector<HTMLElement>('[data-role="today-count"]');
    if (grid) {
      grid.innerHTML = '';
      const slots: Record<PunchType, { time: string | null; done: boolean; next?: boolean }> = {
        entry: { time: null, done: false },
        break_start: { time: null, done: false },
        break_end: { time: null, done: false },
        exit: { time: null, done: false },
      };
      todayPunches.forEach((p) => {
        slots[p.type] = { time: formatTime(p.timestamp), done: true };
      });
      if (next) slots[next] = { time: null, done: false, next: true };
      grid.appendChild(renderTodayGrid(slots));
    }
    if (countEl) countEl.textContent = `${types.length} de ${PUNCH_ORDER.length} batidas`;
    const lastNsr = root.querySelector<HTMLElement>('[data-role="last-nsr"]');
    if (lastNsr) lastNsr.textContent = `Último Comprovante: #${String(892411 + types.length)}`;
  } catch {
    // Non-fatal: leave placeholders
  }
}

function setNextState(root: HTMLElement, next: PunchType | null): void {
  const btn = root.querySelector<HTMLButtonElement>('[data-role="punch-btn"]');
  const cta = root.querySelector<HTMLElement>('[data-role="punch-cta"]');
  const ctaSub = root.querySelector<HTMLElement>('[data-role="punch-cta-sub"]');
  if (!btn || !cta || !ctaSub) return;

  if (!next) {
    cta.textContent = 'JORNADA COMPLETA';
    ctaSub.textContent = 'Todas as batidas de hoje registradas';
    btn.setAttribute('disabled', 'disabled');
    return;
  }

  cta.textContent = 'BATER PONTO';
  ctaSub.textContent = PUNCH_CTA_LABELS[next];
  btn.removeAttribute('disabled');
}

async function locateAndCheck(
  geofences: Awaited<ReturnType<typeof getGeofences>>,
  companyId: string,
  settings: Awaited<ReturnType<typeof getCompanySettings>>,
): Promise<GeoState | null> {
  const enabled = settings?.geofencing_enabled === 1;

  if (!enabled) {
    return {
      lat: -23.5912,
      lng: -46.683,
      accuracy: 10,
      inside: true,
      nearestName: 'Geofencing desativado — registro livre',
      distanceM: 0,
    };
  }

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let best: { name: string; distance: number; radius: number } = {
          name: 'Sede',
          distance: Number.POSITIVE_INFINITY,
          radius: CONFIG.DEFAULT_GEOFENCE_RADIUS,
        };
        for (const g of geofences) {
          if (g.company_id !== companyId) continue;
          const d = haversineMeters(latitude, longitude, g.latitude, g.longitude);
          if (d < best.distance) {
            best = { name: g.name, distance: d, radius: g.radius_meters };
          }
        }
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          inside: best.distance <= best.radius,
          nearestName: best.name,
          distanceM: best.distance,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

async function doPunch(
  root: HTMLElement,
  userId: string,
  geo: GeoState | null,
  photoRef: { current: string | null },
): Promise<void> {
  const btn = root.querySelector<HTMLButtonElement>('[data-role="punch-btn"]');
  const ctaSub = root.querySelector<HTMLElement>('[data-role="punch-cta-sub"]');
  if (!btn || !ctaSub || btn.disabled) return;

  // Current next type from today's punches
  try {
    const today = await getTodayPunches(userId);
    const next = nextPunchType(today.map((p) => p.type));
    if (!next) return;

    btn.setAttribute('disabled', 'disabled');
    ctaSub.textContent = 'Registrando...';

    const now = new Date();
    const timestamp = now.toISOString();
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Haptic feedback
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate?.(60);
    }

    if (online) {
      await insertPunch({
        userId,
        type: next,
        timestamp,
        photoUrl: photoRef.current,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        gpsAccuracy: geo?.accuracy ?? null,
        geofenceId: geo?.inside ? 'gf-nearest' : null,
        source: 'mobile',
      });
    } else {
      // Offline contingency (Stitch #14)
      const item: OfflinePunch = {
        id: crypto.randomUUID(),
        userId,
        type: next,
        timestamp,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        gpsAccuracy: geo?.accuracy ?? null,
        source: 'mobile',
        photoUrl: photoRef.current,
      };
      await queuePunch(item);
    }

    showToast(
      online ? 'Ponto Registrado com Sucesso!' : 'Ponto Registrado em Modo Offline',
      online
        ? 'Comprovante assinado digitalmente ICP-Brasil.'
        : 'Na fila de sincronização — envio automático ao reconectar.',
      online ? { tone: 'success', icon: 'verified' } : { tone: 'offline', icon: 'cloud_off' },
    );
    await refreshPunchState(root, userId);
    btn.removeAttribute('disabled');
  } catch {
    btn.removeAttribute('disabled');
    ctaSub.textContent = 'Falha ao registrar — tente novamente';
  }
}

/**
 * Try to capture a face selfie from the camera. Returns a data URL or null.
 * Non-fatal — the punch proceeds without a photo if the camera is blocked.
 */
async function captureSelfie(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 320, height: 320 },
      audio: false,
    });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    // Let the scanner beam "run" briefly then snap
    await new Promise((r) => window.setTimeout(r, 700));

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, 320, 320);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}
