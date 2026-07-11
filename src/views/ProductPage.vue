<template>
  <Navigation />

  <div
    v-if="productStore.loading"
    class="loading"
  >
    Loading product...
  </div>

  <div
    v-else-if="productStore.error"
    class="error"
  >
    {{ productStore.error }}
  </div>

  <div
    v-else-if="!currentProduct"
    class="error"
  >
    Product not found.
  </div>

  <div
    v-else
    class="main"
  >
    <div class="main-inner">
      <div class="main-inner-left">
        <div>
          <div
            class="big-img"
            :style="{
              backgroundImage: `url('${activeImageUrl}')`
            }"
          ></div>

          <div class="other-images">
            <button
              v-for="image in productImages"
              :key="image.url"
              type="button"
              class="other-images-product"
              :aria-label="image.altText || currentProduct.title"
              :style="{
                backgroundImage: `url('${image.url}')`
              }"
              @click="selectImage(image.url)"
            ></button>
          </div>
        </div>
      </div>

      <div class="main-inner-right">
        <div>
          <div class="payout">
            <h1>
              {{ currentProduct.title }}
            </h1>

            <div class="product-stars">
              <i class="fa fa-light fa-star"></i>
              <i class="fa fa-light fa-star"></i>
              <i class="fa fa-light fa-star"></i>
              <i class="fa fa-light fa-star"></i>
              <i class="fa fa-light fa-star"></i>
            </div>

            <div class="product-price">
              {{ formattedPrice }}
            </div>

            <div class="quantity">
              <div class="q-header">
                Quantity
              </div>

              <div class="q-input-div">
                <input
                  v-model.number="quantity"
                  class="q-input"
                  type="number"
                  min="1"
                  step="1"
                >
              </div>
            </div>

            <div class="purchase-buttons">
              <button
                type="button"
                class="p-btn-1 add-to-card"
                disabled
              >
                ADD TO CART
              </button>

              <button
                type="button"
                class="p-btn-1 apple-pay"
                disabled
              >
                BUY WITH <i class="fa-brands fa-apple-pay fa-2xl"></i>
              </button>
            </div>
          </div>

          <div class="description">
            <div 
                class="description-text"
                v-html="currentProduct.descriptionHtml"
            >
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="main-inner-bottom">
      <RouterLink :to="{ name: 'shop' }">
        <button class="back-btn">
          <i class="fa fa-light fa-arrow-left"></i>
          BACK TO ALL PRODUCTS
        </button>
      </RouterLink>
    </div>

    <Footer />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
import { useProductStore } from '../stores/productStore'

const route = useRoute()
const productStore = useProductStore()

const activeImageUrl = ref('')
const quantity = ref(1)

const currentProduct = computed(() => {
  return productStore.selectedProduct
})

const formattedPrice = computed(() => {
  const money = currentProduct.value?.priceRange?.minVariantPrice

  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
})

const productImages = computed(() => {
  return currentProduct.value?.images?.nodes || []
})

const loadProduct = async () => {
  const handle = route.params.handle

  try {
    const product = await productStore.getProductByHandle(handle)

    activeImageUrl.value =
      product?.featuredImage?.url ||
      product?.images?.nodes?.[0]?.url ||
      ''
  } catch (error) {
    console.error('Failed to load product page:', error)
    activeImageUrl.value = ''
  }
}

const selectImage = imageUrl => {
  activeImageUrl.value = imageUrl
}

onMounted(loadProduct)

watch(
  () => route.params.handle,
  async (newHandle, oldHandle) => {
    if (newHandle !== oldHandle) {
      quantity.value = 1
      await loadProduct()
    }
  }
)
</script>

<style scoped>
.view-cart {
  background-color: white;
  border: 1px solid #ebebeb;
  width: 350px;
  position: fixed;
  right: 0;
  box-shadow: 1px 1px 10px 2px rgba(0, 0, 0, 0.1);
  z-index: 5;
}

.view-cart-inner {
  padding: 0 20px;
}

.view-cart .title {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  font-size: 14px;
  padding: 20px 0 10px;
  border-bottom: 0.5px solid gray;
}

.view-cart .title .title-inner {
  grid-column: 1 / 5;
}

.view-cart .title .cross {
  text-align: right;
  font-size: 1.3rem;
  cursor: pointer;
}

.view-cart .middle {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  padding: 20px 0;
}

.view-cart .middle .little-img {
  grid-column: 1 / 2;
  aspect-ratio: 1 / 1;
  background-size: contain;
  background-repeat: no-repeat;
}

