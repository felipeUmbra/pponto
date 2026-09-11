/**
 * Punch view placeholder — Biometric clock-in.
 */
export function renderPonto(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-4';
  el.innerHTML = `
    <section class="bg-neutral-card rounded-xl p-4 border border-border-subtle shadow-sm">
      <div class="flex items-center space-x-3 mb-3">
        <div class="w-12 h-12 rounded-full bg-blue-vibrant/10 flex items-center justify-center">
          <span class="material-symbols-outlined text-blue-vibrant text-2xl">fingerprint</span>
        </div>
        <div>
          <p class="text-body-md font-semibold text-on-surface">Registrar Ponto</p>
          <p class="text-caption text-outline">Toque para bater ponto</p>
        </div>
      </div>
      <button class="w-full py-4 bg-blue-vibrant hover:bg-secondary text-white font-bold rounded-xl text-lg transition-colors shadow-sm flex items-center justify-center space-x-2">
        <span class="material-symbols-outlined text-2xl">fingerprint</span>
        <span>Bater Ponto</span>
      </button>
    </section>
    <p class="text-caption text-outline text-center">Funcionalidade completa: Fase 2</p>
  `;
  return el;
}
