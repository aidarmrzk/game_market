<script setup lang="ts">
import donateIcon from "~/assets/images/filter/donate.svg"
import subscribesIcon from "~/assets/images/filter/subscribes.svg"
import itemsIcon from "~/assets/images/filter/items.svg"
import accountsIcon from "~/assets/images/filter/accounts.svg"
import keysIcon from "~/assets/images/filter/keys.svg"
import gameValueIcon from "~/assets/images/filter/game_value.svg"
import otherIcon from "~/assets/images/filter/other.svg"

const filterItems = [
  { label: "Донат", icon: donateIcon, active: true },
  { label: "Подписки", icon: subscribesIcon, active: false },
  { label: "Предметы", icon: itemsIcon, active: false },
  { label: "Аккаунты", icon: accountsIcon, active: false },
  { label: "Ключи", icon: keysIcon, active: false },
  { label: "Игровая валюта", icon: gameValueIcon, active: false },
  { label: "Другое", icon: otherIcon, active: false },
]
</script>

<template>
  <div class="flex flex-1 justify-end items-center gap-2">
    <div
      v-for="item in filterItems"
      :key="item.label"
      class="flex shrink-0 items-center py-1.5 px-3.5 gap-1.5 rounded-[10px] cursor-pointer"
      :class="
        item.active ? 'bg-black shadow-[0px_1px_2px_#3B82F633]' : 'bg-[#F4F5F7]'
      "
    >
      <div class="flex flex-col shrink-0 items-center">
        <img :src="item.icon" class="w-3.5 h-3.5 object-fill" />
      </div>
      <span
        class="text-[13px] font-bold"
        :class="item.active ? 'text-white' : 'text-[#8A94A6]'"
      >
        {{ item.label }}
      </span>
    </div>
  </div>
</template>
