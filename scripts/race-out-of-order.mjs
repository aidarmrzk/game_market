import { Client } from "pg"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const sku = process.env.SKU || "KEY-CS2-PRIME"
const pgUrl = process.env.POSTGRES_URL

async function readOrderMetrics(orderExternalId) {
  if (!pgUrl) {
    return null
  }

  const client = new Client({ connectionString: pgUrl })

  try {
    await client.connect()

    const deliveryRes = await client.query(
      `
        select count(*)::int as delivery_count
        from deliveries d
        join orders o on o.id = d.order_id
        where o.external_order_id = $1
      `,
      [orderExternalId],
    )

    const consumedRes = await client.query(
      `
        select count(*)::int as consumed_keys
        from license_keys lk
        join orders o on o.id = lk.allocated_to_order_id
        where o.external_order_id = $1
      `,
      [orderExternalId],
    )

    return {
      delivery_count: deliveryRes.rows[0]?.delivery_count ?? 0,
      consumed_keys: consumedRes.rows[0]?.consumed_keys ?? 0,
    }
  } finally {
    await client.end()
  }
}

async function main() {
  const externalOrderId =
    process.env.ORDER_ID ||
    `ord_ooo_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`

  const t0 = new Date(Date.now() - 60_000).toISOString()
  const t1 = new Date(Date.now() - 30_000).toISOString()
  const t2 = new Date().toISOString()

  const earlyPaid = {
    event_id: `evt_ooo_paid_early_${externalOrderId}`,
    order_id: externalOrderId,
    status: "paid",
    amount: 1290,
    currency: "RUB",
    created_at: t1,
  }

  const earlyResponse = await fetch(`${baseUrl}/api/webhook/payment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(earlyPaid),
  })

  const createRes = await fetch(`${baseUrl}/api/orders/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sku, externalOrderId }),
  })

  if (!createRes.ok) {
    throw new Error(`Failed to create order: ${createRes.status}`)
  }

  const createData = await createRes.json()

  const lateFailed = {
    event_id: `evt_ooo_failed_late_${externalOrderId}`,
    order_id: externalOrderId,
    status: "failed",
    amount: createData.order.finalAmount,
    currency: createData.order.currency,
    created_at: t0,
  }

  const latestPaid = {
    event_id: `evt_ooo_paid_latest_${externalOrderId}`,
    order_id: externalOrderId,
    status: "paid",
    amount: createData.order.finalAmount,
    currency: createData.order.currency,
    created_at: t2,
  }

  const [failedRes, paidRes] = await Promise.all([
    fetch(`${baseUrl}/api/webhook/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lateFailed),
    }),
    fetch(`${baseUrl}/api/webhook/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(latestPaid),
    }),
  ])

  await new Promise((resolve) => setTimeout(resolve, 1200))

  const statusRes = await fetch(`${baseUrl}/api/orders/${externalOrderId}`)
  const statusData = await statusRes.json()
  const metrics = await readOrderMetrics(externalOrderId)

  console.log(
    JSON.stringify(
      {
        order_id: externalOrderId,
        early_orphan_paid_status: earlyResponse.status,
        out_of_order_results: {
          failed_status: failedRes.status,
          paid_status: paidRes.status,
        },
        final_status: statusData.order?.status,
        delivered_code: statusData.order?.deliveredCode,
        metrics,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
