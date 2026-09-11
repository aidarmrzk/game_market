<script setup lang="ts">
import productCardImage from "~/assets/images/product/card.png"

type ProductApi = {
  sku: string
  name: string
  type: string
  price: number
  currency: string
  image: string
  available: number
}

type ProductCard = {
  id: string
  sku?: string
  imageUrl: string
  title: string
  price: string
  oldPrice: string
}

const route = useRoute()

const loading = ref(false)
const loadError = ref("")
const cards = ref<ProductCard[]>([])
let requestSeq = 0

const queryQ = computed(() => String(route.query.q || "").trim())
const queryType = computed(() => String(route.query.type || "").trim())

function toCard(product: ProductApi): ProductCard {
  const oldPrice = Math.round(product.price * 1.25)
  return {
    id: product.sku,
    sku: product.sku,
    imageUrl: productCardImage,
    title: `${product.name} • ${product.sku}`,
    price: `${product.price} ${product.currency}`,
    oldPrice: `${oldPrice} ${product.currency}`,
  }
}

async function loadCatalog() {
  const seq = ++requestSeq
  loading.value = true
  loadError.value = ""

  try {
    const response = await $fetch<{ ok: boolean; products: ProductApi[] }>(
      "/api/products/search",
      {
        query: {
          q: queryQ.value || undefined,
          type: queryType.value || undefined,
        },
      },
    )

    if (seq !== requestSeq) {
      return
    }

    cards.value = response.products.map(toCard)
  } catch {
    if (seq !== requestSeq) {
      return
    }
    loadError.value = "Не удалось загрузить каталог"
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

watch(
  [queryQ, queryType],
  () => {
    loadCatalog()
  },
  { immediate: true },
)
</script>

<template>
  <div class="relative">
    <HeroBanner />

    <div
      class="flex flex-col self-stretch bg-white p-5 mb-4 mx-[41px] gap-4 rounded-2xl shadow-[0px_10px_34px_#14285012]"
    >
      <CategoryList />

      <div class="self-stretch bg-[#E8EAED] h-[1px]"></div>

      <SteamCharge />
    </div>

    <ProductList title="Каталог" :items="cards" with-filters />

    <p
      v-if="loading"
      class="mx-[41px] mb-3 text-sm font-semibold text-[#6B7280]"
    >
      Обновляем каталог...
    </p>
    <p
      v-else-if="loadError"
      class="mx-[41px] mb-3 text-sm font-semibold text-[#B42318]"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="cards.length === 0"
      class="mx-[41px] mb-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold text-[#6B7280]"
    >
      Ничего не найдено. Попробуйте изменить запрос или фильтр.
    </p>
  </div>
</template>
