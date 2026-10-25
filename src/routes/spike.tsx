/**
 * SPIKE (Etapa 03) — página técnica isolada em /spike.
 * Exercita Axios -> MSW (REST) e socket.io-client -> MSW ws + binding (tempo real).
 */
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { SPIKE_SOCKET_URL } from '@/mocks/spike/handlers'

export const Route = createFileRoute('/spike')({
  component: SpikePage,
})

type LogEntry = { t: number; msg: string }

function SpikePage() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [rest, setRest] = useState<'pending' | 'ok' | 'fail'>('pending')
  const [socket, setSocket] = useState<'pending' | 'ok' | 'fail'>('pending')

  useEffect(() => {
    const start = performance.now()
    const add = (msg: string) => {
      const t = Math.round(performance.now() - start)
      console.info(`[spike +${t}ms] ${msg}`)
      setLog((l) => [...l, { t, msg }])
    }

    axios
      .get('/api/__spike/ping')
      .then((r) => {
        add(`REST ${r.status} ${JSON.stringify(r.data)}`)
        setRest(r.data?.source === 'msw' ? 'ok' : 'fail')
      })
      .catch((e: unknown) => {
        add(`REST erro: ${String(e)}`)
        setRest('fail')
      })

    // transports: ['websocket'] — o binding só simula o handshake Engine.IO sobre WebSocket
    // (pacote "0" com upgrades: []). Long-polling é HTTP e não é atendido pelo binding.
    add(`WebSocket type: ${window.WebSocket.toString()}`)

    try {
      const rawWs = new WebSocket('wss://realtime.kurio.test/socket.io/?EIO=4&transport=websocket')
      rawWs.onopen = () => add('rawWs: OPEN!')
      rawWs.onerror = (err) => add(`rawWs: ERROR isTrusted=${err.isTrusted}`)
      rawWs.onmessage = (msg) => add(`rawWs: MESSAGE ${msg.data}`)
      rawWs.onclose = (ev) => add(`rawWs: CLOSE code=${ev.code} reason=${ev.reason}`)
    } catch (err: any) {
      add(`rawWs: CONSTRUCT ERROR: ${err?.message}`)
    }

    let activeSocket: { close: () => void } | null = null
    void import('socket.io-client').then(({ io }) => {
      add('socket.io-client importado dinamicamente após MSW start')
      const s = io(SPIKE_SOCKET_URL, {
        transports: ['websocket'],
        reconnection: false,
      })
      activeSocket = s

      s.on('connect', () => {
        add(`socket connect id=${s.id}`)
      })
      s.on('connect_error', (e: Error & { description?: unknown }) => {
        console.error('[spike-socket-error]', e)
        const details = e?.description ? ` (desc: ${JSON.stringify(e.description)})` : ''
        add(`socket connect_error: ${e.message}${details}`)
        setSocket('fail')
      })
      s.on('disconnect', (reason: string) => add(`socket disconnect: ${reason}`))
      s.on('spike.hello', (payload: unknown) => {
        add(`evento spike.hello ${JSON.stringify(payload)}`)
        s.emit('spike.ping', 'abc')
      })
      s.on('spike.pong', (payload: unknown) => {
        add(`evento spike.pong ${JSON.stringify(payload)}`)
        setSocket('ok')
      })
    })

    return () => {
      if (activeSocket) activeSocket.close()
    }
  }, [])

  return (
    <section className="p-8 space-y-4">
      <h1 className="text-xl font-bold">Spike MSW + Socket.IO</h1>
      <p data-testid="spike-rest">REST: {rest}</p>
      <p data-testid="spike-socket">Socket: {socket}</p>
      <ol data-testid="spike-log" className="text-xs space-y-1">
        {log.map((e, i) => (
          <li key={i}>
            +{e.t}ms — {e.msg}
          </li>
        ))}
      </ol>
    </section>
  )
}
