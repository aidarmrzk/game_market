<script setup lang="ts">
import appStoreIcon from "~/assets/images/category/app_store.svg"
import brawlStarsIcon from "~/assets/images/category/brawl_stars.svg"
import mobileLegIcon from "~/assets/images/category/mobile_leg.svg"
import chatgptIcon from "~/assets/images/category/chatgpt.svg"
import playStationIcon from "~/assets/images/category/play_station.svg"
import pubgMobileIcon from "~/assets/images/category/pubg_mobile.svg"
import robloxIcon from "~/assets/images/category/roblox.svg"
import steamIcon from "~/assets/images/category/steam.svg"
import telegramIcon from "~/assets/images/category/telegram.svg"
import tiktokIcon from "~/assets/images/category/tiktok.svg"
import otherIcon from "~/assets/images/category/other.svg"

const otherCategory = {
  label: "еще 841",
  icon: otherIcon,
  isDefault: true,
}

const categories = [
  { label: "Steam", icon: steamIcon, isSelected: false },
  { label: "Telegram", icon: telegramIcon, isSelected: false },
  { label: "Roblox", icon: robloxIcon, isSelected: false },
  { label: "Brawl Stars", icon: brawlStarsIcon, isSelected: false },
  { label: "PUBG Mob...", icon: pubgMobileIcon, isSelected: true },
  { label: "App Store", icon: appStoreIcon, isSelected: false },
  { label: "ChatGPT", icon: chatgptIcon, isSelected: false },
  { label: "PlayStation", icon: playStationIcon, isSelected: false },
  { label: "TikTok", icon: tiktokIcon, isSelected: false },
  { label: "Mobile Leg..", icon: mobileLegIcon, isSelected: false },
  otherCategory,
]

function handlePress() {
  return
}
</script>

<template>
  <div class="flex items-center self-stretch gap-8">
    <CategoryItem
      v-for="(category, idx) in categories"
      :key="category.label + idx"
      v-bind="category"
      @press="handlePress"
    />
  </div>
</template>
