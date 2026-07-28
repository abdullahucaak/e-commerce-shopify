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
        <LoadingSpinner
            v-if="productStore.cartLoading && !productStore.cart"
            label="Loading cart..."
        />

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
                <h1 class="your-cart text-page-title">Your Cart</h1>
                <div>Your Cart is Currently Empty</div>
                <RouterLink :to="{name:'shop'}">
                    <button type="button"> CONTINUE SHOPPING </button>
                </RouterLink>
            </div>
        </div>

        <div v-else class="main-inner">
            <div class="cart-header">
                <h1 class="text-page-title">Your Cart</h1>
                <RouterLink class="continue-shopping link-secondary link-underline" :to="{name:'shop'}">
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
                    <thead class="t-heading table-heading">
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
                                class="order-note-label form-note-label"
                                for="order-note"
                            >
                                Add a note to your order
                            </label>

                            <textarea
                                class="order-note-input"
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
                                    <div
                                        class="cart-sub-total"
                                        :class="{
                                            'single-subtotal-price': !formattedOriginalSubtotal
                                        }"
                                    >
                                        <span class="subtotal">Subtotal</span>
                                        <span
                                            ref="subtotalPricesElement"
                                            class="subtotal subtotal-prices"
                                        >
                                            <span>{{ formattedSubtotal }}</span>
                                            <span
                                                v-if="formattedOriginalSubtotal"
                                                class="original-subtotal price price-original price-original--danger"
                                            >
                                                {{ formattedOriginalSubtotal }}
                                            </span>
                                        </span>
                                    </div>

                                    <div
                                        v-if="formattedSavings"
                                        class="cart-savings-message price-savings"
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
                    <div class="head form-question-label">How did you hear about us?</div>
                    <div class="options">
                        <select v-model="howDidYouHear" class="referral-select">
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
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue'

import Footer from '../components/Footer.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
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
const subtotalPricesElement = ref(null)

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

const alignSingleSubtotalPrice = async () => {
    await nextTick()

    const subtotalElement = subtotalPricesElement.value

    if (!subtotalElement) {
        return
    }

    subtotalElement.style.transform = ''

    if (formattedOriginalSubtotal.value) {
        return
    }

    requestAnimationFrame(() => {
        const cartTotalElement = document.querySelector(
            '.cart-total-cell .cart-item-regular-price'
        )

        if (!cartTotalElement || !subtotalPricesElement.value) {
            return
        }

        const subtotalValueElement =
            subtotalPricesElement.value.querySelector('span')

        if (!subtotalValueElement) {
            return
        }

        const cartTotalLeft = cartTotalElement.getBoundingClientRect().left
        const subtotalLeft = subtotalValueElement.getBoundingClientRect().left
        const offset = cartTotalLeft - subtotalLeft

        subtotalPricesElement.value.style.transform =
            `translateX(${offset}px)`
    })
}

watch(
    [formattedSubtotal, formattedOriginalSubtotal],
    alignSingleSubtotalPrice,
    { flush: 'post' }
)

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
        await alignSingleSubtotalPrice()
    } catch (error) {
        console.error('Failed to load Shopify cart:', error)
    }

    window.addEventListener('resize', alignSingleSubtotalPrice)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', alignSingleSubtotalPrice)
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
    background-color: var(--color-surface);
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
    color: var(--color-text-secondary);
    font-size: var(--font-size-heading-md);
    cursor: pointer;
}

.cart-popup-icon {
    margin-bottom: 14px;
    color: var(--color-text-ui);
    font-size: var(--font-size-display);
}

.cart-popup h2 {
    margin: 0 0 12px;
    color: var(--color-text-strong);
    font-size: var(--font-size-heading-lg);
    font-weight: var(--font-weight-medium);
}

.cart-popup p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: var(--font-size-body);
    line-height: 1.55;
}

.cart-popup-button {
    width: 75%;
    margin-top: 24px;
    padding: 12px 18px;
    border: 1px solid var(--color-brand-secondary);
    border-radius: 4px;
    background-color: var(--color-surface);
    color: var(--color-brand-secondary);
    font-size: var(--font-size-body-compact);
    cursor: pointer;
    transition: 0.3s;
}

