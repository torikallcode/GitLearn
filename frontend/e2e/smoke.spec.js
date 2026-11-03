import { expect, test } from '@playwright/test'

test('landing page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/GitLearn/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('login form is reachable', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
})
