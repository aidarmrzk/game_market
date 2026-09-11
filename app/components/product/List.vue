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
  }
}

const processingCardId = ref<string | null>(null)
const buyError = ref("")
const { items: liveStock } = useStockLive()

function handlePress() {
  return
}

async function handleBuy(card: ProductCard) {
  const availableNow = card.sku
    ? (liveStock.value[card.sku]?.available ?? 0)
    : 0
  if (!card.sku || processingCardId.value || availableNow <= 0) {
    if (availableNow <= 0) {
      buyError.value =
        "Товар только что закончился. Обновите каталог и выберите другой вариант."
    }
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

    await navigateTo(`/order/${orderId}`)
  } catch (error: any) {
    const raceMessage = error?.data?.data?.message
    if (typeof raceMessage === "string" && raceMessage.length > 0) {
      buyError.value = raceMessage
      return
    }

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

function priceLabel(card: ProductCard) {
  if (!card.sku) {
    return card.price
  }

  const live = liveStock.value[card.sku]
  if (!live) {
    return card.price
  }

  return `${live.price} ${live.currency}`
}

function canBuyNow(card: ProductCard) {
  if (!card.sku) {
    return false
  }
  return (liveStock.value[card.sku]?.available ?? 0) > 0
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

    <div
      class="grid self-stretch grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
    >
      <ProductItem
        v-for="card in items"
        :key="card.id"
        :image-url="card.imageUrl"
        :title="card.title"
        :price="priceLabel(card)"
        :old-price="card.oldPrice"
        :can-buy="canBuyNow(card)"
        :busy="processingCardId === card.id"
        @buy="handleBuy(card)"
      />
    </div>

    <p v-if="buyError" class="text-sm text-red-600">{{ buyError }}</p>
  </div>
</template>
