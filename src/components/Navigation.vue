<template>
  <div class="announce-nav-container">
    <div
      ref="announceBar"
      class="announce-bar site-announcement"
      :class="{ 'announce-bar--over-footer': isAnnounceOverFooter }"
    >
      <span> Until October 20th, enjoy a 10% discount on every product with the code '1A18NM'! </span>
    </div>
    <nav ref="navigationElement" class="site-navigation">
      <div class="logo">
        <img class="site-navigation__logo" src="../assets/Alaya-Logo_300x300.jpg" alt="Logo">
      </div>
      <div class="main-nav">
        <ul>
          <li>
            <RouterLink class="nav-item site-navigation__link" :to="{name:'home'}">Home</RouterLink>
          </li>
          <li>
            <RouterLink class="nav-item site-navigation__link" :to="{name:'shop'}">Shop <span class="dropdown-icon"></span></RouterLink>
          </li>
          <li>
            <RouterLink class="nav-item site-navigation__link" :to="{name:'about-us'}">About Us</RouterLink>
          </li>
        </ul>
      </div>
      <div class="shop-search">
        <i @click="searchButtonOn" class="fa fa-light fa-search"></i>
        <RouterLink :to="{name:'cart'}">
          <i class="fa fa-cart-shopping">
            <div
             v-if="totalProductNumberOnCart > 0"
            class="cp-count cart-count-badge">
                <div class="cp-count-inner">
                    {{ totalProductNumberOnCart }}
                </div>
            </div>
          </i>
        </RouterLink>
        <i
          @click="toggleBars"
          class="fa-solid fa-bars"
          role="button"
          aria-label="Toggle navigation menu"
          :aria-expanded="isBarsOpen"
        ></i>
      </div>
      <div 
        class="searching-div-wrapper search-panel"
        ref="searchPanel"
        v-if="isSearchButtonOn" 
      >
        <div class="searching-div">
          <div class="sd-inner">
            <input 
              v-model="search" 
              type="text" 
              ref="searchInput"
            >
            <i @click="searchButtonOff" class="fa-solid fa-xmark xmark-search"></i>
          </div>
          <div
           v-if="search.length > 0"
              class="results-wrapper search-results">
            <div class="results-inner">
              <div class="searched-products">
                <p class="product-header">Products</p>
                <p
                  v-if="productsFound.length === 0"
                  class="product-not-found"
                >
                  Product Not Found
                </p>
                <div v-for="product in productsFound" :key="product.id">
                  <RouterLink 
                    class="searched-product search-result-item"
                    :to="getSearchProductRoute(product)"
                  >
                    <div 
                      class="sp-product-img"
                      :style="{ backgroundImage: `url('${product.featuredImage?.url || ''}')` }"
                    >

                    </div>
                    <div class="sp-content">
                      <div class="sp-product-name">{{ product.title }}</div>
                      <div class="sp-product-price">
                        <small class="sp-current-price">
                          {{ formatProductPrice(product) }}
                        </small>
                        <small
                          v-if="isSearchVariantDiscounted(product)"
                          class="sp-compare-at-price"
                        >
                          {{ formatSearchCompareAtPrice(product) }}
                        </small>
                      </div>
                    </div>
                  </RouterLink>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <Transition name="mobile-menu">
      <div
        v-if="isBarsOpen"
        class="bars"
      >
        <div class="bars-inner">
          <ul>
            <li>
              <RouterLink :to="{name:'home'}" @click="continueMenuCloseOnNextPage('home')">Home</RouterLink>
            </li>
            <li>
              <RouterLink :to="{name:'shop'}" @click="continueMenuCloseOnNextPage('shop')">Shop <span class="dropdown-icon"></span></RouterLink>
            </li>
            <li>
              <RouterLink :to="{name:'about-us'}" @click="continueMenuCloseOnNextPage('about-us')">About Us</RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { useProductStore } from '../stores/productStore'

const productStore = useProductStore()
const route = useRoute()

