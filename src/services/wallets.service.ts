import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import {
  WalletListResponseSchema,
  WalletAccountSchema,
  type WalletListResponse,
  type WalletAccount,
  type SaveWalletRequest,
} from '@/contracts'

export const walletsService = {
  /**
   * Lista todas as carteiras cadastradas pelo usuário.
   */
  async listWallets(options?: RequestOptions): Promise<WalletListResponse> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.get('/wallets', config)
    return WalletListResponseSchema.parse(response.data)
  },

  /**
   * Adiciona uma nova carteira associada à conta.
   */
  async saveWallet(data: SaveWalletRequest, options?: RequestOptions): Promise<WalletAccount> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/wallets', data, config)
    return WalletAccountSchema.parse(response.data)
  },
}