.cart-popup-button:hover {
    width: 80%;
    background-color: var(--color-surface);
    color: var(--color-brand-secondary);
}

@media (max-width: 480px) {
    .cart-popup-overlay {
        padding: 14px;
    }

    .cart-popup {
        padding: 32px 20px 22px;
    }

    .cart-popup h2 {
        font-size: var(--font-size-heading-sm);
    }

    .cart-popup p {
        font-size: var(--font-size-body-compact);
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
    font-weight: var(--font-weight-medium);
}
.main .main-inner-cart-empty .mice-inner div{
    margin-top: 20px;
    letter-spacing: 1px;
}
.main .main-inner-cart-empty .mice-inner button{
    background-color: var(--color-surface);
    color: var(--color-brand-secondary);
    border: 1px solid var(--color-brand-secondary);
    font-size: var(--font-size-sm);
    letter-spacing: 1px;
    padding: 15px 35px;
    border-radius: 5px;
    margin-top: 20px;
    transition: 0.5s;
}
.main .main-inner-cart-empty .mice-inner button:hover{
    background-color: var(--color-brand-secondary);
    color: var(--color-text-inverse);
    font-size: var(--font-size-sm);
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
    font-weight: var(--font-weight-regular);
}
.main .main-inner .cart-header a{
    color: var(--color-text-secondary);
    text-decoration: underline;
}
.main .main-inner .cart-header a:hover{
    color: var(--color-brand-secondary);
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
    font-weight: var(--font-weight-regular);
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
    color: var(--color-danger);
    text-decoration: underline;
}
.main .main-inner form .cart-table tbody tr .cart-quantity .cart-quantity-input{
    width: 100px;
    padding: 20px 10px;
    border: solid 0.5px var(--color-text-strong);
    font-size: var(--font-size-lg);
}
.main .main-inner form .cart-table tbody tr .cart-quantity .q-input-smart-phone{
    display: none;
}

.main .main-inner form .cart-footer .cart-footer-inner{
    display: grid;
    grid-template-columns: 1fr 1fr;
}
.main .main-inner form .cart-footer .cart-footer-inner .order-note-label{
    display: block;
    margin-bottom: 20px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
    border: 0.5px solid black;
    border-radius: 3px;
    font-size: var(--font-size-body);
    letter-spacing: 1.2px;
    font-weight: var(--font-weight-light);
    padding: 10px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-left textarea:focus{
    border: 0.5px solid var(--color-brand-secondary);
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
    color: var(--color-brand-hover);
    font-size: 0.9em;
    font-weight: var(--font-weight-medium);
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
    background-color: var(--color-brand-secondary);
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
    color: var(--color-text-strong);
    font-size: var(--font-size-2xl);
}

.main .main-inner .how-did-you-hear {
    margin-bottom: 50px;
}
.main .main-inner .how-did-you-hear .head {
    color: var(--color-form-label);
    font-weight: var(--font-weight-semibold);
}
.main .main-inner .how-did-you-hear .options select{
    background-color: var(--color-input-surface);
    color: var(--color-referral-select-text);
    border: solid 0.5px black;
    margin-top: 10px;
    padding: 10px 20px;
    width: 100%;
    font-size: var(--font-size-body);
    font-weight: var(--font-weight-light);
    letter-spacing: 1.1px;
}
.main .main-inner .how-did-you-hear .options select:focus{
    border: solid 0.5px var(--color-brand-secondary);
    border-width: 1.5px;
}
.subtotal{
    font-weight: var(--font-weight-semibold);
}
.subtotal-prices {
    display: inline-flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 9px;
    font-size: 1.05em;
}
.original-subtotal {
    color: var(--color-price-original-danger);
    font-size: 0.85em;
    font-weight: var(--font-weight-regular);
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
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total.single-subtotal-price span.subtotal-prices:nth-child(2) {
        justify-content: center;
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
        font-size: var(--font-size-body-sm);
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
        font-size: var(--font-size-body-sm);
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
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
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
        background-color: var(--color-surface);
        color: var(--color-brand-secondary);
        border: var(--color-brand-secondary) 0.5px solid;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .additional-checkout-buttons ul li.icons{
        display: inline-block;
        padding: 20px 10px;
        color: var(--color-text-strong);
        font-size: var(--font-size-body);
    }
}
@media (max-width:391px){
    .main .main-inner{
        width: 95%;
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
        font-size: var(--font-size-2xs);
    }

    .cart-product-name-wrapper{
        padding-left: 3px;
    }

}

@media (min-width:393px) and (max-width:524px){
    .main .main-inner .cart-header h1{
        font-size: 1.85rem;
        line-height: 1.2;
    }

    .main .main-inner .cart-header .continue-shopping{
        font-size: var(--font-size-body-compact);
    }

    .main .main-inner form .cart-table thead tr th{
        font-size: var(--font-size-sm-relaxed);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left label{
        font-size: var(--font-size-body-compact);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
        font-size: var(--font-size-body-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
        font-size: var(--font-size-body-large);
    }

    .subtotal-prices{
        font-size: 1em;
    }

    .original-subtotal{
        font-size: 0.84em;
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-savings-message{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-shipping-message{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input{
        font-size: var(--font-size-body-compact);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .additional-checkout-buttons ul li.icons{
        font-size: 1.15rem;
    }

    .main .main-inner .how-did-you-hear .head{
        font-size: var(--font-size-body-sm);
    }

    .main .main-inner .how-did-you-hear .options select{
        font-size: var(--font-size-sm);
    }

    .cart-inventory-warning,
    .cart-status{
        font-size: var(--font-size-body-compact);
    }
}

@media (min-width:363px) and (max-width:392px){
    .main .main-inner{
        width: 95%;
        padding: 5px 5px;
    }
    .main .main-inner .cart-header h1{
        font-size: 1.7rem;
        line-height: 1.2;
    }

    .main .main-inner .cart-header .continue-shopping{
        font-size: var(--font-size-sm-relaxed);
    }

    .main .main-inner form .cart-table thead tr th{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left label{
        font-size: var(--font-size-sm-relaxed);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
        font-size: var(--font-size-body);
    }

    .subtotal-prices{
        font-size: 1em;
    }

    .original-subtotal{
        font-size: 0.82em;
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-savings-message{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-shipping-message{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input{
        font-size: var(--font-size-sm-relaxed);
    }

    .main .main-inner .how-did-you-hear .head{
        font-size: var(--font-size-sm);
    }

    .main .main-inner .how-did-you-hear .options select{
        font-size: var(--font-size-sm);
    }

    .cart-inventory-warning,
    .cart-status{
        font-size: var(--font-size-sm-relaxed);
    }
}

@media (max-width:362px){

    .main .main-inner{
        width: 95%;
        padding: 5px 5px;
    }
    .main .main-inner .cart-header h1{
        font-size: 1.55rem;
        line-height: 1.2;
    }

    .main .main-inner .cart-header .continue-shopping{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-table thead tr th{
        font-size: var(--font-size-xs);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left label{
        font-size: var(--font-size-sm);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-left textarea{
        font-size: var(--font-size-xs-relaxed);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
        font-size: var(--font-size-body-sm);
    }

    .subtotal-prices{
        font-size: 1em;
    }

    .original-subtotal{
        font-size: 0.78em;
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-savings-message{
        font-size: var(--font-size-xs);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-shipping-message{
        font-size: var(--font-size-xs);
    }

    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .submit-control input{
        font-size: var(--font-size-sm);
    }

    .main .main-inner .how-did-you-hear .head{
        font-size: var(--font-size-xs-relaxed);
    }

    .main .main-inner .how-did-you-hear .options select{
        font-size: var(--font-size-xs);
    }

    .cart-inventory-warning,
    .cart-status{
        font-size: var(--font-size-sm);
    }
}



.cart-inventory-warning {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    background-color: #fff5f5;
}

/* Shopify cart status messages */
.cart-status {
    margin: 100px auto;
    width: 60%;
    padding: 100px 0;
    text-align: center;
    font-size: var(--font-size-lg);
}

.cart-error {
    color: var(--color-danger);
}
</style>
