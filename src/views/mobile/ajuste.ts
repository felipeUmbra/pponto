/**
 * Ajuste de Ponto form (Stitch #08) — request a missing/wrong punch.
 *
 * - Type segmented control (Inclusão | Alteração | Abono)
 * - Punch selector + requested time
 * - Legal reason select + detailed observations
 * - Optional attachment
 * - Veracity checkbox (Portaria 671) + submit
 */
import { requireAuth } from '../../core/auth.js';
import { getTodayPunches, insertAdjustment } from '../../api/data.js';
import type { Punch, PunchType } from '../../types.js';
import { PUNCH_LABELS, dateKey } from '../../utils/time.js';
import { esc } from '../../utils/dom.js';
import { createMobileViewSkeleton } from '../../components/skeleton.js';

type AdjKind = 'inclusao' | 'alteracao' | 'abono';

export function renderAjuste(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-3.5';
  // Show skeleton while loading
  el.appendChild(createMobileViewSkeleton());
  void initAjuste(el);
  return el;
}

async function initAjuste(root: HTMLElement): Promise<void> {
  const user = requireAuth();

  // Today's punches for a quick "ponto a ajustar" seed
  let todayPunches: Punch[];
  try {
    todayPunches = await getTodayPunches(user.id);
  } catch {
    todayPunches = [];
  }

  const today = new Date();
  const todayKey = dateKey(today);
  const todayLabel = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Default missing punch = first empty type, else 'exit'
  const done = new Set<PunchType>(todayPunches.map((p) => p.type));
  const missing = (['entry', 'break_start', 'break_end', 'exit'] as PunchType[]).find((t) => !done.has(t));
  const defaultType = missing ?? 'exit';

  // Show loader while we build async bits (none today — build synchronously)
  root.innerHTML = `
    <div class="space-y-3.5" data-role="form">
      <section class="bg-neutral-card border border-border-subtle rounded-xl p-3.5 shadow-sm">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full bg-surface-container-low border border-border-subtle flex items-center justify-center flex-shrink-0 text-secondary font-bold">
            ${esc(getInitials(user.name))}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-body-md font-semibold text-navy-deep truncate">${esc(user.name)}</h2>
            <p class="text-caption text-on-surface-variant mt-0.5">
              Matrícula: <span class="font-mono font-medium text-navy-deep">${esc(user.cpf)}</span> • Depto: ${esc(user.department_id ?? '—')}
            </p>
            <div class="mt-1.5 flex items-center gap-1.5 text-on-surface-variant text-caption bg-surface-container-low px-2 py-1 rounded">
              <span class="material-symbols-outlined text-secondary" style="font-size: 14px;">schedule</span>
              <span>Turno: Administrativo (08:00 - 18:00)</span>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-neutral-card border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-caption font-bold text-on-surface-variant uppercase tracking-wider">Data do Registro</span>
          <button class="flex items-center gap-1 text-caption text-secondary font-semibold hover:underline" type="button" data-role="change-date">
            <span class="material-symbols-outlined" style="font-size: 14px;">calendar_month</span>
            Alterar Data
          </button>
        </div>
        <div class="flex items-center justify-between bg-surface-container-low px-3 py-2 rounded-lg border border-border-subtle">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary">event</span>
            <span class="text-body-md font-semibold text-navy-deep" data-role="date-label">${esc(`${todayLabel.charAt(0).toUpperCase()}${todayLabel.slice(1)}`)}</span>
          </div>
          <span class="text-caption text-on-surface-variant">Hoje</span>
        </div>
        <div class="flex items-start gap-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span class="material-symbols-outlined text-amber-warning flex-shrink-0 mt-0.5" style="font-size: 18px;">warning</span>
          <div>
            <p class="text-badge-label font-bold text-amber-warning uppercase">Marcação Incompleta</p>
            <p class="text-caption text-amber-900 mt-0.5 leading-snug">
              Falta batida de <span class="font-semibold" data-role="missing-label">${PUNCH_LABELS[defaultType]}</span>.
              Requer tratamento conforme exigências do Art. 74 § 2º da CLT.
            </p>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-2">
        <label class="block text-caption font-bold text-navy-deep uppercase tracking-wider">Tipo de Solicitação <span class="text-ruby-danger">*</span></label>
        <div class="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-low rounded-lg border border-border-subtle" data-role="kind">
          <button class="py-2 px-1 rounded-md text-center text-caption font-bold transition-all bg-secondary text-white shadow-sm" data-kind="inclusao" type="button">Inclusão</button>
          <button class="py-2 px-1 rounded-md text-center text-caption font-medium text-on-surface-variant hover:text-navy-deep transition-all" data-kind="alteracao" type="button">Alteração</button>
          <button class="py-2 px-1 rounded-md text-center text-caption font-medium text-on-surface-variant hover:text-navy-deep transition-all" data-kind="abono" type="button">Abono</button>
        </div>
        <p class="text-caption text-[11px] text-on-surface-variant" data-role="kind-desc">
          Selecionado: <span class="font-semibold text-navy-deep">Inclusão de Batida Esquecida</span> (Portaria 671/2021).
        </p>
      </section>

      <section class="bg-surface-container-lowest border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-3">
        <div>
          <label class="block text-caption font-bold text-navy-deep uppercase tracking-wider mb-1" for="ponto-select">Ponto a Ajustar <span class="text-ruby-danger">*</span></label>
          <div class="relative">
            <select class="w-full h-11 bg-surface-container-low border border-border-subtle rounded-lg px-3 pr-8 text-body-md text-navy-deep focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary appearance-none" id="ponto-select" data-role="ponto-select">
              <option value="entry">Entrada (1ª Batida)</option>
              <option value="break_start">Saída Intervalo (2ª Batida)</option>
              <option value="break_end">Retorno Intervalo (3ª Batida)</option>
              <option value="exit">Saída Final (4ª Batida)</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant">expand_more</span>
          </div>
        </div>
        <div>
          <label class="block text-caption font-bold text-navy-deep uppercase tracking-wider mb-1" for="horario-input">Horário Efetivamente Realizado <span class="text-ruby-danger">*</span></label>
          <div class="relative flex items-center">
            <input class="w-full h-11 pl-11 pr-4 bg-surface-container-low border border-border-subtle rounded-lg font-mono text-[15px] font-semibold text-navy-deep focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary" id="horario-input" type="time" step="60" value="18:00" data-role="horario">
            <span class="material-symbols-outlined absolute left-3 text-secondary">schedule</span>
          </div>
          <p class="text-caption text-[11px] text-outline mt-1">Horário contratual de término: 18:00</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-3">
        <div>
          <label class="block text-caption font-bold text-navy-deep uppercase tracking-wider mb-1" for="motivo-select">Motivo Legal (CLT / Acordo Coletivo) <span class="text-ruby-danger">*</span></label>
          <div class="relative">
            <select class="w-full h-11 bg-surface-container-low border border-border-subtle rounded-lg px-3 pr-8 text-body-md text-navy-deep focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary appearance-none" id="motivo-select" data-role="motivo">
              <option>Esquecimento de registro</option>
              <option>Instabilidade no aplicativo REP-P</option>
              <option>Serviço externo / Reunião fora</option>
              <option>Atividade extraordinária autorizada</option>
            </select>
            <span class="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-on-surface-variant">expand_more</span>
          </div>
        </div>
        <div>
          <label class="block text-caption font-bold text-navy-deep uppercase tracking-wider mb-1" for="obs-textarea">Observações / Justificativa Detalhada <span class="text-ruby-danger">*</span></label>
          <textarea class="w-full bg-surface-container-low border border-border-subtle rounded-lg p-3 text-body-md text-navy-deep focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary leading-relaxed resize-none" id="obs-textarea" rows="3" placeholder="Descreva o que aconteceu..." data-role="obs"></textarea>
          <div class="flex justify-between items-center mt-1 text-outline text-caption text-[11px]">
            <span>Mínimo 15 caracteres exigidos</span>
            <span data-role="obs-count">0 / 300</span>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest border border-border-subtle rounded-xl p-3.5 shadow-sm space-y-2.5">
        <div class="flex items-center justify-between">
          <label class="text-caption font-bold text-navy-deep uppercase tracking-wider">Anexo Comprovante <span class="text-outline-variant font-normal">(Opcional)</span></label>
          <span class="text-caption text-[11px] text-outline">PDF, JPG, PNG até 5MB</span>
        </div>
        <label class="w-full py-2 border border-dashed border-border-subtle hover:border-secondary rounded-lg flex items-center justify-center gap-1.5 text-caption text-secondary font-semibold bg-neutral-card transition-colors cursor-pointer" for="anexo-input">
          <span class="material-symbols-outlined" style="font-size: 16px;">attach_file</span>
          Anexar Documento
        </label>
        <input class="hidden" id="anexo-input" type="file" accept=".pdf,image/*" data-role="anexo">
        <div class="hidden items-center justify-between p-2.5 bg-surface-container-low border border-border-subtle rounded-lg" data-role="file-card">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0 text-ruby-danger">
              <span class="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div class="min-w-0">
              <p class="text-body-md font-medium text-navy-deep truncate" data-role="file-name">arquivo.pdf</p>
              <p class="text-caption text-outline" data-role="file-size">—</p>
            </div>
          </div>
          <button class="text-outline hover:text-ruby-danger p-1 rounded transition-colors" type="button" data-role="file-remove" aria-label="Remover anexo">
            <span class="material-symbols-outlined" style="font-size: 18px;">close</span>
          </button>
        </div>
      </section>

      <section class="bg-surface-container-low border border-border-subtle rounded-xl p-3.5">
        <label class="flex items-start gap-3 cursor-pointer">
          <input class="mt-0.5 rounded border-border-subtle text-secondary focus:ring-secondary w-4 h-4" type="checkbox" data-role="veracidade">
          <span class="text-caption text-on-surface-variant leading-tight">
            Declaro a veracidade das informações sob as penas da lei e termos do <strong class="text-navy-deep">Art. 74 da CLT</strong> e <strong class="text-navy-deep">Portaria 671 MTE</strong>. Estou ciente de que esta solicitação será auditada eletronicamente pelo fiscalizador interno.
          </span>
        </label>
      </section>

      <div class="space-y-2 pt-2">
        <button class="w-full h-12 rounded-xl bg-secondary hover:bg-blue-vibrant text-white font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all" type="button" data-role="submit">
          <span class="material-symbols-outlined" style="font-size: 20px;">send</span>
          Enviar Solicitação de Ajuste
        </button>
        <button class="w-full h-10 rounded-xl bg-transparent text-on-surface-variant text-body-md font-medium transition-colors" type="button" data-role="cancel">
          Cancelar
        </button>
      </div>

      <div class="py-2 text-center">
        <p class="text-caption text-[11px] text-outline flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-outline" style="font-size: 14px;">lock</span>
          pPonto Mobile • Registro Eletrônico de Ponto REP-P Seguro
        </p>
      </div>
    </div>
    <div class="hidden" data-role="success"></div>
  `;

  // Select the missing/default punch
  const select = root.querySelector<HTMLSelectElement>('[data-role="ponto-select"]');
  if (select) select.value = defaultType;

  // Kind segmented control
  const kindButtons = root.querySelectorAll<HTMLButtonElement>('[data-role="kind"] button');
  const kindDesc = root.querySelector<HTMLElement>('[data-role="kind-desc"]');
  let kind: AdjKind = 'inclusao';
  const kindLabels: Record<AdjKind, string> = {
    inclusao: 'Inclusão de Batida Esquecida',
    alteracao: 'Alteração de Horário Registrado',
    abono: 'Abono de Falta / Marcação',
  };
  kindButtons.forEach((b) => {
    b.addEventListener('click', () => {
      kind = (b.dataset.kind as AdjKind) ?? 'inclusao';
      kindButtons.forEach((x) => {
        x.className = x === b
          ? 'py-2 px-1 rounded-md text-center text-caption font-bold transition-all bg-secondary text-white shadow-sm'
          : 'py-2 px-1 rounded-md text-center text-caption font-medium text-on-surface-variant hover:text-navy-deep transition-all';
      });
      if (kindDesc) {
        kindDesc.innerHTML = `Selecionado: <span class="font-semibold text-navy-deep">${esc(kindLabels[kind])}</span> (Portaria 671/2021).`;
      }
    });
  });

  // Observations counter
  const obs = root.querySelector<HTMLTextAreaElement>('[data-role="obs"]');
  const obsCount = root.querySelector<HTMLElement>('[data-role="obs-count"]');
  obs?.addEventListener('input', () => {
    if (obsCount) obsCount.textContent = `${obs.value.length} / 300`;
  });

  // Attachment
  const anexoInput = root.querySelector<HTMLInputElement>('[data-role="anexo"]');
  const fileCard = root.querySelector<HTMLElement>('[data-role="file-card"]');
  const fileName = root.querySelector<HTMLElement>('[data-role="file-name"]');
  const fileSize = root.querySelector<HTMLElement>('[data-role="file-size"]');
  let attachmentName: string | null = null;

  anexoInput?.addEventListener('change', () => {
    const f = anexoInput.files?.[0];
    if (!f) return;
    attachmentName = f.name;
    if (fileName) fileName.textContent = f.name;
    if (fileSize) fileSize.textContent = `${Math.max(1, Math.round(f.size / 1024))} KB • Validação SHA-256 ok`;
    fileCard?.classList.remove('hidden');
    fileCard?.classList.add('flex');
  });
  root.querySelector<HTMLButtonElement>('[data-role="file-remove"]')?.addEventListener('click', () => {
    attachmentName = null;
    if (anexoInput) anexoInput.value = '';
    fileCard?.classList.add('hidden');
    fileCard?.classList.remove('flex');
  });

  // Submit
  const submitBtn = root.querySelector<HTMLButtonElement>('[data-role="submit"]');
  const veracidade = root.querySelector<HTMLInputElement>('[data-role="veracidade"]');
  const successBox = root.querySelector<HTMLElement>('[data-role="success"]');
  const form = root.querySelector<HTMLElement>('[data-role="form"]');

  const flashError = (msg: string): void => {
    submitBtn!.textContent = msg;
    submitBtn!.classList.add('bg-ruby-danger');
    window.setTimeout(() => {
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">send</span>Enviar Solicitação de Ajuste';
        submitBtn.classList.remove('bg-ruby-danger');
      }
    }, 2500);
  };

  submitBtn?.addEventListener('click', async () => {
    const reason = (obs?.value ?? '').trim();
    if (reason.length < 15) {
      flashError('Justificativa: mínimo 15 caracteres');
      return;
    }
    if (!veracidade?.checked) {
      flashError('Marque a declaração de veracidade');
      return;
    }

    const requestedType = (select?.value ?? 'exit') as PunchType;
    const time = (root.querySelector<HTMLInputElement>('[data-role="horario"]')?.value ?? '').trim();

    const isEntry = requestedType === 'entry' || requestedType === 'break_end';
    const requestedEntry = isEntry ? time : null;
    const requestedExit = isEntry ? null : time;

    submitBtn!.setAttribute('disabled', 'disabled');
    submitBtn!.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span> Enviando...';

    try {
      await insertAdjustment({
        userId: user.id,
        punchDate: todayKey,
        requestedEntry,
        requestedExit,
        reason,
        // attachmentName only used for reporting/audit; NULL when absent
      });
      submitBtn!.removeAttribute('disabled');
      form?.classList.add('hidden');
      if (successBox) {
        successBox.classList.remove('hidden');
        successBox.className = 'space-y-3.5';
      }
      const attachNote = attachmentName
        ? `<p class="text-caption text-on-surface-variant">Anexo: <span class="font-mono">${esc(attachmentName)}</span></p>`
        : '';
      successBox!.innerHTML = `
        <div class="bg-emerald-light/10 border border-emerald-light/30 rounded-xl p-5 text-center space-y-2">
          <div class="w-14 h-14 rounded-full bg-emerald-light/20 flex items-center justify-center text-emerald-light mx-auto">
            <span class="material-symbols-outlined text-[32px]">verified</span>
          </div>
          ${attachNote}
          <h3 class="font-semibold text-navy-deep">Solicitação Enviada com Sucesso!</h3>
          <p class="text-caption text-on-surface-variant">Protocolo gerado — o gestor será notificado para análise.</p>
          <button class="mt-3 w-full h-11 rounded-xl bg-secondary text-white font-semibold" data-role="done-btn">Voltar ao Espelho</button>
        </div>`;
      root.querySelector<HTMLButtonElement>('[data-role="done-btn"]')?.addEventListener('click', () => {
        window.location.hash = '#/espelho';
      });
    } catch {
      submitBtn!.removeAttribute('disabled');
      submitBtn!.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">send</span>Enviar Solicitação de Ajuste';
      flashError('Falha ao enviar — tente novamente');
    }
  });

  root.querySelector<HTMLButtonElement>('[data-role="cancel"]')?.addEventListener('click', () => {
    window.location.hash = '#/espelho';
  });

  // Change date (opens native picker fallback label)
  root.querySelector<HTMLButtonElement>('[data-role="change-date"]')?.addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'date';
    picker.style.position = 'fixed';
    picker.style.opacity = '0';
    document.body.appendChild(picker);
    picker.showPicker?.();
    picker.addEventListener('change', () => {
      if (picker.value) {
        const d = new Date(`${picker.value}T12:00:00`);
        const label = root.querySelector<HTMLElement>('[data-role="date-label"]');
        if (label) {
          label.textContent = esc(
            `${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          );
        }
      }
      picker.remove();
    });
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
