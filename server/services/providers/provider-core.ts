import { sql } from "drizzle-orm"
import { db } from "~~/server/db"
import {
  licenseKeys,
  providerRequests,
  reservations,
} from "~~/server/db/schema"
import type {
  ProviderIssueRequest,
  ProviderIssueResult,
} from "~~/server/services/types"
import {
  ProviderFailureError,
  ProviderOutOfStockError,
  ProviderTimeoutError,
} from "~~/server/services/providers/errors"

type ProviderBehavior = {
  failRate: number
  timeoutRate: number
  minDelayMs: number
  maxDelayMs: number
}

function readBehavior(prefix: string): ProviderBehavior {
  const failRate = Number(process.env[`${prefix}_FAIL_RATE`] ?? "0.15")
  const timeoutRate = Number(process.env[`${prefix}_TIMEOUT_RATE`] ?? "0.1")
  const minDelayMs = Number(process.env[`${prefix}_MIN_DELAY_MS`] ?? "100")
  const maxDelayMs = Number(process.env[`${prefix}_MAX_DELAY_MS`] ?? "800")

  return {
    failRate: Math.min(1, Math.max(0, failRate)),
    timeoutRate: Math.min(1, Math.max(0, timeoutRate)),
    minDelayMs: Math.max(0, minDelayMs),
    maxDelayMs: Math.max(minDelayMs, maxDelayMs),
  }
}

function roll(probability: number) {
  return Math.random() < probability
}

async function randomDelay(behavior: ProviderBehavior) {
  const ms = Math.floor(
    behavior.minDelayMs +
      Math.random() * (behavior.maxDelayMs - behavior.minDelayMs),
  )
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function issueFromProvider(
  providerName: string,
  envPrefix: string,
  request: ProviderIssueRequest,
  tx?: any,
): Promise<ProviderIssueResult> {
  const executor = tx ?? db
  const behavior = readBehavior(envPrefix)
  await randomDelay(behavior)

  const existingRows = await executor.execute<{
    status: "ok" | "error"
    code: string | null
    reason: string | null
  }>(
    sql`select status, code, reason from ${providerRequests} where request_id = ${request.requestId} limit 1`,
  )

  const existing = existingRows.rows[0]

  if (existing) {
    if (existing.status === "ok" && existing.code) {
      return {
        status: "ok",
        requestId: request.requestId,
        code: existing.code,
      }
    }

    if (existing.reason === "out_of_stock") {
      throw new ProviderOutOfStockError()
    }

    throw new ProviderFailureError(existing.reason ?? "provider_error")
  }

  const alreadyAllocated = await executor.execute<{ code: string }>(
    sql`select code from ${licenseKeys} where allocated_to_order_id = ${request.orderId} limit 1`,
  )

  const timeoutAfterIssue = roll(behavior.timeoutRate)

  const existingCode = alreadyAllocated.rows[0]?.code
  if (existingCode) {
    await executor.insert(providerRequests).values({
      requestId: request.requestId,
      provider: providerName,
      orderId: request.orderId,
      sku: request.sku,
      status: "ok",
      code: existingCode,
    })

    if (timeoutAfterIssue) {
      throw new ProviderTimeoutError()
    }

    return {
      status: "ok",
      requestId: request.requestId,
      code: existingCode,
    }
  }

  if (roll(behavior.failRate)) {
    await executor.insert(providerRequests).values({
      requestId: request.requestId,
      provider: providerName,
      orderId: request.orderId,
      sku: request.sku,
      status: "error",
      reason: "provider_5xx",
    })
    throw new ProviderFailureError()
  }

  const allocated = await executor.execute<{ code: string }>(sql`
    with reserved_key as (
      select lk.id, lk.code
      from ${reservations} r
      join ${licenseKeys} lk on lk.id = r.license_key_id
      where r.order_id = ${request.orderId}
        and r.sku = ${request.sku}
        and r.status in ('active', 'consumed')
        and (r.status = 'consumed' or r.expires_at > now())
      limit 1
      for update of lk skip locked
    )
    update ${licenseKeys} as lk
    set allocated_to_order_id = ${request.orderId}, allocated_at = now()
    from reserved_key
    where lk.id = reserved_key.id
      and (lk.allocated_to_order_id is null or lk.allocated_to_order_id = ${request.orderId})
    returning lk.code
  `)

  const code = allocated.rows[0]?.code
  if (!code) {
    await executor.insert(providerRequests).values({
      requestId: request.requestId,
      provider: providerName,
      orderId: request.orderId,
      sku: request.sku,
      status: "error",
      reason: "out_of_stock",
    })
    throw new ProviderOutOfStockError()
  }

  await executor.insert(providerRequests).values({
    requestId: request.requestId,
    provider: providerName,
    orderId: request.orderId,
    sku: request.sku,
    status: "ok",
    code,
  })

  if (timeoutAfterIssue) {
    throw new ProviderTimeoutError()
  }

  return {
    status: "ok",
    requestId: request.requestId,
    code,
  }
}
