<template>
    <!-- Cart quantity / inventory warning pop-up -->
    <div
        v-if="productStore.cartWarning"
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

            <p>{{ productStore.cartWarning }}</p>

            <button
                type="button"
                class="cart-popup-button"
                @click="hideCartPopup"
            >
                OK
            </button>
        </div>
    </div>

    <Navigation/>
    <div class="main">
        <div
            v-if="productStore.cartLoading && !productStore.cart"
            class="cart-status"
        >
            Loading cart...
        </div>

        <div
            v-else-if="productStore.cartError"
            class="cart-status cart-error"
        >
            {{ productStore.cartError }}
        </div>

        <div
            v-else-if="productStore.cartLines.length === 0"
            class="main-inner-cart-empty"
        >
            <div class="mice-inner">
                <h1 class="your-cart">Your Cart</h1>
                <div>Your Cart is Currently Empty</div>
                <RouterLink :to="{name:'shop'}">
                    <button type="button"> CONTINUE SHOPPING </button>
                </RouterLink>
            </div>
        </div>

        <div v-else class="main-inner">
            <div class="cart-header">
                <h1>Your Cart</h1>
                <RouterLink class="continue-shopping" :to="{name:'shop'}">
                    Continue Shopping
                </RouterLink>
            </div>


            <div
                v-if="productStore.inventoryError"
                class="cart-inventory-warning"
            >
                {{ productStore.inventoryError }}
            </div>

            <form @submit.prevent="goToCheckout">
                <table class="cart-table">
                    <thead class="t-heading">
                        <tr>
                            <th>PRODUCT</th>
                            <th>PRICE</th>
                            <th>QUANTITY</th>
                            <th>TOTAL</th>
                        </tr>
                    </thead>

                    <tbody
                        v-for="cartLine in productStore.cartLines"
                        :key="cartLine.id"
                    >
                        <CartProduct :cart-line="cartLine"/>
                    </tbody>
                </table>

                <div class="cart-footer">
                    <div class="cart-footer-inner">
                        <div class="f-left">
                            <label
                                style="display: block; margin-bottom: 20px; font-weight: 300;"
                                for="order-note"
                            >
                                Add a note to your order
                            </label>

                            <textarea
                                id="order-note"
                                name="userNote"
                                v-model="userNote"
                                cols="40"
                                rows="3"
                            ></textarea>
                        </div>

                        <div class="f-right">
                            <div class="f-right-inner">
                                <div class="cart-sub-total-wrapper">
                                    <div class="cart-sub-total">
                                        <span class="subtotal">Subtotal</span>
                                        <span class="subtotal subtotal-prices">
                                            <span>{{ formattedSubtotal }}</span>
                                            <span
                                                v-if="formattedOriginalSubtotal"
                                                class="original-subtotal"
                                            >
                                                {{ formattedOriginalSubtotal }}
                                            </span>
                                        </span>
                                    </div>

                                    <div
                                        v-if="formattedSavings"
                                        class="cart-savings-message"
                                    >
                                        You saved {{ formattedSavings }} on this order.
                                    </div>

                                    <div class="cart-shipping-message">
                                        Taxes and shipping calculated at checkout
                                    </div>
                                </div>

                                <div class="cart-buttons-container">
                                    <div class="submit-control">
                                        <input
                                            type="submit"
                                            name="checkout"
                                            :disabled="productStore.cartLoading || !productStore.checkoutUrl"
                                            :value="productStore.cartLoading ? 'Updating...' : 'Check Out'"
                                        >
                                    </div>

                                    <div class="additional-checkout-buttons">
                                        <ul>
                                            <li class="icons">
                                                <i class="fa-brands fa-apple-pay fa-2xl"></i>
                                            </li>
                                            <li class="icons">
                                                <i class="fa-brands fa-google-pay fa-2xl"></i>
                                            </li>
                                            <li class="icons">
                                                <i class="fa-brands fa-paypal fa-2xl"></i>
                                            </li>
                                            <li class="icons">
                                                <i class="fa-brands fa-cc-mastercard fa-2xl"></i>
                                            </li>
                                            <li class="icons">
                                                <i class="fa-brands fa-cc-visa fa-2xl"></i>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="how-did-you-hear">
                    <div class="head">How did you hear about us?</div>
                    <div class="options">
                        <select v-model="howDidYouHear">
                            <option>Please Make a Selection</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Google">Google</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Influencer">Influencer</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </form>
        </div>

        <Footer/>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
