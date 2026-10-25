import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  hasMore: boolean
  onPageChange: (newPage: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  hasMore,
  onPageChange,
}) => {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav
      data-testid="catalog-pagination"
      aria-label="Paginação do Catálogo"
      className="flex items-center justify-center gap-1 sm:gap-2 my-8 font-mono text-xs"
    >
      {/* Botão Anterior */}
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded border border-kurio-border bg-kurio-surface-card text-kurio-foreground hover:border-kurio-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      {/* Páginas numéricas */}
      <div className="flex items-center gap-1">
        {pages.map((p) => {
          const isActive = p === page
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 px-2 rounded text-center transition-colors font-medium ${
                isActive
                  ? 'bg-kurio-primary text-kurio-ink font-bold shadow-sm'
                  : 'border border-kurio-border bg-kurio-surface-card text-kurio-foreground hover:border-kurio-primary'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </button>
          )
        })}
      </div>

      {/* Botão Próxima */}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!hasMore || page >= totalPages}
        className="flex items-center gap-1 px-3 py-1.5 rounded border border-kurio-border bg-kurio-surface-card text-kurio-foreground hover:border-kurio-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Próxima página"
      >
        <span className="hidden sm:inline">Próxima</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  )
}
