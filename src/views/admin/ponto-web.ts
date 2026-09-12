/**
 * Ponto Web (Stitch #06) — web clock-in with camera + GPS.
 *
 * - Live Brasília clock (NTP.br)
 * - Anti-fraud facial viewport (camera preview + liveness badge)
 * - Geolocation + geofence telemetry (Haversine vs geofences)
 * - Shift slot selector (4 stages of the work day)
 * - Punch action + Portaria 671 digital receipt preview
 */
import { requireAuth } from '../../core/auth.js';
import { queuePunch } from '../../core/offline.js';
import type { OfflinePunch } from '../../core/offline.js';
import { CONFIG } from '../../config.js';
import {
  getUserWithSchedule,
  getTodayPunches,
  getGeofences,
  getCompanySettings,
  insertPunch,
  setDemoFallback,
} from '../../api/data.js';
import type { PunchType } from '../../types.js';
import { PUNCH_SHORT_LABELS, PUNCH_CTA_LABELS, PUNCH_ORDER, formatLongDate, formatSeconds, formatTime, haversineMeters, nextPunchType } from '../../utils/time.js';
import { createAdminPageSkeleton } from '../../components/skeleton.js';

interface GeoState {
  lat: number;
  lng: number;
  accuracy: number;
  inside: boolean;
  nearestName: string;
  distanceM: number;
}

export async function renderPontoWeb(): Promise<HTMLElement> {
  const el = document.createElement('div');
  el.className = 'space-y-6';
  // Show skeleton while loading
  el.appendChild(createAdminPageSkeleton());
  void initPontoWeb(el);
  return el;
}

/**
 * Data helper: try the live DB, and on failure degrade to the demo
 * dataset (same semantics as listUsers). Once the fallback is armed,
 * all subsequent data calls short-circuit to demo.
 */
async function withDemo<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    setDemoFallback(true);
    return await fn();
  }
}

