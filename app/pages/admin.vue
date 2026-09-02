<script setup lang="ts">
type RecoverableOrder = {
  id: string
  externalOrderId: string
  sku: string
  status: string
  deliveredCode?: string | null
  finalAmount: number
  currency: string
  updatedAt: string
}

const recoverableOrders = ref<RecoverableOrder[]>([])
const loadingRecoverable = ref(false)
const recoverableError = ref("")

const retryingOrderId = ref("")
const retryMessage = ref("")
const retryError = ref("")

const restockSku = ref("STEAM-TOPUP-500")
const restockKeys = ref("RESTOCK-KEY-0001")
const restockLoading = ref(false)
const restockMessage = ref("")
const restockError = ref("")

function normalizeKeys(raw: string) {
  return raw
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadRecoverableOrders() {
  loadingRecoverable.value = true
  recoverableError.value = ""

  try {
    const response = await $fetch<{ ok: boolean; orders: RecoverableOrder[] }>(
      "/api/admin/recoverable",
    )
    recoverableOrders.value = response.orders
  } catch {
    recoverableError.value = "Не удалось загрузить список восстановимых заказов"
  } finally {
    loadingRecoverable.value = false
  }
}

async function retryIssue(orderExternalId: string) {
  retryingOrderId.value = orderExternalId
  retryMessage.value = ""
  retryError.value = ""

  try {
    const response = await $fetch<{
      ok: boolean
      result: { status: string; code?: string }
    }>("/api/admin/retry-issue", {
      method: "POST",
      body: { order_id: orderExternalId },
    })

    retryMessage.value = `Результат retry для ${orderExternalId}: ${response.result.status}`
    await loadRecoverableOrders()
  } catch {
    retryError.value = `Не удалось выполнить retry для ${orderExternalId}`
  } finally {
    retryingOrderId.value = ""
  }
}

async function submitRestock() {
  restockLoading.value = true
  restockMessage.value = ""
  restockError.value = ""

  const keys = normalizeKeys(restockKeys.value)
  if (!restockSku.value.trim() || keys.length === 0) {
    restockLoading.value = false
    restockError.value = "Нужно заполнить sku и хотя бы один ключ"
    return
  }

  try {
    const response = await $fetch<{ ok: boolean; inserted: number }>(
      "/api/admin/restock",
      {
        method: "POST",
        body: {
          sku: restockSku.value.trim(),
          keys,
        },
      },
    )

    restockMessage.value = `Добавлено ключей: ${response.inserted}`
    await loadRecoverableOrders()
  } catch {
    restockError.value = "Не удалось пополнить пул ключей"
  } finally {
    restockLoading.value = false
  }
}

onMounted(loadRecoverableOrders)
</script>

<template>
  <section class="mx-[41px] mt-4 space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h1 class="text-2xl font-bold text-gray-900">
        Админка восстановления выдачи
      </h1>
      <NuxtLink
        to="/"
        class="inline-flex h-10 items-center justify-center rounded-[10px] bg-black px-4 text-sm font-bold text-white transition-opacity hover:opacity-85"
      >
        На главную
      </NuxtLink>
    </div>

    <div class="rounded-xl border border-[#E6E8EE] bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">
          Восстановимые заказы
        </h2>
        <button
          class="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80"
          :disabled="loadingRecoverable"
          @click="loadRecoverableOrders"
        >
          {{ loadingRecoverable ? "Обновление..." : "Обновить" }}
        </button>
      </div>

      <p v-if="recoverableError" class="text-sm text-red-600">
        {{ recoverableError }}
      </p>

      <p
        v-if="!loadingRecoverable && recoverableOrders.length === 0"
        class="text-sm text-gray-500"
      >
        Нет заказов в статусах out_of_stock / delivery_failed / delivering /
        paid
      </p>

      <div v-else class="space-y-2">
        <div
          v-for="order in recoverableOrders"
          :key="order.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E6E8EE] p-3"
        >
          <div class="space-y-1 text-sm">
            <p>
              <span class="font-semibold">order_id:</span>
              {{ order.externalOrderId }}
            </p>
            <p><span class="font-semibold">sku:</span> {{ order.sku }}</p>
            <p><span class="font-semibold">status:</span> {{ order.status }}</p>
          </div>

          <button
            class="rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-60"
            :disabled="retryingOrderId === order.externalOrderId"
            @click="retryIssue(order.externalOrderId)"
          >
            {{
              retryingOrderId === order.externalOrderId
                ? "Повтор..."
                : "Повторная выдача"
            }}
          </button>
        </div>
      </div>

      <p v-if="retryMessage" class="text-sm text-green-700">
        {{ retryMessage }}
      </p>
      <p v-if="retryError" class="text-sm text-red-600">{{ retryError }}</p>
    </div>

    <form
      class="rounded-xl border border-[#E6E8EE] bg-white p-4 space-y-3"
      @submit.prevent="submitRestock"
    >
      <h2 class="text-lg font-semibold text-gray-900">Пополнение ключей</h2>

      <label class="block space-y-1 text-sm">
        <span class="font-medium text-gray-700">SKU</span>
        <input
          v-model="restockSku"
          class="w-full rounded-lg border border-[#D8DEEA] px-3 py-2 outline-none focus:border-black"
          placeholder="Например: STEAM-TOPUP-500"
        />
      </label>

      <label class="block space-y-1 text-sm">
        <span class="font-medium text-gray-700"
          >Ключи (через пробел, запятую или новую строку)</span
        >
        <textarea
          v-model="restockKeys"
          rows="4"
          class="w-full rounded-lg border border-[#D8DEEA] px-3 py-2 outline-none focus:border-black"
          placeholder="RESTOCK-KEY-0001"
        />
      </label>

      <button
        class="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80 disabled:opacity-60"
        :disabled="restockLoading"
        type="submit"
      >
        {{ restockLoading ? "Добавление..." : "Добавить ключи" }}
      </button>

      <p v-if="restockMessage" class="text-sm text-green-700">
        {{ restockMessage }}
      </p>
      <p v-if="restockError" class="text-sm text-red-600">{{ restockError }}</p>
    </form>
  </section>
</template>
