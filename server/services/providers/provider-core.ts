import { sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { licenseKeys, providerRequests } from "~~/server/db/schema"
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

  const timeoutAfterIssue = roll(behavior.timeoutRate)

  const alreadyAllocated = await executor.execute<{ code: string }>(
    sql`select code from ${licenseKeys} where allocated_to_order_id = ${request.orderId} limit 1`,
  )

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

  const allocated = await executor.execute<{ code: string }>(sql`
    with picked as (
      select id, code
      from ${licenseKeys}
      where sku = ${request.sku}
        and allocated_to_order_id is null
      order by created_at
      limit 1
      for update skip locked
    )
    update ${licenseKeys} as lk
    set allocated_to_order_id = ${request.orderId}, allocated_at = now()
    from picked
    where lk.id = picked.id
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
