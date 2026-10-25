import React, { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { nftsService, collectionsService } from '@/services'
import type { NftAvailabilityFilter, NftSortOption } from '@/contracts'
import { NftCard } from '@/components/catalog/NftCard'
import { NftCardSkeleton } from '@/components/catalog/NftCardSkeleton'
import { FilterSidebar, type FilterState } from '@/components/catalog/FilterSidebar'
import { MobileFilterDrawer } from '@/components/catalog/MobileFilterDrawer'
import { SortSelect } from '@/components/catalog/SortSelect'
import { Pagination } from '@/components/catalog/Pagination'
import { CatalogEmpty } from '@/components/catalog/CatalogEmpty'
import { CatalogError } from '@/components/catalog/CatalogError'
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react'

const CatalogSearchSchema = z.object({
  search: z.string().optional(),
  collectionId: z.string().optional(),
  minPriceEth: z.string().optional(),
  maxPriceEth: z.string().optional(),
  network: z.string().optional(),
  availability: z.enum(['all', 'available', 'sold_out']).optional(),
  sort: z.enum(['recently_listed', 'price_asc', 'price_desc', 'popular']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
})

export type CatalogSearchParams = z.infer<typeof CatalogSearchSchema>

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogSearchParams => {
    return {
      search: typeof search.search === 'string' && search.search ? search.search : undefined,
      collectionId:
        typeof search.collectionId === 'string' && search.collectionId
          ? search.collectionId
          : undefined,
      minPriceEth:
        typeof search.minPriceEth === 'string' && search.minPriceEth
          ? search.minPriceEth
          : undefined,
      maxPriceEth:
        typeof search.maxPriceEth === 'string' && search.maxPriceEth
          ? search.maxPriceEth
          : undefined,
      network: typeof search.network === 'string' && search.network ? search.network : undefined,
      availability:
        search.availability === 'available' || search.availability === 'sold_out'
          ? search.availability
          : undefined,
      sort:
        search.sort === 'price_asc' ||
        search.sort === 'price_desc' ||
        search.sort === 'popular'
          ? search.sort
          : undefined,
      page: Number(search.page) > 0 ? Math.floor(Number(search.page)) : undefined,
      limit: Number(search.limit) > 0 ? Math.floor(Number(search.limit)) : undefined,
    }
  },
  component: CatalogPage,
})

