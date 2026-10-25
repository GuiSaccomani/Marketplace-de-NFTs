import { test, expect } from '@playwright/test'

test.describe('Fluxo Completo de Compra: Carrinho, Cupons, Checkout e Recibo', () => {
  test('deve adicionar NFT, aplicar cupom, finalizar checkout idempotente e visualizar recibo', async ({
    page,
  }) => {
    // 1. Acessa a página de detalhes do primeiro NFT
    await page.goto('/nfts/nft-03')

    // 2. Adiciona o NFT ao carrinho
    const addToCartButton = page.getByRole('button', { name: /Adicionar ao Carrinho/i })
    await expect(addToCartButton).toBeVisible({ timeout: 10000 })
    await addToCartButton.click()

    // 3. Aguarda o link para ver o carrinho e navega até ele
    const viewCartLink = page.getByRole('link', { name: /Ver Carrinho/i })
    await expect(viewCartLink).toBeVisible({ timeout: 10000 })
    await viewCartLink.click()

    await expect(page).toHaveURL(/\/cart/)

    // 4. Verifica a tela de carrinho com itens e resumo financeiro
    await expect(page.getByRole('heading', { name: /Carrinho de Compras/i })).toBeVisible()
    await expect(page.getByText(/Resumo da Compra/i)).toBeVisible()

    // 5. Aplica cupom promocional KURIO10
    const couponInput = page.getByPlaceholder(/Ex: KURIO10/i)
    await expect(couponInput).toBeVisible()
    await couponInput.fill('KURIO10')
    await page.getByRole('button', { name: /Aplicar/i }).click()

    // 6. Confirma feedback de sucesso do cupom
    await expect(page.getByText(/Cupom "KURIO10" aplicado/i)).toBeVisible({ timeout: 10000 })

    // 7. Avança para o Checkout
    const checkoutLink = page.getByRole('link', { name: /Avançar para Checkout/i })
    await expect(checkoutLink).toBeVisible()
    await checkoutLink.click()

    await expect(page).toHaveURL(/\/checkout/)

    // 8. Verifica a presença do resumo e confirma a compra
    await expect(page.getByRole('heading', { name: /Checkout e Confirmação/i })).toBeVisible({
      timeout: 10000,
    })

    const confirmButton = page.getByRole('button', { name: /Confirmar e Assinar Pedido/i })
    await expect(confirmButton).toBeEnabled()
    await confirmButton.click()

    // 9. Aguarda redirecionamento para o recibo do pedido
    await expect(page).toHaveURL(/\/orders\/ord-/, { timeout: 15000 })

    // 10. Validações do recibo oficial e snapshot imutável
    await expect(
      page.getByRole('heading', { name: /Pagamento e Transferência Confirmados/i })
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Recibo Oficial de Liquidação/i)).toBeVisible()

    // Confirma presença do hash da blockchain 0x...
    await expect(page.getByText(/0x[a-fA-F0-9]+/).first()).toBeVisible()

    // 11. Verifica imutabilidade após recarregamento direto (refresh)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: /Pagamento e Transferência Confirmados/i })
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Recibo Oficial de Liquidação/i)).toBeVisible()
  })
})
