<template>
    <tr>
        <td class="cart-product-information">
            <div
                class="cart-product-img"
                :style="{ backgroundImage: `url('${productImageUrl}')` }"
            ></div>

            <div class="cart-product-name-wrapper">
                <RouterLink
                    class="searched-product"
                    :to="{
                        name: 'product-page',
                        params: { handle: cartLine.merchandise.product.handle }
                    }"
                >
                    <div class="cart-product-name">
                        {{ cartLine.merchandise.product.title }}
                    </div>
                </RouterLink>

                <div
                    class="remove"
                    @click="removeProduct"
                >
                    Remove
                </div>
            </div>
        </td>

        <td>
            <div class="cart-item-price">
                {{ formattedUnitPrice }}
            </div>
        </td>

        <td>
            <div class="cart-quantity">
                <input
                    v-model.number="localQuantity"
                    @change="updateQuantity"
                    @click="$event.target.select()"
                    class="cart-quantity-input"
                    type="number"
                    min="1"
                    step="1"
                    :disabled="isUpdating"
                >
            </div>
        </td>

        <td>
            <div class="cart-item-regular-price-group">
                <span class="cart-item-regular-price">
                    {{ formattedLineTotal }}
                </span>
            </div>

            <div class="cart-quantity">
                <input
                    v-model.number="localQuantity"
                    @change="updateQuantity"
                    @click="$event.target.select()"
                    class="cart-quantity-input q-input-smart-phone"
                    type="number"
                    min="1"
                    step="1"
                    :disabled="isUpdating"
                >
            </div>
        </td>
    </tr>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useProductStore } from '../stores/productStore'

const props = defineProps({
    cartLine: {
        type: Object,
        required: true
    }
})

const productStore = useProductStore()

const localQuantity = ref(props.cartLine.quantity)
const isUpdating = ref(false)

watch(
    () => props.cartLine.quantity,
    newQuantity => {
        localQuantity.value = newQuantity
    }
)

const productImageUrl = computed(() => {
    return (
        props.cartLine.merchandise.image?.url ||
        props.cartLine.merchandise.product.featuredImage?.url ||
        ''
    )
})

const formatMoney = money => {
    if (!money) {
        return ''
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currencyCode
    }).format(Number(money.amount))
}

const formattedUnitPrice = computed(() => {
    return formatMoney(props.cartLine.merchandise.price)
})

const formattedLineTotal = computed(() => {
    return formatMoney(props.cartLine.cost?.totalAmount)
})

const updateQuantity = async () => {
    const safeQuantity = Math.max(1, Number(localQuantity.value) || 1)

    localQuantity.value = safeQuantity
    isUpdating.value = true

    try {
        await productStore.updateCartLine(
            props.cartLine.id,
            safeQuantity
        )
    } catch (error) {
        localQuantity.value = props.cartLine.quantity
        console.error('Failed to update cart quantity:', error)
        window.alert(
            error instanceof Error
                ? error.message
                : 'The requested quantity is not available.'
        )
    } finally {
        isUpdating.value = false
    }
}

const removeProduct = async () => {
    if (isUpdating.value) {
        return
    }

    isUpdating.value = true

    try {
        await productStore.removeCartLine(props.cartLine.id)
    } catch (error) {
        console.error('Failed to remove cart product:', error)
    } finally {
        isUpdating.value = false
    }
}
</script>

<style scoped>

.main{
    display: grid;
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
    display: inline;
    margin-top: 5px;
    color: rgb(203, 116, 107);
    text-decoration: underline;
    cursor: pointer;
    user-select: none;
}
.main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-name-wrapper .remove:hover{
    font-weight: 400;
    color: rgb(218, 75, 75);
}
.main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-name{
    user-select: none;
    cursor: pointer;
}
.main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-name:hover{
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
}

.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper{
    justify-self: end;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
    margin: 0 0 20px 60px;
}
.main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total span:nth-child(2){
    padding-left: 75px;
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
.main .main-inner .how-did-you-hear p {
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
.cart-item-regular-price{
    font-weight: 500;
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
        /* background-image: url(../assets/products/assam-black-600x600.webp); */
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
        justify-self: center;
    }
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-sub-total-wrapper .cart-sub-total{
        font-size: 1.1rem;
        font-weight: 500;
        margin: 0 0 20px 25px;
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
    .main .main-inner form .cart-footer .cart-footer-inner .f-right .f-right-inner .cart-buttons-container .additional-checkout-buttons ul li.icons{
        display: inline-block;
        padding: 20px 10px;
        color: #1b2430;
        font-size: 1rem;
    }
}
@media (max-width:340px){
    .main .main-inner form .cart-table tbody tr .cart-product-information .cart-product-img{
        aspect-ratio: 1/1;
        width: 50px;
        height: auto;
        background-image: url(../assets/products/assam-black-600x600.webp);
        background-size: contain;
        background-repeat: no-repeat;
    }
    .main .main-inner form .cart-table tbody tr td{
        font-size: 0.7rem;
    }
    .cart-product-name-wrapper{
        margin-left: 3px;
    }
}


</style>