import CartProduct from '../components/CartProduct.vue'

import { useProductStore } from '../stores/productStore'

const productStore = useProductStore()

// Product-page add-to-cart warnings must not remain visible on the cart page.
productStore.cartError = null
productStore.inventoryError = null

const hideCartPopup = () => {
    productStore.cartWarning = null
}

const userNote = ref('')
const howDidYouHear = ref('Please Make a Selection')

const formattedSubtotal = computed(() => {
    const money = productStore.cartSubtotal

    if (!money) {
        return '$0.00 USD'
    }

    const formattedAmount = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currencyCode
    }).format(Number(money.amount))

    return formattedAmount
})

const formattedSavings = computed(() => {
    const subtotalCurrency = productStore.cartSubtotal?.currencyCode

    if (!subtotalCurrency) {
        return ''
    }

    const savings = productStore.cartLines.reduce((total, cartLine) => {
        const price = cartLine.merchandise?.price
        const compareAtPrice = cartLine.merchandise?.compareAtPrice

        if (
            !price ||
            !compareAtPrice ||
            price.currencyCode !== subtotalCurrency ||
            compareAtPrice.currencyCode !== subtotalCurrency ||
            Number(compareAtPrice.amount) <= Number(price.amount)
        ) {
            return total
        }

        return total + (
            (Number(compareAtPrice.amount) - Number(price.amount)) *
            cartLine.quantity
        )
    }, 0)

    if (savings <= 0) {
        return ''
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: subtotalCurrency
    }).format(savings)
})

const formattedOriginalSubtotal = computed(() => {
    const subtotal = productStore.cartSubtotal

    if (!subtotal) {
        return ''
    }

    let hasDiscountedLine = false

    const originalTotal = productStore.cartLines.reduce((total, cartLine) => {
        const price = cartLine.merchandise?.price
        const compareAtPrice = cartLine.merchandise?.compareAtPrice
        const hasCompareAtPrice = Boolean(
            price &&
            compareAtPrice &&
            price.currencyCode === subtotal.currencyCode &&
            compareAtPrice.currencyCode === subtotal.currencyCode &&
            Number(compareAtPrice.amount) > Number(price.amount)
        )

        if (hasCompareAtPrice) {
            hasDiscountedLine = true
        }

        const unitAmount = hasCompareAtPrice
            ? Number(compareAtPrice.amount)
            : Number(price?.amount || 0)

        return total + (unitAmount * cartLine.quantity)
    }, 0)

    if (!hasDiscountedLine) {
        return ''
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: subtotal.currencyCode
    }).format(originalTotal)
})

const goToCheckout = async () => {
    productStore.inventoryError = null

    try {
        await productStore.proceedToCheckout()
    } catch (error) {
        window.alert(
            productStore.inventoryError ||
            (error instanceof Error
                ? error.message
                : 'Your cart inventory could not be verified.')
        )
    }
}

onMounted(async () => {
    productStore.cartError = null
    productStore.inventoryError = null

    try {
        await productStore.initializeCart()
    } catch (error) {
        console.error('Failed to load Shopify cart:', error)
    }
})
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

