<template>
   <Navigation/>
   <div class="shop-container">
      <div class="s-header text-page-title">
         All Products
      </div>
      <div class="s-description text-body">
         {{ brand.content.shop.description }}
      </div>
      <div class="sort-by-container">
         <div class="sort-by">
            SORT BY
            <div class="sort-select-display">
               <span>{{ selectedSortLabel }}</span>
               <span class="sort-select-arrow" aria-hidden="true"></span>
               <select
                  v-model="sortBy"
                  class="sort-select-control"
                  aria-label="Sort products"
               >
                  <option value="featured">Featured</option>
                  <option value="low-to-high">Price, low to high</option>
                  <option value="high-to-low">Price, high to low</option>
               </select>
            </div>
         </div>
         <div class="s-products">
            {{ productStore.totalProducts }} Products
         </div>
      </div>
      <div class="s-products-container">
         <div v-if="productStore.loading">
         Loading products...
         </div>

         <div v-else-if="productStore.error">
         {{ productStore.error }}
         </div>

         <Product
         v-else
         v-for="product in sortedProducts"
         :key="product.id"
         :product="product"
         />
      </div>
      <Footer/>
   </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
import Product from '../components/Product.vue'
import { useProductStore } from '../stores/productStore'
import { brand } from '../config/brand'

const productStore = useProductStore()
const sortBy = ref('featured')
const selectedSortLabel = computed(() => ({
  featured: 'Featured',
  'low-to-high': 'Price, low to high',
  'high-to-low': 'Price, high to low'
})[sortBy.value])

const sortedProducts = computed(() => {
  const products = [...productStore.products]

  if (sortBy.value === 'low-to-high') {
    return products.sort((firstProduct, secondProduct) => {
      const firstPrice = Number(
        firstProduct.priceRange?.minVariantPrice?.amount || 0
      )

      const secondPrice = Number(
        secondProduct.priceRange?.minVariantPrice?.amount || 0
      )

      return firstPrice - secondPrice
    })
  }

  if (sortBy.value === 'high-to-low') {
    return products.sort((firstProduct, secondProduct) => {
      const firstPrice = Number(
        firstProduct.priceRange?.minVariantPrice?.amount || 0
      )

      const secondPrice = Number(
        secondProduct.priceRange?.minVariantPrice?.amount || 0
      )

      return secondPrice - firstPrice
    })
  }

  return products
})
</script>

