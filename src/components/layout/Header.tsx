import React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import kurioLogo from '@/assets/brand/kurio-logo.svg'
import { useSession } from '@/session'
import { cartService } from '@/services'
import { useRealtime } from '@/realtime'
import { ShoppingBag, User as UserIcon, Sparkles, Radio } from 'lucide-react'

export const Header: React.FC = () => {
  const { status, user } = useSession()
  const realtime = useRealtime()
  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
  })

  const cartCount = cart?.itemCount ?? 0
  const isRealtimeActive = realtime.status === 'connected'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-kurio-border bg-kurio-ink/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-kurio-primary">
            <img
              src={kurioLogo}
              alt="KURIO Logo"
              width={120}
              height={28}
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-wider font-mono">
            <Link
              to="/"
              className="text-kurio-foreground transition-colors hover:text-kurio-primary [&.active]:text-kurio-primary font-semibold"
            >
              Catálogo
            </Link>
            <Link
              to="/cart"
              className="text-kurio-text-secondary hover:text-kurio-primary transition-colors [&.active]:text-kurio-primary font-semibold"
            >
              Carrinho
            </Link>
            <Link
              to="/profile"
              className="text-kurio-text-secondary hover:text-kurio-primary transition-colors [&.active]:text-kurio-primary font-semibold"
            >
              Perfil
            </Link>
            <Link
              to="/spike"
              className="flex items-center gap-1.5 text-kurio-text-secondary hover:text-kurio-primary transition-colors text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-kurio-accent" />
              <span>Spike MSW</span>
            </Link>

            {/* Indicador de Tempo Real (Socket.IO) */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                isRealtimeActive
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  : 'border-kurio-border bg-kurio-surface text-kurio-text-secondary'
              }`}
              title={
                isRealtimeActive
                  ? 'Sincronização em Tempo Real Ativa via Socket.IO'
                  : `Status Realtime: ${realtime.status}`
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isRealtimeActive ? 'bg-emerald-400 animate-pulse' : 'bg-kurio-text-secondary'
                }`}
              />
              <Radio className="w-3 h-3" />
              <span>{isRealtimeActive ? 'Live' : realtime.status}</span>
            </div>
          </nav>
        </div>

        {/* User & Actions */}
        <div className="flex items-center gap-3">
          {/* Status de Sessão / Link para Perfil */}
          <Link
            to="/profile"
            className="focus:outline-none"
            aria-label={status === 'authenticated' && user ? user.name : 'Perfil do Colecionador'}
          >
            {status === 'authenticated' && user ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-kurio-surface-card border border-kurio-border text-xs text-kurio-foreground hover:border-kurio-primary transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline font-mono">{user.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-kurio-surface-card/60 border border-kurio-border/80 text-xs font-mono text-kurio-text-secondary hover:border-kurio-primary hover:text-kurio-foreground transition-colors">
                <UserIcon className="w-3.5 h-3.5 text-kurio-text-secondary" />
                <span className="hidden sm:inline">Perfil</span>
              </div>
            )}
          </Link>

          {/* Carrinho Indicador */}
          <Link
            to="/cart"
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-kurio-border bg-kurio-surface-card text-xs text-kurio-foreground hover:border-kurio-primary transition-colors focus:outline-none"
            title="Carrinho de Compras"
            id="header-cart-button"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-kurio-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-kurio-primary text-kurio-ink text-[10px] font-bold font-mono flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-mono">Carrinho</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
