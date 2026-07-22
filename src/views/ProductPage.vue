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
          <div class="product-name-title">
            {{ recentlyAddedProductTitle }}
          </div>

          <div
            v-if="recentlyAddedVariantTitle"
            class="product-variant-name"
          >
            {{ recentlyAddedVariantTitle }}
          </div>
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
              :class="{ active: image.url === activeImageUrl }"
              :aria-label="image.altText || currentProduct.title"
              :aria-pressed="image.url === activeImageUrl"
              :style="{
                backgroundImage: `url('${image.url}')`
              }"
              @click="selectImage(image.url)"
              @mouseenter="selectImage(image.url)"
            ></button>
          </div>

          <div
            v-if="hasMultipleColorValues"
            class="variant-color-picker"
          >
            <div class="variant-color-header">
              <span class="variant-color-label">Color</span>
              <span class="variant-color-value">{{ selectedColorValue }}</span>
            </div>

            <div
              class="variant-color-options"
              role="radiogroup"
              aria-label="Color"
            >
              <button
                v-for="colorValue in colorValues"
                :key="colorValue"
                type="button"
                class="variant-color-button"
                :class="{
                  active: selectedColorValue === colorValue,
                  unavailable: !isColorAvailable(colorValue)
                }"
                role="radio"
                :aria-checked="selectedColorValue === colorValue"
                :aria-label="`${colorValue}${isColorAvailable(colorValue) ? '' : ' - Sold out'}`"
                :disabled="!isColorAvailable(colorValue)"
                @click="selectColor(colorValue)"
              >
                <span
                  class="variant-color-swatch"
                  :style="{ backgroundColor: getColorSwatch(colorValue) }"
                  aria-hidden="true"
                ></span>
                <span class="variant-color-name">{{ colorValue }}</span>
              </button>
            </div>
          </div>

          <div
            v-for="option in selectableNonColorOptions"
            :key="option.id || option.name"
            class="variant-option-picker"
          >
            <div class="variant-color-header">
              <span class="variant-color-label">{{ option.name }}</span>
              <span class="variant-color-value">{{ selectedOptions[option.name] }}</span>
            </div>

            <div
              class="variant-color-options"
              role="radiogroup"
              :aria-label="option.name"
            >
              <button
                v-for="optionValue in getOptionValues(option)"
                :key="optionValue"
                type="button"
                class="variant-option-button"
                :class="{
                  active: selectedOptions[option.name] === optionValue,
                  unavailable: !isOptionValueAvailable(option.name, optionValue)
                }"
                role="radio"
                :aria-checked="selectedOptions[option.name] === optionValue"
                :aria-label="`${optionValue}${isOptionValueAvailable(option.name, optionValue) ? '' : ' - Sold out'}`"
                :disabled="!isOptionValueAvailable(option.name, optionValue)"
                @click="selectOption(option.name, optionValue)"
              >
                {{ optionValue }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="main-inner-right">
        <div>
          <div class="payout">
<!--             <h1>
              {{ productTitleWithVariant }}
            </h1> -->
            <h1>
              {{ currentProduct.title }}
            </h1>

            <div
              v-if="selectedVariantTitle"
              class="product-variant-title"
            >
              {{ selectedVariantTitle }}
            </div>

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
const selectedOptions = ref({})
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
  const money =
    selectedVariant.value?.price ||
    currentProduct.value?.priceRange?.minVariantPrice

  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
})

const normalizeOptionValue = optionValue => {
  if (typeof optionValue === 'string') {
    return optionValue
  }

  return optionValue?.name || optionValue?.value || ''
}

const colorOption = computed(() => {
  return (
    currentProduct.value?.options?.find(option => (
      String(option.name).toLowerCase() === 'color'
    )) || null
  )
})

const colorValues = computed(() => {
  return (colorOption.value?.values || [])
    .map(normalizeOptionValue)
    .filter(Boolean)
})

const hasMultipleColorValues = computed(() => {
  return colorValues.value.length > 1
})

