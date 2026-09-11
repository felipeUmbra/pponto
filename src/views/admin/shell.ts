/**
 * Admin layout shell — wraps content with sidebar + topbar.
 * Matches the desktop dashboard layout from Stitch screen #01.
 */
import type { RouteName } from '../../types.js';
import { renderSideNav } from '../../components/side-nav.js';
import { renderTopBar } from '../../components/top-bar.js';

export function renderAdminShell(
  activeRoute: RouteName,
  topBarTitle: string,
  content: HTMLElement,
): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'flex h-screen overflow-hidden';

  // Sidebar
  shell.appendChild(renderSideNav(activeRoute));

  // Main area
  const mainArea = document.createElement('div');
  mainArea.className = 'flex-1 flex flex-col h-screen overflow-hidden min-w-0';

  // Top bar
  mainArea.appendChild(renderTopBar(topBarTitle));

  // Scrollable content canvas
  const canvas = document.createElement('main');
  canvas.className = 'flex-1 overflow-y-auto p-6 space-y-6';
  canvas.appendChild(content);
  mainArea.appendChild(canvas);

  shell.appendChild(mainArea);

  return shell;
}
