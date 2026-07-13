import axios from 'axios'
import { defineStore } from 'pinia'
import { shopifyFetch } from '../services/shopify'

const CART_ID_STORAGE_KEY = 'shopifyCartId'

const CART_FIELDS = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity

    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
    }

    lines(first: 100) {
      nodes {
        id
        quantity

        cost {
          totalAmount {
            amount
            currencyCode
          }
        }

        merchandise {
          ... on ProductVariant {
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

            product {
              id
              handle
              title

              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`

const getUserErrorMessage = userErrors => {
  if (!userErrors?.length) {
    return null
  }

  return userErrors
    .map(error => error.message)
    .filter(Boolean)
    .join(', ')
}

export const useProductStore = defineStore('productStore', {
  state: () => ({
    products: [],
    selectedProduct: null,

    cart: null,
    cartLoading: false,
    cartError: null,
    isAddingToCart: false,

    orders: [],
    order: [],
    completedOrders: [],

    loading: false,
    error: null,

    shippingMethodView: false,
    discountView: false,
    isSubmitGiftCardCode: false,
    giftCardCodeInput: '',
    priceBeforeDiscount: null,
    finalPrice: null,
    newId: null
  }),

  getters: {
    totalProducts: state => state.products.length,

    bestSellingProducts: state => state.products.slice(0, 8),

    cartLines: state => state.cart?.lines?.nodes || [],

    cartTotalQuantity: state => state.cart?.totalQuantity || 0,

    cartSubtotal: state => state.cart?.cost?.subtotalAmount || null,

    cartTotal: state => state.cart?.cost?.totalAmount || null,

    checkoutUrl: state => state.cart?.checkoutUrl || ''
  },

  actions: {
    async getProducts() {
      if (this.products.length > 0) {
        return this.products
      }

      this.loading = true
      this.error = null

      const query = `
        query GetProducts($first: Int!) {
          products(first: $first, sortKey: BEST_SELLING) {
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

    getStoredCartId() {
      return localStorage.getItem(CART_ID_STORAGE_KEY)
    },

    storeCartId(cartId) {
      if (cartId) {
        localStorage.setItem(CART_ID_STORAGE_KEY, cartId)
      }
    },

    clearStoredCart() {
      localStorage.removeItem(CART_ID_STORAGE_KEY)
      this.cart = null
    },

    async initializeCart() {
      const cartId = this.getStoredCartId()

      if (!cartId) {
        this.cart = null
        return null
      }

      try {
        return await this.getCart(cartId)
      } catch (error) {
        console.error('Failed to restore Shopify cart:', error)
        this.clearStoredCart()
        return null
      }
    },

    async getCart(cartId = this.getStoredCartId()) {
      if (!cartId) {
        this.cart = null
        return null
      }

      this.cartLoading = true
      this.cartError = null

      const query = `
        ${CART_FIELDS}

        query GetCart($cartId: ID!) {
          cart(id: $cartId) {
            ...CartFields
          }
        }
      `

      try {
        const data = await shopifyFetch(query, {
          cartId
        })

        if (!data?.cart) {
          this.clearStoredCart()
          return null
        }

        this.cart = data.cart
        this.storeCartId(data.cart.id)

        return this.cart
      } catch (error) {
        console.error('Failed to fetch Shopify cart:', error)

        this.cartError =
          error instanceof Error
            ? error.message
            : 'Failed to fetch Shopify cart.'

        throw error
      } finally {
        this.cartLoading = false
      }
    },

    async createCart(merchandiseId, quantity = 1) {
      if (!merchandiseId) {
        throw new Error('A Shopify product variant is required.')
      }

      const mutation = `
        ${CART_FIELDS}

        mutation CreateCart($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              ...CartFields
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const data = await shopifyFetch(mutation, {
        input: {
          lines: [
            {
              merchandiseId,
              quantity
            }
          ]
        }
      })

      const payload = data?.cartCreate
      const userErrorMessage = getUserErrorMessage(payload?.userErrors)

      if (userErrorMessage) {
        throw new Error(userErrorMessage)
      }

      if (!payload?.cart) {
        throw new Error('Shopify did not return a cart.')
      }

      this.cart = payload.cart
      this.storeCartId(payload.cart.id)

      return this.cart
    },

    async addCartLines(cartId, merchandiseId, quantity = 1) {
      const mutation = `
        ${CART_FIELDS}

        mutation AddCartLines(
          $cartId: ID!
          $lines: [CartLineInput!]!
        ) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              ...CartFields
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const data = await shopifyFetch(mutation, {
        cartId,
        lines: [
          {
            merchandiseId,
            quantity
          }
        ]
      })

      const payload = data?.cartLinesAdd
      const userErrorMessage = getUserErrorMessage(payload?.userErrors)

      if (userErrorMessage) {
        throw new Error(userErrorMessage)
      }

      if (!payload?.cart) {
        throw new Error('Shopify did not return the updated cart.')
      }

      this.cart = payload.cart
      this.storeCartId(payload.cart.id)

      return this.cart
    },

    async addToCart(merchandiseId, quantity = 1) {
      const safeQuantity = Math.max(1, Number(quantity) || 1)

      this.isAddingToCart = true
      this.cartError = null

      try {
        const storedCartId = this.getStoredCartId()

        if (!storedCartId) {
          return await this.createCart(merchandiseId, safeQuantity)
        }

        try {
          return await this.addCartLines(
            storedCartId,
            merchandiseId,
            safeQuantity
          )
        } catch (error) {
          console.warn(
            'The stored cart could not be updated. Creating a new cart.',
            error
          )

          this.clearStoredCart()
          return await this.createCart(merchandiseId, safeQuantity)
        }
      } catch (error) {
        console.error('Failed to add product to Shopify cart:', error)

        this.cartError =
          error instanceof Error
            ? error.message
            : 'Failed to add the product to the cart.'

        throw error
      } finally {
        this.isAddingToCart = false
      }
    },

    async updateCartLine(lineId, quantity) {
      const cartId = this.getStoredCartId()
      const safeQuantity = Math.max(1, Number(quantity) || 1)

      if (!cartId || !lineId) {
        throw new Error('Cart and line identifiers are required.')
      }

      this.cartLoading = true
      this.cartError = null

      const mutation = `
        ${CART_FIELDS}

        mutation UpdateCartLines(
          $cartId: ID!
          $lines: [CartLineUpdateInput!]!
        ) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              ...CartFields
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      try {
        const data = await shopifyFetch(mutation, {
          cartId,
          lines: [
            {
              id: lineId,
              quantity: safeQuantity
            }
          ]
        })

        const payload = data?.cartLinesUpdate
        const userErrorMessage = getUserErrorMessage(payload?.userErrors)

        if (userErrorMessage) {
          throw new Error(userErrorMessage)
        }

        if (!payload?.cart) {
          throw new Error('Shopify did not return the updated cart.')
        }

        this.cart = payload.cart
        this.storeCartId(payload.cart.id)

        return this.cart
      } catch (error) {
        console.error('Failed to update Shopify cart line:', error)

        this.cartError =
          error instanceof Error
            ? error.message
            : 'Failed to update the cart item.'

        throw error
      } finally {
        this.cartLoading = false
      }
    },

    async removeCartLine(lineId) {
      const cartId = this.getStoredCartId()

      if (!cartId || !lineId) {
        throw new Error('Cart and line identifiers are required.')
      }

      this.cartLoading = true
      this.cartError = null

      const mutation = `
        ${CART_FIELDS}

        mutation RemoveCartLines(
          $cartId: ID!
          $lineIds: [ID!]!
        ) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              ...CartFields
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      try {
        const data = await shopifyFetch(mutation, {
          cartId,
          lineIds: [lineId]
        })

        const payload = data?.cartLinesRemove
        const userErrorMessage = getUserErrorMessage(payload?.userErrors)

        if (userErrorMessage) {
          throw new Error(userErrorMessage)
        }

        if (!payload?.cart) {
          throw new Error('Shopify did not return the updated cart.')
        }

        this.cart = payload.cart

        if (payload.cart.totalQuantity === 0) {
          this.clearStoredCart()
        } else {
          this.storeCartId(payload.cart.id)
        }

        return this.cart
      } catch (error) {
        console.error('Failed to remove Shopify cart line:', error)

        this.cartError =
          error instanceof Error
            ? error.message
            : 'Failed to remove the cart item.'

        throw error
      } finally {
        this.cartLoading = false
      }
    },

    proceedToCheckout() {
      if (!this.checkoutUrl) {
        throw new Error('Shopify checkout URL is not available.')
      }

      window.location.href = this.checkoutUrl
    },

    async getOrders() {
      this.loading = true

      try {
        const response = await axios.get('http://localhost:3000/orders')

        if (response.status !== 200) {
          throw new Error('Failed to fetch orders.')
        }

        this.orders = response.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async getCompletedOrders() {
      this.loading = true

      try {
        const response = await axios.get(
          'http://localhost:3000/completedOrders'
        )

        if (response.status !== 200) {
          throw new Error('Failed to fetch completed orders.')
        }

        this.completedOrders = response.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    }
  }
})