import React, { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartService, quoteService, ordersService, walletsService } from '@/services'
import { useSession } from '@/session'
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Wallet,
  User,
  Mail,
  Lock,
} from 'lucide-react'
import { z } from 'zod'

const CheckoutSearchSchema = z.object({
  network: z.string().optional(),
  coupon: z.string().optional(),
})

export const Route = createFileRoute('/checkout')({
  validateSearch: (search) => CheckoutSearchSchema.parse(search),
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user: sessionUser, status: authStatus } = useSession()
  const searchParams = Route.useSearch()

  // Chave de idempotência fixa por ciclo de tentativa
  const [idempotencyKey] = useState(
    () => `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  )

  // Configurações do comprador e carteira
  const [selectedNetwork, setSelectedNetwork] = useState<string>(
    searchParams.network || 'Ethereum Mainnet',
  )
  const [buyerName, setBuyerName] = useState(sessionUser?.name || 'Guilherme Colecionador')
  const [buyerEmail, setBuyerEmail] = useState(sessionUser?.email || 'colecionador@kurio.test')
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>(
    '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
  )
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // 1. Carrega o carrinho de compras
  const {
    data: cart,
    isLoading: isLoadingCart,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
  })

  // 2. Carrega carteiras conectadas caso autenticado
  const { data: walletsData } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletsService.listWallets(),
    enabled: authStatus === 'authenticated',
  })

  const cartItems = cart?.items ?? []
  const hasItems = cartItems.length > 0

  // 3. Revalida a cotação em tempo real antes da confirmação
  const {
    data: quote,
    isLoading: isLoadingQuote,
    isError: isQuoteError,
    error: quoteError,
    refetch: refetchQuote,
  } = useQuery({
    queryKey: ['quote', cartItems, searchParams.coupon, selectedNetwork],
    queryFn: () =>
      quoteService.getQuote({
        items: cartItems.map((i) => ({ nftId: i.nftId, quantity: i.quantity })),
        couponCode: searchParams.coupon,
        network: selectedNetwork,
        walletAddress: selectedWalletAddress,
      }),
    enabled: hasItems,
  })

  // 4. Mutação estritamente idempotente de criação de pedido
  const createOrderMutation = useMutation({
    mutationFn: () => {
      if (!quote) throw new Error('Cotação não disponível para confirmação.')
      return ordersService.createOrder(
        {
          quoteId: quote.quoteId,
          walletAddress: selectedWalletAddress,
          network: selectedNetwork,
          buyer: {
            name: buyerName.trim(),
            email: buyerEmail.trim(),
          },
          expectedTotalEth: quote.totalEth,
        },
        idempotencyKey,
      )
    },
    onSuccess: (order) => {
      // Invalida cache de carrinho e cotação
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })

      // Se rejeitado (ex: cenário payment_rejected), redireciona para tela de recibo que exibirá o status rejeitado
      void navigate({
        to: '/orders/$orderId',
        params: { orderId: order.orderId },
      })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { message?: string })?.message ||
        'Falha temporária ao processar pagamento na rede simulada.'
      setCheckoutError(msg)
    },
  })

  const handleConfirmOrder = (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutError(null)
    if (!hasItems || !quote || !quote.isAvailable) return
    createOrderMutation.mutate()
  }

  // --- Caso 1: Loading Skeleton ---
  if (isLoadingCart || (hasItems && isLoadingQuote)) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 w-full animate-pulse space-y-8">
        <div className="h-8 w-56 bg-kurio-muted rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-44 rounded-xl bg-kurio-surface-card border border-kurio-border" />
            <div className="h-44 rounded-xl bg-kurio-surface-card border border-kurio-border" />
          </div>
          <div className="h-80 rounded-xl bg-kurio-surface-card border border-kurio-border" />
        </div>
      </main>
    )
  }

  // --- Caso 2: Carrinho Vazio ---
  if (!hasItems) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-kurio-surface-card border border-kurio-border flex items-center justify-center text-kurio-text-secondary">
          <AlertTriangle className="w-8 h-8 text-kurio-accent" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold font-mono text-kurio-foreground">
            Nenhum item para checkout
          </h1>
          <p className="text-xs sm:text-sm text-kurio-text-secondary">
            Seu carrinho está vazio. Adicione NFTs ao carrinho antes de prosseguir com a finalização.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </main>
    )
  }

  const unavailableItems = quote?.unavailableItems ?? []
  const isQuoteBlocked = Boolean(isQuoteError || (quote && !quote.isAvailable))

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Barra de Título / Voltar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kurio-border/80">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-kurio-foreground tracking-tight flex items-center gap-3">
            <span>Checkout e Confirmação</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded bg-kurio-surface border border-kurio-border text-kurio-accent">
              Idempotência Ativa
            </span>
          </h1>
          <p className="text-xs text-kurio-text-secondary font-mono">
            Revise os dados da transação antes de assinar a transferência dos NFTs.
          </p>
        </div>

        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-kurio-text-secondary hover:text-kurio-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Carrinho</span>
        </Link>
      </div>

      {/* Alerta de Cotação Inválida / Erro */}
      {isQuoteBlocked && (
        <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 space-y-2 text-xs font-mono text-red-300">
          <div className="flex items-center gap-2 font-bold text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Não é possível confirmar a compra no momento</span>
          </div>
          <p className="text-[11px] text-red-300/90">
            {(quoteError as { message?: string })?.message ||
              'A disponibilidade de estoque ou os valores do pedido foram alterados.'}
          </p>
          {unavailableItems.length > 0 && (
            <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
              {unavailableItems.map((item) => (
                <li key={item.nftId}>
                  <strong>{item.title}</strong>:{' '}
                  {item.reason === 'out_of_stock'
                    ? 'Esgotado.'
                    : `Estoque insuficiente (apenas ${item.availableQuantity} disponíveis).`}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => refetchQuote()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/40 border border-red-700 text-red-200 hover:bg-red-800 transition-colors text-xs font-bold uppercase mt-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalcular Cotação</span>
          </button>
        </div>
      )}

      {/* Grid: Configurações do Pagamento (2 cols) + Resumo Final (1 col) */}
      <form onSubmit={handleConfirmOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coluna Esquerda: Dados do Comprador e Carteira */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seção 1: Dados do Comprador */}
          <section className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-kurio-border/60">
              <User className="w-4 h-4 text-kurio-primary" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-kurio-foreground">
                Dados do Colecionador / Comprador
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-kurio-text-secondary uppercase text-[10px] tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-kurio-text-secondary uppercase text-[10px] tracking-wider mb-1">
                  E-mail de Confirmação
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                  />
                  <Mail className="w-3.5 h-3.5 text-kurio-text-secondary absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: Carteira e Rede de Pagamento */}
          <section className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-kurio-border/60">
              <Wallet className="w-4 h-4 text-kurio-accent" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-kurio-foreground">
                Carteira Pagadora e Rede
              </h2>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label
                  htmlFor="checkout-network"
                  className="block text-kurio-text-secondary uppercase text-[10px] tracking-wider mb-1"
                >
                  Rede Blockchain de Liquidação
                </label>
                <select
                  id="checkout-network"
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                >
                  <option value="Ethereum Mainnet">Ethereum Mainnet (Taxa: 0.005 ETH)</option>
                  <option value="Sepolia">Sepolia Testnet (Taxa: 0.001 ETH)</option>
                  <option value="Polygon">Polygon PoS (Taxa: 0.001 ETH)</option>
                </select>
              </div>

              <div>
                <label className="block text-kurio-text-secondary uppercase text-[10px] tracking-wider mb-1">
                  Endereço da Carteira
                </label>
                {walletsData && walletsData.wallets.length > 0 ? (
                  <select
                    value={selectedWalletAddress}
                    onChange={(e) => setSelectedWalletAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                  >
                    {walletsData.wallets.map((w) => (
                      <option key={w.id} value={w.address}>
                        {w.label} — {w.address.slice(0, 8)}...{w.address.slice(-6)} ({w.balanceEth} ETH)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedWalletAddress}
                    onChange={(e) => setSelectedWalletAddress(e.target.value)}
                    required
                    pattern="^0x[a-fA-F0-9]{40}$"
                    title="Endereço Ethereum válido (0x seguido de 40 caracteres hexadecimais)"
                    className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                  />
                )}
              </div>
            </div>
          </section>

          {/* Seção 3: Itens Inclusos no Pedido */}
          <section className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-4">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-kurio-foreground pb-2 border-b border-kurio-border/60">
              Itens a Transferir ({cartItems.length})
            </h2>

            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.nftId}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl border border-kurio-border/80 bg-kurio-ink/50 text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.mediaUrl}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover bg-kurio-surface"
                    />
                    <div>
                      <span className="text-[10px] text-kurio-text-secondary truncate block">
                        {item.collectionName}
                      </span>
                      <span className="font-bold text-kurio-foreground truncate block">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-kurio-text-secondary">
                        {item.quantity}x @ {item.unitPriceEth} ETH
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-kurio-primary text-sm">
                      {item.subtotalEth} ETH
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Coluna Direita: Resumo Financeiro & Ação de Pagamento */}
        <aside className="space-y-6">
          <div className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-kurio-border/60">
              <h2 className="text-base font-bold font-mono uppercase tracking-wider text-kurio-foreground">
                Resumo da Cotação
              </h2>
              <Lock className="w-4 h-4 text-kurio-accent" />
            </div>

            {/* Linhas de Valores Financeiros */}
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between text-kurio-text-secondary">
                <span>Subtotal</span>
                <span className="text-kurio-foreground font-semibold">
                  {quote?.subtotalEth ?? cart?.subtotalEth ?? '0'} ETH
                </span>
              </div>

              {quote?.appliedCoupon && quote.discountEth !== '0' && (
                <div className="flex justify-between text-kurio-accent">
                  <span>Desconto ({quote.appliedCoupon.discountPercentage}% OFF)</span>
                  <span className="font-bold">-{quote.discountEth} ETH</span>
                </div>
              )}

              <div className="flex justify-between text-kurio-text-secondary">
                <span>Taxa de Rede ({selectedNetwork})</span>
                <span className="text-kurio-foreground font-semibold">
                  {quote?.networkFeeEth ?? '0.005'} ETH
                </span>
              </div>

              {/* Totalizador Final */}
              <div className="pt-3 border-t border-kurio-border flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-kurio-foreground block">
                    Total Final
                  </span>
                  <span className="text-[10px] text-kurio-text-secondary block">
                    Cálculo exato em Wei
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold font-mono text-kurio-primary">
                    {quote?.totalEth ?? cart?.subtotalEth ?? '0'}{' '}
                    <span className="text-xs font-normal text-kurio-foreground">ETH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta de Erro de Checkout */}
            {checkoutError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-xs font-mono text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-200">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Erro na Transação</span>
                </div>
                <p className="text-[11px] leading-relaxed">{checkoutError}</p>
                <div className="pt-1 text-[10px] text-red-400">
                  Idempotência: mesma chave será utilizada em novas tentativas.
                </div>
              </div>
            )}

            {/* Botão de Confirmação do Pedido */}
            <button
              type="submit"
              disabled={createOrderMutation.isPending || isQuoteBlocked}
              className="w-full py-4 px-6 rounded-lg font-mono text-xs sm:text-sm font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-kurio-primary/10 flex items-center justify-center gap-2"
            >
              {createOrderMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Assinando Transação...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirmar e Assinar Pedido</span>
                </>
              )}
            </button>

            {/* Informações de Idempotência e Segurança */}
            <div className="space-y-1 pt-2 border-t border-kurio-border/40 text-[10px] font-mono text-kurio-text-secondary text-center">
              <div>Chave de Idempotência: {idempotencyKey.slice(0, 16)}...</div>
              <div>Transação atômica simulada com liquidação na blockchain.</div>
            </div>
          </div>
        </aside>
      </form>
    </main>
  )
}
