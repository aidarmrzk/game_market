<script setup lang="ts">
import profileIcon from "~/assets/images/charge/profile.svg"

const route = useRoute()
const router = useRouter()
const searchQuery = ref<string>("")

function handlePress() {
  return
}

watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = typeof q === "string" ? q : ""
  },
  { immediate: true },
)

watch(searchQuery, async (value) => {
  const query = {
    ...route.query,
    q: value.trim() || undefined,
  }
  await router.replace({ query })
})
</script>

<template>
  <div class="relative">
    <div
      class="flex justify-end items-center self-stretch bg-white py-[18px] mb-4 mx-[1px] border-b border-solid border-b-[#F2F4F7]"
    >
      <CatalogDropdownMenu />

      <AppSearchBar v-model="searchQuery" />

      <NuxtLink
        to="/admin"
        class="mr-3 rounded-[10px] bg-[#F2F4F7] px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-[#E6EAF2]"
      >
        Админка
      </NuxtLink>

      <button
        class="flex flex-col shrink-0 items-start bg-[#F2F4F7] text-left p-3 mr-10 rounded-[10px] border-0 cursor-pointer"
        @click="handlePress"
      >
        <img :src="profileIcon" class="w-5 h-5 object-fill" />
      </button>
    </div>
  </div>
</template>
