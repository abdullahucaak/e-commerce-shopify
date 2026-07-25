<template>
  <div class="announce-nav-container">
    <div ref="announceBar" class="announce-bar">
      <span> Until October 20th, enjoy a 10% discount on every product with the code '1A18NM'! </span>
    </div>
    <nav>
      <div class="logo">
        <img src="../assets/Alaya-Logo_300x300.jpg" alt="Logo">
      </div>
      <div class="main-nav">
        <ul>
          <li>
            <RouterLink class="nav-item" :to="{name:'home'}">Home</RouterLink>
          </li>
          <li>
            <RouterLink class="nav-item" :to="{name:'shop'}">Shop <span class="dropdown-icon"></span></RouterLink>
          </li>
          <li>
            <RouterLink class="nav-item" :to="{name:'about-us'}">About Us</RouterLink>
          </li>
        </ul>
      </div>
      <div class="shop-search">
        <i @click="searchButtonOn" class="fa fa-light fa-search"></i>
        <RouterLink :to="{name:'cart'}">
          <i class="fa fa-cart-shopping">
            <div
             v-if="totalProductNumberOnCart > 0"
             class="cp-count">
                <div class="cp-count-inner">
                    {{ totalProductNumberOnCart }}
                </div>
            </div>
          </i>
        </RouterLink>
        <i @click="openBars" v-if="!isBarsOpen" class="fa-solid fa-bars"></i>
        <i @click="hideToBars" v-if="isBarsOpen" class="fa-solid fa-xmark xmark-vertical-bars"></i>
      </div>
      <div 
        class="searching-div-wrapper"
        ref="isSearchButtonOn"
        v-if="isSearchButtonOn" 
      >
        <div class="searching-div">
          <div class="sd-inner">
            <input 
              v-model="search" 
              type="text" 
              ref="input" 
              :autofocus="isSearchButtonOn"
            >
            <i @click="searchButtonOff" class="fa-solid fa-xmark xmark-search"></i>
          </div>
          <div
           v-if="search.length > 0"
           class="results-wrapper">
            <div class="results-inner">
              <div class="searched-products">
                <p class="product-header">Products</p>
                <div v-for="product in productsFound" :key="product.id">
                  <RouterLink 
                    class="searched-product" 
                    :to="{ name: 'product-page', params: { handle: product.handle } }"
                  >
                    <div 
                      class="sp-product-img"
                      :style="{ backgroundImage: `url('${product.featuredImage?.url || ''}')` }"
                    >

                    </div>
                    <div class="sp-content">
                      <div class="sp-product-name">{{ product.title }}</div>
                      <div class="sp-product-price"><small>{{ formatProductPrice(product) }}</small></div>
                    </div>
                  </RouterLink>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div 
      v-if="isBarsOpen" 
      class="bars"
      :class="{'slide-in': isAnimationWorked, 'slide-out': !isAnimationWorked}"
    >
      <div>
        <ul>
          <li>
            <RouterLink :to="{name:'home'}">Home</RouterLink>
          </li>
          <li>
            <RouterLink :to="{name:'shop'}">Shop <span class="dropdown-icon"></span></RouterLink>
          </li>
          <li>
            <RouterLink :to="{name:'about-us'}">About Us</RouterLink>
          </li>
        </ul>
      </div>
  </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { useProductStore } from '../stores/productStore'

const productStore = useProductStore()

const isSearchButtonOn = ref(false)
const search = ref('')
const isBarsOpen = ref(false)
const isAnimationWorked = ref(false)
const announceBar = ref(null)
let announceBarObserver

onMounted(async () => {
  const updateAnnounceBarHeight = () => {
    const height = announceBar.value?.getBoundingClientRect().height || 0
    document.documentElement.style.setProperty('--announce-bar-height', `${height}px`)
  }

  updateAnnounceBarHeight()
  announceBarObserver = new ResizeObserver(updateAnnounceBarHeight)
  if (announceBar.value) announceBarObserver.observe(announceBar.value)

  await productStore.initializeCart()
})

onBeforeUnmount(() => {
  announceBarObserver?.disconnect()
  document.documentElement.style.removeProperty('--announce-bar-height')
})

const searchButtonOn = () => {
  isSearchButtonOn.value = true
  isBarsOpen.value = false
}

const searchButtonOff = () => {
  isSearchButtonOn.value = false
}

onClickOutside(isSearchButtonOn, searchButtonOff)

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

const formatProductPrice = product => {
  const money = product.priceRange?.minVariantPrice

  if (!money) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode
  }).format(Number(money.amount))
}

const openBars = () => {
  isBarsOpen.value = true
  isAnimationWorked.value = true
}

const hideToBars = () => {
  setTimeout(() => {
    isBarsOpen.value = false
  }, 100)

  isAnimationWorked.value = false
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
    background-color: #4C4C6D;
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
    color: whitesmoke;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  .announce-nav-container nav{
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    justify-items: center;
    align-items: center;
    background-color: white;
    z-index: 100;
    position: relative;
    min-height: 147px;
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
    font-size: 1.1rem;
    cursor: pointer;
  }
  .announce-nav-container nav .searching-div-wrapper{
    display: inline-block;
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    background-color: white;
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
    border: 0.5px solid #4C4C6D;
    border-radius: 4px;
    font-size: 1rem;
    padding: 5px;
  }
  .announce-nav-container nav .sd-inner input:focus{
      border: 2px solid #4C4C6D;
  }
  .announce-nav-container nav .sd-inner .xmark-search{
    position: absolute;
    top: 50%;
    left: calc(100% + 10px);
    transform: translateY(-50%);
    font-size: 1.2rem;
    margin-left: 0;
    padding: 0;
    cursor: pointer;
  }
  .announce-nav-container nav .results-wrapper{
    width: 100%;
    background-color: white;
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
    font-size: 1.1rem;
    border-bottom: 0.5px solid gray;
    padding-bottom: 20px;
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
        background-color: #1B9C85;
        border: 1px solid #1B9C85;
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
      padding: 20px 20px;
      font-size: 14px;
      font-weight: 500;
      border-bottom: 0.5px solid rgba(0,0,0, 0.2);
      user-select: none;
    }
    .bars li:first-child{
      border-top: 0.5px solid rgba(0,0,0, 0.2);
    }
    .bars li:last-child{
      border-bottom: none;
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
    .slide-in{
        animation: slide-in 0.3s ease;
        z-index: +1;
      }
      .slide-out{
        animation: slide-out 0.3s ease;
        z-index: +1;
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
      font-size: 1rem;
      font-weight: 400;
    }
  }
  @media (max-width: 392px){
    .announce-nav-container nav .logo > img{
      width: 150px;
    }

    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-name{
        font-size: 0.95rem;
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-price{
        font-size: 1rem;
    }
    .announce-nav-container nav .searching-div{
      width: calc(100% - 80px);
      height: auto;
      margin: 50px auto 0;
      position: relative;
    }
      .announce-nav-container nav .sd-inner .xmark-search{
      font-size: 1rem;
      margin-left: 0;
      cursor: pointer;
    }

  }
  @media (max-width: 362px){
    .announce-nav-container nav .logo > img{
      width: 135px;
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-name{
        font-size: 0.85rem;
    }
    .announce-nav-container nav .results-wrapper .results-inner .searched-products .searched-product .sp-content .sp-product-price{
        font-size: 0.9rem;
    }
  }
</style>
