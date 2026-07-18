<template>
  <!-- Recently added product panel -->
  <div
    v-if="isAddedToCart"
    class="view-cart"
    :class="{
      'slide-in': isOpenCart,
      'slide-out': !isOpenCart
    }"
  >
    <div class="view-cart-inner">
      <div class="title">
        <div class="title-inner">
          JUST ADDED TO YOUR CART
        </div>

        <div class="cross">
          <i
            class="fa-solid fa-xmark"
            @click="hideCartPanel"
          ></i>
        </div>
      </div>

      <div
        v-if="recentlyAddedLine"
        class="middle"
      >
        <div
          class="little-img"
          :style="{
            backgroundImage: `url('${recentlyAddedImageUrl}')`
          }"
        ></div>

        <div class="product-name">
          {{ recentlyAddedLine.merchandise.product.title }}
        </div>

        <div class="quantity">
          Qty: {{ recentlyAddedQuantity }}
        </div>
      </div>

      <div class="view-cart-button">
        <RouterLink :to="{ name: 'cart' }">
          <button
            type="button"
            class="cart-button"
          >
            VIEW CART
            <span>
              ( {{ productStore.cartTotalQuantity }} )
            </span>
          </button>
        </RouterLink>
      </div>

      <RouterLink :to="{ name: 'shop' }">
        <div
          class="continue-shopping"
          @click="hideCartPanel"
        >
          Continue Shopping
        </div>
      </RouterLink>
    </div>
  </div>

  <!-- Cart error pop-up -->
  <div
    v-if="cartMessage && ['error', 'warning'].includes(cartMessageType)"
    class="cart-popup-overlay"
    role="presentation"
    @click.self="hideCartPopup"
  >
    <div
      class="cart-popup"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cart-popup-title"
    >
      <button
        type="button"
        class="cart-popup-close"
        aria-label="Close"
        @click="hideCartPopup"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>

      <div class="cart-popup-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
      </div>

      <h2 id="cart-popup-title">Dear Friend</h2>

      <p>{{ cartMessage }}</p>

      <button
        type="button"
        class="cart-popup-button"
        @click="hideCartPopup"
      >
        OK
      </button>
    </div>
  </div>

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
          <div class="product-image-zoom-wrapper">
            <div
              class="big-img"
              :style="{
                backgroundImage: `url('${highResImageUrl}')`
              }"
              @mouseenter="showImageZoom"
              @mousemove="updateImageZoom"
              @mouseleave="hideImageZoom"
            >
              <div
                v-if="isImageZoomVisible"
                class="image-zoom-lens"
                :style="{
                  left: `${imageZoomX}%`,
                  top: `${imageZoomY}%`
                }"
              ></div>
            </div>

            <div
              v-if="isImageZoomVisible"
              class="image-zoom-preview"
              :style="{
                backgroundImage: `url('${highResImageUrl}')`,
                backgroundPosition: `${imageZoomX}% ${imageZoomY}%`
              }"
            ></div>
          </div>

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
              @mouseenter="selectImage(image.url)"
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
                  :max="selectedVariant?.quantityAvailable || undefined"
                  step="1"
                  :disabled="isAddToCartDisabled"
                >
              </div>
            </div>

            <div class="purchase-buttons">
              <button
                type="button"
                class="p-btn-1 add-to-card"
                :disabled="isAddToCartDisabled"
                @click="handleAddToCart"
              >
                {{ addToCartButtonText }}
              </button>

              <button
                type="button"
                class="p-btn-1 apple-pay"
                disabled
              >
                BUY WITH <i class="fa-brands fa-apple-pay fa-2xl"></i>
              </button>

              <p
                v-if="cartMessage && cartMessageType === 'success'"
                class="cart-message success"
              >
                {{ cartMessage }}
              </p>
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
import { useProductStore } from '../stores/productStore'

const route = useRoute()
const productStore = useProductStore()

const activeImageUrl = ref('')
const quantity = ref(1)
const cartMessage = ref('')
const cartMessageType = ref('success')
const isAddedToCart = ref(false)
const isOpenCart = ref(false)
const recentlyAddedVariantId = ref('')
const recentlyAddedQuantity = ref(0)
const isImageZoomVisible = ref(false)
const imageZoomX = ref(50)
const imageZoomY = ref(50)