<style scoped>
   .shop-container{
      display: grid;
      grid-template-rows: 200px 2fr 50px auto;
      grid-template-columns: 1fr;
      max-height: auto;
      width: 100%;
   }
   .shop-container .s-header{
      text-align: center;
      align-self: center;
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-light);
   }
   .shop-container .s-description{
      text-align: center;
      font-size: var(--font-size-body-sm);
      font-weight: var(--font-weight-regular);
      width: 70%;
      height: auto;
      margin: 0 auto 50px;
      line-height: 25px;
      letter-spacing: 2px;
      padding: 0 0 20px 0;
   }
   .shop-container .sort-by-container{
      display: flex;
      font-size: var(--font-size-body-sm);
      justify-content: space-around;
      align-items: center;
      border-top: 0.5px solid var(--color-text-subtle);
      border-bottom: 0.5px solid var(--color-text-subtle);
   }
   .shop-container .sort-by-container .sort-by select{
      margin-left: 10px;
      font-size: var(--font-size-body);
   }
   .sort-select-display{
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-left: 10px;
      white-space: nowrap;
      cursor: pointer;
   }
   .sort-select-arrow{
      width: 7px;
      height: 7px;
      border-right: 1px solid currentColor;
      border-bottom: 1px solid currentColor;
      transform: translateY(-2px) rotate(45deg);
   }

   .shop-container .s-products-container{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      column-gap: var(--card-gap);
      row-gap: var(--card-gap);
      align-items: start;
      width: min(
        calc(100% - (2 * var(--page-padding-inline))),
        var(--shop-grid-max-width)
      );
      height: auto;
      margin: 50px auto;
      overflow: visible;
   }
   

   .shop-container .s-products-container .s-item{
      width: 100%;
      height: auto;
   }
   .shop-container .s-products-container .s-item .product-img{
      aspect-ratio: 1/1;
      width: 100%;
      height: auto;
      background-image: url(../assets/products/assam-black-600x600.webp);
      background-size: contain;
      background-repeat: no-repeat;
   }
   .shop-container .s-products-container .s-item .product-img:hover{
      aspect-ratio: 1/1;
      width: 100%;
      height: auto;
      background-image: url(../assets/products/secondary_product_600x600.jpeg);
      background-size: contain;
      background-repeat: no-repeat;
   }
   .shop-container .s-products-container .s-item .product-name, .product-price{
      font-size: var(--font-size-body-large);
      text-transform: uppercase;
   }
   .shop-container .s-products-container .s-item .product-price{
      margin-top: 5px;
      font-weight: var(--font-weight-bold);
   }

   /* responsive | stop shrinking*/
   @media (max-width: 1100px){
      .shop-container .s-products-container{
         display: grid;
         grid-template-columns: 1fr 1fr 1fr;
         grid-column-gap: 30px;
         grid-row-gap: 10px;
         width: 95%;
         height: auto;
         margin: 50px auto;
         overflow: visible;
      }
   }
   /* responsive smart phone */
   @media (max-width: 804px){
      .shop-container .s-products-container{
         display: grid;
         grid-template-columns: 1fr 1fr;
         grid-column-gap: 30px;
         grid-row-gap: 10px;
         align-items: start;
         width: 90%;
         height: auto;
         margin: 50px auto;
         overflow: visible;
      }
   }
   @media (min-width: 393px) and (max-width: 524px){
      .shop-container .s-header{
         font-size: 1.7rem;
         line-height: 1.25;
      }

      .shop-container .s-description{
         font-size: var(--font-size-sm);
         line-height: 1.65;
         letter-spacing: 1px;
      }

      .shop-container .sort-by-container{
         font-size: var(--font-size-sm);
      }

      .shop-container .sort-by-container .sort-by select{
         font-size: var(--font-size-sm-relaxed);
      }
   }
      @media (max-width: 392px){
      .shop-container .sort-by-container{
         display: flex;
         font-size: var(--font-size-sm);
         justify-content: space-around;
         align-items: center;
         border-top: 0.5px solid var(--color-text-subtle);
         border-bottom: 0.5px solid var(--color-text-subtle);
      }
      .shop-container .sort-by-container .sort-by select{
         margin-left: 10px;
         font-size: var(--font-size-body-sm);
      }
   }
   @media (max-width: 362px){
      .shop-container{
         grid-template-rows: auto auto auto auto;
      }
      .shop-container .s-header{
         padding: 44px 16px 20px;
         font-size: var(--font-size-2xl);
         line-height: 1.2;
      }
      .shop-container .s-description{
         width: calc(100% - 32px);
         margin: 0 auto 28px;
         padding: 0;
         font-size: var(--font-size-xs-relaxed);
         line-height: 1.65;
         letter-spacing: 0.6px;
      }
      .shop-container .sort-by-container{
         display: flex;
         min-height: 54px;
         padding: 8px 14px;
         gap: 8px;
         font-size: var(--font-size-xs);
         justify-content: space-between;
         align-items: center;
         border-top: 0.5px solid var(--color-text-subtle);
         border-bottom: 0.5px solid var(--color-text-subtle);
      }
      .shop-container .sort-by-container .sort-by{
         display: flex;
         min-width: 0;
         align-items: center;
         gap: 6px;
         white-space: nowrap;
      }
      .shop-container .sort-by-container .sort-by select{
         min-width: 0;
         max-width: 130px;
         margin-left: 0;
         padding: 4px 2px;
         font-size: var(--font-size-xs-relaxed);
      }
      .shop-container .sort-by-container .s-products{
         flex: 0 0 auto;
         white-space: nowrap;
      }
      .shop-container .s-products-container{
         grid-template-columns: repeat(2, minmax(0, 1fr));
         column-gap: 12px;
         row-gap: 20px;
         width: calc(100% - 24px);
         margin: 26px auto 38px;
      }
   }
   .shop-container .sort-by-container .sort-by .sort-select-display .sort-select-control{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      min-width: 0;
      max-width: none;
      margin: 0;
      padding: 0;
      opacity: 0;
      cursor: pointer;
   }
</style>
