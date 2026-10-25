import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import { cartService, couponsService, quoteService } from '@/services'
import { ApiClientError } from '@/services/api/types'
import { addEth, subEth, multiplyEthByQuantity } from '@/domain/money'

describe('Carrinho de Compras, Cupons e Cotação de Checkout (Etapa 09)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    mockDb.reset()
    mockScenarioManager.reset()
  })

  afterAll(() => {
    server.close()
  })

  describe('Operações do Carrinho', () => {
    it('deve carregar o carrinho inicial com o item padrão do mock', async () => {
      const cart = await cartService.getCart()
      expect(cart.items.length).toBeGreaterThanOrEqual(1)
      expect(cart.itemCount).toBeGreaterThanOrEqual(1)
      expect(typeof cart.subtotalEth).toBe('string')
    })

    it('deve adicionar um novo NFT ao carrinho e atualizar a contagem e subtotal', async () => {
      // Limpa carrinho inicial para teste determinístico
      mockDb.carts['user-01'] = []

      // Adiciona nft-03 (preço 0.45 ETH)
      const cart1 = await cartService.addToCart('nft-03', 1)
      expect(cart1.items.length).toBe(1)
      expect(cart1.items[0]!.nftId).toBe('nft-03')
      expect(cart1.items[0]!.quantity).toBe(1)
      expect(cart1.items[0]!.unitPriceEth).toBe('0.45')
      expect(cart1.items[0]!.subtotalEth).toBe('0.45')
      expect(cart1.subtotalEth).toBe('0.45')

      // Adiciona mais 1 unidade do mesmo NFT
      const cart2 = await cartService.addToCart('nft-03', 1)
      expect(cart2.items.length).toBe(1)
      expect(cart2.items[0]!.quantity).toBe(2)
      expect(cart2.items[0]!.subtotalEth).toBe('0.9')
      expect(cart2.subtotalEth).toBe('0.9')
    })

    it('deve atualizar a quantidade de um item no carrinho respeitando os limites', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      const updatedCart = await cartService.updateCartItemQuantity('nft-03', 3)
      expect(updatedCart.items[0]!.quantity).toBe(3)
      expect(updatedCart.items[0]!.subtotalEth).toBe(multiplyEthByQuantity('0.45', 3))
      expect(updatedCart.itemCount).toBe(3)
    })

    it('deve rejeitar quantidade que exceda o estoque disponível', async () => {
      mockDb.carts['user-01'] = []
      // nft-03 tem availableCount = 4
      await cartService.addToCart('nft-03', 1)

      await expect(cartService.updateCartItemQuantity('nft-03', 5)).rejects.toThrow(
        ApiClientError,
      )

      try {
        await cartService.updateCartItemQuantity('nft-03', 5)
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(409)
        expect(apiError.code).toBe('OUT_OF_STOCK')
      }
    })

    it('deve remover um item do carrinho com sucesso', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 2)

      const cartAfterRemove = await cartService.removeCartItem('nft-03')
      expect(cartAfterRemove.items.length).toBe(0)
      expect(cartAfterRemove.itemCount).toBe(0)
      expect(cartAfterRemove.subtotalEth).toBe('0')
    })
  })

  describe('Validação e Aplicação de Cupons', () => {
    it('deve validar e aplicar com sucesso cupom ativo KURIO10 (10% OFF)', async () => {
      const coupon = await couponsService.applyCoupon('KURIO10')
      expect(coupon.code).toBe('KURIO10')
      expect(coupon.discountPercentage).toBe(10)
      expect(coupon.active).toBe(true)
    })

    it('deve validar e aplicar com sucesso cupom VIP KURIO20 (20% OFF)', async () => {
      const coupon = await couponsService.applyCoupon('KURIO20')
      expect(coupon.code).toBe('KURIO20')
      expect(coupon.discountPercentage).toBe(20)
    })

    it('deve rejeitar cupom expirado com status 422 (COUPON_EXPIRED)', async () => {
      await expect(couponsService.applyCoupon('EXPIRED50')).rejects.toThrow(ApiClientError)

      try {
        await couponsService.applyCoupon('EXPIRED50')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(422)
        expect(apiError.code).toBe('COUPON_EXPIRED')
      }
    })

    it('deve rejeitar cupom inexistente com status 400 (COUPON_INVALID)', async () => {
      await expect(couponsService.applyCoupon('INEXISTENTE')).rejects.toThrow(ApiClientError)

      try {
        await couponsService.applyCoupon('INEXISTENTE')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(400)
        expect(apiError.code).toBe('COUPON_INVALID')
      }
    })
  })

  describe('Cotação de Checkout com Precisão em ETH', () => {
    it('deve gerar cotação com cálculo exato de subtotal, desconto e taxa de rede', async () => {
      // Cria cotação para nft-03 (0.45 ETH) com quantidade 2 = 0.9 ETH
      const quote = await quoteService.getQuote({
        items: [{ nftId: 'nft-03', quantity: 2 }],
        couponCode: 'KURIO10', // 10% de 0.9 = 0.09 ETH
        network: 'Ethereum Mainnet', // Taxa padrão: 0.005 ETH
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      })

      expect(quote.isAvailable).toBe(true)
      expect(quote.subtotalEth).toBe('0.9')
      expect(quote.discountEth).toBe('0.09')
      expect(quote.networkFeeEth).toBe('0.005')

      // Total esperado: 0.9 - 0.09 + 0.005 = 0.815 ETH
      const expectedTotal = addEth(subEth('0.9', '0.09'), '0.005')
      expect(quote.totalEth).toBe(expectedTotal)
      expect(quote.totalEth).toBe('0.815')

      // Garante que é string decimal exata, sem ponto flutuante
      expect(typeof quote.totalEth).toBe('string')
      expect(quote.appliedCoupon?.code).toBe('KURIO10')
      expect(quote.appliedCoupon?.discountPercentage).toBe(10)
    })

    it('deve ajustar a taxa de rede ao selecionar rede alternativa como Polygon ou Sepolia', async () => {
      const quotePolygon = await quoteService.getQuote({
        items: [{ nftId: 'nft-03', quantity: 1 }],
        network: 'Polygon',
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      })

      expect(quotePolygon.networkFeeEth).toBe('0.001')
      // Subtotal: 0.45 + 0.001 = 0.451 ETH
      expect(quotePolygon.totalEth).toBe('0.451')
    })
  })

  describe('Cenários MSW de Falha e Resiliência', () => {
    it('deve responder com erro 409 quando o cenário out_of_stock estiver ativo', async () => {
      mockScenarioManager.setScenario('out_of_stock')

      await expect(cartService.addToCart('nft-03', 1)).rejects.toThrow(ApiClientError)

      try {
        await cartService.addToCart('nft-03', 1)
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(409)
        expect(apiError.code).toBe('OUT_OF_STOCK')
      }
    })

    it('deve responder com erro 503 quando o cenário transient_error estiver ativo', async () => {
      mockScenarioManager.setScenario('transient_error')

      await expect(cartService.getCart()).rejects.toThrow(ApiClientError)

      try {
        await cartService.getCart()
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(503)
        expect(apiError.code).toBe('TRANSIENT_ERROR')
      }
    })

    it('deve responder com erro 400 no cenário coupon_invalid', async () => {
      mockScenarioManager.setScenario('coupon_invalid')

      await expect(couponsService.applyCoupon('KURIO10')).rejects.toThrow(ApiClientError)

      try {
        await couponsService.applyCoupon('KURIO10')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(400)
        expect(apiError.code).toBe('COUPON_INVALID')
      }
    })

    it('deve responder com erro 422 no cenário coupon_expired', async () => {
      mockScenarioManager.setScenario('coupon_expired')

      await expect(couponsService.applyCoupon('KURIO10')).rejects.toThrow(ApiClientError)

      try {
        await couponsService.applyCoupon('KURIO10')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(422)
        expect(apiError.code).toBe('COUPON_EXPIRED')
      }
    })
  })
})
