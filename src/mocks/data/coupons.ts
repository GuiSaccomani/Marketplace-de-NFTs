/**
 * KURIO Mocks: Fixtures de Cupons para simulação de checkout.
 */
import type { Coupon } from '@/contracts'

export const MOCK_COUPONS: Coupon[] = [
  {
    code: 'KURIO10',
    discountPercentage: 10,
    description: '10% de desconto de boas-vindas na primeira compra.',
    active: true,
    expiresAt: '2027-12-31T23:59:59.000Z',
  },
  {
    code: 'KURIO20',
    discountPercentage: 20,
    description: '20% de desconto exclusivo para membros VIP.',
    active: true,
    expiresAt: '2027-12-31T23:59:59.000Z',
  },
  {
    code: 'EXPIRED50',
    discountPercentage: 50,
    description: 'Cupom de evento especial expirado.',
    active: false,
    expiresAt: '2025-01-01T00:00:00.000Z',
  },
]
