import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService, walletsService, favoritesService } from '@/services'
import { useSession } from '@/session'
import {
  User as UserIcon,
  Wallet,
  Heart,
  ShieldCheck,
  LogOut,
  LogIn,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Edit3,
  Calendar,
  Sparkles,
} from 'lucide-react'

/**
 * Extrai iniciais elegantes para o fallback do avatar (ex: "Guilherme Colecionador" -> "GC")
 */
function getInitials(name?: string): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return 'U'
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1]
  const firstChar = first.charAt(0)
  const lastChar = last ? last.charAt(0) : ''
  return (firstChar + lastChar).toUpperCase() || 'U'
}

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { status: authStatus, login, logout } = useSession()
  const queryClient = useQueryClient()

  // Estado para fallback de imagem quebrada do avatar
  const [avatarImgError, setAvatarImgError] = useState(false)

  // Estados de formulário de login de demonstração (para visitante)
  const [loginEmail, setLoginEmail] = useState('colecionador@kurio.test')
  const [loginPassword, setLoginPassword] = useState('senha123')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Estados para edição rápida de perfil
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null)

  // 1. Consulta de Perfil do Colecionador
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.getProfile(),
    enabled: authStatus === 'authenticated',
  })

  // 2. Consulta de Carteiras Vinculadas
  const {
    data: walletsData,
    isLoading: isLoadingWallets,
    isError: isWalletsError,
    refetch: refetchWallets,
  } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => walletsService.listWallets(),
    enabled: authStatus === 'authenticated',
  })

  // 3. Consulta de Favoritos
  const {
    data: favoritesData,
    isLoading: isLoadingFavorites,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesService.listFavorites(),
    enabled: authStatus === 'authenticated',
  })

  // Mutação para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name: string; bio?: string }) => profileService.updateProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditing(false)
      setUpdateFeedback('Perfil atualizado com sucesso!')
      setTimeout(() => setUpdateFeedback(null), 3000)
    },
    onError: () => {
      setUpdateFeedback('Erro ao atualizar perfil. Verifique os dados.')
      setTimeout(() => setUpdateFeedback(null), 3500)
    },
  })

  const handleStartEdit = () => {
    if (profile) {
      setEditName(profile.name)
      setEditBio(profile.bio || '')
      setIsEditing(true)
    }
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    updateProfileMutation.mutate({ name: editName.trim(), bio: editBio.trim() })
  }

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError(null)
    try {
      await login({ email: loginEmail, password: loginPassword })
    } catch (err: unknown) {
      setLoginError((err as Error)?.message || 'Falha ao autenticar. Verifique e-mail e senha.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  // --- Caso 1: Usuário Visitante (Não Autenticado) ---
  if (authStatus === 'unauthenticated') {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="p-8 rounded-2xl border border-kurio-border bg-kurio-surface-card shadow-2xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-kurio-surface border border-kurio-border flex items-center justify-center text-kurio-primary">
            <UserIcon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-kurio-foreground">
              Acesso ao Perfil
            </h1>
            <p className="text-xs sm:text-sm text-kurio-text-secondary leading-relaxed font-sans">
              Você está navegando como visitante. Para visualizar sua coleção, carteiras conectadas e
              favoritos, faça login na sua conta KURIO.
            </p>
          </div>

          <form onSubmit={handleDemoLogin} className="space-y-4 text-left">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-mono uppercase tracking-wider text-kurio-text-secondary mb-1"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-sm font-mono text-kurio-foreground focus:border-kurio-primary focus:outline-none transition-colors"
                placeholder="seu.email@exemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-mono uppercase tracking-wider text-kurio-text-secondary mb-1"
              >
                Senha
              </label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded bg-kurio-ink border border-kurio-border text-sm font-mono text-kurio-foreground focus:border-kurio-primary focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded bg-red-950/40 border border-red-800 text-xs font-mono text-red-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded font-mono text-xs font-bold uppercase tracking-wider bg-kurio-primary text-kurio-ink hover:bg-kurio-accent disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoggingIn ? 'Conectando...' : 'Entrar com Conta de Teste'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-kurio-border/60 text-xs font-mono text-kurio-text-secondary text-center">
            Dica: Conta de demonstração com credenciais simuladas pré-carregadas.
          </div>
        </div>
      </main>
    )
  }

  // --- Caso 2: Carregamento do Perfil ---
  if (isLoadingProfile || authStatus === 'loading') {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-10">
        <div className="flex items-center gap-6 p-6 rounded-2xl bg-kurio-surface-card border border-kurio-border">
          <div className="w-20 h-20 rounded-full bg-kurio-muted" />
          <div className="space-y-3 flex-1">
            <div className="h-6 w-48 bg-kurio-muted rounded" />
            <div className="h-4 w-72 bg-kurio-muted rounded" />
            <div className="h-4 w-96 bg-kurio-muted rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-xl bg-kurio-surface-card border border-kurio-border" />
          <div className="lg:col-span-2 h-64 rounded-xl bg-kurio-surface-card border border-kurio-border" />
        </div>
      </main>
    )
  }

  // --- Caso 3: Erro no Perfil ---
  if (isProfileError || !profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-950/40 border border-red-800 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold font-mono text-kurio-foreground">
          Erro ao Carregar Perfil
        </h1>
        <p className="text-xs sm:text-sm text-kurio-text-secondary">
          Não foi possível sincronizar suas informações cadastrais com o servidor simulado.
        </p>
        <button
          type="button"
          onClick={() => refetchProfile()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tentar Novamente</span>
        </button>
      </main>
    )
  }

  // Formatação da data de adesão
  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : '2026'

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* 1. Header do Perfil do Colecionador */}
      <section className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-kurio-border bg-kurio-surface-card shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar com Fallback Elegante de Iniciais KURIO */}
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-kurio-primary bg-gradient-to-br from-kurio-surface to-kurio-surface-card shrink-0 flex items-center justify-center shadow-lg select-none"
              aria-label={`Avatar de ${profile.name}`}
            >
              {profile.avatarUrl && !avatarImgError ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  onError={() => setAvatarImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  data-testid="profile-avatar-fallback"
                  className="font-mono font-bold text-xl sm:text-2xl text-kurio-primary tracking-wider"
                >
                  {getInitials(profile.name)}
                </span>
              )}
            </div>

            {/* Informações Cadastrais */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-mono text-kurio-foreground">
                  {profile.name}
                </h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verificado</span>
                </span>
              </div>
              <p className="text-xs font-mono text-kurio-text-secondary">{profile.email}</p>
              <div className="flex items-center gap-1.5 text-xs text-kurio-text-secondary/80 font-mono pt-1">
                <Calendar className="w-3.5 h-3.5 text-kurio-accent" />
                <span>Membro desde {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Ações do Perfil: Editar e Logout */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-semibold uppercase bg-kurio-surface border border-kurio-border text-kurio-foreground hover:border-kurio-primary transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-semibold uppercase bg-red-950/40 border border-red-900 text-red-300 hover:bg-red-900/60 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Bio do Colecionador ou Formulário de Edição */}
        <div className="mt-6 pt-6 border-t border-kurio-border/60">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-kurio-text-secondary mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-kurio-ink border border-kurio-border text-xs font-mono text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-kurio-text-secondary mb-1">
                  Biografia
                </label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded bg-kurio-ink border border-kurio-border text-xs font-mono text-kurio-foreground focus:border-kurio-primary focus:outline-none"
                  placeholder="Escreva algo sobre sua trajetória como colecionador..."
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-primary text-kurio-ink hover:bg-kurio-accent transition-colors disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded text-xs font-mono font-semibold uppercase bg-kurio-surface border border-kurio-border text-kurio-text-secondary hover:text-kurio-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-kurio-text-secondary block mb-1">
                Biografia
              </span>
              <p className="text-xs sm:text-sm text-kurio-foreground font-sans leading-relaxed">
                {profile.bio || 'Nenhuma biografia informada.'}
              </p>
            </div>
          )}

          {updateFeedback && (
            <div className="mt-3 p-2.5 rounded bg-kurio-ink border border-kurio-accent/60 text-xs font-mono text-kurio-accent flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{updateFeedback}</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Grid de Conteúdo: Carteiras Conectadas & Favoritos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Coluna Esquerda: Carteiras do Colecionador */}
        <section className="p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-kurio-border/60">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-kurio-primary shrink-0" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-kurio-foreground">
                Carteiras Conectadas
              </h2>
            </div>
            {walletsData && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-kurio-surface border border-kurio-border/80">
                <span className="font-bold text-kurio-primary">
                  {walletsData.wallets.length}
                </span>
                <span className="text-kurio-text-secondary">
                  ativas
                </span>
              </div>
            )}
          </div>

          {isLoadingWallets ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 rounded bg-kurio-muted" />
              <div className="h-16 rounded bg-kurio-muted" />
            </div>
          ) : isWalletsError ? (
            <div className="p-4 rounded bg-red-950/30 border border-red-900 text-xs font-mono text-red-300 flex items-center justify-between">
              <span>Erro ao listar carteiras.</span>
              <button
                type="button"
                onClick={() => refetchWallets()}
                className="text-kurio-primary underline"
              >
                Tentar
              </button>
            </div>
          ) : walletsData?.wallets && walletsData.wallets.length > 0 ? (
            <div className="space-y-3">
              {walletsData.wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="p-3.5 rounded-xl border border-kurio-border/80 bg-kurio-ink/60 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-kurio-foreground">{wallet.label}</span>
                    {wallet.isDefault && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-kurio-primary/20 text-kurio-primary border border-kurio-primary/40">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-kurio-text-secondary">
                    <span className="text-[11px]">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-kurio-surface border border-kurio-border">
                      {wallet.network}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-kurio-border/40 flex items-center justify-between">
                    <span className="text-[11px] text-kurio-text-secondary">Saldo:</span>
                    <span className="font-bold text-kurio-primary">
                      {wallet.balanceEth} <span className="text-[10px] text-kurio-foreground">ETH</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-mono text-kurio-text-secondary py-4 text-center">
              Nenhuma carteira vinculada no momento.
            </p>
          )}
        </section>

        {/* Coluna Direita: NFTs Favoritos */}
        <section className="lg:col-span-2 p-6 rounded-2xl border border-kurio-border bg-kurio-surface-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-kurio-border/60">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-current" />
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-kurio-foreground">
                NFTs Favoritados
              </h2>
            </div>
            {favoritesData && (
              <span className="text-xs font-mono text-kurio-text-secondary">
                {favoritesData.total} {favoritesData.total === 1 ? 'item' : 'itens'}
              </span>
            )}
          </div>

          {isLoadingFavorites ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              <div className="h-44 rounded-xl bg-kurio-muted" />
              <div className="h-44 rounded-xl bg-kurio-muted" />
            </div>
          ) : favoritesData?.items && favoritesData.items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favoritesData.items.map((nft) => (
                <Link
                  key={nft.id}
                  to="/nfts/$nftId"
                  params={{ nftId: nft.id }}
                  className="group flex gap-3 p-3 rounded-xl border border-kurio-border bg-kurio-ink/60 hover:border-kurio-primary transition-all duration-300"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-kurio-surface shrink-0 aspect-square">
                    <img
                      src={nft.mediaUrl}
                      alt={nft.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <span className="text-[10px] font-mono text-kurio-text-secondary truncate block">
                        {nft.collection.name}
                      </span>
                      <h3 className="font-semibold text-xs sm:text-sm text-kurio-foreground truncate group-hover:text-kurio-primary transition-colors">
                        {nft.title}
                      </h3>
                    </div>
                    <div className="flex items-baseline justify-between pt-1 border-t border-kurio-border/40">
                      <span className="text-[10px] font-mono text-kurio-text-secondary">Preço</span>
                      <span className="text-xs font-bold font-mono text-kurio-primary">
                        {nft.priceEth} ETH
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-kurio-surface border border-kurio-border flex items-center justify-center text-kurio-text-secondary">
                <Heart className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono text-kurio-text-secondary">
                Você ainda não favoritou nenhum NFT.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-xs font-mono font-bold uppercase bg-kurio-surface border border-kurio-border text-kurio-primary hover:border-kurio-primary transition-colors"
              >
                <span>Explorar Catálogo</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
