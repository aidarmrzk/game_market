type StockItem = {
  sku: string
  price: number
  currency: string
  available: number
  reserved: number
}

type StockPayload = {
  items: StockItem[]
  ts: string
}

let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelayMs = 1000
let visibilityListenerInstalled = false

function normalize(items: StockItem[]) {
  return Object.fromEntries(items.map((item) => [item.sku, item]))
}

export function useStockLive() {
  const items = useState<Record<string, StockItem>>(
    "stock-live-items",
    () => ({}),
  )
  const connected = useState<boolean>("stock-live-connected", () => false)
  const lastSyncAt = useState<string | null>("stock-live-last-sync", () => null)

  const applyPayload = (payload: StockPayload) => {
    items.value = normalize(payload.items)
    lastSyncAt.value = payload.ts
  }

  const fetchSnapshot = async () => {
    const snapshot = await $fetch<{
      ok: boolean
      items: StockItem[]
      ts: string
    }>("/api/products/stock")
    if (snapshot.ok) {
      applyPayload({ items: snapshot.items, ts: snapshot.ts })
    }
  }

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    clearReconnect()
    reconnectTimer = setTimeout(() => {
      start()
      reconnectDelayMs = Math.min(10000, reconnectDelayMs * 2)
    }, reconnectDelayMs)
  }

  const stop = () => {
    clearReconnect()
    connected.value = false
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }

  const start = async () => {
    if (!import.meta.client) {
      return
    }

    if (eventSource) {
      return
    }

    await fetchSnapshot().catch(() => {
      // Keep moving: SSE reconnect loop can recover later.
    })

    eventSource = new EventSource("/api/stream/stock")
    eventSource.onopen = () => {
      connected.value = true
      reconnectDelayMs = 1000
      clearReconnect()
    }

    eventSource.onerror = () => {
      connected.value = false
      if (eventSource) {
        eventSource.close()
        eventSource = null
      }
      scheduleReconnect()
    }

    eventSource.addEventListener("stock", (message) => {
      try {
        const parsed = JSON.parse(
          (message as MessageEvent).data,
        ) as StockPayload
        applyPayload(parsed)
      } catch {
        // Ignore malformed updates and keep connection alive.
      }
    })
  }

  if (import.meta.client) {
    start()

    if (!visibilityListenerInstalled) {
      visibilityListenerInstalled = true
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          fetchSnapshot().catch(() => {
            // Best effort refresh after tab restore.
          })
        }
      })
    }
  }

  return {
    items,
    connected,
    lastSyncAt,
    start,
    stop,
    fetchSnapshot,
  }
}
