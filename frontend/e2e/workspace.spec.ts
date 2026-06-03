import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Start from a clean persisted state for deterministic runs.
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
});

test('renders the default ETL pipeline on the canvas', async ({ page }) => {
  await expect(page.getByText('AuraBI')).toBeVisible();
  await expect(page.getByText('FactSales')).toBeVisible();
  await expect(page.getByText('build_fct_sales')).toBeVisible();
});

test('adds a resource node from the canvas toolbar', async ({ page }) => {
  const addResource = page.getByRole('button', { name: 'Add resource node' });
  await addResource.click();
  await expect(page.getByText(/new_table_/)).toBeVisible();
});

test('drills into a datamart and returns via the breadcrumb', async ({ page }) => {
  await page.getByText('Sales Analytics Mart').click();
  await expect(page.getByRole('navigation', { name: 'Datamart navigation' })).toBeVisible();
  await expect(page.getByText('kpi_daily_revenue')).toBeVisible();
  await page.getByRole('button', { name: 'Pipeline' }).click();
  await expect(page.getByText('FactSales')).toBeVisible();
});

test('collapses and restores the chat panel', async ({ page }) => {
  await expect(page.getByText('AI Data Architect')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse chat panel' }).click();
  await expect(page.getByText('AI Data Architect')).toBeHidden();
  await page.getByRole('button', { name: 'Show chat panel' }).click();
  await expect(page.getByText('AI Data Architect')).toBeVisible();
});

test('switches to the data sources tab and parses CSV input', async ({ page }) => {
  await page.getByRole('tab', { name: 'Data Sources' }).click();
  await page.getByLabel('Schema import input').fill('id,name\n1,Acme');
  await page.getByRole('button', { name: 'Parse & Add to Canvas' }).click();
  await expect(page.getByText('Imported')).toBeVisible();
});