.main{
    display: grid;
}
.main .main-inner-cart-empty{
    margin: 100px auto;
    width: 60%;
    text-align: center;
}
.main .main-inner-cart-empty .mice-inner{
    padding: 100px 0;
}
.main .main-inner-cart-empty .mice-inner .your-cart{
    letter-spacing: 3px;
    font-weight: 500;
}
.main .main-inner-cart-empty .mice-inner div{
    margin-top: 20px;
    letter-spacing: 1px;
}
.main .main-inner-cart-empty .mice-inner button{
    background-color: white;
    color: #1b9c85;
    border: 1px solid #1b9c85;
    font-size: 0.8rem;
    letter-spacing: 1px;
    padding: 15px 35px;
    border-radius: 5px;
    margin-top: 20px;
    transition: 0.5s;
}
.main .main-inner-cart-empty .mice-inner button:hover{
    background-color: #1b9c85;
    color: whitesmoke;
    font-size: 0.8rem;
    letter-spacing: 0.1px;
    padding: 15px 55px;
    border-radius: 5px;
    margin-top: 20px;
    transition: 0.5s;
}
.main .main-inner{
    width: 1197px;
    margin: 50px auto 0;
    padding: 20px;
}
.main .main-inner .cart-header{
    text-align: center;
}
.main .main-inner .cart-header h1{
    margin-bottom: 20px;
    font-weight: 400;
}
.main .main-inner .cart-header a{
    color: #535e6f;
    text-decoration: underline;
}
.main .main-inner .cart-header a:hover{
    color: #1b9c85;
}
.main .main-inner form .cart-table{
    border-collapse: collapse;
    margin: 25px 0;
    width: 100%;
    text-align: left;
}
.main .main-inner form .cart-table thead tr th,
.main .main-inner form .cart-table tbody tr td{
    padding: 12px 15px;
    border-bottom: solid 0.5px rgb(184, 184, 184);
    font-size: 1.05em;
    font-weight: 400;
}
.main .main-inner form .cart-table tbody tr td{
    padding: 30px 15px;
}
.main .main-inner form .cart-table tbody tr .cart-product-information{
    display: grid;
    grid-template-columns: 1fr 3fr;
    align-items: center;
}
.main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-img{
    aspect-ratio: 1/1;
    width: 100px;
    height: auto;
    /* background-image: url(../assets/products/assam-black-600x600.webp); */
    background-size: contain;
    background-repeat: no-repeat;
}
.main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-name-wrapper .remove{
    margin-top: 5px;
    color: rgb(203, 116, 107);
    text-decoration: underline;
}
.main .main-inner form .cart-table tbody tr .cart-quantity .cart-quantity-input{
    width: 100px;
    padding: 20px 10px;
    border: solid 0.5px #1b2430;
    font-size: 1.1rem;
}
.main .main-inner form .cart-table tbody tr .cart-quantity .q-input-smart-phone{
    display: none;
}

