<script setup lang="ts">
import catalogIcon from "~/assets/images/header/catalog.svg"
import chevronIcon from "~/assets/images/header/chevron.svg"

type CatalogMenuItem = {
  title: string
  isActive?: boolean
}

type CatalogSection = {
  title: string
  items: string[]
  withBottomPadding?: boolean
}

const catalogMenuItems: CatalogMenuItem[] = [
  { title: "Игры и игровые сервисы", isActive: true },
  { title: "Игровые ценности" },
  { title: "Мобильные игры" },
  { title: "Сервисы и соцсети" },
  { title: "Программы" },
]

const catalogSections: CatalogSection[] = [
  {
    title: "Steam",
    items: [
      "Игры и DLC",
      "Пополнение баланса",
      "Подарочные карты",
      "Коллекционные карточки",
      "Смена региона",
    ],
  },
  {
    title: "PlayStation",
    items: [
      "Игры и DLC",
      "Пополнение баланса",
      "Новые аккаунты",
      "PS Plus",
      "EA Play",
    ],
  },
  {
    title: "Xbox",
    items: [
      "Игры и DLC",
      "Пополнение баланса",
      "Новые аккаунты",
      "Xbox Game Pass",
      "Услуги",
    ],
  },
  {
    title: "Nintendo",
    withBottomPadding: true,
    items: ["Игры и DLC", "Подарочные карты", "Новые аккаунты", "NS Online"],
  },
  {
    title: "Battle.net",
    items: [
      "World of Warcraft",
      "Подарочные карты",
      "Прямое пополнение",
      "Новые аккаунты",
      "Смена региона",
    ],
  },
]

const catalogCollections: CatalogSection = {
  title: "Подборки",
  items: [
    "Скидки 90%",
    "Популярные издатели",
    "Лучшие серии игр",
    "Steam Deck",
    "Bundle-наборы",
  ],
}

const isCatalogOpen = ref<boolean>(false)
const catalogContainerRef = ref<HTMLElement | null>(null)

const toggleCatalog = () => {
  isCatalogOpen.value = !isCatalogOpen.value
}

const closeCatalog = () => {
  isCatalogOpen.value = false
}

const onDocumentClick = (event: MouseEvent) => {
  if (!isCatalogOpen.value || !catalogContainerRef.value) {
    return
  }

  const target = event.target as Node | null
  if (target && !catalogContainerRef.value.contains(target)) {
    closeCatalog()
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick)
})
</script>

<template>
  <div ref="catalogContainerRef" class="mr-[76px]">
    <button
      class="flex shrink-0 items-center bg-black text-left py-[11px] px-6 gap-2 rounded-xl border-0 cursor-pointer hover:opacity-80 transition-opacity duration-300"
      @click="toggleCatalog"
    >
      <img :src="catalogIcon" class="w-5 h-5 rounded-xl" />
      <span class="text-white text-base font-bold"> Каталог </span>
    </button>

    <div v-if="isCatalogOpen" class="absolute left-0 top-[82px] z-50 w-full">
      <div
        class="flex flex-col bg-white shadow-[0px_24px_40px_rgba(17,18,21,0.12)] overflow-hidden border border-solid border-[#E9EDF3]"
      >
        <div class="self-stretch bg-[#F8F9FB] px-8 overflow-hidden">
          <div
            class="flex flex-col self-stretch bg-[#00000000] py-6 px-4 gap-8"
          >
            <div class="flex self-stretch bg-[#00000000] gap-12">
              <div class="flex flex-col bg-[#00000000] w-64 pb-[152px] gap-2">
                <div
                  v-for="menuItem in catalogMenuItems"
                  :key="menuItem.title"
                  :class="[
                    'flex justify-between items-center self-stretch py-[11px] px-3 rounded-lg cursor-pointer',
                    menuItem.isActive ? 'bg-gray-100' : 'bg-[#00000000]',
                  ]"
                >
                  <span
                    :class="[
                      'text-sm transition-all duration-200',
                      menuItem.isActive
                        ? 'text-[#1A1A1A] hover:opacity-90'
                        : 'text-gray-600 hover:text-[#1A1A1A]',
                    ]"
                  >
                    {{ menuItem.title }}
                  </span>
                  <img
                    :src="chevronIcon"
                    class="w-2 h-4 rounded-lg object-fill opacity-40"
                  />
                </div>
              </div>

              <div class="flex flex-1 flex-col bg-[#00000000] gap-12 py-6">
                <div class="flex self-stretch bg-[#00000000] gap-8">
                  <div
                    v-for="section in catalogSections"
                    :key="section.title"
                    :class="[
                      'flex-1 bg-[#00000000]',
                      section.withBottomPadding ? 'pb-8' : '',
                    ]"
                  >
                    <CatalogSectionLinks
                      :title="section.title"
                      :items="section.items"
                    />
                  </div>
                </div>

                <CatalogSectionLinks
                  :title="catalogCollections.title"
                  :items="catalogCollections.items"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
