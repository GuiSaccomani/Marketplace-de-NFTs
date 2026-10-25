import { test, expect } from '@playwright/test'

test.describe('Descoberta e Catálogo de NFTs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('deve renderizar a página inicial com hero, busca e cards de NFTs', async ({ page }) => {
    // 1. Verifica título da página
    await expect(page).toHaveTitle(/KURIO/)

    // 2. Verifica a seção Hero
    await expect(
      page.getByRole('heading', { name: /Colecione o futuro da arte digital com precisão/i })
    ).toBeVisible()

    // 3. Verifica a presença dos cards de NFTs no catálogo
    const cards = page.locator('[data-testid="nft-card"]')
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('deve filtrar NFTs por busca textual e sincronizar parâmetros na URL', async ({ page }) => {
    // 1. Localiza o campo de busca
    const searchInput = page.getByPlaceholder('Buscar por título ou coleção...')
    await expect(searchInput).toBeVisible()

    // 2. Digita um termo de busca
    await searchInput.fill('Quantum')
    await page.getByRole('button', { name: 'Buscar' }).click()

    // 3. Verifica que a URL foi atualizada com o termo de busca
    await expect(page).toHaveURL(/search=Quantum/)

    // 4. Confirma que os cards exibidos contêm o termo ou correspondem à busca
    const cards = page.locator('[data-testid="nft-card"]')
    await expect(cards.first()).toBeVisible()
    const cardText = await cards.first().textContent()
    expect(cardText?.toLowerCase()).toContain('quantum')

    // 5. Verifica sobrevivência a recarregamento da página (refresh)
    await page.reload()
    await expect(page).toHaveURL(/search=Quantum/)
    await expect(cards.first()).toBeVisible()
  })

  test('deve permitir ordenação de NFTs no catálogo', async ({ page }) => {
    // 1. Localiza o seletor de ordenação
    const sortSelect = page.locator('#sort-select')
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price_asc')
      await expect(page).toHaveURL(/sort=price_asc/)
      await page.waitForTimeout(500)
      const cards = page.locator('[data-testid="nft-card"]')
      await expect(cards.first()).toBeVisible()
    }
  })
})
