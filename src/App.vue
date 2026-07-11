<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useProductStore } from './stores/productStore'

const productStore = useProductStore()

onMounted(async () => {
  try {
    await productStore.getProducts()
  } catch (error) {
    console.error('Failed to initialize Shopify products:', error)
  }
})
</script>

<template>
  <RouterView />
</template>