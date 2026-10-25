import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cartService, couponsService, quoteService } from '@/services'
import {
  ShoppingBag,
  Trash2,
  Tag,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const queryClient = useQueryClient()

  // Estados locais para cupom e rede
  const [couponInput, setCouponInput] = useState('')
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<string>('Ethereum Mainnet')

  // 1. Consulta do estado atual do carrinho
  const {
    data: cart,
    isLoading: isLoadingCart,
    isError: isCartError,
    error: cartQueryError,
    refetch: refetchCart,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
  })

  // 2. Consulta de cotação em tempo real com precisão estrita em ETH
  const cartItems = cart?.items ?? []
  const hasItems = cartItems.length > 0

  const {
    data: quote,
    isLoading: isLoadingQuote,
  } = useQuery({
    queryKey: ['quote', cartItems, appliedCouponCode, selectedNetwork],
    queryFn: () =>
      quoteService.getQuote({
        items: cartItems.map((item) => ({
          nftId: item.nftId,
          quantity: item.quantity,
        })),
        couponCode: appliedCouponCode || undefined,
        network: selectedNetwork,
        walletAddress: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
      }),
    enabled: hasItems,
  })

  // 3. Mutação para alterar quantidade de um item
  const updateQuantityMutation = useMutation({
    mutationFn: ({ nftId, quantity }: { nftId: string; quantity: number }) =>
      cartService.updateCartItemQuantity(nftId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message || 'Erro ao alterar quantidade.'
      setCouponError(msg)
      setTimeout(() => setCouponError(null), 4000)
    },
  })

  // 4. Mutação para remover um item do carrinho
  const removeItemMutation = useMutation({
    mutationFn: (nftId: string) => cartService.removeCartItem(nftId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message || 'Erro ao remover item do carrinho.'
      setCouponError(msg)
      setTimeout(() => setCouponError(null), 4000)
    },
  })

  // 5. Mutação para aplicar cupom de desconto
  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => couponsService.applyCoupon(code),
    onSuccess: (coupon) => {
      setAppliedCouponCode(coupon.code)
      setCouponError(null)
      setCouponSuccess(`Cupom "${coupon.code}" aplicado! (${coupon.discountPercentage}% OFF)`)
      setCouponInput('')
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      setTimeout(() => setCouponSuccess(null), 4000)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { message?: string })?.message ||
        'Cupom de desconto inválido ou não compatível com o pedido.'
      setCouponError(msg)
      setCouponSuccess(null)
      setTimeout(() => setCouponError(null), 4500)
    },
  })

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = couponInput.trim().toUpperCase()
    if (!trimmed) return
    applyCouponMutation.mutate(trimmed)
  }

  const handleRemoveCoupon = () => {
    setAppliedCouponCode(null)
    setCouponSuccess('Cupom removido com sucesso.')
    void queryClient.invalidateQueries({ queryKey: ['quote'] })
    setTimeout(() => setCouponSuccess(null), 3000)
  }

  // --- Caso 1: Loading Skeleton ---
  if (isLoadingCart) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full animate-pulse space-y-8">
        <div className="h-8 w-60 bg-kurio-muted rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-28 rounded-xl bg-kurio-surface-card border border-kurio-border" />
            <div className="h-28 rounded-xl bg-kurio-surface-card border border-kurio-border" />
          </div>
          <div className="h-80 rounded-xl bg-kurio-surface-card border border-kurio-border" />
        </div>
      </main>
    )
  }

  // --- Caso 2: Erro ao Carregar Carrinho ---
  if (isCartError || !cart) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-950/40 border border-red-800 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold font-mono text-kurio-foreground">
          Erro ao Carregar o Carrinho
        </h1>
        <p className="text-xs sm:text-sm text-kurio-text-secondary">
          {(cartQueryError as { message?: string })?.message ||
            'Não foi possível sincronizar os itens do seu carrinho com o servidor.'}
        </p>
        <button
          type="button"
          onClick={() => refetchCart()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tentar Novamente</span>
        </button>
      </main>
    )
  }

  // --- Caso 3: Carrinho Vazio ---
  if (!hasItems) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-kurio-surface-card border border-kurio-border flex items-center justify-center text-kurio-text-secondary">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-mono text-kurio-foreground">
            Seu carrinho está vazio
          </h1>
          <p className="text-xs sm:text-sm text-kurio-text-secondary max-w-sm mx-auto font-sans leading-relaxed">
            Nenhum NFT adicionado no momento. Explore nosso catálogo de arte digital cyberpunk e edições
            exclusivas na Ethereum.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-all shadow-lg shadow-kurio-primary/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explorar Catálogo</span>
        </Link>
      </main>
    )
  }

  // Valores financeiros exibidos (prioridade da cotação do servidor, fallback no subtotal do cart)
  const displaySubtotal = quote?.subtotalEth ?? cart.subtotalEth
  const displayDiscount = quote?.discountEth ?? '0'
  const displayNetworkFee = quote?.networkFeeEth ?? '0.005'
  const displayTotal = quote?.totalEth ?? cart.subtotalEth
  const hasDiscount = quote?.appliedCoupon && displayDiscount !== '0'
  const unavailableItems = quote?.unavailableItems ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-kurio-border/80">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-kurio-foreground tracking-tight flex items-center gap-3">
            <span>Carrinho de Compras</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded bg-kurio-surface border border-kurio-border text-kurio-primary">
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'}
            </span>
          </h1>
          <p className="text-xs text-kurio-text-secondary font-mono">
            Revise seus NFTs, aplique cupons promocionais e confira a cotação exata da transação.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-kurio-text-secondary hover:text-kurio-primary transition-colors focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continuar Comprando</span>
        </Link>
      </div>

      {/* Alerta de Itens com Falha de Estoque ou Preço Alterado */}
      {unavailableItems.length > 0 && (
        <div className="p-4 rounded-xl border border-red-800 bg-red-950/40 space-y-2 text-xs font-mono text-red-300">
          <div className="flex items-center gap-2 font-bold text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Atenção: alterações na disponibilidade de itens no carrinho</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-red-300/90 pl-1">
            {unavailableItems.map((item) => (
              <li key={item.nftId}>
                <strong>{item.title}</strong>:{' '}
                {item.reason === 'out_of_stock'
                  ? 'Edição esgotada.'
                  : `Apenas ${item.availableQuantity} unidades disponíveis em estoque.`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid Principal: Lista de Itens (2 cols) + Resumo do Pedido (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coluna Esquerda: Lista de Itens do Carrinho */}
        <section className="lg:col-span-2 space-y-4" aria-label="Itens do Carrinho">
          {cartItems.map((item) => {
            const isAtMax = item.quantity >= Math.min(item.availableQuantity, item.maxPerOrder)
            const isAtMin = item.quantity <= 1

            return (
              <article
                key={item.nftId}
                data-testid={`cart-item-${item.nftId}`}
                className="group p-4 sm:p-5 rounded-2xl border border-kurio-border bg-kurio-surface-card hover:border-kurio-primary/60 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Imagem + Identificação da Obra */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-kurio-ink border border-kurio-border shrink-0 aspect-square">
                    <img
                      src={item.mediaUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary truncate block">
                      {item.collectionName}
                    </span>
                    <h2 className="text-sm sm:text-base font-bold font-mono text-kurio-foreground truncate group-hover:text-kurio-primary transition-colors">
                      <Link to="/nfts/$nftId" params={{ nftId: item.nftId }}>
                        {item.title}
                      </Link>
                    </h2>
                    <div className="text-xs font-mono text-kurio-text-secondary">
                      Preço unitário:{' '}
                      <span className="text-kurio-primary font-bold">{item.unitPriceEth} ETH</span>
                    </div>
                  </div>
                </div>

                {/* Controles: Quantidade + Subtotal + Remoção */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-kurio-border/40">
                  {/* Seletor de Quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantityMutation.mutate({
                          nftId: item.nftId,
                          quantity: item.quantity - 1,
                        })
                      }
                      disabled={isAtMin || updateQuantityMutation.isPending}
                      aria-label="Diminuir quantidade"
                      className="w-8 h-8 rounded border border-kurio-border bg-kurio-ink text-kurio-foreground font-mono disabled:opacity-40 hover:border-kurio-primary transition-colors flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-kurio-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantityMutation.mutate({
                          nftId: item.nftId,
                          quantity: item.quantity + 1,
                        })
                      }
                      disabled={isAtMax || updateQuantityMutation.isPending}
                      aria-label="Aumentar quantidade"
                      className="w-8 h-8 rounded border border-kurio-border bg-kurio-ink text-kurio-foreground font-mono disabled:opacity-40 hover:border-kurio-primary transition-colors flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Subtotal da Linha em ETH */}
                  <div className="text-right min-w-[90px]">
                    <span className="text-[10px] font-mono uppercase text-kurio-text-secondary block">
                      Subtotal
                    </span>
                    <span className="text-sm font-bold font-mono text-kurio-primary">
                      {item.subtotalEth} <span className="text-[10px] text-kurio-foreground font-normal">ETH</span>
                    </span>
                  </div>

                  {/* Botão de Remoção */}
                  <button
                    type="button"
                    onClick={() => removeItemMutation.mutate(item.nftId)}
                    disabled={removeItemMutation.isPending}
                    aria-label={`Remover ${item.title} do carrinho`}
                    title="Remover item"
                    className="p-2 rounded text-kurio-text-secondary hover:text-red-400 hover:bg-red-950/20 transition-colors focus:outline-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            )
          })}
        </section>

        {/* Coluna Direita: Resumo do Pedido & Cupons */}
        <aside className="space-y-6" aria-label="Resumo do Pedido">
          <div className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-6 shadow-2xl">
            <h2 className="text-base font-bold font-mono uppercase tracking-wider text-kurio-foreground pb-3 border-b border-kurio-border/60">
              Resumo da Compra
            </h2>

            {/* Seletor de Rede Blockchain */}
            <div className="space-y-2">
              <label
                htmlFor="network-select"
                className="text-xs font-mono uppercase tracking-wider text-kurio-text-secondary flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-kurio-accent" />
                <span>Rede de Liquidação</span>
              </label>
              <select
                id="network-select"
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full px-3 py-2.5 rounded bg-kurio-ink border border-kurio-border text-xs font-mono text-kurio-foreground focus:border-kurio-primary focus:outline-none transition-colors"
              >
                <option value="Ethereum Mainnet">Ethereum Mainnet (Taxa: 0.005 ETH)</option>
                <option value="Sepolia">Sepolia Testnet (Taxa: 0.001 ETH)</option>
                <option value="Polygon">Polygon PoS (Taxa: 0.001 ETH)</option>
              </select>
            </div>

            {/* Seção de Cupom Promocional */}
            <div className="space-y-3 pt-2 border-t border-kurio-border/40">
              <span className="text-xs font-mono uppercase tracking-wider text-kurio-text-secondary flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-kurio-primary" />
                <span>Cupom Promocional</span>
              </span>

              {appliedCouponCode ? (
                <div className="p-3 rounded-lg border border-kurio-accent/60 bg-kurio-ink flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-kurio-accent" />
                    <div>
                      <span className="font-bold text-kurio-foreground">{appliedCouponCode}</span>
                      {quote?.appliedCoupon && (
                        <span className="text-[11px] text-kurio-accent block">
                          {quote.appliedCoupon.discountPercentage}% OFF (-{quote.appliedCoupon.discountEth} ETH)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded text-kurio-text-secondary hover:text-red-400 hover:bg-red-950/20 transition-colors"
                    title="Remover cupom"
                    aria-label="Remover cupom aplicado"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ex: KURIO10"
                    className="flex-1 px-3 py-2 rounded bg-kurio-ink border border-kurio-border text-xs font-mono uppercase text-kurio-foreground placeholder:text-kurio-text-secondary/60 focus:border-kurio-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!couponInput.trim() || applyCouponMutation.isPending}
                    className="px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-surface border border-kurio-border text-kurio-foreground hover:border-kurio-primary hover:text-kurio-primary disabled:opacity-40 transition-colors"
                  >
                    {applyCouponMutation.isPending ? 'Validando...' : 'Aplicar'}
                  </button>
                </form>
              )}

              {/* Mensagens de Feedback de Cupom */}
              {couponError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-[11px] font-mono text-red-300">
                  {couponError}
                </div>
              )}
              {couponSuccess && (
                <div className="p-2.5 rounded bg-kurio-ink border border-kurio-accent/60 text-[11px] font-mono text-kurio-accent flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{couponSuccess}</span>
                </div>
              )}
            </div>

            {/* Linhas de Valores Financeiros da Cotação */}
            <div className="space-y-3 pt-3 border-t border-kurio-border/60 text-xs font-mono">
              <div className="flex justify-between text-kurio-text-secondary">
                <span>Subtotal dos Itens</span>
                <span className="text-kurio-foreground font-semibold">{displaySubtotal} ETH</span>
              </div>

              {hasDiscount && (
                <div className="flex justify-between text-kurio-accent">
                  <span className="flex items-center gap-1">
                    <span>Desconto ({quote?.appliedCoupon?.discountPercentage}%)</span>
                  </span>
                  <span className="font-bold">-{displayDiscount} ETH</span>
                </div>
              )}

              <div className="flex justify-between text-kurio-text-secondary">
                <span className="flex items-center gap-1">
                  <span>Taxa de Rede Estimada</span>
                </span>
                <span className="text-kurio-foreground font-semibold">
                  {isLoadingQuote ? 'Calculando...' : `${displayNetworkFee} ETH`}
                </span>
              </div>

              {/* Totalizador Final */}
              <div className="pt-3 border-t border-kurio-border flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-kurio-foreground block">
                    Total da Cotação
                  </span>
                  <span className="text-[10px] text-kurio-text-secondary block">
                    Cálculo exato em Wei garantido
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold font-mono text-kurio-primary">
                    {displayTotal}{' '}
                    <span className="text-xs font-normal text-kurio-foreground">ETH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Prosseguir para o Checkout */}
            <Link
              to="/checkout"
              search={{
                network: selectedNetwork,
                coupon: appliedCouponCode || undefined,
              }}
              className="w-full py-3.5 px-6 rounded-lg font-mono text-xs sm:text-sm font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-all shadow-lg shadow-kurio-primary/10 flex items-center justify-center gap-2"
            >
              <span>Avançar para Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Rodapé do Card */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-kurio-text-secondary/70">
              <ShieldCheck className="w-3.5 h-3.5 text-kurio-accent" />
              <span>Transação protegida por Contratos Inteligentes</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