const highResImageUrl = computed(() => {
  return activeImageUrl.value
    ? activeImageUrl.value.replace(/([?&])width=\d+/g, '').replace(/([?&])height=\d+/g, '')
    : ''
})


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

const selectedVariant = computed(() => {
  const variants = currentProduct.value?.variants?.nodes || []

  return (
    variants.find(variant => (
      variant.availableForSale &&
      variant.quantityAvailable !== 0
    )) ||
    variants[0] ||
    null
  )
})

const recentlyAddedLine = computed(() => {
  return (
    productStore.cartLines.find(line => {
      return line.merchandise?.id === recentlyAddedVariantId.value
    }) || null
  )
})

const recentlyAddedImageUrl = computed(() => {
  return (
    recentlyAddedLine.value?.merchandise?.image?.url ||
    recentlyAddedLine.value?.merchandise?.product?.featuredImage?.url ||
    currentProduct.value?.featuredImage?.url ||
    ''
  )
})

const isAddToCartDisabled = computed(() => {
  return (
    productStore.isAddingToCart ||
    !currentProduct.value?.availableForSale ||
    !selectedVariant.value?.availableForSale ||
    selectedVariant.value?.quantityAvailable === 0
  )
})

const addToCartButtonText = computed(() => {
  if (productStore.isAddingToCart) {
    return 'ADDING...'
  }

  if (
    !currentProduct.value?.availableForSale ||
    !selectedVariant.value?.availableForSale ||
    selectedVariant.value?.quantityAvailable === 0
  ) {
    return 'SOLD OUT'
  }

  return 'ADD TO CART'
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

const getMainImageUrl = () => {
  return (
    currentProduct.value?.featuredImage?.url ||
    currentProduct.value?.images?.nodes?.[0]?.url ||
    ''
  )
}

const selectImage = imageUrl => {
  activeImageUrl.value = imageUrl
}

const showImageZoom = event => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return
  }

  isImageZoomVisible.value = true
  updateImageZoom(event)
}

const updateImageZoom = event => {
  if (!isImageZoomVisible.value) {
    return
  }

  const imageBounds = event.currentTarget.getBoundingClientRect()
  const pointerX = event.clientX - imageBounds.left
  const pointerY = event.clientY - imageBounds.top

  imageZoomX.value = Math.min(
    100,
    Math.max(0, (pointerX / imageBounds.width) * 100)
  )
  imageZoomY.value = Math.min(
    100,
    Math.max(0, (pointerY / imageBounds.height) * 100)
  )
}

const hideImageZoom = () => {
  isImageZoomVisible.value = false
}

const resetToMainImage = () => {
  activeImageUrl.value = getMainImageUrl()
}

const handleDocumentPointerDown = event => {
  if (event.target.closest('.other-images-product')) {
    return
  }

  resetToMainImage()
}

const handleAddToCart = async () => {
  cartMessage.value = ''

  if (!selectedVariant.value?.id) {
    cartMessageType.value = 'error'
    cartMessage.value = 'This product does not have an available variant.'
    return
  }

  quantity.value = Math.max(1, Number(quantity.value) || 1)

  if (
    selectedVariant.value.quantityAvailable !== null &&
    quantity.value > selectedVariant.value.quantityAvailable
  ) {
    cartMessageType.value = 'error'
    cartMessage.value = `Only ${selectedVariant.value.quantityAvailable} item(s) are currently available.`
    return
  }

  try {
    const existingLineBeforeAdd = productStore.cartLines.find(
      line => line.merchandise?.id === selectedVariant.value.id
    )
    const quantityBeforeAdd = existingLineBeforeAdd?.quantity || 0

    await productStore.addToCart(
      selectedVariant.value.id,
      quantity.value
    )

    const addedLineAfterAdd = productStore.cartLines.find(
      line => line.merchandise?.id === selectedVariant.value.id
    )
    const quantityAfterAdd = addedLineAfterAdd?.quantity || 0
    const actualAddedQuantity = Math.max(
      0,
      quantityAfterAdd - quantityBeforeAdd
    )

    if (actualAddedQuantity > 0) {
      recentlyAddedVariantId.value = selectedVariant.value.id
      recentlyAddedQuantity.value = actualAddedQuantity
      isAddedToCart.value = true
      isOpenCart.value = true
    } else {
      recentlyAddedVariantId.value = null
      recentlyAddedQuantity.value = 0
      isAddedToCart.value = false
      isOpenCart.value = false
    }

    if (productStore.cartWarning) {
      cartMessageType.value = 'warning'
      cartMessage.value = productStore.cartWarning
    } else {
      cartMessageType.value = 'success'
      cartMessage.value = 'Product added to cart.'
    }
  } catch (error) {
    console.error('Failed to add product to cart:', error)
    cartMessageType.value = 'error'
    cartMessage.value =
      productStore.cartError ||
      'The product could not be added to the cart.'
  }
}