.view-cart .middle .product-name {
  grid-column: 2 / 5;
  padding-left: 20px;
  letter-spacing: 1px;
  font-weight: 500;
}

.view-cart .middle .quantity {
  text-align: right;
}

.view-cart .view-cart-button {
  margin: 0 auto;
}

.view-cart .view-cart-button .cart-button {
  width: 100%;
  background-color: white;
  line-height: 1.4;
  border: solid #1b9c85 0.5px;
  border-radius: 2px;
  font-size: 1rem;
  color: #1b9c85;
  padding: 12px 0;
}

.view-cart .view-cart-button .cart-button:hover {
  border: solid #1b9c85 1px;
  color: #1b9c85;
  padding: 11.5px 0;
}

.view-cart .continue-shopping {
  text-align: center;
  letter-spacing: 0.7px;
  color: #1b9c85;
  text-decoration: underline;
  font-size: 0.9rem;
  padding: 20px;
}

@keyframes slide-in {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes slide-out {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-100%);
  }
}

.slide-in {
  animation: slide-in 0.5s ease;
}

.slide-out {
  animation: slide-out 0.5s ease;
}

.main {
  width: 100%;
  display: grid;
  margin-top: 50px;
}

.main .main-inner {
  width: 1200px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 30px;
  align-items: start;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.main .main-inner .main-inner-left {
  min-width: 0;
}

.main .main-inner .main-inner-left > div {
  display: grid;
  grid-template-rows: auto auto;
  gap: 10px;
}

.main .main-inner .main-inner-left .big-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.main .main-inner .main-inner-left .other-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}

.main .main-inner .main-inner-left .other-images .other-images-product {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid #ddd;
  box-sizing: border-box;
}

.main .main-inner .main-inner-right {
  min-width: 0;
}

.main .main-inner .main-inner-right .payout h1 {
  font-weight: 400;
  margin-bottom: 20px;
}

.main .main-inner .main-inner-right .payout .product-stars {
  color: rgb(255, 211, 33);
  font-size: 0.8rem;
  margin-bottom: 10px;
}

.main .main-inner .main-inner-right .payout .product-price {
  color: rgb(65, 61, 61);
  font-weight: 600;
  font-size: 1.3rem;
  margin-bottom: 30px;
}

.main .main-inner .main-inner-right .payout .quantity .q-header {
  color: rgb(65, 61, 61);
  font-weight: 400;
  font-size: 1.1rem;
  margin-bottom: 10px;
}

.main .main-inner .main-inner-right .payout .quantity .q-input-div .q-input {
  width: 100px;
  padding: 10px 0;
  font-size: 1rem;
  text-indent: 20px;
  border: solid rgb(188, 188, 188, 0.6) 1px;
}

.main .main-inner .main-inner-right .payout .purchase-buttons {
  margin-top: 10px;
  width: 400px;
}