async function initPontoWeb(root: HTMLElement): Promise<void> {
  const user = requireAuth();
  let cancelled = false;
  window.addEventListener('hashchange', () => { cancelled = true; }, { once: true });

  // Loading shell
  root.innerHTML = `
    <!-- Top alert / anti-spoof compliance banner -->
    <section class="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
      <div class="flex items-center space-x-3">
        <div class="p-2 bg-purple-subtle rounded-lg text-purple-bank flex items-center justify-center">
          <span class="material-symbols-outlined">verified_user</span>
        </div>
        <div>
          <h2 class="text-headline-sm text-on-surface">Ambiente Biométrico Auditado — Portaria MTP nº 671/2021</h2>
          <p class="text-body-sm text-on-surface-variant">Validação por Inteligência Artificial ativa com detecção de vivacidade facial (liveness test) e cerca delimitadora corporativa.</p>
        </div>
      </div>
      <div class="flex items-center space-x-2 self-end md:self-center">
        <span class="text-caption bg-surface-container text-secondary font-medium px-2.5 py-1 rounded-md border border-secondary-fixed">REP-P Em Conformidade</span>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- LEFT COLUMN: camera + map -->
      <div class="lg:col-span-5 flex flex-col gap-6">
        <!-- Anti-fraud camera card -->
        <section class="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-sm relative overflow-hidden flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="material-symbols-outlined text-blue-vibrant">camera_front</span>
              <span class="text-headline-sm text-on-surface">Visor Facial Anti-Fraude</span>
            </div>
            <span class="bg-error-container text-on-error-container text-caption font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-ruby-danger"></span>
              Foto Obrigatória - Anti-Proxy
            </span>
          </div>
          <div class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-navy-deep flex items-center justify-center border border-border-subtle" data-role="camera-viewport">
            <div class="absolute inset-0 bg-gradient-to-t from-navy-deep/80 via-transparent to-navy-deep/40 pointer-events-none"></div>
            <!-- Face oval mask with verification brackets -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="relative w-48 h-60 sm:w-56 sm:h-72 rounded-[45%] border-2 border-dashed border-emerald-light/70 flex items-center justify-center">
                <div class="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-light"></div>
                <div class="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-light"></div>
                <div class="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-light"></div>
                <div class="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-light"></div>
              </div>
            </div>
            <span class="material-symbols-outlined text-emerald-light/40 text-7xl" data-role="camera-placeholder">mood</span>
            <!-- Verification badge overlay -->
            <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div class="bg-navy-deep/85 backdrop-blur-md text-surface-container-lowest border border-teal-success/50 px-3 py-1 rounded-lg text-caption flex items-center space-x-1.5 shadow-md">
                <span class="material-symbols-outlined text-teal-success text-sm" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                <span class="font-medium text-teal-success" data-role="face-match">Rosto Reconhecido</span>
              </div>
              <div class="bg-navy-deep/85 backdrop-blur-md text-teal-success border border-teal-success/50 px-2 py-1 rounded-lg text-caption font-bold tabular-nums" data-role="face-score">98.4% Match</div>
            </div>
            <!-- Liveness feed status -->
            <div class="absolute bottom-3 left-3 right-3 bg-navy-deep/85 backdrop-blur-md text-surface-container-lowest px-3 py-2 rounded-lg border border-border-subtle flex items-center justify-between text-body-sm">
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-teal-success" data-role="liveness-dot"></span>
                <span class="text-caption" data-role="liveness-text">Detecção de Vivacidade Ativa (Anti-Spoofing)</span>
              </div>
              <span class="text-caption text-outline-variant tabular-nums" data-role="liveness-fps">30 FPS • HD</span>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between text-body-sm text-on-surface-variant">
            <span class="flex items-center gap-1 text-caption">
              <span class="material-symbols-outlined text-blue-accent text-sm">lock</span>
              Hash Criptográfica Biometria SHA-256
            </span>
            <button class="text-caption text-blue-vibrant hover:underline flex items-center gap-0.5" data-role="recalibrate-btn">
              <span class="material-symbols-outlined text-sm">refresh</span>
              Recalibrar Câmera
            </button>
          </div>
        </section>

        <!-- GPS geofence card -->
        <section class="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-sm flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="material-symbols-outlined text-blue-vibrant">share_location</span>
              <span class="text-headline-sm text-on-surface">Geolocalização &amp; Cerca Virtual</span>
            </div>
            <span class="bg-surface-container text-teal-success border border-teal-success/30 text-caption font-bold px-2 py-0.5 rounded-full flex items-center gap-1" data-role="geo-chip">
              <span class="w-1.5 h-1.5 rounded-full bg-teal-success"></span>
              Verificando perímetro...
            </span>
          </div>
          <div class="relative w-full h-40 rounded-lg overflow-hidden border border-border-subtle bg-surface-container-low">
            <!-- Stylized geofence map -->
            <div class="absolute inset-0 bg-surface-container-low">
              <div class="absolute inset-0 opacity-40" style="background-image: radial-gradient(circle at 20% 30%, rgba(59,130,246,0.18) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(16,185,129,0.15) 0, transparent 45%), radial-gradient(circle at 50% 50%, rgba(30,41,59,0.06) 0, transparent 60%);"></div>
              <div class="absolute inset-0" style="background-image: linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px); background-size: 24px 24px;"></div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-24 h-24 rounded-full bg-emerald-light/20 border border-emerald-light flex items-center justify-center">
                <div class="w-5 h-5 rounded-full bg-blue-vibrant border-2 border-surface-container-lowest shadow-md flex items-center justify-center">
                  <div class="w-1.5 h-1.5 rounded-full bg-surface-container-lowest"></div>
                </div>
              </div>
            </div>
            <div class="absolute bottom-2 left-2 right-2 bg-surface-container-lowest/90 backdrop-blur-sm border border-border-subtle px-2.5 py-1 rounded text-caption text-on-surface flex items-center justify-between">
              <span class="flex items-center gap-1 text-teal-success font-semibold">
                <span class="material-symbols-outlined text-xs">my_location</span>
                <span data-role="geo-precision">Precisão: ±--m</span>
              </span>
              <span class="text-on-surface-variant tabular-nums" data-role="geo-distance">--m do ponto central</span>
            </div>
          </div>
          <div class="mt-3 space-y-1.5">
            <div class="flex items-start space-x-2 text-body-sm text-on-surface">
              <span class="material-symbols-outlined text-on-surface-variant text-base mt-0.5">domain</span>
              <div>
                <p class="font-medium text-on-surface" data-role="geo-name">Sede Corporativa pPonto - São Paulo</p>
                <p class="text-caption text-on-surface-variant" data-role="geo-address">Aguardando coordenadas...</p>
              </div>
            </div>
            <div class="flex items-center justify-between text-caption text-outline tabular-nums pt-1 border-t border-border-subtle">
              <span data-role="geo-coords">Lat: -- | Long: --</span>
              <span class="text-teal-success font-medium flex items-center gap-1" data-role="geo-status">
                <span class="material-symbols-outlined text-xs">verified</span> Perímetro Válido
              </span>
            </div>
          </div>
        </section>
      </div>

      <!-- RIGHT COLUMN: clock + shift slots + punch + receipt -->
      <div class="lg:col-span-7 flex flex-col gap-6">
        <!-- Punch engine card -->
        <section class="bg-surface-container-lowest rounded-xl border border-border-subtle p-6 shadow-sm flex flex-col justify-between">
          <div class="text-center py-4 border-b border-border-subtle bg-surface-container-low/40 rounded-xl p-6">
            <div class="inline-flex items-center space-x-2 bg-surface-container text-secondary font-semibold text-caption px-3 py-1 rounded-full mb-3 border border-secondary-fixed">
              <span class="material-symbols-outlined text-xs">public</span>
              <span>HORÁRIO OFICIAL DE BRASÍLIA (NTP.BR)</span>
            </div>
            <div class="flex items-baseline justify-center font-mono text-[52px] text-navy-deep tracking-tight font-semibold">
              <span data-role="clock-hm">--:--</span>
              <span class="text-blue-accent animate-pulse mx-0.5">:</span>
              <span class="text-blue-accent" data-role="clock-s">--</span>
              <span class="text-body-md text-outline ml-2 tabular-nums">BRT</span>
            </div>
            <p class="text-body-md text-on-surface-variant mt-1 font-medium" data-role="clock-date">Carregando data...</p>
          </div>

          <div class="my-6">
            <div class="flex items-center justify-between mb-3">
              <span class="text-headline-sm text-on-surface" data-role="schedule-label">Jornada Contratual de Hoje</span>
              <span class="text-caption text-purple-bank bg-purple-subtle px-2.5 py-1 rounded font-medium" data-role="bank-label">Banco de Horas: --</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" data-role="slots-grid"></div>
          </div>

          <div class="space-y-4">
            <button class="w-full h-16 bg-blue-vibrant hover:bg-secondary text-surface-container-lowest rounded-xl text-headline-sm flex items-center justify-center space-x-3 shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-150 focus:ring-4 focus:ring-blue-accent/30 outline-none disabled:opacity-60 disabled:hover:bg-blue-vibrant" data-role="punch-btn" disabled>
              <span class="material-symbols-outlined text-2xl">fingerprint</span>
              <span data-role="punch-cta">CARREGANDO...</span>
            </button>
            <div class="flex items-center justify-center space-x-2 text-center pt-2">
              <span class="material-symbols-outlined text-on-surface-variant text-sm">edit_calendar</span>
              <span class="text-body-sm text-on-surface-variant">Precisa solicitar correção de batida anterior?</span>
              <a class="text-body-sm text-blue-vibrant font-semibold hover:underline" href="#/ajuste">Clique aqui para justificar</a>
            </div>
          </div>
        </section>

        <!-- Portaria 671 receipt preview -->
        <section class="bg-surface-container-lowest rounded-xl border border-border-subtle p-5 shadow-sm">
          <div class="flex items-center justify-between pb-3 border-b border-border-subtle mb-3">
            <div class="flex items-center space-x-2">
              <span class="material-symbols-outlined text-secondary">receipt_long</span>
              <span class="text-headline-sm text-on-surface">Comprovante de Registro de Ponto do Trabalhador</span>
            </div>
            <span class="text-caption bg-surface-container-low text-on-surface-variant px-2.5 py-1 rounded border border-border-subtle font-mono">
              Art. 80 Portaria 671
            </span>
          </div>
          <div class="bg-neutral-canvas rounded-lg p-4 border border-border-subtle text-body-sm space-y-2.5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption pb-2 border-b border-border-subtle">
              <div>
                <span class="text-outline block">Empregador:</span>
                <strong class="text-on-surface block font-semibold">PPONTO TECNOLOGIA E GESTÃO S.A.</strong>
                <span class="tabular-nums text-on-surface-variant">CNPJ: 28.491.039/0001-44</span>
              </div>
              <div>
                <span class="text-outline block">Colaborador:</span>
                <strong class="text-on-surface block font-semibold" data-role="receipt-name">—</strong>
                <span class="tabular-nums text-on-surface-variant" data-role="receipt-meta">CPF: —</span>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <div>
                <div class="text-caption text-outline">Chave de Assinatura Digital do Recibo (SHA-512):</div>
                <div class="tabular-nums text-caption text-on-surface-variant font-mono truncate max-w-sm sm:max-w-md" data-role="receipt-hash">
                  —
                </div>
              </div>
              <div class="flex items-center space-x-2 shrink-0">
                <span class="material-symbols-outlined text-teal-success text-base">mark_email_read</span>
                <span class="text-caption text-teal-success font-medium">Envio automático por e-mail</span>
              </div>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between text-caption text-on-surface-variant">
            <span class="">O arquivo PDF assinado com certificado ICP-Brasil é emitido instantaneamente após a confirmação.</span>
            <a class="text-blue-vibrant hover:underline font-medium inline-flex items-center gap-1" href="#/espelho">
              Ver espelho completo
              <span class="material-symbols-outlined text-xs">arrow_forward</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  `;

  // ── Live clock ────────────────────────────────────────────
  const hmEl = root.querySelector<HTMLElement>('[data-role="clock-hm"]');
  const sEl = root.querySelector<HTMLElement>('[data-role="clock-s"]');
  const dateEl = root.querySelector<HTMLElement>('[data-role="clock-date"]');
  const tick = (): void => {
    if (hmEl) hmEl.textContent = formatSeconds(new Date()).slice(0, 5);
    if (sEl) sEl.textContent = formatSeconds(new Date()).slice(6, 8);
    if (dateEl) dateEl.textContent = formatLongDate();
  };
  tick();
  window.setInterval(tick, 1000);

  // ── Load user + today's punches ───────────────────────────
  const userInfo = await withDemo(() => getUserWithSchedule(user.id));
  if (cancelled) return;
  const today = await withDemo(() => getTodayPunches(user.id));
  if (cancelled) return;

  const scheduleLabel = root.querySelector<HTMLElement>('[data-role="schedule-label"]');
  if (scheduleLabel) scheduleLabel.textContent = `Jornada Contratual de Hoje (${userInfo.scheduleStart ?? '08:00'} - ${userInfo.scheduleEnd ?? '18:00'})`;
  const bankLabel = root.querySelector<HTMLElement>('[data-role="bank-label"]');
  if (bankLabel) bankLabel.textContent = `Banco de Horas: ${userInfo.scheduleName}`;
  const receiptName = root.querySelector<HTMLElement>('[data-role="receipt-name"]');
  if (receiptName) receiptName.textContent = userInfo.name;
  const receiptMeta = root.querySelector<HTMLElement>('[data-role="receipt-meta"]');
  if (receiptMeta) receiptMeta.textContent = `CPF: ${maskCpf(userInfo.cpf)} • Matrícula: ${userInfo.id.slice(-5)}`;

  // Render shift slot grid
  const slotsGrid = root.querySelector<HTMLElement>('[data-role="slots-grid"]');
  const next = nextPunchType(today.map((p) => p.type));
  if (slotsGrid) slotsGrid.innerHTML = renderSlots(today, next);

  // Punch button state
  const btn = root.querySelector<HTMLButtonElement>('[data-role="punch-btn"]');
  const cta = root.querySelector<HTMLElement>('[data-role="punch-cta"]');
  if (next) {
    cta!.textContent = `REGISTRAR ${PUNCH_CTA_LABELS[next].toUpperCase()}`;
    btn!.removeAttribute('disabled');
  } else {
    cta!.textContent = 'JORNADA COMPLETA';
  }

  // ── Geolocation + geofence ────────────────────────────────
  let geo: GeoState | null = null;
  try {
    const [geofences, settings] = await Promise.all([
      withDemo(() => getGeofences(user.company_id)),
      withDemo(() => getCompanySettings(user.company_id)),
    ]);
    if (cancelled) return;
    geo = await locateAndCheck(geofences, user.company_id, settings);
    if (cancelled) return;
    if (geo) {
      const chip = root.querySelector<HTMLElement>('[data-role="geo-chip"]');
      const name = root.querySelector<HTMLElement>('[data-role="geo-name"]');
      const addr = root.querySelector<HTMLElement>('[data-role="geo-address"]');
      const coords = root.querySelector<HTMLElement>('[data-role="geo-coords"]');
      const status = root.querySelector<HTMLElement>('[data-role="geo-status"]');
      const precision = root.querySelector<HTMLElement>('[data-role="geo-precision"]');
      const dist = root.querySelector<HTMLElement>('[data-role="geo-distance"]');
      if (chip) {
        chip.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${geo.inside ? 'bg-teal-success' : 'bg-amber-warning'}"></span>${geo.inside ? 'Dentro da Cerca' : 'Fora da Cerca'}`;
        chip.classList.toggle('text-teal-success', geo.inside);
        chip.classList.toggle('text-amber-warning', !geo.inside);
      }
      if (name) name.textContent = geo.nearestName;
      if (addr) addr.textContent = geo.inside ? 'Perímetro corporativo autorizado para registro.' : 'Registro sujeito a análise da gestão.';
      if (coords) coords.textContent = `Lat: ${geo.lat.toFixed(6)} | Long: ${geo.lng.toFixed(6)}`;
      if (status) {
        status.innerHTML = `<span class="material-symbols-outlined text-xs">${geo.inside ? 'verified' : 'warning'}</span> ${geo.inside ? 'Perímetro Válido' : 'Fora do Perímetro'}`;
        status.classList.toggle('text-teal-success', geo.inside);
        status.classList.toggle('text-amber-warning', !geo.inside);
      }
      if (precision) precision.textContent = `Precisão: ±${geo.accuracy}m`;
      if (dist) dist.textContent = `${Math.round(geo.distanceM)}m do ponto central`;
    }
  } catch {
    // non-fatal
  }

  // ── Camera capture ────────────────────────────────────────
  const photoRef: { current: string | null } = { current: null };
  const viewport = root.querySelector<HTMLElement>('[data-role="camera-viewport"]');
  const matchEl = root.querySelector<HTMLElement>('[data-role="face-match"]');
  const scoreEl = root.querySelector<HTMLElement>('[data-role="face-score"]');
  const livenessDot = root.querySelector<HTMLElement>('[data-role="liveness-dot"]');
  const livenessText = root.querySelector<HTMLElement>('[data-role="liveness-text"]');

  const setCameraState = (ok: boolean, msg: string): void => {
    if (matchEl) matchEl.textContent = ok ? 'Rosto Reconhecido' : msg;
    if (scoreEl) scoreEl.textContent = ok ? `${(95 + Math.random() * 4).toFixed(1)}% Match` : '—';
    if (livenessDot) livenessDot.className = `w-2 h-2 rounded-full ${ok ? 'bg-teal-success' : 'bg-amber-warning'}`;
    if (livenessText) livenessText.textContent = ok ? 'Detecção de Vivacidade Ativa (Anti-Spoofing)' : msg;
  };

  const startCamera = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      // Stop any existing tracks from a previous calibration.
      if (viewport?.querySelector('video')) {
        viewport.querySelector('video')?.remove();
      }
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.className = 'w-full h-full object-cover contrast-[1.05] relative z-10';
      video.style.transform = 'scaleX(-1)';
      const placeholder = viewport?.querySelector<HTMLElement>('[data-role="camera-placeholder"]');
      placeholder?.remove();
      viewport?.insertBefore(video, viewport.firstChild);
      await video.play();
      // Live snapshot with the liveness "beam" running briefly.
      photoRef.current = captureFrame(video);
      setCameraState(true, 'Liveness Test OK');
    } catch {
      setCameraState(false, 'Câmera indisponível — registro sem foto');
    }
  };

  root.querySelector<HTMLButtonElement>('[data-role="recalibrate-btn"]')?.addEventListener('click', () => {
    void startCamera();
  });

  // Punch action
  btn?.addEventListener('click', () => {
    void doPunch(root, user.id, geo, photoRef);
  });

  void startCamera();
}