.main .main-inner form .cart-footer .cart-footer-inner{
    display: grid;
    grid-template-columns: 1fr 1fr;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
    border: 0.5px solid black;
    border-radius: 3px;
    font-size: 1rem;
    letter-spacing: 1.2px;
    font-weight: 300;
    padding: 10px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-left textarea:focus{
    border: 0.5px solid #1b9c85;
    border-width: 1.5px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right{
    justify-self: end;
    width: 100%;
    display: grid;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner{
    justify-self: end;
    display: grid;
    width: 100%;
}

.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper{
    justify-self: end;
    width: 100%;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin: 0 0 20px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total > span:nth-child(2){
    margin-left: auto;
    padding-left: 30px;
    text-align: right;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-savings-message{
    margin: -8px 0 14px;
    color: #147967;
    font-size: 0.9em;
    font-weight: 500;
    text-align: right;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-shipping-message{
    margin-bottom: 50px;
    font-size: 0.9em;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control{
    display: grid;
    justify-content: end;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input{
    padding: 10px 30px;
    background-color: #1b9c85;
    color: white;
    font-size: 1em;
    border-radius: 3px;
    transition: 0.4s;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input:hover{
    padding: 10px 45px;
    transition: 0.4s;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .additional-checkout-buttons ul li.icons{
    display: inline-block;
    padding: 20px 10px;
    color: #1b2430;
    font-size: 1.5rem;
}

.main .main-inner .how-did-you-hear {
    margin-bottom: 50px;
}
.main .main-inner .how-did-you-hear .head {
    color: rgba(27, 26, 26, 0.7);
    font-weight: 600;
}
.main .main-inner .how-did-you-hear .options select{
    background-color: none;
    color: rgba(27, 26, 26, 0.9);
    border: solid 0.5px black;
    margin-top: 10px;
    padding: 10px 20px;
    width: 100%;
    font-size: 1rem;
    font-weight: 300;
    letter-spacing: 1.1px;
}
.main .main-inner .how-did-you-hear .options select:focus{
    border: solid 0.5px #1b9c85;
    border-width: 1.5px;
}
.subtotal{
    font-weight: 600;
}
.subtotal-prices {
    display: inline-flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 9px;
    font-size: 1.05em;
}
.original-subtotal {
    color: #b64036;
    font-size: 0.85em;
    font-weight: 400;
    text-decoration: line-through;
    text-decoration-thickness: 1px;
    white-space: nowrap;
    padding-left: 5px;
}

@media (min-width: 868px) {
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total {
        display: grid;
        grid-template-columns: 65.5% minmax(0, 1fr);
        align-items: baseline;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total span.subtotal-prices:nth-child(2) {
        justify-content: flex-start;
        margin-left: 0;
        padding-left: 0;
        gap: 7px;
        text-align: left;
    }

}

.continue-shopping{
    letter-spacing: 0.5px;
    opacity: 0.8;
}

@media (max-width: 1200px){
    .main .main-inner{
        width: 95%;
    }
}
@media (max-width: 867px) {
    .main .main-inner form .cart-table tbody tr{
    height: auto;
    }
    .main .main-inner form .cart-table tbody tr td{
        font-size: 0.9rem;
    }
    .main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-img{
        aspect-ratio: 1/1;
        width: 95%;
        height: auto;
        background-image: url(../assets/products/assam-black-600x600.webp);
        background-size: contain;
        background-repeat: no-repeat;
    }
    .main .main-inner form .cart-table tbody tr td:nth-child(2),
    .main .main-inner form .cart-table tbody tr td:nth-child(3),
    .main .main-inner form .cart-table thead th:nth-child(2),
    .main .main-inner form .cart-table thead th:nth-child(3)
    {
        display: none;
    }
    .main .main-inner form .cart-table tbody tr .cart-quantity .q-input-smart-phone{
        display: block;
        margin-top: 5px;
        width: 75px;
        padding: 5px 10px;
        font-size: 0.9rem;
    }

    .main .main-inner form .cart-footer .cart-footer-inner{
        display: grid;
        grid-template-columns: 1fr;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-left{
        margin-bottom: 20px;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
        width: 100%;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner{
        justify-self: center;
        display: grid;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper{
        justify-self: stretch;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
        font-size: 1.1rem;
        font-weight: 500;
        margin: 0 0 20px;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-shipping-message{
        margin-bottom: 20px;
        font-size: 0.9em;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control{
        display: grid;
        justify-content: center;
        margin-bottom: 20px;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input{
        padding: 10px 100px;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input:hover{
        padding: 10px 100px;
        background-color: white;
        color: #1b9c85;
        border: #1b9c85 0.5px solid;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .additional-checkout-buttons ul li.icons{
        display: inline-block;
        padding: 20px 10px;
        color: #1b2430;
        font-size: 1rem;
    }
}
@media (max-width:340px){
    .main .main-inner{
        width: 100%;
        padding: 5px;
    }
    .main .main-inner form .cart-table{
        border-collapse: collapse;
        margin: 25px 0;
        width: 100%;
        text-align: left;
    }
    .main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-img{
        aspect-ratio: 1/1;
        width: 50px;
        height: auto;
        /* background-image: url(../assets/products/assam-black-600x600.webp); */
        background-size: contain;
        background-repeat: no-repeat;
    }
    .main .main-inner form .cart-table tbody tr td{
        font-size: 0.7rem;
    }

    .cart-product-name-wrapper{
        padding-left: 3px;
    }

}



.cart-inventory-warning {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #dc3545;
    color: #dc3545;
    background-color: #fff5f5;
}

/* Shopify cart status messages */
.cart-status {
    margin: 100px auto;
    width: 60%;
    padding: 100px 0;
    text-align: center;
    font-size: 1.1rem;
}

.cart-error {
    color: #dc3545;
}
</style>
