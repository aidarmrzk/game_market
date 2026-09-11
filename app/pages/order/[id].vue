<script setup lang="ts">
type OrderStatus =
  | "created"
  | "paid"
  | "delivering"
  | "delivered"
  | "payment_failed"
  | "out_of_stock"
  | "delivery_failed"

type ReservationStatus = "active" | "consumed" | "expired"

type OrderResponse = {
  ok: boolean
  order: {
    status: OrderStatus
    finalAmount: number
    currency: string
    sku: string
    promoCode?: string | null
    deliveredCode?: string | null
  }
  reservation?: {
    status: ReservationStatus
    expiresAt: string
  } | null
}

const route = useRoute()

const orderId = computed(() => String(route.params.id || ""))
const { data, error, refresh, pending } = await useFetch<OrderResponse>(
  () => `/api/orders/${orderId.value}`,
)

const refreshing = ref(false)
const paying = ref(false)
const payError = ref("")
const secondsLeft = ref(0)
let pollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const order = computed(() => data.value?.order)
const reservation = computed(() => data.value?.reservation)
const isInitialLoading = computed(
  () => pending.value && !order.value && !error.value,
)
const isTerminalStatus = computed(() => {
  const status = order.value?.status
  return (
    status === "delivered" ||
    status === "payment_failed" ||
    status === "out_of_stock" ||
    status === "delivery_failed"
  )
})

const hasActiveReservation = computed(
  () => reservation.value?.status === "active" && secondsLeft.value > 0,
)

const reservationLabel = computed(() => {
  const min = Math.floor(secondsLeft.value / 60)
  const sec = secondsLeft.value % 60
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
})

function recalcCountdown() {
  if (!reservation.value?.expiresAt || reservation.value.status !== "active") {
    secondsLeft.value = 0
    return
  }

  const ms = new Date(reservation.value.expiresAt).getTime() - Date.now()
  secondsLeft.value = Math.max(0, Math.floor(ms / 1000))
}

async function safeRefresh() {
  if (refreshing.value) {
    return
  }
  refreshing.value = true
  try {
    await refresh()
    recalcCountdown()
  } finally {
    refreshing.value = false
  }
}

const canPayNow = computed(() => {
  const status = order.value?.status
  return (
    !paying.value &&
    (status === "created" || status === "payment_failed") &&
    hasActiveReservation.value
  )
})

