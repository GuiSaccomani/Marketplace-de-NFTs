import React from 'react'

export const NftCardSkeleton: React.FC = () => {
  return (
    <div
      data-testid="nft-card-skeleton"
      className="flex flex-col overflow-hidden rounded border border-kurio-border bg-kurio-surface-card animate-pulse"
    >
      {/* Imagem Shimmer */}
      <div className="aspect-square w-full bg-kurio-muted" />

      {/* Detalhes Shimmer */}
      <div className="flex flex-1 flex-col p-4 justify-between gap-3">
        <div className="h-3 w-1/2 rounded bg-kurio-muted" />
        <div className="h-4 w-3/4 rounded bg-kurio-muted" />
        <div className="pt-2 border-t border-kurio-border/40 flex items-center justify-between">
          <div className="h-3 w-10 rounded bg-kurio-muted" />
          <div className="h-4 w-16 rounded bg-kurio-muted" />
        </div>
      </div>
    </div>
  )
}
