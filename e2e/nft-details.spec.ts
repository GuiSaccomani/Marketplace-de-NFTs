import { test, expect } from '@playwright/test'

test.describe('Detalhes do NFT e Favoritos', () => {
  test('deve navegar diretamente para a página de detalhes de um NFT válido', async ({ page }) => {
    // 1. Acesso direto por ID
    await page.goto('/nfts/nft-03')

    // 2. Verifica a presença do título do NFT e dados da edição
    await expect(page.locator('h1')).toBeVisible()
    const title = await page.locator('h1').textContent()
    expect(title?.trim().length).toBeGreaterThan(0)

    // 3. Verifica informações de preço em ETH e rede
    await expect(page.getByText('ETH', { exact: true })).toBeVisible()
    await expect(page.getByText('Preço da Edição')).toBeVisible()

    // 4. Verifica botão de adicionar ao carrinho
    const addToCartButton = page.getByRole('button', { name: /Adicionar ao Carrinho/i })
    await expect(addToCartButton).toBeVisible()
  })

  test('deve tratar adequadamente um NFT inexistente (404)', async ({ page }) => {
    // 1. Acessa um ID inexistente
    await page.goto('/nfts/nft-inexistente-999')

    // 2. Deve exibir mensagem de erro clara de recurso não encontrado
    await expect(page.getByRole('heading', { name: /NFT Não Encontrado/i })).toBeVisible()
    await expect(page.getByText(/não existe ou foi removido/i)).toBeVisible()

    // 3. Verifica botão para retornar ao catálogo
    const backButton = page.getByRole('button', { name: /Voltar/i })
    await expect(backButton).toBeVisible()
  })

  test('deve solicitar login ao tentar favoritar sem estar autenticado', async ({ page }) => {
    await page.goto('/nfts/nft-03')

    // Localiza botão de favoritar
    const favoriteBtn = page.getByLabel(/favorito/i)
    if (await favoriteBtn.isVisible()) {
      await favoriteBtn.click()
      // Deve exibir mensagem solicitando autenticação
      await expect(page.getByText(/Faça login para salvar favoritos/i)).toBeVisible()
    }
  })
})