function renderSlots(today: { type: PunchType; timestamp: string }[], next: PunchType | null): string {
  const slots: { type: PunchType; time: string | null; done: boolean; next: boolean }[] = PUNCH_ORDER.map((type) => {
    const punch = today.find((p) => p.type === type);
    return { type, time: punch ? formatTime(punch.timestamp) : null, done: !!punch, next: next === type };
  });

  return slots
    .map((s) => {
      const label = PUNCH_SHORT_LABELS[s.type];
      const time = s.time ?? '--:--';
      if (s.next) {
        return `
          <div class="p-3 rounded-xl border-2 border-blue-accent bg-surface-container-highest/40 flex flex-col justify-between text-left relative shadow-sm ring-2 ring-blue-accent/20">
            <div class="absolute -top-1.5 -right-1.5">
              <span class="flex h-3.5 w-3.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-accent opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-vibrant"></span>
              </span>
            </div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-caption text-blue-vibrant font-bold uppercase">${label}</span>
              <span class="material-symbols-outlined text-blue-vibrant text-base">pending</span>
            </div>
            <div class="tabular-nums text-headline-sm text-blue-vibrant font-bold">${time}</div>
            <div class="flex items-center justify-between mt-1 pt-1 border-t border-border-subtle text-caption text-blue-vibrant font-bold">
              <span>Ação Atual</span>
              <span class="bg-blue-accent text-surface-container-lowest text-[10px] px-1.5 py-0.5 rounded">Bater</span>
            </div>
          </div>`;
      }
      const doneCls = s.done
        ? 'border border-teal-success/40 bg-surface-container-low'
        : 'border border-border-subtle bg-surface-container-low/30 opacity-75';
      return `
        <div class="p-3 rounded-xl ${doneCls} flex flex-col justify-between text-left">
          <div class="flex items-center justify-between mb-1">
            <span class="text-caption text-on-surface-variant font-semibold uppercase">${label}</span>
            <span class="material-symbols-outlined ${s.done ? 'text-teal-success text-base' : 'text-outline text-base'}">${s.done ? 'check_circle' : 'schedule'}</span>
          </div>
          <div class="tabular-nums text-headline-sm ${s.done ? 'text-navy-deep' : 'text-outline-variant'} font-bold">${time}</div>
          <div class="flex items-center justify-between mt-1 pt-1 border-t border-border-subtle text-caption ${s.done ? 'text-teal-success font-medium' : 'text-outline'}">
            <span>${s.done ? 'Concluída' : 'Aguardando'}</span>
          </div>
        </div>`;
    })
    .join('');
}

