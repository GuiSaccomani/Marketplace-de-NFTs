import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { NftCard } from '../NftCard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    let href = to
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        href = href.replace(`$${k}`, String(v))
      })
    }
    return <a href={href} {...props}>{children}</a>
  },
}))
import { NftCardSkeleton } from '../NftCardSkeleton'
import { Pagination } from '../Pagination'
import { CatalogEmpty } from '../CatalogEmpty'
import { CatalogError } from '../CatalogError'
import { SortSelect } from '../SortSelect'
import { FilterSidebar } from '../FilterSidebar'
import type { Nft, CollectionDetail } from '@/contracts'

const mockNft: Nft = {
  id: 'nft-03',
  tokenId: '1003',
  title: 'Cyber Ronin #03',
  description: 'Ronin renegado equipado com katana plasmática.',
  mediaUrl: '/assets/nfts/nft-artwork-03.png',
  thumbnailUrl: '/assets/nfts/nft-artwork-03.png',
  priceEth: '0.45',
  collection: {
    id: 'col-01',
    name: 'Cyber Samurais',
    slug: 'cyber-samurais',
    verified: true,
    avatarUrl: '/assets/collections/collection-01.png',
  },
  creator: {
    id: 'user-02',
    name: 'Akiro Artista',
    address: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
  },
  owner: {
    id: 'user-02',
    name: 'Akiro Artista',
    address: '0x71C84167B3a27501a038c119e6C7b2D6Fe041071',
  },
  editions: {
    availableCount: 4,
    totalCount: 10,
    maxPerOrder: 3,
  },
  contractAddress: '0x1A2B3C4D5E6F708192A3B4C5D6E7F8091A2B3C4D',
  blockchainNetwork: 'Ethereum Mainnet',
  featured: true,
  isFavorite: false,
  createdAt: '2026-03-01T10:00:00.000Z',
  version: 1,
}

const mockCollections: CollectionDetail[] = [
  {
    id: 'col-01',
    name: 'Cyber Samurais',
    slug: 'cyber-samurais',
    verified: true,
    avatarUrl: '/assets/collections/collection-01.png',
    description: 'Guerreiros cibernéticos lendários.',
    itemCount: 4,
    floorPriceEth: '0.45',
    totalVolumeEth: '12.5',
    ownerCount: 8,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
]

describe('Componentes Visuais do Catálogo (Etapa 07)', () => {
  describe('NftCard', () => {
    it('deve renderizar título, coleção, preço em ETH e disponibilidade', () => {
      const html = renderToString(<NftCard nft={mockNft} />)

      expect(html).toContain('Cyber Ronin #03')
      expect(html).toContain('Cyber Samurais')
      expect(html).toContain('0.45')
      expect(html).toContain('ETH')
      expect(html).toContain('4/10 disp.')
      expect(html).toContain('Ethereum Mainnet')
      expect(html).toContain('nft-card-nft-03')
    })

    it('deve exibir badge de Esgotado quando availableCount for zero', () => {
      const soldOutNft: Nft = {
        ...mockNft,
        editions: {
          ...mockNft.editions,
          availableCount: 0,
        },
      }

      const html = renderToString(<NftCard nft={soldOutNft} />)
      expect(html).toContain('Esgotado')
    })
  })

  describe('NftCardSkeleton', () => {
    it('deve renderizar skeleton shimmer com testid', () => {
      const html = renderToString(<NftCardSkeleton />)
      expect(html).toContain('data-testid="nft-card-skeleton"')
      expect(html).toContain('animate-pulse')
    })
  })

  describe('Pagination', () => {
    it('deve renderizar controles de paginação e desabilitar botão anterior na primeira página', () => {
      const html = renderToString(
        <Pagination
          page={1}
          totalPages={3}
          hasMore={true}
          onPageChange={() => {}}
        />,
      )

      expect(html).toContain('data-testid="catalog-pagination"')
      expect(html).toContain('Anterior')
      expect(html).toContain('Próxima')
      expect(html).toContain('disabled=""') // botão anterior desabilitado
    })

    it('não deve renderizar paginação se houver apenas 1 página', () => {
      const html = renderToString(
        <Pagination
          page={1}
          totalPages={1}
          hasMore={false}
          onPageChange={() => {}}
        />,
      )
      expect(html).toBe('')
    })
  })

  describe('CatalogEmpty', () => {
    it('deve renderizar mensagem de estado vazio e botão de limpar filtros', () => {
      const html = renderToString(<CatalogEmpty onClearFilters={() => {}} />)
      expect(html).toContain('data-testid="catalog-empty-state"')
      expect(html).toContain('Nenhum NFT Encontrado')
      expect(html).toContain('Limpar Filtros')
    })
  })

  describe('CatalogError', () => {
    it('deve renderizar estado de erro com mensagem e botão de retry', () => {
      const html = renderToString(
        <CatalogError
          message="Falha de conexão com a API simulada."
          onRetry={() => {}}
        />,
      )
      expect(html).toContain('data-testid="catalog-error-state"')
      expect(html).toContain('Falha na Conexão')
      expect(html).toContain('Falha de conexão com a API simulada.')
      expect(html).toContain('Tentar Novamente')
    })
  })

  describe('SortSelect', () => {
    it('deve renderizar opções de ordenação com o valor selecionado', () => {
      const html = renderToString(
        <SortSelect value="price_desc" onChange={() => {}} />,
      )
      expect(html).toContain('data-testid="sort-select"')
      expect(html).toContain('value="price_desc"')
      expect(html).toContain('Maior Preço (ETH)')
    })
  })

  describe('FilterSidebar', () => {
    it('deve renderizar inputs de preço, opções de coleção e rede', () => {
      const html = renderToString(
        <FilterSidebar
          filters={{
            collectionId: 'col-01',
            network: 'Ethereum Mainnet',
            availability: 'available',
            minPriceEth: '0.1',
            maxPriceEth: '1.5',
          }}
          collections={mockCollections}
          onFilterChange={() => {}}
          onResetFilters={() => {}}
        />,
      )

      expect(html).toContain('Preço (ETH)')
      expect(html).toContain('value="0.1"')
      expect(html).toContain('value="1.5"')
      expect(html).toContain('Cyber Samurais')
      expect(html).toContain('Ethereum')
      expect(html).toContain('Apenas Disponíveis')
      expect(html).toContain('Limpar')
    })
  })
})