const isSearchButtonOn = ref(false)
const searchPanel = ref(null)
const searchInput = ref(null)
const search = ref('')
const mobileMenuTransitionKey = 'mobile-menu-closing'
const shouldResumeMenuClose = sessionStorage.getItem(mobileMenuTransitionKey) === 'true'
const isBarsOpen = ref(shouldResumeMenuClose)
const isAnnounceOverFooter = ref(false)
const announceBar = ref(null)
const navigationElement = ref(null)
let announceBarObserver

const updateNavigationOffsets = () => {
  const announceRect = announceBar.value?.getBoundingClientRect()
  const announceHeight = announceRect?.height || 0
  const navigationBottom =
    navigationElement.value?.getBoundingClientRect().bottom || announceHeight
  const visibleHeaderBottom = Math.max(announceHeight, navigationBottom)
  const footerRect = document.querySelector('.site-footer')?.getBoundingClientRect()

  isAnnounceOverFooter.value = Boolean(
    window.innerWidth <= 804 &&
    announceRect &&
    footerRect &&
    footerRect.top <= announceRect.bottom &&
    footerRect.bottom > announceRect.top
  )

  document.documentElement.style.setProperty(
    '--announce-bar-height',
    `${announceHeight}px`
  )
  document.documentElement.style.setProperty(
    '--navigation-visible-bottom',
    `${visibleHeaderBottom}px`
  )
}

onMounted(async () => {
  if (shouldResumeMenuClose) {
    sessionStorage.removeItem(mobileMenuTransitionKey)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isBarsOpen.value = false
      })
    })
  }

  updateNavigationOffsets()
  announceBarObserver = new ResizeObserver(updateNavigationOffsets)
  if (announceBar.value) announceBarObserver.observe(announceBar.value)
  if (navigationElement.value) announceBarObserver.observe(navigationElement.value)
  window.addEventListener('scroll', updateNavigationOffsets, { passive: true })
  window.addEventListener('resize', updateNavigationOffsets, { passive: true })

  await productStore.initializeCart()
  updateNavigationOffsets()
})

onBeforeUnmount(() => {
  announceBarObserver?.disconnect()
  window.removeEventListener('scroll', updateNavigationOffsets)
  window.removeEventListener('resize', updateNavigationOffsets)
  document.documentElement.style.removeProperty('--announce-bar-height')
  document.documentElement.style.removeProperty('--navigation-visible-bottom')
})

const searchButtonOn = async () => {
  isSearchButtonOn.value = true
  isBarsOpen.value = false
  await nextTick()
  searchInput.value?.focus()
}

const searchButtonOff = () => {
  isSearchButtonOn.value = false
}

onClickOutside(searchPanel, searchButtonOff)

const productsFound = computed(() => {
  const searchTerm = search.value.trim().toLowerCase()

  if (!searchTerm) {
    return []
  }

  return productStore.products
    .filter(product => {
      return product.title.toLowerCase().includes(searchTerm)
    })
    .slice(0, 5)
})

const getDisplayedSearchVariant = product => {
  const variants = product.variants?.nodes || []
  const minimumPrice = product.priceRange?.minVariantPrice

  if (!minimumPrice) {
    return variants[0] || null
  }

  return variants.find(variant => (
    variant.price?.currencyCode === minimumPrice.currencyCode &&
    Number(variant.price?.amount) === Number(minimumPrice.amount)
  )) || variants[0] || null
}

const formatMoney = money => {
  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
}

const formatProductPrice = product => {
  const displayedVariant = getDisplayedSearchVariant(product)
  const money = displayedVariant?.price || product.priceRange?.minVariantPrice

  return formatMoney(money)
}

const isSearchVariantDiscounted = product => {
  const displayedVariant = getDisplayedSearchVariant(product)
  const price = displayedVariant?.price
  const compareAtPrice = displayedVariant?.compareAtPrice

  return Boolean(
    price &&
    compareAtPrice &&
    price.currencyCode === compareAtPrice.currencyCode &&
    Number(compareAtPrice.amount) > Number(price.amount)
  )
}

const formatSearchCompareAtPrice = product => {
  if (!isSearchVariantDiscounted(product)) {
    return ''
  }

  return formatMoney(getDisplayedSearchVariant(product)?.compareAtPrice)
}

