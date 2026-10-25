import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import { ordersService, cartService, quoteService } from '@/services'
import { ApiClientError } from '@/services/api/types'
import { setAccessToken } from '@/services/api/client'

describe('Checkout, Idempotência de Pedidos e Snapshot de Recibos (Etapa 10)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    mockDb.reset()
    mockScenarioManager.reset()
    setAccessToken(null)
  })

  afterAll(() => {
    server.close()
  })

  describe('Criação Idempotente de Pedidos e Snapshot de Recibo', () => {
    it('deve criar um pedido confirmado com sucesso, limpar o carrinho e decrementar o estoque', async () => {
      // 1. Prepara carrinho com nft-03 (preço: 0.45 ETH, estoque inicial: 4)
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 2)

      const initialNft = mockDb.nfts.find((n) => n.id === 'nft-03')
      const initialStock = initialNft?.editions.availableCount ?? 4

      // 2. Gera cotação válida
      const quote = await quoteService.getQuote({
        items: [{ nftId: 'nft-03', quantity: 2 }],
        network: 'Ethereum Mainnet',
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      })

      const idempotencyKey = `test-idemp-${Date.now()}`

      // 3. Cria o pedido via ordersService
      const order = await ordersService.createOrder(
        {
          quoteId: quote.quoteId,
          walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
          network: 'Ethereum Mainnet',
          buyer: {
            name: 'Guilherme Colecionador',
            email: 'colecionador@kurio.test',
          },
          expectedTotalEth: quote.totalEth,
        },
        idempotencyKey,
      )

      // Validações do pedido criado
      expect(order.orderId).toBeDefined()
      expect(order.status).toBe('confirmed')
      expect(order.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/)
      expect(order.items.length).toBe(1)
      expect(order.items[0]!.nftId).toBe('nft-03')
      expect(order.items[0]!.quantity).toBe(2)
      expect(order.subtotalEth).toBe('0.9')
      expect(order.totalEth).toBe(quote.totalEth)

      // 4. Confirma que o carrinho foi limpo após o pedido confirmado
      const cartAfterOrder = await cartService.getCart()
      expect(cartAfterOrder.items.length).toBe(0)
      expect(cartAfterOrder.itemCount).toBe(0)

      // 5. Confirma que o estoque do NFT foi decrementado
      const updatedNft = mockDb.nfts.find((n) => n.id === 'nft-03')
      expect(updatedNft?.editions.availableCount).toBe(initialStock - 2)
    })

    it('deve garantir idempotência estrita: mesma chave e payload retornam o mesmo pedido sem duplicidade', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      const quote = await quoteService.getQuote({
        items: [{ nftId: 'nft-03', quantity: 1 }],
        network: 'Polygon',
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      })

      const payload = {
        quoteId: quote.quoteId,
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
        network: 'Polygon',
        buyer: {
          name: 'Guilherme Colecionador',
          email: 'colecionador@kurio.test',
        },
        expectedTotalEth: quote.totalEth,
      }

      const idempotencyKey = 'unique-idempotency-key-01'

      // Primeira tentativa
      const firstOrder = await ordersService.createOrder(payload, idempotencyKey)
      expect(firstOrder.status).toBe('confirmed')

      const orderCountBefore = mockDb.orders.length

      // Segunda tentativa idêntica com a mesma chave (ex: retry por timeout ou duplo clique)
      const secondOrder = await ordersService.createOrder(payload, idempotencyKey)

      expect(secondOrder.orderId).toBe(firstOrder.orderId)
      expect(secondOrder.transactionHash).toBe(firstOrder.transactionHash)
      expect(mockDb.orders.length).toBe(orderCountBefore) // Não duplicou
    })

    it('deve retornar conflito 409 ao reutilizar a mesma chave com payload diferente', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      const idempotencyKey = 'shared-key-different-payload'

      await ordersService.createOrder(
        {
          quoteId: 'quote-01',
          walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
          network: 'Polygon',
          buyer: { name: 'Comprador A', email: 'a@kurio.test' },
          expectedTotalEth: '0.451',
        },
        idempotencyKey,
      )

      // Tentativa de reutilizar a chave com outro comprador/total
      await expect(
        ordersService.createOrder(
          {
            quoteId: 'quote-02',
            walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
            network: 'Ethereum Mainnet',
            buyer: { name: 'Comprador Diferente', email: 'diff@kurio.test' },
            expectedTotalEth: '0.905',
          },
          idempotencyKey,
        ),
      ).rejects.toThrow(ApiClientError)

      try {
        await ordersService.createOrder(
          {
            quoteId: 'quote-02',
            walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
            network: 'Ethereum Mainnet',
            buyer: { name: 'Comprador Diferente', email: 'diff@kurio.test' },
            expectedTotalEth: '0.905',
          },
          idempotencyKey,
        )
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(409)
        expect(apiError.code).toBe('IDEMPOTENCY_CONFLICT')
      }
    })

    it('deve preservar o snapshot imutável do recibo mesmo se o catálogo mudar posteriormente', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      const order = await ordersService.createOrder(
        {
          quoteId: 'quote-snapshot',
          walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
          network: 'Ethereum Mainnet',
          buyer: { name: 'Guilherme', email: 'gui@kurio.test' },
          expectedTotalEth: '0.455',
        },
        `snapshot-key-${Date.now()}`,
      )

      // Simula alteração posterior do preço e nome do NFT no catálogo
      const nftInCatalog = mockDb.nfts.find((n) => n.id === 'nft-03')
      if (nftInCatalog) {
        nftInCatalog.priceEth = '9.99'
        nftInCatalog.title = 'Título Modificado no Catálogo'
      }

      // Consulta o recibo oficial
      const receipt = await ordersService.getOrderReceipt(order.orderId)

      // O recibo DEVE manter os valores do momento da compra (snapshot imutável)
      expect(receipt.orderId).toBe(order.orderId)
      expect(receipt.items[0]!.title).toBe('Cyber Ronin #03')
      expect(receipt.items[0]!.unitPriceEth).toBe('0.45')
      expect(receipt.subtotalEth).toBe('0.45')
      expect(receipt.totalEth).toBe('0.455')
    })
  })

  describe('Cenários de Falha, Rejeição e Consistência', () => {
    it('deve registrar pedido com status rejected e NÃO limpar o carrinho no cenário payment_rejected', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      mockScenarioManager.setScenario('payment_rejected')

      const rejectedOrder = await ordersService.createOrder(
        {
          quoteId: 'quote-rejected',
          walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
          network: 'Ethereum Mainnet',
          buyer: { name: 'Guilherme', email: 'gui@kurio.test' },
          expectedTotalEth: '0.455',
        },
        `reject-key-${Date.now()}`,
      )

      expect(rejectedOrder.status).toBe('rejected')
      expect(rejectedOrder.rejectionReason).toBeDefined()

      // O carrinho NÃO deve ser limpo caso o pagamento seja rejeitado
      const cartAfterRejection = await cartService.getCart()
      expect(cartAfterRejection.items.length).toBe(1)
    })

    it('deve responder com erro 503 e preservar o carrinho no cenário transient_error', async () => {
      mockDb.carts['user-01'] = []
      await cartService.addToCart('nft-03', 1)

      mockScenarioManager.setScenario('transient_error')

      await expect(
        ordersService.createOrder(
          {
            quoteId: 'quote-transient',
            walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
            network: 'Ethereum Mainnet',
            buyer: { name: 'Guilherme', email: 'gui@kurio.test' },
            expectedTotalEth: '0.455',
          },
          `transient-key-${Date.now()}`,
        ),
      ).rejects.toThrow(ApiClientError)

      // Carrinho preservado no estado para permitir que o usuário tente novamente
      mockScenarioManager.reset()
      const cartAfterError = await cartService.getCart()
      expect(cartAfterError.items.length).toBe(1)
    })

    it('deve retornar 404 para recibo de pedido inexistente', async () => {
      await expect(ordersService.getOrderReceipt('ord-inexistente-9999')).rejects.toThrow(
        ApiClientError,
      )

      try {
        await ordersService.getOrderReceipt('ord-inexistente-9999')
      } catch (err: unknown) {
        const apiError = err as ApiClientError
        expect(apiError.status).toBe(404)
        expect(apiError.code).toBe('NOT_FOUND')
      }
    })
  })
})
