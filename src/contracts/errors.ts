/**
 * KURIO Contracts: Erros Padronizados da API REST.
 *
 * Em conformidade com o CHALLENGE.md (Seção 5):
 * "As respostas devem representar erros de validação, sessão inválida, falta de permissão,
 * recurso inexistente, conflito de disponibilidade e falha transitória."
 */
import { z } from 'zod'

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'PRICE_CHANGED',
  'OUT_OF_STOCK',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_EXPIRED',
  'PAYMENT_REJECTED',
  'TRANSIENT_ERROR',
  'INTERNAL_ERROR',
])

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export const FieldValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
})

export type FieldValidationError = z.infer<typeof FieldValidationErrorSchema>

export const ApiErrorResponseSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  errors: z.array(FieldValidationErrorSchema).optional(),
  details: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>
