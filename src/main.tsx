import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './app/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function enableMocking() {
  // Ativa mocks da API via MSW por padrão em desenvolvimento e na demonstração da Vercel
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

import { SessionProvider, sessionManager } from './session'
import { RealtimeProvider, realtimeClient } from './realtime'

// Configura purga do cache TanStack Query e reset de tempo real ao fazer logout ou expirar sessão
sessionManager.registerCacheClearCallback(() => {
  queryClient.clear()
  realtimeClient.resetSession()
})

const rootElement = document.getElementById('root')
if (rootElement && !(rootElement as any)._reactRoot) {
  ;(rootElement as any)._reactRoot = true
  void enableMocking().then(() => {
    void sessionManager.initSession()

    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <RealtimeProvider>
              <RouterProvider router={router} />
            </RealtimeProvider>
          </SessionProvider>
        </QueryClientProvider>
      </React.StrictMode>
    )

    // Conecta o socket de forma não-bloqueante após o carregamento completo da página
    if (typeof window !== 'undefined') {
      const scheduleConnect = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(
            () => {
              void realtimeClient.connect(queryClient)
            },
            { timeout: 3000 },
          )
        } else {
          setTimeout(() => {
            void realtimeClient.connect(queryClient)
          }, 1000)
        }
      }

      if (document.readyState === 'complete') {
        scheduleConnect()
      } else {
        window.addEventListener('load', scheduleConnect, { once: true })
      }
    }
  })
}