function CatalogPage() {
  const searchParams = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const [searchInput, setSearchInput] = useState(searchParams.search || '')
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const effectivePage = searchParams.page ?? 1
  const effectiveLimit = searchParams.limit ?? 8
  const effectiveSort: NftSortOption = searchParams.sort ?? 'recently_listed'
  const effectiveAvailability: NftAvailabilityFilter = searchParams.availability ?? 'all'

  // Sincroniza o input local quando a URL mudar externamente (ex: botão voltar do navegador)
  useEffect(() => {
    setSearchInput(searchParams.search || '')
  }, [searchParams.search])

  // 1. Consulta de NFTs via TanStack Query
  const {
    data: nftData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['nfts', searchParams],
    queryFn: () =>
      nftsService.listNfts({
        search: searchParams.search,
        collectionId: searchParams.collectionId,
        minPriceEth: searchParams.minPriceEth,
        maxPriceEth: searchParams.maxPriceEth,
        network: searchParams.network,
        availability: effectiveAvailability,
        sort: effectiveSort,
        page: effectivePage,
        limit: effectiveLimit,
      }),
  })

  // 2. Consulta de Coleções para os filtros
  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: () => collectionsService.listCollections(),
    staleTime: 1000 * 60 * 10,
  })

  // Ações de alteração de estado com atualização de URL e reset para página 1
  const updateFilters = (newFilters: Partial<CatalogSearchParams>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...newFilters,
        page: 1, // Reinicia a página para 1 sempre que um filtro é alterado
      }),
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchInput.trim() || undefined })
  }

  const handleSortChange = (newSort: NftSortOption) => {
    updateFilters({ sort: newSort })
  }

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: newPage,
      }),
    })
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  const handleResetFilters = () => {
    setSearchInput('')
    navigate({
      search: {
        page: 1,
        limit: 8,
        sort: 'recently_listed',
        availability: 'all',
      },
    })
  }

  const filterState: FilterState = {
    collectionId: searchParams.collectionId,
    network: searchParams.network,
    availability: searchParams.availability,
    minPriceEth: searchParams.minPriceEth,
    maxPriceEth: searchParams.maxPriceEth,
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section Destaque KURIO */}
      <section className="relative overflow-hidden border-b border-kurio-border bg-gradient-to-b from-kurio-surface-dark/40 to-kurio-ink py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-start gap-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono uppercase tracking-widest text-kurio-accent border border-kurio-border bg-kurio-surface-card">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Edições Raras &amp; Arte Cibernética</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-kurio-foreground leading-tight">
                Colecione o futuro da arte digital com <span className="text-kurio-primary">precisão</span>.
              </h1>

              <p className="text-sm sm:text-base text-kurio-text-secondary max-w-lg">
                Explore criações exclusivas, autenticadas em blockchain e precificadas com cálculo financeiro exato em ETH.
              </p>
            </div>

            <div className="relative flex justify-center md:justify-end">
              <div className="relative w-full max-w-xs sm:max-w-sm aspect-square rounded-2xl overflow-hidden border border-kurio-border/80 shadow-2xl shadow-kurio-primary/10 bg-kurio-surface-card/60 p-2">
                <picture>
                  <source srcSet="/assets/hero/hero-sculpture.avif" type="image/avif" />
                  <source srcSet="/assets/hero/hero-sculpture.webp" type="image/webp" />
                  <img
                    src="/assets/hero/hero-sculpture.png"
                    alt="Escultura Hero KURIO"
                    width={384}
                    height={384}
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Barra de Controle do Catálogo (Busca, Ordenação e Contagem) */}
      <section className="sticky top-16 z-30 border-b border-kurio-border bg-kurio-ink/95 backdrop-blur-md py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Busca textual */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:w-80 md:w-96 flex items-center"
          >
            <Search className="absolute left-3 w-4 h-4 text-kurio-text-secondary pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por título ou coleção..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-20 py-2 text-xs font-mono rounded bg-kurio-surface-card border border-kurio-border text-kurio-foreground placeholder:text-kurio-text-secondary/60 focus:border-kurio-primary focus:outline-none"
              aria-label="Campo de busca de NFTs"
            />
            {searchInput && (
              <button
                type="submit"
                className="absolute right-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-bold bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
              >
                Buscar
              </button>
            )}
          </form>

          {/* Ações e Ordenação */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            {/* Botão de Filtros no Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono border border-kurio-border bg-kurio-surface-card text-kurio-foreground hover:border-kurio-primary transition-colors"
              aria-label="Abrir painel de filtros"
            >
              <SlidersHorizontal className="w-4 h-4 text-kurio-primary" />
              <span>Filtros</span>
            </button>

            {/* Ordenação */}
            <SortSelect value={effectiveSort} onChange={handleSortChange} />
          </div>
        </div>
      </section>

      {/* 3. Área Principal: Sidebar de Filtros + Grid de NFTs */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Título semântico para leitores de tela e hierarquia H1 -> H2 -> H3 */}
        <h2 className="sr-only">Catálogo de Obras e NFTs</h2>

        {/* Contagem de itens */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-kurio-border/40 text-xs font-mono text-kurio-text-secondary">
          <span>
            {isLoading ? (
              'Carregando catálogo...'
            ) : isError ? (
              'Erro ao carregar'
            ) : (
              <>
                Exibindo <strong className="text-kurio-foreground">{nftData?.items.length ?? 0}</strong> de{' '}
                <strong className="text-kurio-foreground">{nftData?.total ?? 0}</strong> NFTs
                {isFetching && <span className="ml-2 text-kurio-accent animate-pulse">(atualizando...)</span>}
              </>
            )}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Desktop */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filterState}
              collections={collections}
              onFilterChange={(f) => updateFilters(f)}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Grid de Cards de NFTs */}
          <div className="flex-1 flex flex-col justify-between">
            {isLoading ? (
              <div
                data-testid="catalog-loading-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <NftCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <CatalogError
                message={
                  error instanceof Error
                    ? error.message
                    : 'Falha temporária ao consultar catálogo de NFTs.'
                }
                onRetry={() => refetch()}
              />
            ) : !nftData || nftData.items.length === 0 ? (
              <CatalogEmpty onClearFilters={handleResetFilters} />
            ) : (
              <>
                <div
                  data-testid="catalog-nft-grid"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {nftData.items.map((nft) => (
                    <NftCard key={nft.id} nft={nft} />
                  ))}
                </div>

                {/* Paginação */}
                <Pagination
                  page={nftData.page}
                  totalPages={nftData.totalPages}
                  hasMore={nftData.hasMore}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Drawer Móvel de Filtros */}
      <MobileFilterDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        filters={filterState}
        collections={collections}
        onFilterChange={(f) => updateFilters(f)}
        onResetFilters={handleResetFilters}
      />
    </div>
  )
}