const getSearchProductRoute = product => {
  const displayedVariant = getDisplayedSearchVariant(product)

  return {
    name: 'product-page',
    params: {
      handle: product.handle
    },
    query: displayedVariant?.id
      ? { variant: displayedVariant.id }
      : {}
  }
}

const toggleBars = () => {
  isBarsOpen.value = !isBarsOpen.value
}

const continueMenuCloseOnNextPage = routeName => {
  if (route.name !== routeName) {
    sessionStorage.setItem(mobileMenuTransitionKey, 'true')
  }
  isBarsOpen.value = false
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 700) {
    isBarsOpen.value = false
  }
})

const totalProductNumberOnCart = computed(() => {
  return productStore.cartTotalQuantity
})
</script>
<style scoped>
  body{
    z-index: 0;
  }
  .announce-nav-container{
    display: contents;
  }
  .announce-nav-container .announce-bar{
    background-color: var(--color-announcement-bg);
    width: 100%;
    min-height: 46px;
    padding: 10px 0px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.4;
    overflow-wrap: anywhere;
    color: var(--color-announcement-text);
    position: sticky;
    top: 0;
    z-index: 1000;
    transition: background-color 0.45s ease;
  }
  .announce-nav-container .announce-bar.announce-bar--over-footer{
    background-color: var(--color-brand-secondary);
  }
  .announce-nav-container nav{
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    justify-items: center;
    align-items: center;
    background-color: var(--color-surface);
    z-index: 100;
    position: relative;
    min-height: var(--header-min-height);
    border-bottom: solid rgba(0,0,0, 0.2) 0.5px;
  }
