import React, { useEffect } from 'react'
import { FilterSidebar, type FilterState } from './FilterSidebar'
import type { CollectionDetail } from '@/contracts'

interface MobileFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  collections: CollectionDetail[]
  onFilterChange: (newFilters: Partial<FilterState>) => void
  onResetFilters: () => void
}

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  collections,
  onFilterChange,
  onResetFilters,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      data-testid="mobile-filter-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-xs h-full bg-kurio-surface-card border-l border-kurio-border overflow-y-auto">
        <FilterSidebar
          filters={filters}
          collections={collections}
          onFilterChange={(f) => {
            onFilterChange(f)
          }}
          onResetFilters={onResetFilters}
          isMobileModal={true}
          onCloseMobileModal={onClose}
        />
        <div className="p-4 border-t border-kurio-border">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
          >
            Ver Resultados
          </button>
        </div>
      </div>
    </div>
  )
}
