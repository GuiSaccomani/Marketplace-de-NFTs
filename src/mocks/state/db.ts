/**
 * KURIO Mocks: Banco de dados em memória para simulação com estado consistente.
 *
 * Em conformidade com o CHALLENGE.md (Seção 6):
 * "Os mocks devem manter estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos.
 * Persistência local é permitida para sustentar refresh; o reset deve restaurar integralmente um cenário conhecido."
 */
import type {
  Nft,
  CollectionDetail,
  CartItem,
  OrderReceipt,
  WalletAccount,
} from '@/contracts'
import { MOCK_USERS, type MockUserRecord } from '../data/users'
import { MOCK_COLLECTIONS } from '../data/collections'
import { MOCK_NFTS } from '../data/nfts'
import { MOCK_COUPONS } from '../data/coupons'
import { MOCK_WALLETS } from '../data/wallets'
import { addEth, multiplyEthByQuantity } from '@/domain/money'

export interface MockOrderRecord {
  order: OrderReceipt
  idempotencyKey: string
  requestHash: string
}

export class MockDatabase {
  public users: MockUserRecord[] = []
  public collections: CollectionDetail[] = []
  public nfts: Nft[] = []
  public favorites: Record<string, string[]> = {} // userId -> nftIds[]
  public carts: Record<string, CartItem[]> = {} // session/userId -> CartItem[]
  public orders: MockOrderRecord[] = []
  public wallets: Record<string, WalletAccount[]> = {}
  public currentSessionUserId: string | null = 'user-01'

  constructor() {
    this.reset(false)
    this.loadPersistentData()
  }

  /**
   * Restaura o estado para o cenário inicial determinístico e conhecido.
   */
  public reset(clearStorage = false): void {
    this.users = JSON.parse(JSON.stringify(MOCK_USERS)) as MockUserRecord[]
    this.collections = JSON.parse(JSON.stringify(MOCK_COLLECTIONS)) as CollectionDetail[]
    this.nfts = JSON.parse(JSON.stringify(MOCK_NFTS)) as Nft[]
    this.wallets = JSON.parse(JSON.stringify(MOCK_WALLETS)) as Record<string, WalletAccount[]>

    // Favoritos iniciais determinísticos
    this.favorites = {
      'user-01': ['nft-05', 'nft-18'],
      'user-02': ['nft-03'],
    }

    // Carrinho inicial para user-01
    const initialNft = this.nfts.find((n) => n.id === 'nft-03')
    if (initialNft) {
      this.carts = {
        'user-01': [
          {
            nftId: initialNft.id,
            title: initialNft.title,
            collectionName: initialNft.collection.name,
            mediaUrl: initialNft.mediaUrl,
            unitPriceEth: initialNft.priceEth,
            quantity: 1,
            availableQuantity: initialNft.editions.availableCount,
            maxPerOrder: initialNft.editions.maxPerOrder,
            subtotalEth: initialNft.priceEth,
          },
        ],
      }
    } else {
      this.carts = {}
    }

    this.orders = []
    this.currentSessionUserId = 'user-01'

    if (clearStorage && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('kurio_mock_orders')
        window.localStorage.removeItem('kurio_mock_carts')
      } catch {
        // Ignora erros em ambientes sem storage
      }
    }
  }

  public loadPersistentData(): void {
    if (typeof window === 'undefined') return
    try {
      const savedOrders = window.localStorage.getItem('kurio_mock_orders')
      if (savedOrders) {
        this.orders = JSON.parse(savedOrders) as MockOrderRecord[]
      }
      const savedCarts = window.localStorage.getItem('kurio_mock_carts')
      if (savedCarts) {
        this.carts = JSON.parse(savedCarts) as Record<string, CartItem[]>
      }
    } catch {
      // Ignora erro de parsing
    }
  }

  public savePersistentData(): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('kurio_mock_orders', JSON.stringify(this.orders))
      window.localStorage.setItem('kurio_mock_carts', JSON.stringify(this.carts))
    } catch {
      // Ignora erro de gravação
    }
  }

  // Métodos auxiliares para manipulação do carrinho com precisão em ETH
  public getCart(sessionIdOrUserId: string): { items: CartItem[]; subtotalEth: string } {
    const items = this.carts[sessionIdOrUserId] ?? []
    let subtotalEth = '0'
    for (const item of items) {
      subtotalEth = addEth(subtotalEth, item.subtotalEth)
    }
    return { items, subtotalEth }
  }

  public setCartItem(
    sessionIdOrUserId: string,
    nftId: string,
    quantity: number,
  ): CartItem | null {
    const nft = this.nfts.find((n) => n.id === nftId)
    if (!nft) return null

    const currentItems = this.carts[sessionIdOrUserId] ?? []
    const existingIndex = currentItems.findIndex((i) => i.nftId === nftId)

    if (quantity <= 0) {
      // Remoção
      if (existingIndex >= 0) {
        currentItems.splice(existingIndex, 1)
        this.carts[sessionIdOrUserId] = currentItems
      }
      return null
    }

    const subtotalEth = multiplyEthByQuantity(nft.priceEth, quantity)
    const cartItem: CartItem = {
      nftId: nft.id,
      title: nft.title,
      collectionName: nft.collection.name,
      mediaUrl: nft.mediaUrl,
      unitPriceEth: nft.priceEth,
      quantity,
      availableQuantity: nft.editions.availableCount,
      maxPerOrder: nft.editions.maxPerOrder,
      subtotalEth,
    }

    if (existingIndex >= 0) {
      currentItems[existingIndex] = cartItem
    } else {
      currentItems.push(cartItem)
    }

    this.carts[sessionIdOrUserId] = currentItems
    this.savePersistentData()
    return cartItem
  }

  public removeCartItem(sessionIdOrUserId: string, nftId: string): boolean {
    const currentItems = this.carts[sessionIdOrUserId] ?? []
    const index = currentItems.findIndex((i) => i.nftId === nftId)
    if (index >= 0) {
      currentItems.splice(index, 1)
      this.carts[sessionIdOrUserId] = currentItems
      this.savePersistentData()
      return true
    }
    return false
  }

  public clearCart(sessionIdOrUserId: string): void {
    delete this.carts[sessionIdOrUserId]
    this.savePersistentData()
  }

  public getCoupon(code: string) {
    return MOCK_COUPONS.find((c) => c.code.toUpperCase() === code.toUpperCase())
  }

  public resolveUser(request: Request): MockUserRecord | null {
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      const user = this.users.find((u) => u.token === token)
      if (user) return user
    }
    if (this.currentSessionUserId) {
      return this.users.find((u) => u.id === this.currentSessionUserId) ?? null
    }
    return null
  }
}

export const mockDb = new MockDatabase()

export function resolveAuthenticatedUser(request: Request): MockUserRecord | null {
  return mockDb.resolveUser(request)
}

