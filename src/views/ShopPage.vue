<template>
   <Navigation/>
   <div class="shop-container">
      <div class="s-header">
         All Products
      </div>
      <div class="s-description">
         We source our teas from organic estates and farms that are building soil health and going back to regenerative practices: no tilling, no pesticides, and no synthetic inputs. All our teas come from biodynamic estates. All our herbals come from organic farms, which have transitioned to regenerative agriculture. Picked fresh and sent in small batches, our products celebrate simple and pure ingredients free of pesticides or added flavorings.
      </div>
      <div class="sort-by-container">
         <div class="sort-by">SORT BY
            <select v-model="sortBy">
                <option value="featured">Featured</option>
                <option value="low-to-high">Price, low to high</option>
                <option value="high-to-low">Price, high to low</option>
            </select>
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

const productStore = useProductStore()
const sortBy = ref('featured')

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
      font-size: 2rem;
      font-weight: 300;
   }
   .shop-container .s-description{
      text-align: center;
      font-size: 0.9rem;
      font-weight: 400;
      width: 70%;
      height: auto;
      margin: 0 auto 50px;
      line-height: 25px;
      letter-spacing: 2px;
      padding: 0 0 20px 0;
   }
   .shop-container .sort-by-container{
      display: flex;
      font-size: 0.9rem;
      justify-content: space-around;
      align-items: center;
      border-top: 0.5px solid rgb(182, 182, 182);
      border-bottom: 0.5px solid rgb(182, 182, 182);
   }
   .shop-container .sort-by-container .sort-by select{
      margin-left: 10px;
      font-size: 1rem;
   }

   .shop-container .s-products-container{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-column-gap: 30px;
      grid-row-gap: 10px;
      align-items: start;
      width: 1050px;
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
      font-size: 1.05rem;
      text-transform: uppercase;
   }
   .shop-container .s-products-container .s-item .product-price{
      margin-top: 5px;
      font-weight: 700;
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
   @media (max-width: 340px){
      .shop-container .sort-by-container{
         display: flex;
         font-size: 0.7rem;
         justify-content: space-around;
         align-items: center;
         border-top: 0.5px solid rgb(182, 182, 182);
         border-bottom: 0.5px solid rgb(182, 182, 182);
      }
      .shop-container .sort-by-container .sort-by select{
         margin-left: 10px;
         font-size: 0.8rem;
      }
      .s-products{

      }
   }
</style>