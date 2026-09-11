<script setup lang="ts">
import donateIcon from "~/assets/images/filter/donate.svg"
import subscribesIcon from "~/assets/images/filter/subscribes.svg"
import itemsIcon from "~/assets/images/filter/items.svg"
import accountsIcon from "~/assets/images/filter/accounts.svg"
import keysIcon from "~/assets/images/filter/keys.svg"
import gameValueIcon from "~/assets/images/filter/game_value.svg"
import otherIcon from "~/assets/images/filter/other.svg"

const route = useRoute()
const router = useRouter()

const filterItems = [
  { label: "Все", icon: donateIcon, type: "" },
  { label: "Подписки", icon: subscribesIcon, type: "subscription" },
  { label: "Предметы", icon: itemsIcon, type: "item" },
  { label: "Аккаунты", icon: accountsIcon, type: "account" },
  { label: "Ключи", icon: keysIcon, type: "key" },
  { label: "Игровая валюта", icon: gameValueIcon, type: "topup" },
  { label: "Другое", icon: otherIcon, type: "giftcard" },
]

const activeType = computed(() => String(route.query.type || ""))

async function applyType(type: string) {
  const query = {
    ...route.query,
    type: type || undefined,
  }

  await router.replace({ query })
}
</script>

<template>
  <div class="flex flex-1 justify-end items-center gap-2">
    <div
      v-for="item in filterItems"
      :key="item.label"
      class="flex shrink-0 items-center py-1.5 px-3.5 gap-1.5 rounded-[10px] cursor-pointer"
      :class="
        activeType === item.type
          ? 'bg-black shadow-[0px_1px_2px_#3B82F633]'
          : 'bg-[#F4F5F7]'
      "
      @click="applyType(item.type)"
    >
      <div class="flex flex-col shrink-0 items-center">
        <img :src="item.icon" class="w-3.5 h-3.5 object-fill" />
      </div>
      <span
        class="text-[13px] font-bold"
        :class="activeType === item.type ? 'text-white' : 'text-[#8A94A6]'"
      >
        {{ item.label }}
      </span>
    </div>
  </div>
</template>
