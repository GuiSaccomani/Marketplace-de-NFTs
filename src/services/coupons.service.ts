import { apiClient, buildAxiosConfig } from './api/client'
import type { RequestOptions } from './api/types'
import { CouponSchema, type Coupon } from '@/contracts'

export const couponsService = {
  /**
   * Aplica e valida um cupom de desconto.
   */
  async applyCoupon(code: string, options?: RequestOptions): Promise<Coupon> {
    const config = buildAxiosConfig(options)
    const response = await apiClient.post('/coupons/apply', { code }, config)
    return CouponSchema.parse(response.data)
  },
}
