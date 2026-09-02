<script setup lang="ts">
type ProductCard = {
  id: string
  sku?: string
  imageUrl: string
  title: string
  price: string
  oldPrice: string
}

defineProps<{
  title: string
  items: ProductCard[]
  showAll?: boolean
  withFilters?: boolean
}>()

type CreateOrderResponse = {
  ok: boolean
  order: {
    externalOrderId: string
    finalAmount: number
    currency: string
  }
}

const processingCardId = ref<string | null>(null)
const buyError = ref("")

function handlePress() {
  return
}

async function handleBuy(card: ProductCard) {
  if (!card.sku || processingCardId.value) {
    return
  }

  buyError.value = ""
  processingCardId.value = card.id

  let orderId = ""

  try {
    const idempotencyKey = `buy_${card.id}_${crypto.randomUUID()}`

    const createResult = await $fetch<CreateOrderResponse>(
      "/api/orders/create",
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: { sku: card.sku },
      },
    )

    orderId = createResult.order.externalOrderId

    await $fetch("/api/payments/simulate", {
      method: "POST",
      body: {
        order_id: orderId,
        status: "paid",
        amount: createResult.order.finalAmount,
        currency: createResult.order.currency,
      },
    })

    await navigateTo(`/order/${orderId}`)
  } catch {
    if (orderId) {
      await navigateTo(`/order/${orderId}`)
    } else {
      buyError.value =
        "Не удалось создать заказ. Проверьте доступность API и базы данных."
    }
  } finally {
    processingCardId.value = null
  }
}
</script>

<template>
  <div
    class="flex flex-col self-stretch"
    :class="withFilters ? 'mb-4 mx-[41px] gap-4' : 'mb-[43px] mx-[41px] gap-4'"
  >
    <div class="flex justify-between items-center self-stretch">
      <span class="text-gray-800 text-xl font-bold">{{ title }}</span>

      <ProductFilters v-if="withFilters" />

      <button
        v-else-if="showAll"
        class="flex flex-col shrink-0 items-start bg-[#F4F5F7] text-left py-1.5 px-5 rounded-[10px] border-0 cursor-pointer"
        @click="handlePress"
      >
        <span class="text-gray-800 text-[13px] font-bold">Показать все</span>
      </button>
    </div>

    <div class="flex items-center self-stretch gap-4">
      <ProductItem
        v-for="card in items"
        :key="card.id"
        :image-url="card.imageUrl"
        :title="card.title"
        :price="card.price"
        :old-price="card.oldPrice"
        :can-buy="Boolean(card.sku)"
        :busy="processingCardId === card.id"
        @buy="handleBuy(card)"
      />
    </div>

    <p v-if="buyError" class="text-sm text-red-600">{{ buyError }}</p>
  </div>
</template>
