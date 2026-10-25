/**
 * KURIO Contracts: Carteiras e Redes Blockchain.
 */
import { z } from 'zod'
import { EthAmountSchema } from './common'

export const WalletTypeSchema = z.enum(['primary', 'secondary'])
export type WalletType = z.infer<typeof WalletTypeSchema>

export const SupportedNetworkSchema = z.enum([
  'ethereum_mainnet',
  'sepolia',
  'polygon',
])

export type SupportedNetwork = z.infer<typeof SupportedNetworkSchema>

export const WalletConnectionStatusSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'rejected',
])

export type WalletConnectionStatus = z.infer<typeof WalletConnectionStatusSchema>

export const WalletAccountSchema = z.object({
  id: z.string().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço Ethereum inválido'),
  label: z.string().min(1, 'Rótulo da carteira obrigatório'),
  type: WalletTypeSchema,
  network: SupportedNetworkSchema,
  balanceEth: EthAmountSchema,
  status: WalletConnectionStatusSchema.default('connected'),
  isDefault: z.boolean().default(false),
  createdAt: z.string().datetime(),
})

export type WalletAccount = z.infer<typeof WalletAccountSchema>

export const SaveWalletRequestSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço Ethereum inválido'),
  label: z.string().min(1, 'Rótulo da carteira obrigatório'),
  type: WalletTypeSchema,
  network: SupportedNetworkSchema,
})

export type SaveWalletRequest = z.infer<typeof SaveWalletRequestSchema>

export const WalletListResponseSchema = z.object({
  wallets: z.array(WalletAccountSchema),
  activeNetwork: SupportedNetworkSchema,
})

export type WalletListResponse = z.infer<typeof WalletListResponseSchema>