const hideCartPopup = () => {
  cartMessage.value = ''
}

const hideCartPanel = () => {
  isOpenCart.value = false

  window.setTimeout(() => {
    isAddedToCart.value = false
  }, 499)
}

onMounted(() => {
  loadProduct()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})

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

.cart-popup-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background-color: rgba(0, 0, 0, 0.45);
  box-sizing: border-box;
  z-index: 1000;
}

.cart-popup {
  position: relative;
  width: min(100%, 430px);
  padding: 34px 30px 28px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.22);
  box-sizing: border-box;
  text-align: center;
}

.cart-popup-close {
  position: absolute;
  top: 12px;
  right: 14px;
  padding: 5px;
  border: 0;
  background: transparent;
  color: #535e6f;
  font-size: 1.25rem;
  cursor: pointer;
}

.cart-popup-icon {
  margin-bottom: 14px;
  color: rgb(71, 71, 71);
  font-size: 2.2rem;
}

.cart-popup h2 {
  margin: 0 0 12px;
  color: #1b2430;
  font-size: 1.35rem;
  font-weight: 500;
}

.cart-popup p {
  margin: 0;
  color: #535e6f;
  font-size: 1rem;
  line-height: 1.55;
}

.cart-popup-button {
  width: 75%;
  margin-top: 24px;
  padding: 12px 18px;
  border: 1px solid #1b9c85;
  border-radius: 4px;
  background-color: white;
  color: #1b9c85;
  font-size: 0.95rem;
  cursor: pointer;
  transition: 0.3s;
}

.cart-popup-button:hover {
  width: 80%;
  background-color: white;
  color: #1b9c85;
}

@media (max-width: 480px) {
  .cart-popup-overlay {
    padding: 14px;
  }

  .cart-popup {
    padding: 32px 20px 22px;
  }

  .cart-popup h2 {
    font-size: 1.2rem;
  }

  .cart-popup p {
    font-size: 0.92rem;
  }
}

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

.main .main-inner .main-inner-left .product-image-zoom-wrapper {
  position: relative;
}

.main .main-inner .main-inner-left .big-img {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  overflow: hidden;
  cursor: crosshair;
}

.main .main-inner .main-inner-left .image-zoom-lens {
  position: absolute;
  width: 38%;
  aspect-ratio: 1 / 1;
  border: 1px solid rgba(27, 156, 133, 0.75);
  background-color: rgba(27, 156, 133, 0.16);
  box-sizing: border-box;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.main .main-inner .main-inner-left .image-zoom-preview {
  position: absolute;
  top: 0;
  left: calc(100% + 30px);
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: 180%;
  background-repeat: no-repeat;
  background-color: white;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 20;
  pointer-events: none;

  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.main .main-inner .main-inner-left .other-images {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.main .main-inner .main-inner-left .other-images .other-images-product {
  width: 100%;
  aspect-ratio: 1 / 1;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border-radius: 5px;

  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.main .main-inner .main-inner-left .other-images .other-images-product:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.8);
    z-index: 2;
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

.main .main-inner .main-inner-right .payout .purchase-buttons .add-to-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.main .main-inner .main-inner-right .payout .purchase-buttons .add-to-card:disabled:hover {
  background-color: white;
  color: #1b9c85;
}

.cart-message {
  margin: 4px 0 16px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.cart-message.success {
  color: #1b9c85;
}

.cart-message.error {
  color: #dc3545;
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

  .main .main-inner .main-inner-left .image-zoom-lens,
  .main .main-inner .main-inner-left .image-zoom-preview {
    display: none;
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