const getOptionValues = option => {
  return (option?.values || [])
    .map(normalizeOptionValue)
    .filter(Boolean)
}

const selectableOptions = computed(() => {
  return (currentProduct.value?.options || []).filter(option => (
    getOptionValues(option).length > 1
  ))
})

const selectableNonColorOptions = computed(() => {
  return selectableOptions.value.filter(option => option !== colorOption.value)
})

const hasSelectableOptions = computed(() => {
  return selectableOptions.value.length > 0
})

const selectedColorValue = computed(() => {
  if (!colorOption.value) {
    return ''
  }

  return selectedOptions.value[colorOption.value.name] || ''
})

const variantMatchesSelections = (variant, selections) => {
  const variantOptions = variant?.selectedOptions || []

  return Object.entries(selections).every(([name, value]) => (
    variantOptions.some(option => (
      option.name === name && option.value === value
    ))
  ))
}

const selectedVariant = computed(() => {
  const variants = currentProduct.value?.variants?.nodes || []
  const chosenVariant = variants.find(variant => (
    variantMatchesSelections(variant, selectedOptions.value)
  ))

  return chosenVariant || variants[0] || null
})

const selectedVariantTitle = computed(() => {
  if (!hasSelectableOptions.value || !selectedVariant.value) {
    return ''
  }

  const selectableOptionNames = new Set(
    selectableOptions.value.map(option => option.name)
  )

  return (selectedVariant.value.selectedOptions || [])
    .filter(option => selectableOptionNames.has(option.name))
    .map(option => option.value)
    .filter(Boolean)
    .join(' / ')
})


/* const productTitleWithVariant = computed(() => {
  const baseTitle = currentProduct.value?.title || ''
  const variant = selectedVariant.value
  if (!variant) return baseTitle

  const variantName = variant.title && variant.title !== 'Default Title'
    ? variant.title
    : (variant.selectedOptions || []).map(o => o.value).filter(v => v && v !== 'Default Title').join(' / ')

  return variantName ? `${baseTitle} (${variantName})` : baseTitle
}) */

const getImageKey = image => {
  return String(image?.url || '').split('?')[0]
}

const getVariantImages = variant => {
  const metafieldImages = (
    variant?.variantImages?.references?.nodes || []
  )
    .map(reference => reference?.image || null)
    .filter(image => image?.url)

  const images = [
    ...metafieldImages,
    variant?.image || null
  ].filter(image => image?.url)

  return images.filter((image, index) => (
    images.findIndex(candidate => getImageKey(candidate) === getImageKey(image)) === index
  ))
}

const productImages = computed(() => {
  const variants = currentProduct.value?.variants?.nodes || []
  const selectedImages = getVariantImages(selectedVariant.value)
  const selectedImageKeys = new Set(selectedImages.map(getImageKey))

  const otherVariantImageKeys = new Set(
    variants
      .filter(variant => variant.id !== selectedVariant.value?.id)
      .flatMap(getVariantImages)
      .map(getImageKey)
      .filter(imageKey => !selectedImageKeys.has(imageKey))
  )

  const sharedProductImages = (currentProduct.value?.images?.nodes || [])
    .filter(image => !otherVariantImageKeys.has(getImageKey(image)))

  const galleryImages = [
    ...selectedImages,
    ...sharedProductImages
  ]

  return galleryImages.filter((image, index) => (
    galleryImages.findIndex(candidate => getImageKey(candidate) === getImageKey(image)) === index
  ))
})

const recentlyAddedLine = computed(() => {
  return (
    productStore.cartLines.find(line => {
      return line.merchandise?.id === recentlyAddedVariantId.value
    }) || null
  )
})

const recentlyAddedProductTitle = computed(() => {
  const line = recentlyAddedLine.value
  return line?.merchandise?.product?.title || ''
})

