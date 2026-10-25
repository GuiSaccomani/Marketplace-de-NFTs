/**
 * Handlers centrais do MSW para o KURIO NFT Marketplace.
 * Agrega todos os handlers de domínio e preserva os handlers do Spike (Etapa 03).
 */
import { spikeHandlers } from './spike/handlers'
import { authHandlers } from './handlers/auth.handlers'
import { nftsHandlers, collectionsHandlers } from './handlers/nfts.handlers'
import { favoritesHandlers } from './handlers/favorites.handlers'
import { cartHandlers } from './handlers/cart.handlers'
import { couponsHandlers } from './handlers/coupons.handlers'
import { quoteHandlers } from './handlers/quote.handlers'
import { ordersHandlers } from './handlers/orders.handlers'
import { profileHandlers } from './handlers/profile.handlers'
import { walletsHandlers } from './handlers/wallets.handlers'

export const handlers = [
  ...spikeHandlers,
  ...authHandlers,
  ...nftsHandlers,
  ...collectionsHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...couponsHandlers,
  ...quoteHandlers,
  ...ordersHandlers,
  ...profileHandlers,
  ...walletsHandlers,
]
