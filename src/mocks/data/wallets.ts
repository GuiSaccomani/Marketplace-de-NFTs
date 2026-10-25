/**
 * KURIO Mocks: Fixtures de Carteiras pré-cadastradas.
 */
import type { WalletAccount } from '@/contracts'

export const MOCK_WALLETS: Record<string, WalletAccount[]> = {
  'user-01': [
    {
      id: 'wal-01',
      address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      label: 'MetaMask Principal',
      type: 'primary',
      network: 'ethereum_mainnet',
      balanceEth: '14.85',
      status: 'connected',
      isDefault: true,
      createdAt: '2026-01-15T10:10:00.000Z',
    },
    {
      id: 'wal-02',
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      label: 'Coinbase Wallet Secundária',
      type: 'secondary',
      network: 'polygon',
      balanceEth: '5.2',
      status: 'connected',
      isDefault: false,
      createdAt: '2026-02-01T15:00:00.000Z',
    },
  ],
  'user-02': [
    {
      id: 'wal-03',
      address: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      label: 'Rainbow Studio',
      type: 'primary',
      network: 'ethereum_mainnet',
      balanceEth: '42.0',
      status: 'connected',
      isDefault: true,
      createdAt: '2026-02-20T14:35:00.000Z',
    },
  ],
}
