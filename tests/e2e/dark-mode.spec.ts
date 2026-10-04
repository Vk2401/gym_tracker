import { expect, test, type Page } from '@playwright/test';
import { openApp, seedTemplate, view } from './helpers';

// ST-7 / device-independence §3: every surface stays readable when the phone is in dark mode
// and the app follows System (the reported bug: white alert box with white text).

function luminance(rgb: string): number {
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
};

async function colors(page: Page, textSel: string, bgSel: string) {
  return page.evaluate(
    ([t, b]) => {
      const text = getComputedStyle(document.querySelector(t)!).color;
      let el: Element | null = document.querySelector(b);
      let bg = 'rgba(0, 0, 0, 0)';
      while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
        bg = getComputedStyle(el).backgroundColor;
        el = el.parentElement;
      }
      return { text, bg };
    },
    [textSel, bgSel] as const,
  );
}

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`${scheme} system theme`, () => {
    test.use({ colorScheme: scheme });

    test(`alerts, action sheets and footer CTA are readable (${scheme})`, async ({ page }) => {
      await openApp(page);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await expect(page.locator('html')).toHaveClass(
        scheme === 'dark' ? /ion-palette-dark/ : /^(?!.*ion-palette-dark).*$/,
      );

      // alert (the reported case)
      await view(page).getByRole('button', { name: 'Add', exact: true }).click();
      await page.getByRole('button', { name: 'Add Workout Group' }).click();
      await expect(page.locator('ion-alert .alert-title')).toBeVisible();
      const a = await colors(page, 'ion-alert .alert-title', 'ion-alert .alert-wrapper');
      expect(contrast(a.text, a.bg), `alert ${JSON.stringify(a)}`).toBeGreaterThanOrEqual(4.5);
      await page.locator('ion-alert').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.locator('ion-alert')).toHaveCount(0);

      // action sheet
      await view(page).getByRole('button', { name: 'Add', exact: true }).click();
      await expect(page.locator('ion-action-sheet .action-sheet-button').first()).toBeVisible();
      const s = await colors(
        page,
        'ion-action-sheet .action-sheet-button',
        'ion-action-sheet .action-sheet-group',
      );
      expect(contrast(s.text, s.bg), `sheet ${JSON.stringify(s)}`).toBeGreaterThanOrEqual(3);
      await page.locator('ion-action-sheet').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.locator('ion-action-sheet')).toHaveCount(0);

      // page text and the Start Workout CTA
      const t = await seedTemplate(page, 'Push', [
        { id: 'ex-bench-press', sets: [{ reps: 5, weightKg: 60 }] },
      ]);
      await page.goto(`/#/workouts/${t}`);
      await page.reload();
      await view(page).locator('h1.gt-large-title').waitFor();
      const title = await colors(page, 'h1.gt-large-title', 'ion-content');
      expect(contrast(title.text, title.bg)).toBeGreaterThanOrEqual(4.5);
      const cta = view(page).getByRole('button', { name: 'Start Workout' });
      await expect(cta).toBeVisible();
      const ctaColors = await view(page)
        .locator('.gt-footer ion-button')
        .evaluate((el) => {
          const inner = el.shadowRoot!.querySelector('.button-native')!;
          const cs = getComputedStyle(inner);
          return { text: cs.color, bg: cs.backgroundColor };
        });
      expect(
        contrast(ctaColors.text, ctaColors.bg),
        `cta ${JSON.stringify(ctaColors)}`,
      ).toBeGreaterThanOrEqual(3);
      expect(luminance(ctaColors.bg)).toBeLessThan(0.5); // brand blue, never white
    });
  });
}
