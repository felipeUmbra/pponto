/**
 * Admin dashboard placeholder — HR overview.
 */
export function renderDashboard(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-6';

  el.innerHTML = `
    <section class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm">
      <div>
        <div class="flex items-center space-x-2">
          <h1 class="text-headline-lg font-bold text-on-surface">Tratamento de Ponto &amp; Ocorrências</h1>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-light/10 text-teal-success border border-emerald-light/20">Período Aberto</span>
        </div>
        <p class="text-body-md text-on-surface-variant mt-0.5">Existem <strong class="text-ruby-danger">6 divergências críticas</strong> e <strong class="text-amber-warning">12 solicitações</strong> aguardando validação.</p>
      </div>
    </section>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Presentes Hoje</p>
        <p class="text-headline-lg font-bold text-on-surface">7 / 10</p>
        <p class="text-caption text-teal-success">↑ 2 vs ontem</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Atestados Pendentes</p>
        <p class="text-headline-lg font-bold text-amber-warning">2</p>
        <p class="text-caption text-outline">Aguardando análise RH</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Ajustes Pendentes</p>
        <p class="text-headline-lg font-bold text-ruby-danger">3</p>
        <p class="text-caption text-outline">Solicitações de correção</p>
      </div>
      <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
        <p class="text-caption text-outline">Offline Sync</p>
        <p class="text-headline-lg font-bold text-purple-bank">1</p>
        <p class="text-caption text-outline">Pendente sincronização</p>
      </div>
    </div>

    <p class="text-caption text-outline text-center">Módulos completos: Fase 3–4</p>
  `;

  return el;
}
