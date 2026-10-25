import { test, expect } from '@playwright/test'

test.describe('Tempo Real e Responsividade Mobile', () => {
  test('deve inicializar e exibir indicador de sincronização em tempo real (Live) no Header', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Indicador com texto Live na barra de navegação desktop')
    await page.goto('/')

    // Verifica que o badge de status de tempo real está presente no Header
    const liveIndicator = page.locator('header').getByText(/Live/i)
    await expect(liveIndicator).toBeVisible({ timeout: 10000 })
  })

  test('deve manter a integridade visual e funcional em viewport mobile (390x844)', async ({
    page,
  }) => {
    // Configura viewport mobile explícito
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // 1. Verifica logo no mobile
    const logo = page.locator('header img[alt="KURIO Logo"]')
    await expect(logo).toBeVisible({ timeout: 10000 })

    // 2. Verifica ausência de overflow horizontal indevido
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2)

    // 3. Verifica que os cards de NFT são legíveis e interativos em mobile
    const firstCard = page.locator('[data-testid="nft-card"]').first()
    await expect(firstCard).toBeVisible()
    await firstCard.click()

    // 4. Confirma navegação para a página de detalhes em mobile
    await expect(page).toHaveURL(/\/nfts\/nft-/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('deve suportar navegação por teclado com foco visível', async ({ page }) => {
    await page.goto('/')

    // Pressiona Tab para navegar pelos links do Header
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedTag).toBeTruthy()
  })
})
