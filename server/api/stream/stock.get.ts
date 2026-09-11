import { getStockSnapshot } from "~~/server/services/stock"

function serializeSnapshot(
  items: Awaited<ReturnType<typeof getStockSnapshot>>,
) {
  return JSON.stringify({
    items,
    ts: new Date().toISOString(),
  })
}

export default defineEventHandler(async (event) => {
  setHeader(event, "Content-Type", "text/event-stream")
  setHeader(event, "Cache-Control", "no-cache, no-transform")
  setHeader(event, "Connection", "keep-alive")

  const res = event.node.res
  res.write(`retry: 1500\n`)

  let closed = false
  const writePayload = async () => {
    if (closed) {
      return
    }

    const items = await getStockSnapshot()
    res.write(`event: stock\n`)
    res.write(`data: ${serializeSnapshot(items)}\n\n`)
  }

  await writePayload()

  const timer = setInterval(() => {
    writePayload().catch(() => {
      clearInterval(timer)
      if (!closed) {
        closed = true
        try {
          res.end()
        } catch {
          // ignore socket close races
        }
      }
    })
  }, 1000)

  event.node.req.on("close", () => {
    closed = true
    clearInterval(timer)
  })

  return new Promise(() => {})
})
