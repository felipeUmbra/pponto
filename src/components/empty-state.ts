/**
 * Reusable empty state components for consistent UX across views.
 * Matches the "Precision Vanguard" design system.
 */

interface EmptyStateOptions {
  /** Icon name from Material Symbols Outlined */
  icon: string;
  /** Main title text */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Create a standardized empty state component.
 */
export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const {
    icon,
    title,
    subtitle,
    action,
    className = '',
  } = options;

  const el = document.createElement('div');
  el.className = `flex flex-col items-center justify-center text-center py-10 px-4 ${className}`;

  el.innerHTML = `
    <div class="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4 text-on-surface-variant">
      <span class="material-symbols-outlined text-3xl">${icon}</span>
    </div>
    <h3 class="text-body-lg font-semibold text-on-surface mb-1">${title}</h3>
    ${subtitle ? `<p class="text-body-sm text-on-surface-variant max-w-xs">${subtitle}</p>` : ''}
    ${action ? `
      <button
        type="button"
        class="mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
          action.variant === 'secondary'
            ? 'bg-surface-container-low border border-border-subtle text-on-surface hover:bg-surface-container'
            : 'bg-blue-vibrant text-white hover:bg-secondary'
        }"
      >
        ${action.label}
      </button>
    ` : ''}
  `;

  if (action) {
    const btn = el.querySelector('button')!;
    btn.addEventListener('click', action.onClick);
  }

  return el;
}

/**
 * Predefined empty states for common scenarios.
 */
export const EmptyStates = {
  /** No data found */
  noData: (className?: string) => createEmptyState({
    icon: 'inbox',
    title: 'Nenhum dado encontrado',
    subtitle: 'Não há registros para exibir no momento.',
    className,
  }),

  /** No search results */
  noResults: (className?: string) => createEmptyState({
    icon: 'search_off',
    title: 'Nenhum resultado',
    subtitle: 'Tente alterar os filtros ou termos de busca.',
    className,
  }),

  /** No pending items */
  noPending: (type: string, className?: string) => createEmptyState({
    icon: 'check_circle',
    title: `Nenhum ${type} pendente`,
    subtitle: `Todos os ${type} estão em dia 🎉`,
    className,
  }),

  /** No internet connection */
  offline: (className?: string) => createEmptyState({
    icon: 'cloud_off',
    title: 'Você está offline',
    subtitle: 'Os dados serão sincronizados automaticamente quando a conexão voltar.',
    className,
  }),

  /** No permissions */
  noPermission: (className?: string) => createEmptyState({
    icon: 'lock',
    title: 'Acesso restrito',
    subtitle: 'Você não tem permissão para visualizar este conteúdo.',
    className,
  }),

  /** First time user / onboarding */
  gettingStarted: (className?: string) => createEmptyState({
    icon: 'rocket_launch',
    title: 'Bem-vindo ao pPonto',
    subtitle: 'Comece registrando seu primeiro ponto ou explore as funcionalidades.',
    action: {
      label: 'Registrar Ponto',
      onClick: () => window.location.hash = '/ponto',
      variant: 'primary',
    },
    className,
  }),

  /** No users in dropdown */
  noUsers: (className?: string) => createEmptyState({
    icon: 'person_off',
    title: 'Nenhum usuário disponível',
    subtitle: 'Não há usuários cadastrados no sistema.',
    className,
  }),

  /** Generic error state */
  error: (message: string = 'Ocorreu um erro ao carregar os dados.', className?: string) => createEmptyState({
    icon: 'error',
    title: 'Erro ao carregar',
    subtitle: message,
    action: {
      label: 'Tentar novamente',
      onClick: () => window.location.reload(),
      variant: 'primary',
    },
    className,
  }),
};

/**
 * Create an empty state for tables (inline version).
 */
export function createTableEmptyState(
  message: string = 'Nenhum registro encontrado.',
  icon: string = 'inbox',
  colspan: number = 1
): HTMLElement {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td colspan="${colspan}" class="py-10 px-4 text-center">
      <div class="flex flex-col items-center justify-center text-on-surface-variant">
        <span class="material-symbols-outlined text-3xl mb-2">${icon}</span>
        <p class="text-caption">${message}</p>
      </div>
    </td>
  `;
  return row;
}