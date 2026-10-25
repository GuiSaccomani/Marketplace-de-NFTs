import React from 'react'
import { Link } from '@tanstack/react-router'
import type { Nft } from '@/contracts'
import { CheckCircle2 } from 'lucide-react'

interface NftCardProps {
  nft: Nft
}

export const NftCard: React.FC<NftCardProps> = ({ nft }) => {
  const isSoldOut = nft.editions.availableCount === 0

  return (
    <article
      id={`nft-card-${nft.id}`}
      data-testid="nft-card"
      className="group relative flex flex-col overflow-hidden rounded border border-kurio-border bg-kurio-surface-card transition-all duration-300 hover:border-kurio-primary/60 hover:shadow-lg hover:shadow-kurio-primary/5"
    >
      {/* Imagem do NFT com Aspect Ratio 1:1 e Link de Navegação */}
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="relative aspect-square w-full overflow-hidden bg-kurio-ink focus:outline-none"
      >
        <img
          src={nft.mediaUrl}
          alt={nft.title}
          width={300}
          height={300}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge de Rede Blockchain */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-kurio-ink/80 backdrop-blur-md text-kurio-text-secondary border border-kurio-border">
          {nft.blockchainNetwork}
        </div>

        {/* Badge de Esgotado / Disponibilidade */}
        {isSoldOut ? (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-red-950/90 text-red-300 border border-red-800">
            Esgotado
          </div>
        ) : (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono text-kurio-foreground bg-kurio-ink/80 backdrop-blur-md border border-kurio-border">
            {`${nft.editions.availableCount}/${nft.editions.totalCount} disp.`}
          </div>
        )}
      </Link>

      {/* Conteúdo do Card */}
      <div className="flex flex-1 flex-col p-4 justify-between gap-3">
        {/* Coleção */}
        <div className="flex items-center gap-1.5 text-xs text-kurio-text-secondary">
          <span className="truncate max-w-[180px] font-mono">{nft.collection.name}</span>
          {nft.collection.verified && (
            <CheckCircle2 className="w-3.5 h-3.5 text-kurio-accent shrink-0" aria-label="Coleção verificada" />
          )}
        </div>

        {/* Título do NFT com Link */}
        <h3 className="font-semibold text-sm sm:text-base text-kurio-foreground truncate group-hover:text-kurio-primary transition-colors">
          <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="focus:outline-none hover:underline">
            {nft.title}
          </Link>
        </h3>

        {/* Preço em ETH */}
        <div className="pt-2 border-t border-kurio-border/60 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-kurio-text-secondary font-mono">
            Preço
          </span>
          <span className="text-sm font-bold font-mono text-kurio-primary">
            {nft.priceEth} <span className="text-xs text-kurio-foreground font-normal">ETH</span>
          </span>
        </div>
      </div>
    </article>
  )
}
