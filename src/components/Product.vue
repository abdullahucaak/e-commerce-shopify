<template>
  <RouterLink
    :to="{
      name: 'product-page',
      params: { handle: product.handle },
      query: displayedVariant?.id
        ? { variant: displayedVariant.id }
        : {}
    }"
  >
    <div class="bs-item">
      <div
        class="product-img"
        :style="{
          backgroundImage: `url(${product.featuredImage?.url || ''})`
        }"
      >
        <span
          v-if="isDiscounted"
          class="image-discount-label discount-badge discount-badge--outline"
        >
          %{{ discountPercentage }} DISCOUNT
        </span>
      </div>

      <div
        class="product-img-2"
        :style="{
          backgroundImage: `url(${product.images?.nodes?.[1]?.url || product.featuredImage?.url || ''})`
        }"
      >
        <span
          v-if="isDiscounted"
          class="image-discount-label discount-badge discount-badge--outline"
        >
          %{{ discountPercentage }} DISCOUNT
        </span>
      </div>

      <div class="product-name">
        {{ product.title }}
      </div>

      <div class="product-price">
        <span class="price price-current">{{ formattedPrice }}</span>
        <span
          v-if="isDiscounted"
          class="compare-at-price price price-original price-original--muted"
        >
          {{ formattedCompareAtPrice }}
        </span>
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

const formatMoney = money => {
  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
}

const displayedVariant = computed(() => {
  const variants = props.product.variants?.nodes || []
  const minimumPrice = props.product.priceRange?.minVariantPrice

  if (!minimumPrice) {
    return variants[0] || null
  }

  return variants.find(variant => (
    variant.price?.currencyCode === minimumPrice.currencyCode &&
    Number(variant.price?.amount) === Number(minimumPrice.amount)
  )) || variants[0] || null
})

const formattedPrice = computed(() => {
  const money = props.product.priceRange?.minVariantPrice

  return formatMoney(money)
})

const isDiscounted = computed(() => {
  const price = displayedVariant.value?.price
  const compareAtPrice = displayedVariant.value?.compareAtPrice

  return Boolean(
    price &&
    compareAtPrice &&
    price.currencyCode === compareAtPrice.currencyCode &&
    Number(compareAtPrice.amount) > Number(price.amount)
  )
})

const formattedCompareAtPrice = computed(() => {
  return isDiscounted.value
    ? formatMoney(displayedVariant.value.compareAtPrice)
    : ''
})

const discountPercentage = computed(() => {
  if (!isDiscounted.value) {
    return 0
  }

  const price = Number(displayedVariant.value.price.amount)
  const compareAtPrice = Number(displayedVariant.value.compareAtPrice.amount)

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
})
</script>
<style scoped>
.product-name{
    font-size: var(--font-size-body-large);
    text-transform: uppercase;
    margin-top: 5px;
    letter-spacing: 0.8px;
    color: var(--color-product-text);
    font-weight: var(--font-weight-medium);
}
.bs-item{
    width: 100%;
    height: auto;
    margin-top: 10px;
}
.product-img, .product-img-2{
    position: relative;
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
.image-discount-label{
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 3px 8px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.9);
    color: var(--color-brand-hover);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.35px;
    line-height: 1;
    white-space: nowrap;
    text-shadow: 0px 0px 2px rgba(255, 255, 255, 0.5);
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
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 7px;
    font-size: var(--font-size-body-large);
    text-transform: uppercase;
    margin-top: 5px;
    font-weight: var(--font-weight-semibold);
}
.compare-at-price{
    color: var(--color-price-original-muted);
    font-size: 0.85em;
    font-weight: var(--font-weight-regular);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
    white-space: nowrap;
}

@media (min-width: 393px) and (max-width: 524px){
    .image-discount-label{
        font-size: var(--font-size-xs);
    }

    .product-name{
        font-size: var(--font-size-sm);
        line-height: 1.3;
    }

    .product-price{
        font-size: var(--font-size-body-sm);
    }

    .compare-at-price{
        font-size: 0.82em;
    }
}
@media (max-width: 392px){
    .product-name{
        margin-top: 5px;
        font-size: var(--font-size-sm);
    }
    .product-price{
        font-size: var(--font-size-sm);
        text-transform: uppercase;
        margin-top: 5px;
        font-weight: var(--font-weight-semibold);
    }
}

@media (max-width: 362px){
    .bs-item{
        margin-top: 0;
    }
    .product-img,
    .product-img-2{
        margin-bottom: 5px;
    }
    .image-discount-label{
        top: 6px;
        right: 6px;
        min-height: 18px;
        padding: 2px 5px;
        font-size: 0.62rem;
        letter-spacing: 0.2px;
    }
    .product-name{
        margin-top: 2px;
        font-size: var(--font-size-xs-relaxed);
        line-height: 1.3;
        letter-spacing: 0.35px;
    }
    .product-price{
        gap: 5px;
        font-size: var(--font-size-sm);
        text-transform: uppercase;
        margin-top: 4px;
        font-weight: var(--font-weight-semibold);
    }
    .compare-at-price{
        font-size: 0.8em;
    }
}

</style>
