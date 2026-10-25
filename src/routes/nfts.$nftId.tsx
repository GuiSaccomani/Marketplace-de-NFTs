import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { nftsService, favoritesService, cartService } from '@/services'
import { useSession } from '@/session'
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  ShieldCheck,
  Layers,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailsPage,
})

function NftDetailsPage() {
  const { nftId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { status: authStatus } = useSession()

  const [quantity, setQuantity] = useState(1)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [isSuccessAction, setIsSuccessAction] = useState(false)

  // 1. Consulta dos detalhes do NFT via TanStack Query
  const {
    data: nft,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['nft', nftId],
    queryFn: () => nftsService.getNftById(nftId),
  })

  // 2. Consulta da lista de favoritos do usuário logado (para marcar o coração ativo)
  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.listFavorites(),
    enabled: authStatus === 'authenticated',
  })

  const isFavorited = Boolean(
    favoritesData?.items.some((f) => f.id === nftId) || nft?.isFavorite,
  )

  // 3. Mutação otimista de favoritar/desfavoritar
  const toggleFavoriteMutation = useMutation({
    mutationFn: () => favoritesService.toggleFavorite(nftId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] })
      void queryClient.invalidateQueries({ queryKey: ['nft', nftId] })
    },
  })

  // 4. Mutação para adicionar ao carrinho
  const addToCartMutation = useMutation({
    mutationFn: () => cartService.addToCart(nftId, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      setIsSuccessAction(true)
      setActionFeedback(`Item adicionado ao carrinho (${quantity}x)!`)
      setTimeout(() => setActionFeedback(null), 5000)
    },
    onError: (err: unknown) => {
      setIsSuccessAction(false)
      const msg = (err as { message?: string })?.message || 'Erro ao adicionar item ao carrinho.'
      setActionFeedback(msg)
      setTimeout(() => setActionFeedback(null), 4000)
    },
  })

  const handleFavoriteClick = () => {
    if (authStatus !== 'authenticated') {
      setIsSuccessAction(false)
      setActionFeedback('Faça login para salvar favoritos.')
      setTimeout(() => setActionFeedback(null), 3000)
      return
    }
    toggleFavoriteMutation.mutate()
  }

  const handleAddToCartClick = () => {
    addToCartMutation.mutate()
  }

  // Tratamento de Loading Skeleton (replica a geometria exata do layout final para CLS = 0)
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-pulse">
        {/* Barra Superior / Breadcrumb idêntica para preservar geometria */}
        <div className="border-b border-kurio-border/60 bg-kurio-surface-card/40 py-3">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-kurio-text-secondary">
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Catálogo</span>
            </div>
            <div className="h-4 w-36 bg-kurio-muted rounded hidden sm:block" />
          </div>
        </div>

        {/* Conteúdo Principal Skeleton */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="aspect-square w-full rounded-2xl bg-kurio-muted" />
            <div className="flex flex-col gap-6">
              <div className="h-4 w-28 bg-kurio-muted rounded" />
              <div className="h-8 w-3/4 bg-kurio-muted rounded" />
              <div className="h-16 w-full bg-kurio-muted rounded-lg" />
              <div className="h-20 w-full bg-kurio-muted rounded" />
              <div className="h-48 w-full bg-kurio-muted rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Tratamento de Erro ou NFT Não Encontrado
  if (isError || !nft) {
    const isNotFound = (error as { status?: number })?.status === 404
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-red-950/40 border border-red-800 flex items-center justify-center text-red-400 mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold font-mono text-kurio-foreground mb-2">
          {isNotFound ? 'NFT Não Encontrado' : 'Erro ao Carregar NFT'}
        </h1>
        <p className="text-xs sm:text-sm text-kurio-text-secondary max-w-md mb-6">
          {isNotFound
            ? `O NFT com identificador "${nftId}" não existe ou foi removido do marketplace.`
            : 'Ocorreu uma falha temporária de comunicação com o servidor simulado.'}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-semibold uppercase bg-kurio-surface-card border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          {!isNotFound && (
            <button
              type="button"
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-semibold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tentar Novamente</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const isSoldOut = nft.editions.availableCount === 0
  const soldCount = nft.editions.totalCount - nft.editions.availableCount
  const progressPercent = Math.min(100, Math.round((soldCount / nft.editions.totalCount) * 100))

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Barra Superior / Breadcrumb */}
      <div className="border-b border-kurio-border/60 bg-kurio-surface-card/40 py-3">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-mono">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="flex items-center gap-1.5 text-kurio-text-secondary hover:text-kurio-primary transition-colors focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Catálogo</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-kurio-text-secondary/80">
            <Link to="/" className="hover:text-kurio-primary transition-colors">
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-kurio-text-secondary truncate max-w-[150px]">
              {nft.collection.name}
            </span>
            <span>/</span>
            <span className="text-kurio-foreground font-semibold truncate max-w-[150px]">
              {nft.title}
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Detalhe */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Coluna Esquerda: Artwork e Identificação */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-kurio-border bg-kurio-surface-card shadow-2xl shadow-kurio-primary/5 group">
              <img
                src={nft.mediaUrl}
                alt={nft.title}
                width={600}
                height={600}
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />

              {/* Badges Superiores */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider bg-kurio-ink/85 backdrop-blur-md text-kurio-foreground border border-kurio-border">
                  {nft.blockchainNetwork}
                </span>
                <span className="px-2.5 py-1 rounded text-[11px] font-mono text-kurio-accent bg-kurio-ink/85 backdrop-blur-md border border-kurio-border">
                  Token #{nft.tokenId}
                </span>
              </div>

              {/* Botão de Favoritar */}
              <button
                type="button"
                onClick={handleFavoriteClick}
                disabled={toggleFavoriteMutation.isPending}
                className={`absolute top-4 right-4 p-2.5 rounded-full backdrop-blur-md border transition-all ${
                  isFavorited
                    ? 'bg-rose-950/90 text-rose-400 border-rose-800 scale-105'
                    : 'bg-kurio-ink/85 text-kurio-text-secondary border-kurio-border hover:text-rose-400'
                }`}
                aria-label={isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                title="Favoritar NFT"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Metadados On-Chain Simulados */}
            <div className="p-4 rounded-xl border border-kurio-border/80 bg-kurio-surface-card/60 flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-kurio-text-secondary">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-kurio-accent" />
                  <span>Contrato Inteligente</span>
                </span>
                <span className="text-kurio-foreground font-mono">
                  {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-kurio-text-secondary pt-2 border-t border-kurio-border/40">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-kurio-primary" />
                  <span>Padrão do Token</span>
                </span>
                <span className="text-kurio-foreground">ERC-1155 (Semi-fungível)</span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Informações Comerciais e Compra */}
          <div className="flex flex-col gap-6">
            {/* Header da Coleção */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-kurio-primary font-bold">
                {nft.collection.name}
              </span>
              {nft.collection.verified && (
                <CheckCircle2
                  className="w-4 h-4 text-kurio-accent shrink-0"
                  aria-label="Coleção autenticada"
                />
              )}
            </div>

            {/* Título Principal */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono text-kurio-foreground tracking-tight">
              {nft.title}
            </h1>

            {/* Criador & Dono */}
            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-lg border border-kurio-border bg-kurio-surface-card text-xs font-mono">
              <div>
                <span className="text-kurio-text-secondary block text-[11px] mb-0.5">Criador</span>
                <span className="font-semibold text-kurio-foreground truncate block">
                  {nft.creator.name}
                </span>
              </div>
              <div>
                <span className="text-kurio-text-secondary block text-[11px] mb-0.5">Proprietário</span>
                <span className="font-semibold text-kurio-foreground truncate block">
                  {nft.owner.name}
                </span>
              </div>
            </div>

            {/* Descrição */}
            {nft.description && (
              <div className="space-y-1.5">
                <h2 className="text-xs font-mono uppercase tracking-wider text-kurio-text-secondary">
                  Descrição da Obra
                </h2>
                <p className="text-sm text-kurio-foreground/90 leading-relaxed font-sans">
                  {nft.description}
                </p>
              </div>
            )}

            {/* Caixa de Compra / Preço em ETH */}
            <div className="p-6 rounded-xl border border-kurio-border bg-kurio-surface-card space-y-5">
              <div className="flex items-end justify-between pb-4 border-b border-kurio-border/60">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary block mb-1">
                    Preço da Edição
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold font-mono text-kurio-primary">
                      {nft.priceEth}
                    </span>
                    <span className="text-sm font-mono text-kurio-foreground font-semibold">
                      ETH
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-kurio-text-secondary block mb-1">
                    Disponibilidade
                  </span>
                  {isSoldOut ? (
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-red-950/80 text-red-300 border border-red-800">
                      Esgotado
                    </span>
                  ) : (
                    <span className="text-sm font-mono font-bold text-kurio-foreground">
                      {nft.editions.availableCount}{' '}
                      <span className="text-xs font-normal text-kurio-text-secondary">
                        / {nft.editions.totalCount} edições
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso de Edições */}
              {!isSoldOut && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-kurio-text-secondary">
                    <span>{soldCount} edições vendidas</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-kurio-ink overflow-hidden border border-kurio-border/60">
                    <div
                      className="h-full bg-gradient-to-r from-kurio-primary to-kurio-accent rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Seletor de Quantidade (respeita maxPerOrder e availableCount) */}
              {!isSoldOut && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-mono text-kurio-text-secondary">
                    Quantidade desejada:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 rounded border border-kurio-border bg-kurio-ink text-kurio-foreground font-mono disabled:opacity-40 hover:border-kurio-primary transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-kurio-foreground">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) =>
                          Math.min(
                            Math.min(nft.editions.availableCount, nft.editions.maxPerOrder),
                            q + 1,
                          ),
                        )
                      }
                      disabled={
                        quantity >=
                        Math.min(nft.editions.availableCount, nft.editions.maxPerOrder)
                      }
                      className="w-8 h-8 rounded border border-kurio-border bg-kurio-ink text-kurio-foreground font-mono disabled:opacity-40 hover:border-kurio-primary transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback de Ação */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded border text-xs font-mono flex items-center justify-between gap-2 animate-fadeIn ${
                    isSuccessAction
                      ? 'bg-kurio-ink border-kurio-accent/60 text-kurio-accent'
                      : 'bg-red-950/40 border-red-800 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{actionFeedback}</span>
                  </div>
                  {isSuccessAction && (
                    <Link
                      to="/cart"
                      className="px-2.5 py-1 rounded bg-kurio-surface border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors text-[11px] font-bold uppercase shrink-0"
                    >
                      Ver Carrinho
                    </Link>
                  )}
                </div>
              )}

              {/* Botão de Compra / Adicionar ao Carrinho */}
              <button
                type="button"
                onClick={handleAddToCartClick}
                disabled={isSoldOut || addToCartMutation.isPending}
                className="w-full py-3.5 px-6 rounded-lg font-mono text-sm font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-kurio-primary/10 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {isSoldOut
                    ? 'Edição Esgotada'
                    : addToCartMutation.isPending
                      ? 'Adicionando...'
                      : 'Adicionar ao Carrinho'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