/* nav-inner */
  .announce-nav-container nav .logo > img{
    width: 200px;
    height: auto;
    display: block;
    object-fit: contain;
  }
  .announce-nav-container nav .main-nav{
    width: 100%;
  }
  .announce-nav-container nav .main-nav ul{
    list-style-type:none ;
    text-align: center;
  }
  .announce-nav-container nav .main-nav ul li{
    display: inline-block;
    cursor: pointer;
  }
  .announce-nav-container nav .main-nav ul li .dropdown-icon {
    display: inline-block;
    width: 0.4em;
    height: 0.4em;
    margin-left: 5px;
    margin-bottom: 3px;
    border-top: 1px solid;
    border-right: 1px solid;
    transform: rotate(135deg);
    transition: transform 0.3s;
  }
  .announce-nav-container nav .shop-search i {
    padding: 0 8px ;
    font-size: var(--font-size-lg);
    cursor: pointer;
  }
  .announce-nav-container nav .searching-div-wrapper{
    display: inline-block;
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    background-color: var(--color-surface);
  }
  .announce-nav-container nav .searching-div{
    width: 60%; 
    height: auto;
    margin: 50px auto 0;
    position: relative;
  }
  .announce-nav-container nav .sd-inner{
    width: 100%;
    position: relative;
  }
  .announce-nav-container nav .sd-inner input{
    width: 100%;
    height: 40px;
    box-sizing: border-box;
    border: 0.5px solid var(--color-announcement-bg);
    border-radius: 4px;
    font-size: var(--font-size-body);
    padding: 5px;
  }
  .announce-nav-container nav .sd-inner input:focus{
      border: 2px solid var(--color-announcement-bg);
  }
  .announce-nav-container nav .sd-inner .xmark-search{
    position: absolute;
    top: 50%;
    left: calc(100% + 10px);
    transform: translateY(-50%);
    font-size: var(--font-size-heading-sm);
    margin-left: 0;
    padding: 0;
    cursor: pointer;
  }
  .announce-nav-container nav .results-wrapper{
    width: 100%;
    background-color: var(--color-surface);
    border: 0.5px solid gray;
    position: absolute;
    z-index: 2;
  }
  .announce-nav-container nav .results-wrapper .results-inner{
    width: 100%; 
    height: auto;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products{
    margin: 20px;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .product-header{
    width: 100%;
    font-size: var(--font-size-lg);
    border-bottom: 0.5px solid gray;
    padding-bottom: 20px;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .product-not-found{
    margin: 20px 0 0;
    color: var(--color-text, inherit);
    font-size: var(--font-size-body);
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product{
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    padding: 10px 0;
    height: auto;
    border-bottom: 0.5px solid gray;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-product-img{
    aspect-ratio: 1/1;
    width: 50px;
    height: auto;
    background-size: contain;
    background-repeat: no-repeat;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content{
    margin-left: 20px;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-product-price{
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-compare-at-price{
    color: var(--color-price-original-muted);
    font-size: 0.82em;
    font-weight: var(--font-weight-regular);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
    white-space: nowrap;
  }
  .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-name:hover{
      text-decoration: underline;
      user-select: none;
      cursor: pointer;
  }

  /* product number on cart */
  .fa-cart-shopping{
    position: relative;
  }
  .cp-count{
        width: 19px;
        height: 19px;
        background-color: var(--color-brand-secondary);
        border: 1px solid var(--color-brand-secondary);
        border-radius: 50%;
        position: absolute;
        top: -10px;
        right: -7px;
        z-index: 0;
      }
      .cp-count-inner{
        position: absolute;
        color: white;
        font-size: 10px;
        top: 3px;
        width: 100%;
        height: 100%;
        text-align: center;
    }



  /* Nav Responsive */
  @media (max-width: 700px){
    .announce-nav-container nav{
      display: grid;
      grid-template-columns: 1fr 1fr;
      justify-items: center;
      align-items: center;
    }
    .announce-nav-container nav .logo{
      justify-self: start;
    }
    .announce-nav-container nav .logo > img{
      width: 170px;
    }
    .announce-nav-container nav .shop-search{
      justify-self: end;
      margin-right: 2rem;
    }
    .announce-nav-container nav .main-nav{
      display: none;
    }
    .bars li{
      font-size: 14px;
      font-weight: var(--font-weight-medium);
      border-bottom: 0.5px solid rgba(0,0,0, 0.2);
      user-select: none;
    }
    .bars li a{
      display: block;
      width: 100%;
      padding: 20px;
    }
    .bars li:first-child{
      border-top: none;
    }
    .bars li:last-child{
      border-bottom: 0.5px solid rgba(0,0,0, 0.2);
    }
    .bars{
      max-height: 200px;
      overflow: hidden;
      opacity: 1;
      transition:
        max-height 0.5s ease,
        opacity 0.5s ease;
    }
    .bars-inner{
      min-height: 0;
      overflow: hidden;
    }
    .mobile-menu-enter-from,
    .mobile-menu-leave-to{
      max-height: 0;
      opacity: 0;
    }
    .mobile-menu-enter-to,
    .mobile-menu-leave-from{
      max-height: 200px;
      opacity: 1;
    }
    .announce-nav-container nav .searching-div{
      width: calc(100% - 80px);
      height: auto;
      margin: 50px auto 0;
      position: relative;
    }
  }
  @media (min-width: 700px){
    .announce-nav-container nav .shop-search .fa-bars, .xmark-vertical-bars{
      display: none;
    }
  }
  @media (max-width: 700px){
    .announce-bar{
      font-size: var(--font-size-body);
      font-weight: var(--font-weight-regular);
    }
  }
  @media (max-width: 392px){
    .announce-nav-container nav .logo > img{
      width: 150px;
    }

    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-name{
        font-size: var(--font-size-body-compact);
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-price{
        font-size: var(--font-size-body);
    }
    .announce-nav-container nav .searching-div{
      width: calc(100% - 80px);
      height: auto;
      margin: 50px auto 0;
      position: relative;
    }
      .announce-nav-container nav .sd-inner .xmark-search{
      font-size: var(--font-size-body);
      margin-left: 0;
      cursor: pointer;
    }

  }
  @media (max-width: 362px){
    .announce-nav-container nav .logo > img{
      width: 135px;
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-name{
        font-size: var(--font-size-sm);
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-price{
        font-size: var(--font-size-body-sm);
    }
  }
</style>
