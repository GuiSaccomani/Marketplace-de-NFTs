/**
 * KURIO Contracts: Pedidos, Idempotência e Snapshot do Recibo.
 */
import { z } from 'zod'
import { EthAmountSchema } from './common'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const BuyerInfoSchema = z.object({
  name: z.string().min(1, 'Nome do comprador é obrigatório'),
  email: z.string().email('E-mail do comprador inválido'),
})

export type BuyerInfo = z.infer<typeof BuyerInfoSchema>

export const OrderItemSnapshotSchema = z.object({
  nftId: z.string().min(1),
  title: z.string().min(1),
  collectionName: z.string().min(1),
  mediaUrl: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceEth: EthAmountSchema,
  subtotalEth: EthAmountSchema,
})

export type OrderItemSnapshot = z.infer<typeof OrderItemSnapshotSchema>

export const CreateOrderRequestSchema = z.object({
  quoteId: z.string().min(1, 'ID da cotação é obrigatório'),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço de carteira inválido'),
  network: z.string().min(1, 'Rede blockchain é obrigatória'),
  buyer: BuyerInfoSchema,
  expectedTotalEth: EthAmountSchema,
})

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>

/**
 * Snapshot imutável do pedido (CHALLENGE.md Seção 3:
 * "O recibo deve reproduzir o snapshot do pedido. Alterações posteriores no catálogo não podem modificar seus valores.")
 */
export const OrderReceiptSchema = z.object({
  orderId: z.string().min(1),
  idempotencyKey: z.string().min(1),
  status: OrderStatusSchema,
  createdAt: z.string().datetime(),
  confirmedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
  transactionHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Hash de transação Ethereum inválido')
    .optional(),
  network: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  buyer: BuyerInfoSchema,
  items: z.array(OrderItemSnapshotSchema).min(1),
  subtotalEth: EthAmountSchema,
  discountEth: EthAmountSchema,
  networkFeeEth: EthAmountSchema,
  totalEth: EthAmountSchema,
  couponCode: z.string().optional(),
  version: z.number().int().positive().default(1),
})

export type OrderReceipt = z.infer<typeof OrderReceiptSchema>