async function payNow() {
  if (!order.value || !canPayNow.value) {
    return
  }

  payError.value = ""
  paying.value = true
  try {
    await $fetch("/api/payments/simulate", {
      method: "POST",
      body: {
        order_id: orderId.value,
        status: "paid",
        amount: order.value.finalAmount,
        currency: order.value.currency,
      },
    })
    await safeRefresh()
  } catch (error: any) {
    if (error?.data?.code === "PRICE_CHANGED") {
      const amount = error?.data?.expectedAmount
      const currency = error?.data?.expectedCurrency
      payError.value =
        typeof amount === "number" && typeof currency === "string"
          ? `Цена изменилась. Новая сумма: ${amount} ${currency}. Подтвердите оплату еще раз.`
          : "Цена изменилась. Обновите заказ и подтвердите оплату по новой сумме."
      await safeRefresh()
      return
    }

    payError.value =
      "Оплата не прошла. Можно повторить, заказ останется тем же."
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  recalcCountdown()

  pollTimer = setInterval(() => {
    if (!isTerminalStatus.value) {
      safeRefresh()
    }
  }, 2000)

  countdownTimer = setInterval(() => {
    recalcCountdown()
    if (
      !isTerminalStatus.value &&
      secondsLeft.value === 0 &&
      reservation.value?.status === "active"
    ) {
      safeRefresh()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
  }
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})

watch(
  () => reservation.value?.expiresAt,
  () => {
    recalcCountdown()
  },
)

const statusMeta = computed(() => {
  const status = String(order.value?.status || "").toLowerCase()

  if (status === "delivered") {
    return {
      label: "Доставлен",
      badgeClass: "bg-[#E8F7EF] text-[#1A7F45] border-[#CDEEDB]",
    }
  }

  if (status === "payment_failed") {
    return {
      label: "Ошибка оплаты",
      badgeClass: "bg-[#FDECEC] text-[#B42318] border-[#F9D2D2]",
    }
  }

  if (status === "paid") {
    return {
      label: "Оплачен",
      badgeClass: "bg-[#EAF1FF] text-[#1D4ED8] border-[#D5E2FF]",
    }
  }

  return {
    label: status || "В обработке",
    badgeClass: "bg-[#F4F5F7] text-[#525866] border-[#E5E7EB]",
  }
})

const details = computed(() => {
  if (!order.value) {
    return [] as Array<{ label: string; value: string | number }>
  }

  return [
    { label: "ID заказа", value: orderId.value },
    {
      label: "Сумма",
      value: `${order.value.finalAmount} ${order.value.currency}`,
    },
    { label: "SKU", value: order.value.sku },
    ...(order.value.promoCode
      ? [{ label: "Промокод", value: order.value.promoCode }]
      : []),
  ]
})
</script>

<template>
  <section class="relative mx-[41px] mt-4">
    <div
      class="rounded-[12px] bg-[linear-gradient(120deg,#0F1117_0%,#1A2030_55%,#222A3D_100%)] px-6 py-7 shadow-[0px_18px_40px_rgba(20,40,80,0.24)]"
    >
      <p
        class="text-white/75 text-sm font-semibold tracking-[0.08em] uppercase"
      >
        Заказ
      </p>
      <div class="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <h1 class="text-white text-[28px] font-bold leading-tight">
          Статус заказа {{ orderId }}
        </h1>
        <button
          class="h-10 px-4 rounded-[10px] bg-white/12 text-white text-sm font-bold border border-white/20 transition-colors hover:bg-white/20 cursor-pointer"
          @click="() => safeRefresh()"
        >
          Обновить
        </button>
      </div>
    </div>

    <div
      class="mt-4 flex flex-col self-stretch bg-white p-5 gap-4 rounded-2xl shadow-[0px_10px_34px_#14285012]"
    >
      <p
        v-if="isInitialLoading"
        class="text-[#525866] text-sm font-semibold animate-pulse"
      >
        Загрузка статуса...
      </p>

      <div
        v-else-if="error"
        class="rounded-xl border border-[#F9D2D2] bg-[#FFF5F5] p-4 text-[#B42318] text-sm font-semibold"
      >
        Не удалось получить заказ: {{ error.message }}
      </div>

      <template v-else-if="order">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-[#14181D] text-base font-semibold">Текущий статус</p>
          <span
            class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold"
            :class="statusMeta.badgeClass"
          >
            {{ statusMeta.label }}
          </span>
        </div>

        <div
          v-if="hasActiveReservation"
          class="rounded-xl border border-[#F8D8A8] bg-[#FFF8ED] p-4"
        >
          <p
            class="text-[#9A6200] text-xs font-semibold uppercase tracking-[0.06em]"
          >
            Бронь активна
          </p>
          <p class="mt-1 text-[#7C4C00] text-sm font-bold">
            Завершите оплату в течение {{ reservationLabel }}
          </p>
        </div>

        <div
          v-else-if="
            reservation?.status === 'expired' ||
            (reservation?.status === 'active' && secondsLeft === 0)
          "
          class="rounded-xl border border-[#F9D2D2] bg-[#FFF5F5] p-4"
        >
          <p class="text-[#B42318] text-sm font-bold">
            Время брони истекло. Товар снова доступен другим покупателям.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="item in details"
            :key="item.label"
            class="rounded-xl border border-[#ECEFF4] bg-[#F9FAFB] px-4 py-3"
          >
            <p
              class="text-[#8A94A6] text-xs font-semibold uppercase tracking-[0.06em]"
            >
              {{ item.label }}
            </p>
            <p class="mt-1 text-[#14181D] text-sm font-bold break-all">
              {{ item.value }}
            </p>
          </div>
        </div>

        <div
          v-if="order.deliveredCode"
          class="rounded-xl border border-[#CDEEDB] bg-[#E8F7EF] p-4"
        >
          <p
            class="text-[#1A7F45] text-xs font-semibold uppercase tracking-[0.06em]"
          >
            Ключ активации
          </p>
          <p class="mt-1 text-[#14532D] text-sm font-bold break-all">
            {{ order.deliveredCode }}
          </p>
        </div>
      </template>

      <div class="flex items-center gap-2 flex-wrap pt-1">
        <button
          v-if="canPayNow"
          class="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#1456F0] px-5 text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          :disabled="paying"
          @click="payNow"
        >
          {{ paying ? "Проводим оплату..." : "Оплатить" }}
        </button>
        <NuxtLink
          class="inline-flex h-10 items-center justify-center rounded-[10px] bg-black px-5 text-white text-sm font-bold transition-opacity hover:opacity-85"
          to="/"
        >
          На витрину
        </NuxtLink>
        <button
          class="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#F4F5F7] px-5 text-[#14181D] text-sm font-bold transition-colors hover:bg-[#E8EBF0] cursor-pointer"
          @click="() => safeRefresh()"
        >
          Проверить еще раз
        </button>
      </div>

      <p v-if="payError" class="text-sm font-semibold text-[#B42318]">
        {{ payError }}
      </p>
    </div>
  </section>
</template>
