/**
 * KURIO Mocks: Handlers REST para Cupons de Desconto.
 */
import { http, HttpResponse } from 'msw'
import {
  ApplyCouponRequestSchema,
  type Coupon,
  type ApiErrorResponse,
} from '@/contracts'
import { mockDb } from '../state/db'
import { mockScenarioManager } from '../state/scenarios'

export const couponsHandlers = [
  http.post('*/api/coupons/apply', async ({ request }) => {
    const scenario = mockScenarioManager.getScenario(request)

    if (scenario === 'coupon_invalid') {
      const error: ApiErrorResponse = {
        code: 'COUPON_INVALID',
        message: 'Código de cupom inválido ou inexistente.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    if (scenario === 'coupon_expired') {
      const error: ApiErrorResponse = {
        code: 'COUPON_EXPIRED',
        message: 'Este cupom de desconto expirou.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 422 })
    }

    const body = await request.json().catch(() => null)
    const parseResult = ApplyCouponRequestSchema.safeParse(body)

    if (!parseResult.success) {
      const error: ApiErrorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Código de cupom não informado.',
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const { code } = parseResult.data
    const coupon = mockDb.getCoupon(code)

    if (!coupon) {
      const error: ApiErrorResponse = {
        code: 'COUPON_INVALID',
        message: `Cupom "${code}" não foi encontrado.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(coupon.expiresAt)
    if (!coupon.active || now > expiresAt) {
      const error: ApiErrorResponse = {
        code: 'COUPON_EXPIRED',
        message: `O cupom "${code}" está expirado ou inativo.`,
        timestamp: new Date().toISOString(),
      }
      return HttpResponse.json(error, { status: 422 })
    }

    return HttpResponse.json(coupon as Coupon, { status: 200 })
  }),
]
