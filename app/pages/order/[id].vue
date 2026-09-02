<script setup lang="ts">
const route = useRoute()

const orderId = computed(() => String(route.params.id || ""))
const { data, error, refresh, pending } = await useFetch<{
  ok: boolean
  order: any
}>(() => `/api/orders/${orderId.value}`)

const order = computed(() => data.value?.order)
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
          @click="() => refresh()"
        >
          Обновить
        </button>
      </div>
    </div>

    <div
      class="mt-4 flex flex-col self-stretch bg-white p-5 gap-4 rounded-2xl shadow-[0px_10px_34px_#14285012]"
    >
      <p
        v-if="pending"
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
        <NuxtLink
          class="inline-flex h-10 items-center justify-center rounded-[10px] bg-black px-5 text-white text-sm font-bold transition-opacity hover:opacity-85"
          to="/"
        >
          На витрину
        </NuxtLink>
        <button
          class="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#F4F5F7] px-5 text-[#14181D] text-sm font-bold transition-colors hover:bg-[#E8EBF0] cursor-pointer"
          @click="() => refresh()"
        >
          Проверить еще раз
        </button>
      </div>
    </div>
  </section>
</template>
