import { test } from '@playwright/test';
import { HomePage } from './pages';

test('homepage has title', async ({ page }) => {
  const home = new HomePage(page);
  await home.open();
  await home.expectTitle(/pPonto/);
});