const recentlyAddedVariantTitle = computed(() => {
  const line = recentlyAddedLine.value
  const variantTitle = line?.merchandise?.title || ''

  if (
    !hasSelectableOptions.value ||
    !variantTitle ||
    variantTitle === 'Default Title'
  ) {
    return ''
  }

  return variantTitle
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

const initializeSelectedOptions = product => {
  const variants = product?.variants?.nodes || []
  const initialVariant = (
    variants.find(variant => (
      variant.availableForSale && variant.quantityAvailable !== 0
    )) ||
    variants[0] ||
    null
  )

  selectedOptions.value = Object.fromEntries(
    (initialVariant?.selectedOptions || []).map(option => [
      option.name,
      option.value
    ])
  )
}

const loadProduct = async () => {
  const handle = route.params.handle

  try {
    const product = await productStore.getProductByHandle(handle)
    initializeSelectedOptions(product)

    activeImageUrl.value = ''
  } catch (error) {
    console.error('Failed to load product page:', error)
    activeImageUrl.value = ''
  }
}

const getMainImageUrl = () => {
  return (
    productImages.value[0]?.url ||
    selectedVariant.value?.image?.url ||
    currentProduct.value?.featuredImage?.url ||
    ''
  )
}

const selectColor = colorValue => {
  if (!colorOption.value) {
    return
  }

  selectedOptions.value = {
    ...selectedOptions.value,
    [colorOption.value.name]: colorValue
  }
  quantity.value = 1
  hideImageZoom()
}

const selectOption = (optionName, optionValue) => {
  selectedOptions.value = {
    ...selectedOptions.value,
    [optionName]: optionValue
  }
  quantity.value = 1
  hideImageZoom()
}

const isOptionValueAvailable = (optionName, optionValue) => {
  const selections = {
    ...selectedOptions.value,
    [optionName]: optionValue
  }
  const variants = currentProduct.value?.variants?.nodes || []

  return variants.some(variant => (
    variantMatchesSelections(variant, selections) &&
    variant.availableForSale &&
    variant.quantityAvailable !== 0
  ))
}

const isColorAvailable = colorValue => {
  if (!colorOption.value) {
    return false
  }

  const selections = {
    ...selectedOptions.value,
    [colorOption.value.name]: colorValue
  }
  const variants = currentProduct.value?.variants?.nodes || []

  return variants.some(variant => (
    variantMatchesSelections(variant, selections) &&
    variant.availableForSale &&
    variant.quantityAvailable !== 0
  ))
}

const getColorSwatch = colorValue => {
  const normalizedColor = String(colorValue)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')

  const colorMap = {
    'dark blue': '#2f5f86',
    'light blue': '#9bd4eb',
    blue: '#4f86b5',
    navy: '#233a5e',
    'light gray': '#c9c9c9',
    'light grey': '#c9c9c9',
    gray: '#8e8e8e',
    grey: '#8e8e8e',
    black: '#1f1f1f',
    white: '#ffffff',
    red: '#c84b4b',
    green: '#56835f',
    beige: '#d8c6a5',
    brown: '#7d5a45',
    pink: '#e3a8b7',
    purple: '#795c9b',
    yellow: '#e6c64f',
    orange: '#d98542'
  }

  return colorMap[normalizedColor] || '#dedede'
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
  if (event.target.closest('.other-images-product, .variant-color-picker, .variant-option-picker')) {
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

      // This warning has already been shown on ProductPage. Consume it here
      // so opening CartPage does not display the same warning a second time.
      productStore.cartWarning = null
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
  () => [selectedVariant.value?.id, productImages.value[0]?.url],
  () => {
    activeImageUrl.value = getMainImageUrl()
  },
  { immediate: true }
)

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
.product-variant-title {
  margin-top: -10px;
  margin-bottom: 20px;
  font-size: 1rem;
  font-weight: 400;
  color: rgb(110, 110, 110);
  letter-spacing: 0.5px;
  text-transform: uppercase;
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
  text-transform: capitalize;
}
.view-cart .middle .product-name-title{
  text-transform: capitalize;
}

.view-cart .middle .product-variant-name {
  margin-top: 4px;
  color: rgba(27, 36, 48, 0.58);
  font-size: 0.86em;
  line-height: 1.3;
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

.main .main-inner .main-inner-left .other-images .other-images-product.active {
  outline: 2px solid #1b9c85;
  outline-offset: 2px;
}

.variant-color-picker,
.variant-option-picker {
  width: 100%;
  margin-top: 16px;
  padding-top: 18px;
  border-top: 1px solid rgba(65, 61, 61, 0.18);
  box-sizing: border-box;
}

.variant-color-header {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.variant-color-label {
  color: rgb(65, 61, 61);
  font-size: 1.05rem;
  font-weight: 500;
}

.variant-color-value {
  color: rgba(65, 61, 61, 0.75);
  font-size: 0.95rem;
}

.variant-color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.variant-color-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  min-width: 125px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid rgba(65, 61, 61, 0.28);
  border-radius: 4px;
  background-color: #fff;
  color: rgb(65, 61, 61);
  box-sizing: border-box;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  text-transform: capitalize;
}

.variant-color-button:hover {
  border-color: #1b9c85;
  transform: translateY(-1px);
}

.variant-color-button.active {
  border-color: #1b9c85;
  box-shadow: 0 0 0 1px #1b9c85;
}

.variant-color-button.unavailable:not(.active) {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.variant-option-button {
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(65, 61, 61, 0.28);
  border-radius: 4px;
  background-color: #fff;
  color: rgb(65, 61, 61);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.variant-option-button:hover {
  border-color: #1b9c85;
  transform: translateY(-1px);
}

.variant-option-button.active {
  border-color: #1b9c85;
  box-shadow: 0 0 0 1px #1b9c85;
}

.variant-option-button.unavailable:not(.active) {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.variant-color-swatch {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 50%;
  box-sizing: border-box;
}

.variant-color-name {
  overflow-wrap: anywhere;
  font-size: 0.9rem;
  line-height: 1.25;
  text-align: left;
}

.main .main-inner .main-inner-right {
  min-width: 0;
}

.main .main-inner .main-inner-right .payout h1 {
  font-weight: 400;
  margin-bottom: 20px;
  text-transform: uppercase;
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

  .variant-color-picker,
  .variant-option-picker {
    margin-top: 12px;
    padding-top: 15px;
  }

  .variant-color-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .variant-color-button {
    width: 100%;
    min-width: 0;
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

@media (max-width: 367px) {
  .view-cart {
    width: 100%;
    max-width: 100vw;
  }

  .view-cart-inner {
    padding: 0 12px;
  }

  .view-cart .title {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 15px 0 9px;
    font-size: 0.75rem;
  }

  .view-cart .title .title-inner,
  .view-cart .title .cross {
    grid-column: auto;
  }

  .view-cart .middle {
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: start;
    gap: 10px;
    padding: 14px 0;
  }

  .view-cart .middle .little-img,
  .view-cart .middle .product-name {
    grid-column: auto;
  }

  .view-cart .middle .little-img {
    width: 64px;
  }

  .view-cart .middle .product-name {
    min-width: 0;
    padding-left: 0;
    font-size: clamp(0.72rem, 3.6vw, 0.82rem);
    line-height: 1.25;
    letter-spacing: 0.4px;
    overflow-wrap: anywhere;
  }

  .view-cart .middle .quantity {
    white-space: nowrap;
    font-size: 0.75rem;
  }

  .view-cart .view-cart-button .cart-button {
    min-width: 0;
    padding: 10px 8px;
    font-size: clamp(0.78rem, 4vw, 0.9rem);
  }

  .view-cart .view-cart-button .cart-button:hover {
    padding: 9.5px 8px;
  }

  .view-cart .continue-shopping {
    padding: 16px 8px;
    font-size: 0.82rem;
  }
}

@media (max-width: 340px) {
  .variant-color-options {
    grid-template-columns: 1fr;
  }

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
