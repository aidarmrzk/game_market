<script setup lang="ts">
import productCardImage from "~/assets/images/product/card.png"

const recommendedCards = [
  {
    id: "recommended-1",
    sku: "KEY-CS2-PRIME",
    imageUrl: productCardImage,
    title: "🔥 PUBG MOBILE 60 UC • Пополнение аккаунта",
    price: "990 ₽",
    oldPrice: "1 990 ₽",
  },
  {
    id: "recommended-2",
    sku: "KEY-CS2-PRIME",
    imageUrl: productCardImage,
    title: "🎯 PUBG MOBILE 325 UC • Мгновенная выдача",
    price: "1 290 ₽",
    oldPrice: "2 190 ₽",
  },
  {
    id: "recommended-3",
    sku: "KEY-CS2-PRIME",
    imageUrl: productCardImage,
    title: "⚡ PUBG MOBILE 660 UC • Безопасное пополнение",
    price: "1 790 ₽",
    oldPrice: "2 490 ₽",
  },
  {
    id: "recommended-4",
    sku: "KEY-CS2-PRIME",
    imageUrl: productCardImage,
    title: "🏆 PUBG MOBILE Royale Pass • Активировать",
    price: "1 150 ₽",
    oldPrice: "1 850 ₽",
  },
  {
    id: "recommended-5",
    sku: "KEY-CS2-PRIME",
    imageUrl: productCardImage,
    title: "💎 PUBG MOBILE 1800 UC • Выгодный пакет",
    price: "2 090 ₽",
    oldPrice: "2 890 ₽",
  },
]
</script>

<template>
  <ProductList
    title="Рекомендуемые товары"
    :items="recommendedCards"
    show-all
  />
</template>
