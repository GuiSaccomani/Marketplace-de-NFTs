/**
 * KURIO Contracts: Carrinho, Itens, Cupons e Cotação de Checkout.
 */
import { z } from 'zod'
import { EthAmountSchema } from './common'

export const CartItemSchema = z.object({
  nftId: z.string().min(1),
  title: z.string().min(1),
  collectionName: z.string().min(1),
  mediaUrl: z.string().min(1),
  unitPriceEth: EthAmountSchema,
  quantity: z.number().int().positive('Quantidade deve ser inteira e positiva'),
  availableQuantity: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive().default(5),
  subtotalEth: EthAmountSchema,
})

export type CartItem = z.infer<typeof CartItemSchema>

export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotalEth: EthAmountSchema,
  updatedAt: z.string().datetime(),
})

export type Cart = z.infer<typeof CartSchema>

export const AddToCartRequestSchema = z.object({
  nftId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
})

export type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>

export const UpdateCartItemQuantityRequestSchema = z.object({
  quantity: z.number().int().positive(),
})

export type UpdateCartItemQuantityRequest = z.infer<
  typeof UpdateCartItemQuantityRequestSchema
>

export const CouponSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  discountPercentage: z.number().min(0).max(100),
  description: z.string().default(''),
  active: z.boolean(),
  expiresAt: z.string().datetime(),
})

export type Coupon = z.infer<typeof CouponSchema>

export const ApplyCouponRequestSchema = z.object({
  code: z.string().min(1).trim(),
})

export type ApplyCouponRequest = z.infer<typeof ApplyCouponRequestSchema>

export const QuoteRequestSchema = z.object({
  items: z
    .array(
      z.object({
        nftId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'O carrinho deve conter ao menos um item para cotação'),
  couponCode: z.string().optional(),
  network: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço de carteira inválido'),
})

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>

export const QuoteUnavailableItemSchema = z.object({
  nftId: z.string().min(1),
  title: z.string().min(1),
  requestedQuantity: z.number().int().positive(),
  availableQuantity: z.number().int().nonnegative(),
  reason: z.enum(['out_of_stock', 'insufficient_quantity', 'price_changed']),
})

export type QuoteUnavailableItem = z.infer<typeof QuoteUnavailableItemSchema>

export const QuoteResponseSchema = z.object({
  quoteId: z.string().min(1),
  expiresAt: z.string().datetime(),
  items: z.array(CartItemSchema),
  subtotalEth: EthAmountSchema,
  discountEth: EthAmountSchema,
  networkFeeEth: EthAmountSchema,
  totalEth: EthAmountSchema,
  appliedCoupon: z
    .object({
      code: z.string(),
      discountPercentage: z.number(),
      discountEth: EthAmountSchema,
    })
    .optional(),
  isAvailable: z.boolean(),
  priceChanged: z.boolean().default(false),
  unavailableItems: z.array(QuoteUnavailableItemSchema).default([]),
})

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>