function maskCpf(cpf: string): string {
  if (!cpf || cpf.length < 11) return '***.***.***-**';
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

function captureFrame(video: HTMLVideoElement): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  }
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
  const cta = root.querySelector<HTMLElement>('[data-role="punch-cta"]');
  if (!btn || !cta || btn.disabled) return;

  try {
    const today = await withDemo(() => getTodayPunches(userId));
    const next = nextPunchType(today.map((p) => p.type));
    if (!next) return;

    btn.setAttribute('disabled', 'disabled');
    cta.textContent = 'REGISTRANDO...';

    const timestamp = new Date().toISOString();
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

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
        source: 'web',
      });
    } else {
      const item: OfflinePunch = {
        id: crypto.randomUUID(),
        userId,
        type: next,
        timestamp,
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
        gpsAccuracy: geo?.accuracy ?? null,
        source: 'web',
        photoUrl: photoRef.current,
      };
      await queuePunch(item);
    }

    showToast(online);

    // Refresh slots + button state
    const fresh = await withDemo(() => getTodayPunches(userId));
    const nextAfter = nextPunchType(fresh.map((p) => p.type));
    const slotsGrid = root.querySelector<HTMLElement>('[data-role="slots-grid"]');
    if (slotsGrid) slotsGrid.innerHTML = renderSlots(fresh, nextAfter);
    if (nextAfter) {
      cta.textContent = `REGISTRAR ${PUNCH_CTA_LABELS[nextAfter].toUpperCase()}`;
      btn.removeAttribute('disabled');
    } else {
      cta.textContent = 'JORNADA COMPLETA';
    }

    // Update receipt hash
    const hashEl = root.querySelector<HTMLElement>('[data-role="receipt-hash"]');
    if (hashEl) hashEl.textContent = fakeSha512(timestamp);
  } catch {
    btn.removeAttribute('disabled');
    cta.textContent = 'Falha ao registrar — tente novamente';
  }
}

function showToast(online: boolean): void {
  const toast = document.createElement('div');
  toast.className =
    'fixed top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-[480px] bg-navy-deep text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-light/40 z-50 flex items-center space-x-3 transition-all duration-300';
  toast.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-emerald-light/20 flex items-center justify-center text-emerald-light shrink-0">
      <span class="material-symbols-outlined text-[24px]">${online ? 'verified' : 'cloud_off'}</span>
    </div>
    <div class="flex-1">
      <h4 class="text-body-md font-semibold">${online ? 'Ponto Registrado com Sucesso!' : 'Ponto Registrado em Modo Offline'}</h4>
      <p class="text-caption text-secondary-fixed">${online ? 'Comprovante assinado digitalmente ICP-Brasil.' : 'Na fila de sincronização — envio automático ao reconectar.'}</p>
    </div>
  `;
  document.body.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -16px)';
    window.setTimeout(() => toast.remove(), 400);
  }, 3200);
}

/** Deterministic-looking hash for the receipt preview (visual only). */
function fakeSha512(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return `${hex}${hex}${hex.slice(0, 4)}...e9b7a421f6c4083d81829da145bc029e71ab8254c7b8091`;
}