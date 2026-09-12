/**
 * Skeleton loading components for async content.
 * Uses CSS animation for shimmer effect.
 */

/**
 * Create a skeleton placeholder for text lines.
 */
export function createTextSkeleton(lines: number = 3, maxWidth: string = '100%'): HTMLElement {
  const container = document.createElement('div');
  container.className = 'space-y-2';
  container.style.maxWidth = maxWidth;

  for (let i = 0; i < lines; i++) {
    const line = document.createElement('div');
    line.className = 'skeleton-text h-4 rounded bg-surface-container-high animate-pulse';
    if (i === lines - 1) {
      line.style.width = '60%';
    }
    container.appendChild(line);
  }

  return container;
}

/**
 * Create a skeleton placeholder for a card.
 */
export function createCardSkeleton(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm animate-pulse space-y-3';
  card.innerHTML = `
    <div class="h-6 w-1/4 bg-surface-container-high rounded"></div>
    <div class="h-8 w-1/2 bg-surface-container-high rounded"></div>
    <div class="h-4 w-full bg-surface-container-high rounded"></div>
    <div class="h-4 w-3/4 bg-surface-container-high rounded"></div>
  `;
  return card;
}

/**
 * Create a skeleton placeholder for KPI stat cards.
 */
export function createStatCardSkeleton(): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm animate-pulse space-y-2';
  card.innerHTML = `
    <div class="h-4 w-1/3 bg-surface-container-high rounded"></div>
    <div class="h-10 w-1/4 bg-surface-container-high rounded"></div>
    <div class="h-4 w-1/2 bg-surface-container-high rounded"></div>
  `;
  return card;
}

/**
 * Create a skeleton placeholder for a table row.
 */
export function createTableRowSkeleton(columns: number = 6): HTMLElement {
  const row = document.createElement('tr');
  row.className = 'animate-pulse';
  for (let i = 0; i < columns; i++) {
    const td = document.createElement('td');
    td.className = 'py-3 px-3';
    td.innerHTML = '<div class="h-4 w-full bg-surface-container-high rounded"></div>';
    row.appendChild(td);
  }
  return row;
}

/**
 * Create a skeleton placeholder for a table with multiple rows.
 */
export function createTableSkeleton(rows: number = 5, columns: number = 6): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden animate-pulse';

  wrap.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-border-subtle">
            ${Array.from({ length: columns }, () => '<th class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>').join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-border-subtle"></tbody>
      </table>
    </div>
  `;

  const tbody = wrap.querySelector('tbody')!;
  for (let i = 0; i < rows; i++) {
    tbody.appendChild(createTableRowSkeleton(columns));
  }

  return wrap;
}

/**
 * Create a skeleton for the bento KPI grid (4 cards).
 */
export function createBentoGridSkeleton(): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
  for (let i = 0; i < 4; i++) {
    grid.appendChild(createStatCardSkeleton());
  }
  return grid;
}

/**
 * Create a full page skeleton for admin views.
 */
export function createAdminPageSkeleton(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-6 animate-pulse';

  el.innerHTML = `
    <!-- Header skeleton -->
    <section class="bg-surface-container-lowest p-5 rounded-xl border border-border-subtle shadow-sm">
      <div class="h-8 w-1/3 bg-surface-container-high rounded mb-2"></div>
      <div class="h-5 w-1/2 bg-surface-container-high rounded"></div>
    </section>

    <!-- KPI grid skeleton -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      ${Array.from({ length: 4 }, () => `
        <div class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
          <div class="h-4 w-1/3 bg-surface-container-high rounded mb-2"></div>
          <div class="h-10 w-1/4 bg-surface-container-high rounded mb-2"></div>
          <div class="h-4 w-1/2 bg-surface-container-high rounded"></div>
        </div>
      `).join('')}
    </section>

    <!-- Table skeleton -->
    <section class="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-border-subtle">
              <th class="py-3 px-4"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
              <th class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
              <th class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
              <th class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
              <th class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
              <th class="py-3 px-4"><div class="h-4 w-full bg-surface-container-high rounded"></div></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-subtle">
            ${Array.from({ length: 5 }, () => `
              <tr>
                <td class="py-3 px-4"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
                <td class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
                <td class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
                <td class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
                <td class="py-3 px-3"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
                <td class="py-3 px-4"><div class="h-4 w-full bg-surface-container-high rounded"></div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  return el;
}

/**
 * Create skeleton for mobile views (punch, espelho, solicitacoes, ajuste).
 */
export function createMobileViewSkeleton(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-3.5 animate-pulse';

  el.innerHTML = `
    <!-- Profile card -->
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 rounded-full bg-surface-container-high"></div>
        <div class="space-y-1">
          <div class="h-5 w-1/3 bg-surface-container-high rounded"></div>
          <div class="h-3 w-1/4 bg-surface-container-high rounded"></div>
        </div>
      </div>
      <div class="mt-2 h-6 w-1/4 bg-surface-container-high rounded"></div>
    </section>

    <!-- Clock card -->
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle text-center">
      <div class="h-4 w-1/2 bg-surface-container-high rounded mx-auto mb-2"></div>
      <div class="h-12 w-1/3 bg-surface-container-high rounded mx-auto mb-1"></div>
      <div class="h-4 w-1/4 bg-surface-container-high rounded mx-auto"></div>
    </section>

    <!-- Face verification card -->
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm">
      <div class="flex items-center justify-between mb-2.5">
        <div class="h-5 w-1/3 bg-surface-container-high rounded"></div>
        <div class="h-5 w-1/4 bg-surface-container-high rounded-full"></div>
      </div>
      <div class="w-64 h-64 mx-auto rounded-2xl bg-surface-container-high"></div>
      <div class="h-4 w-3/4 bg-surface-container-high rounded mx-auto mt-2.5"></div>
    </section>

    <!-- Geolocation card -->
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm">
      <div class="flex items-start space-x-2.5 mb-3">
        <div class="w-8 h-8 rounded-lg bg-surface-container-high flex-shrink-0"></div>
        <div class="flex-1 space-y-1">
          <div class="h-5 w-1/2 bg-surface-container-high rounded"></div>
          <div class="h-4 w-3/4 bg-surface-container-high rounded"></div>
        </div>
      </div>
      <div class="h-3 w-full bg-surface-container-high rounded"></div>
    </section>

    <!-- Punch button -->
    <section class="pt-1">
      <button class="w-full h-16 bg-surface-container-high rounded-2xl" disabled></button>
    </section>

    <!-- Today grid -->
    <section class="bg-neutral-card rounded-xl p-3.5 border border-border-subtle shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <div class="h-5 w-1/3 bg-surface-container-high rounded"></div>
        <div class="h-4 w-1/4 bg-surface-container-high rounded"></div>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        ${Array.from({ length: 4 }, () => `
          <div class="p-2.5 rounded-lg bg-surface-container-high"></div>
        `).join('')}
      </div>
    </section>
  `;

  return el;
}