import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-kurio-ink text-kurio-foreground flex flex-col font-mono selection:bg-kurio-primary selection:text-kurio-ink">
      <Header />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
