import axios from 'axios';
import { shopifyFetch } from '../services/shopify'
import { defineStore } from 'pinia'

export const useProductStore = defineStore('productStore', {
  state: () => ({
    products: [],
    cartProducts:[],
    cartProductsLS:[], /* localStorage */
    orders:[],
    order:[], /* localStorage */
    completedOrders:[],
    loading:false,
    error: null,
    shippingMethodView: false,
    discountView: false,
    isSubmitGiftCardCode: false,
    giftCardCodeInput: "",
    priceBeforeDiscount: null,
    finalPrice: null,
    newId: null,
    selectedProduct: null,
  }),
  getters: { /* computed */
    /* shop-page | how many products are */
    totalProducts:(state) => {
    return state.products.length 
    },
    bestSellingProducts: state => {
      return state.products.slice(0, 8)
    },
    /* calculate subtotal */
    calculateSubtotal:(state) => {
      let subtotal = 0
      for( const p of state.cartProductsLS ){
        subtotal += Number(p.totalPrice)
      }
      return subtotal
    }
  },
  actions:{
    /* get Products with Shopify API */
   async getProducts() {
      if (this.products.length > 0) {
        return this.products
      }

      this.loading = true
      this.error = null

      const query = `
        query GetProducts($first: Int!) {
          products(
            first: $first
            sortKey: BEST_SELLING
          ) {
            nodes {
              id
              handle
              title
              description
              descriptionHtml
              availableForSale
              tags

              featuredImage {
                url
                altText
                width
                height
              }

              images(first: 10) {
                nodes {
                  url
                  altText
                  width
                  height
                }
              }

              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }

                maxVariantPrice {
                  amount
                  currencyCode
                }
              }

              variants(first: 20) {
                nodes {
                  id
                  title
                  availableForSale

                  price {
                    amount
                    currencyCode
                  }

                  image {
                    url
                    altText
                  }

                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      `

      try {
        const data = await shopifyFetch(query, {
          first: 50
        })

        this.products = data?.products?.nodes || []

        return this.products
      } catch (error) {
        console.error('Failed to fetch Shopify products:', error)

        this.error =
          error instanceof Error
            ? error.message
            : 'Failed to fetch Shopify products.'

        this.products = []

        throw error
      } finally {
        this.loading = false
      }
    },
    async getProductByHandle(handle) {
      if (!handle) {
        this.selectedProduct = null
        throw new Error('Product handle is missing.')
      }

      this.loading = true
      this.error = null

      const query = `
        query GetProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
            handle
            title
            description
            descriptionHtml
            availableForSale
            tags

            featuredImage {
              url
              altText
              width
              height
            }

            images(first: 20) {
              nodes {
                url
                altText
                width
                height
              }
            }

            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }

              maxVariantPrice {
                amount
                currencyCode
              }
            }

            options {
              id
              name
              values
            }

            variants(first: 100) {
              nodes {
                id
                title
                availableForSale

                price {
                  amount
                  currencyCode
                }

                compareAtPrice {
                  amount
                  currencyCode
                }

                image {
                  url
                  altText
                }

                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      `

      try {
        const data = await shopifyFetch(query, {
          handle
        })

        this.selectedProduct = data?.productByHandle || null

        return this.selectedProduct
      } catch (error) {
        console.error('Failed to fetch Shopify product:', error)

        this.error =
          error instanceof Error
            ? error.message
            : 'Failed to fetch Shopify product.'

        this.selectedProduct = null

        throw error
      } finally {
        this.loading = false
      }
    },
    /* get cartProducts with JSON */
    async getCartProducts() {
      this.loading = true;
      try {
        const response = await axios.get('http://localhost:3000/cartProducts');
    
        if (response.status !== 200) {
          throw new Error('Failed to fetch cart products.');
        }
    
        this.cartProducts = response.data;
        this.loading = false;
      } catch (error) {
        console.error(error);
      }
    },
    /* get orders with JSON */
    async getOrders() {
      this.loading = true;
      try {
        const response = await axios.get('http://localhost:3000/orders');
    
        if (response.status !== 200) {
          throw new Error('Failed to fetch orders.');
        }
    
        this.orders = response.data;
        this.loading = false;
      } catch (error) {
        console.error(error);
      }
    },
    /* get orders with JSON */
    async getCompletedOrders() {
      this.loading = true;
      try {
        const response = await axios.get('http://localhost:3000/completedOrders');
    
        if (response.status !== 200) {
          throw new Error('Failed to fetch completedOrders.');
        }
    
        this.completedOrders = response.data;
        this.loading = false;
      } catch (error) {
        console.error(error);
      }
    },
    /* add product to cart | CANCELED AFTER LOCALSTORAGE UPDATE  */
/*     async addCartProduct(cartProduct){
      const existingProduct = this.cartProducts.find( p => p.id === cartProduct.id)
      if(existingProduct){
         existingProduct.quantity += cartProduct.quantity
         existingProduct.totalPrice = Number(existingProduct.price * existingProduct.quantity).toFixed(2);
         try {
          const patchRes = await axios.patch(
            `http://localhost:3000/cartProducts/${cartProduct.id}`,
            {
              quantity: existingProduct.quantity,
              totalPrice: existingProduct.totalPrice,
            }
          );
          if (!patchRes.ok) {
            throw new Error('Failed to update cart product.');
          }
        } catch (error) {
          console.log(error);
        }
      }else{
        // Add it as a new item
        this.cartProducts.push(cartProduct);        
        try {
          const res = await axios.post('http://localhost:3000/cartProducts', cartProduct);  
          if (!res.ok) {
            throw new Error('Failed to add product to cart.');
          }
        } catch (error) {
          console.log(error);
        }
      }
      console.log("existingProduct:" + existingProduct)
    } */

   /* delete product from cart */
    async deleteProduct(id){
      this.cartProductsLS = this.cartProductsLS.filter( p => {
        return p.id !== id
      })
      localStorage.setItem('cartProducts', JSON.stringify(this.cartProductsLS));

      
/*    const res = await axios.delete(`http://localhost:3000/cartProducts/${id}`);
      if (res.error) {
        console.log(res.error);
      } | CANCELED AFTER LOCALSTORAGE UPDATE */
    }
  }
})
