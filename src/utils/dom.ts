/**
 * Mobile helper: read a value from localStorage (demo-safe).
 */
export function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Mobile helper: write a value to localStorage.
 */
export function writeLS<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or private mode — ignore
  }
}

/**
 * Add a listener that also fires immediately.
 */
export function onReady<T extends HTMLElement>(
  el: T | null,
  event: string,
  handler: (e: Event) => void,
): void {
  el?.addEventListener(event, handler);
}

/**
 * Create a DOM element with optional children & attributes.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * Escape untrusted text before injecting via innerHTML.
 */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}