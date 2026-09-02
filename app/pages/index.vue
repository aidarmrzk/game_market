<script setup lang="ts"></script>

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

    <ProductsPopular />

    <ProductsRecommended />

    <ProductsOther />
  </div>
</template>