.main .main-inner .main-inner-right .payout .purchase-buttons button {
  margin-bottom: 10px;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .p-btn-1 {
  display: block;
  width: 100%;
  line-height: 1.4;
  padding-left: 5px;
  padding-right: 5px;
  white-space: normal;
  margin-top: 0;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 4px;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .add-to-card {
  background-color: white;
  border: solid #1b9c85 0.5px;
  color: #1b9c85;
  transition: 0.6s;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .add-to-card:hover {
  background-color: #1b9c85;
  border: solid #1b9c85 0.5px;
  color: white;
  transition: 0.6s;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .apple-pay {
  background-color: #5a31f4;
  border: solid #5a31f4 0.5px;
  color: whitesmoke;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .more-payment-options {
  display: block;
  text-decoration: underline;
  font-size: 0.9rem;
  margin: 0 auto 20px;
  color: rgb(63, 63, 63);
  background-color: white;
}

.main .main-inner .main-inner-right .description {
  text-align: justify;
  letter-spacing: 1.5px;
  line-height: 22px;
  font-size: 0.9rem;
}

.main .main-inner .main-inner-right .description p {
  margin-bottom: 20px;
}

.main .main-inner .main-inner-right .description ul li {
  list-style-type: disc;
  width: 90%;
}
.description-text :deep(img) {
    display: none;
}

.main .main-inner-bottom .back-btn {
  display: block;
  margin: 20px auto 50px;
  padding: 20px 30px;
  background-color: white;
  border: solid #1b9c85 0.5px;
  color: #1b9c85;
  transition: 0.6s;
}

.main .main-inner-bottom .back-btn:hover {
  padding: 20px 50px;
  transition: 0.5s;
}

@media (min-width: 700px) and (max-width: 1205px) {
  .main .main-inner {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .main .main-inner .main-inner-left {
    display: grid;
    grid-template-rows: 2.5fr;
    grid-gap: 10px;
  }

  .main .main-inner .main-inner-right {
    display: grid;
    grid-template-rows: auto;
  }

  .main .main-inner .main-inner-right .payout .purchase-buttons {
    margin-top: 10px;
    width: 90%;
  }

  .main .main-inner .main-inner-right .payout .purchase-buttons .more-payment-options {
    margin: 0 auto 20px;
  }

  .main .main-inner .main-inner-right .description {
    width: 90%;
    color: rgba(0, 0, 0, 0.7);
    line-height: 22px;
    font-size: 0.8rem;
  }
}

@media (max-width: 700px) {
  .main {
    display: grid;
  }

  .main .main-inner {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    grid-column-gap: 0;
    margin: 0 auto;
    width: 95%;
    padding: 0 0 20px;
  }

  .main .main-inner .main-inner-left {
    display: grid;
    grid-template-rows: auto auto;
  }

  .main .main-inner .main-inner-left .big-img {
    aspect-ratio: 1 / 1;
    background-size: contain;
    background-repeat: no-repeat;
  }

  .main .main-inner .main-inner-left .other-images .other-images-product {
    aspect-ratio: 1 / 1;
    background-size: contain;
    background-repeat: no-repeat;
    border: solid #1b9c85 0.5px;
    margin: 0;
  }

  .main .main-inner .main-inner-right {
    display: grid;
    grid-template-rows: 2.5fr;
    margin-top: 20px;
  }

  .main .main-inner .main-inner-right .payout {
    width: 100%;
    margin: 0 auto 50px;
    font-weight: 400;
  }

  .main .main-inner .main-inner-right .payout .purchase-buttons {
    margin-top: 10px;
    width: 100%;
  }

  .main .main-inner .main-inner-right .description {
    width: 90%;
    margin: 0 auto;
    text-align: justify;
    letter-spacing: 1.5px;
    line-height: 22px;
    font-size: 0.9rem;
  }
}

@media (max-width: 340px) {
  .main .main-inner .main-inner-right .payout h1 {
    font-size: 1.5rem;
    font-weight: 400;
    margin-bottom: 10px;
  }

  .main .main-inner .main-inner-right .payout .product-price {
    color: rgb(60, 60, 60);
    font-weight: 600;
    font-size: 1.2rem;
    margin-bottom: 15px;
  }

  .main .main-inner .main-inner-right .payout .quantity .q-header {
    display: inline-block;
    color: rgb(65, 61, 61);
    font-weight: 400;
    font-size: 1.1rem;
    margin-bottom: 10px;
  }

  .main .main-inner .main-inner-right .payout .quantity .q-input-div {
    display: inline-block;
    margin-left: 10px;
  }

  .main .main-inner .main-inner-right .payout .quantity .q-input-div .q-input {
    width: 100px;
    padding: 10px 0;
    font-size: 1rem;
    text-indent: 15px;
    border: solid rgb(188, 188, 188, 0.6) 1px;
  }

  .view-cart {
    background-color: white;
    border: 1px solid #ebebeb;
    width: 96%;
    position: fixed;
    right: 0;
    box-shadow: 1px 1px 10px 2px rgba(0, 0, 0, 0.1);
    z-index: 5;
  }

  .view-cart .view-cart-button .cart-button {
    width: 100%;
    background-color: white;
    line-height: 1.4;
    border: solid #1b9c85 0.5px;
    border-radius: 2px;
    font-size: 0.9rem;
    color: #1b9c85;
    padding: 12px 0;
  }
}

.loading,
.error {
  text-align: center;
  margin: 2rem 25%;
  padding: 2rem;
  font-size: 1.2rem;
}

.error {
  color: #dc3545;
}


/* Shopify description styling */
.description-text {
  font-size: 0.95rem;
  line-height: 1.7;
  letter-spacing: 0;
  text-align: left;
}

.description-text :deep(img),
.description-text :deep(picture),
.description-text :deep(video),
.description-text :deep(iframe) {
  display: none;
}

.description-text :deep(p) {
  margin: 0 0 10px;
}

.description-text :deep(ul),
.description-text :deep(ol) {
  margin: 10px 0;
  padding-left: 22px;
}

.description-text :deep(li) {
  margin-bottom: 6px;
}

.description-text :deep(strong) {
  font-weight: 600;
}

</style>