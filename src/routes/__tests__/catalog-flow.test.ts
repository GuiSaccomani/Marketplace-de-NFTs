import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { server } from '@/mocks/server'
import { mockDb } from '@/mocks/state/db'
import { mockScenarioManager } from '@/mocks/state/scenarios'
import { nftsService, collectionsService } from '@/services'

describe('Fluxo do Catálogo, Filtros e Paginação (Etapa 07)', () => {
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

  it('deve carregar coleções para popular a barra de filtros', async () => {
    const collections = await collectionsService.listCollections()
    expect(collections.length).toBe(10)
    expect(collections.some((c) => c.slug === 'cyber-samurais')).toBe(true)
  })

  it('deve filtrar catálogo por busca textual e retornar itens relevantes', async () => {
    const response = await nftsService.listNfts({ search: 'Blade' })
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.every((nft) => /blade/i.test(nft.title))).toBe(true)
  })

  it('deve filtrar por coleção específica', async () => {
    const response = await nftsService.listNfts({ collectionId: 'col-01' })
    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items.every((nft) => nft.collection.id === 'col-01')).toBe(true)
  })

  it('deve filtrar por rede blockchain (Ethereum, Polygon ou Sepolia)', async () => {
    const polygonResponse = await nftsService.listNfts({ network: 'Polygon' })
    expect(polygonResponse.items.length).toBeGreaterThan(0)
    expect(
      polygonResponse.items.every((nft) => /polygon/i.test(nft.blockchainNetwork)),
    ).toBe(true)
  })

  it('deve filtrar por disponibilidade de edições', async () => {
    const availableOnly = await nftsService.listNfts({ availability: 'available' })
    expect(availableOnly.items.every((nft) => nft.editions.availableCount > 0)).toBe(true)
  })

  it('deve filtrar por faixa de preço exata em ETH', async () => {
    const response = await nftsService.listNfts({
      minPriceEth: '0.5',
      maxPriceEth: '1.5',
    })

    expect(response.items.length).toBeGreaterThan(0)
    for (const nft of response.items) {
      const price = parseFloat(nft.priceEth)
      expect(price).toBeGreaterThanOrEqual(0.5)
      expect(price).toBeLessThanOrEqual(1.5)
    }
  })

  it('deve ordenar por menor preço (price_asc) e maior preço (price_desc) com precisão ETH', async () => {
    const asc = await nftsService.listNfts({ sort: 'price_asc', limit: 12 })
    const ascPrices = asc.items.map((n) => parseFloat(n.priceEth))
    for (let i = 0; i < ascPrices.length - 1; i++) {
      expect(ascPrices[i]).toBeLessThanOrEqual(ascPrices[i + 1]!)
    }

    const desc = await nftsService.listNfts({ sort: 'price_desc', limit: 12 })
    const descPrices = desc.items.map((n) => parseFloat(n.priceEth))
    for (let i = 0; i < descPrices.length - 1; i++) {
      expect(descPrices[i]).toBeGreaterThanOrEqual(descPrices[i + 1]!)
    }
  })

  it('deve paginar corretamente dividindo em páginas com limite configurável', async () => {
    const page1 = await nftsService.listNfts({ page: 1, limit: 4 })
    expect(page1.items.length).toBe(4)
    expect(page1.page).toBe(1)
    expect(page1.hasMore).toBe(true)

    const page2 = await nftsService.listNfts({ page: 2, limit: 4 })
    expect(page2.items.length).toBe(4)
    expect(page2.page).toBe(2)

    // Garante que os itens entre as páginas não são duplicados
    const idsPage1 = new Set(page1.items.map((n) => n.id))
    for (const item of page2.items) {
      expect(idsPage1.has(item.id)).toBe(false)
    }
  })

  it('deve lidar com resultado vazio sem quebrar a estrutura', async () => {
    const response = await nftsService.listNfts({
      search: 'termo-inexistente-xyz-123456',
    })
    expect(response.items).toEqual([])
    expect(response.total).toBe(0)
    expect(response.hasMore).toBe(false)
  })

  it('deve suportar simulação de falha temporária determinística e recuperação', async () => {
    // 1. Falha com cenário transient_error
    mockScenarioManager.setScenario('transient_error')
    await expect(nftsService.listNfts()).rejects.toThrow()

    // 2. Recuperação com reset
    mockScenarioManager.reset()
    const recovered = await nftsService.listNfts()
    expect(recovered.items.length).toBeGreaterThan(0)
  })
})
