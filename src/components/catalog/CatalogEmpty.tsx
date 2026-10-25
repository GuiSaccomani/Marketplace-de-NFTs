import React from 'react'
import { SearchX } from 'lucide-react'

interface CatalogEmptyProps {
  onClearFilters: () => void
}

export const CatalogEmpty: React.FC<CatalogEmptyProps> = ({ onClearFilters }) => {
  return (
    <div
      data-testid="catalog-empty-state"
      className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-kurio-border rounded bg-kurio-surface-card/40 my-8"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-kurio-muted text-kurio-text-secondary mb-4">
        <SearchX className="w-7 h-7 text-kurio-accent" />
      </div>

      <h3 className="text-lg font-bold text-kurio-foreground mb-1 font-mono">
        Nenhum NFT Encontrado
      </h3>

      <p className="text-xs sm:text-sm text-kurio-text-secondary max-w-sm mb-6">
        Não encontramos nenhum item correspondente aos filtros e parâmetros aplicados. Tente ajustar os termos de busca ou limpar os filtros.
      </p>

      <button
        type="button"
        onClick={onClearFilters}
        className="px-4 py-2 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-kurio-ring"
      >
        Limpar Filtros
      </button>
    </div>
  )
}
