<template>
  <RouterLink
    :to="{
      name: 'product-page',
      params: { handle: product.handle }
    }"
  >
    <div class="bs-item">
      <div
        class="product-img"
        :style="{
          backgroundImage: `url(${product.featuredImage?.url || ''})`
        }"
      ></div>

      <div
        class="product-img-2"
        :style="{
          backgroundImage: `url(${product.images?.nodes?.[1]?.url || product.featuredImage?.url || ''})`
        }"
      ></div>

      <div class="product-name">
        {{ product.title }}
      </div>

      <div class="product-price">
        {{ formattedPrice }}
      </div>
    </div>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const formattedPrice = computed(() => {
  const money = props.product.priceRange?.minVariantPrice

  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
})
</script>
<style scoped>
.product-name{
    font-size: 1.05rem;
    text-transform: uppercase;
    margin-top: 5px;
    letter-spacing: 0.8px;
    color: #313c55;
    font-weight: 500;
}
.bs-item{
    width: 100%;
    height: auto;
    margin-top: 10px;
}
.product-img, .product-img-2{
    aspect-ratio: 1/1;
    width: 100%;
    height: auto;
    background-size: contain;
    background-repeat: no-repeat;
    margin-bottom: 3px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-radius: 3px;

    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-img:hover, .product-img-2:hover{
    transform: scale(1.01);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    z-index: 2;
    border-radius: 5px;
}
.product-img-2{
    display: none;
}
.bs-item:hover .product-img{
display: none;
}
.bs-item:hover .product-img-2{
display: block;
}
.product-price{
    font-size: 1.05rem;
    text-transform: uppercase;
    margin-top: 5px;
    font-weight: 600;
}
@media (max-width: 340px){
    .product-name{
        margin-top: 3px;
        font-size: 0.8rem;
    }
    .product-price{
    font-size: 0.8rem;
    text-transform: uppercase;
    margin-top: 5px;
    font-weight: 500;
}
}

</style>