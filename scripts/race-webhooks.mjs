import { Client } from "pg"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const sku = process.env.SKU || "KEY-CS2-PRIME"
const parallel = Number(process.env.PARALLEL || 50)
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
  const createRes = await fetch(`${baseUrl}/api/orders/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sku }),
  })

  if (!createRes.ok) {
    throw new Error(`Failed to create order: ${createRes.status}`)
  }

  const createData = await createRes.json()
  const orderId = createData.order.externalOrderId

  const tasks = Array.from({ length: parallel }, (_, index) => {
    const payload = {
      event_id: `evt_race_${orderId}_${index}`,
      order_id: orderId,
      status: "paid",
      amount: createData.order.finalAmount,
      currency: createData.order.currency,
      created_at: new Date().toISOString(),
    }

    return fetch(`${baseUrl}/api/webhook/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then((response) => response.status)
  })

  const statuses = await Promise.all(tasks)

  const duplicatePayload = {
    event_id: `evt_dup_${orderId}`,
    order_id: orderId,
    status: "paid",
    amount: createData.order.finalAmount,
    currency: createData.order.currency,
    created_at: new Date().toISOString(),
  }

  const duplicateStatuses = await Promise.all([
    fetch(`${baseUrl}/api/webhook/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(duplicatePayload),
    }).then((response) => response.status),
    fetch(`${baseUrl}/api/webhook/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(duplicatePayload),
    }).then((response) => response.status),
  ])

  await new Promise((resolve) => setTimeout(resolve, 1200))

  const statusRes = await fetch(`${baseUrl}/api/orders/${orderId}`)
  const statusData = await statusRes.json()
  const metrics = await readOrderMetrics(orderId)

  const statusBreakdown = statuses.reduce((acc, statusCode) => {
    acc[statusCode] = (acc[statusCode] || 0) + 1
    return acc
  }, {})

  console.log(
    JSON.stringify(
      {
        order_id: orderId,
        status: statusData.order?.status,
        delivered_code: statusData.order?.deliveredCode,
        expected_parallel: parallel,
        webhook_status_breakdown: statusBreakdown,
        duplicate_event_statuses: duplicateStatuses,
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
