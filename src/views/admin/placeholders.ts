/**
 * Admin view placeholders — one per route, filled in Fase 3–4.
 */
export function renderTratamento(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Tratamento de Ponto — Fase 3</p>';
  return el;
}

export function renderHomologacao(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Homologação de Atestados — Fase 3</p>';
  return el;
}

export function renderAprovacao(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Aprovação de Ajustes — Fase 3</p>';
  return el;
}

export function renderRelatorios(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Relatórios Analíticos — Fase 4</p>';
  return el;
}

export function renderFechamento(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Fechamento de Folha — Fase 4</p>';
  return el;
}

export function renderCercas(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Cercas Virtuais — Fase 4</p>';
  return el;
}

export function renderConfiguracoes(): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = '<p class="text-caption text-outline text-center py-8">Configurações — Fase 4</p>';
  return el;
}
