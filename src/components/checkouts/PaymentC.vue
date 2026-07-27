<template>
    <div class="form-container">
        <form @submit.prevent="payNow" class="form">
            <InfoToChange/>
            <div class="title">Payment</div>
            <p class="payment-info">All transactions are secure and encrypted.</p>
            <div class="shipping-method">
                <label class="shipping-grid">
                    <div class="shipping-option">
                        <p>Credit Cart</p>
                    </div>
                </label>

                <div class="payment-info-inner">
                    <div class="mb-20">
                      <label 
                        class="field"
                        :class="{ invalid: !validateCartNumber && submitted }"
                      >
                          <span class="field__label" for="cart-number">Cart Number</span>
                          <input 
                            v-model="cartNumber" 
                            class="field__input" 
                            type="text" 
                            id="cart-number"
                          />
                        </label>
                        <span 
                          class="invalid-message"
                          v-if="!validateCartNumber && submitted"
                        >
                          <small>Enter a valid cart number.</small>
                        </span>
                      </div>
                    <div class="mb-20">
                      <label 
                        class="field"
                        :class="{ invalid: !validateNameOnCart && submitted}"
                      >
                          <span class="field__label" for="name-on-cart">Name On Cart</span>
                          <input 
                            v-model="nameOnCart" 
                            class="field__input" 
                            type="text" 
                            id="name-on-cart" 
                          />
                      </label>
                      <span 
                          class="invalid-message"
                          v-if="!validateNameOnCart && submitted"
                        >
                          <small>Enter a valid name.</small>
                        </span>
                    </div>
                    <div class="fields fields--2">
                      <div>
                        <label 
                          class="field"
                          :class="{ invalid: !validateExpirationDate && submitted}"
                        >
                        <span class="field__label" for="expiration-date">Expiration Date ( MM / YY)</span>
                        <input 
                          v-model="expirationDate"
                          class="field__input" 
                          type="date" 
                          id="expiration-date" 
                        />
                        </label>
                        <span 
                          class="invalid-message"
                          v-if="!validateExpirationDate && submitted"
                        >
                          <small>Enter a valid expiration date.</small>
                        </span>
                      </div>
                      <div>
                        <label 
                        class="field"
                        :class="{ invalid: !validateSecurityCode && submitted}">
                        <span class="field__label" for="security-code">Security Code</span>
                        <input 
                          v-model="securityCode" 
                          class="field__input" 
                          type="text" 
                          id="security-code" 
                        />
                        </label>
                        <span 
                          class="invalid-message"
                          v-if="!validateSecurityCode && submitted"
                        >
                          <small>Enter a valid security code.</small>
                        </span>
                      </div>
                    </div>

                </div>
            </div>
            <div class="form-footer">
                <div class="return-to-cart">
                    <span class="back-icon"></span>
                    <button class="r-btn" @click="previousComponent">Return to Shipping</button>
                </div>
                <div class="submit-button">
                    <input 
                      type="submit" 
                      class="button" 
                      value="Pay now"
                    >
                </div>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
/* components */
import InfoToChange from './InfoToChange.vue'
/* pinia */
import { useProductStore } from '../../stores/productStore'
const productStore = useProductStore()
/* import axios */
import axios from 'axios';
/* import router */
import router from '../../router'

const emit = defineEmits(['previousComponent'])
const previousComponent = () => {
  emit('previousComponent')
  productStore.shippingMethodView = false
  productStore.discountView = false
  productStore.isSubmitGiftCardCode = false
  productStore.giftCardCodeInput = ""
}


/* submission control for validity check */
const submitted = ref(false)

/* carNumber */
const cartNumber = ref('8565 1827 3874 3837')

const validateCartNumber = computed (()=>{
  const regex = /^(\d{4}\s?){4}$/
  return regex.test(cartNumber.value)
})

/* nameOnCart */
const nameOnCart = ref('Kaan Uçak')
const validateNameOnCart = computed (()=>{
  const regex = /^[\p{L}ÇçĞğİıÖöŞşÜü\s]{2,} [\p{L}ÇçĞğİıÖöŞşÜü\s]{2,}$/u
  return regex.test(nameOnCart.value)
})

/* expirationDate */
const expirationDate = ref(null)

const validateExpirationDate = computed (()=>{
 const regex = /^(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
 return regex.test(expirationDate.value)
})

/* securityCode */
const securityCode = ref('654')

const validateSecurityCode = computed (()=>{
  const regex = /^[0-9]{3}$/
  return regex.test(securityCode.value)
})

const payNow = () =>{

  submitted.value = true

  if(validateSecurityCode.value && validateExpirationDate.value && validateNameOnCart.value && validateCartNumber.value){
    /* cartInformation */
    const cartInformation = reactive({
      cartNumber: cartNumber.value,
      nameOnCart: nameOnCart.value,
      expirationDate: expirationDate.value,
      securityCode: securityCode.value
    })
    /* add cartInformation to productStore.orders */
    productStore.order.cartInformation = cartInformation; 
  
  
    /* unique Order Code */
    const orderUniqueCode = ref(crypto.randomUUID())
    /* add unique Order Code to productStore.orders */
    productStore.order.orderUniqueCode = orderUniqueCode.value
  
    console.log(JSON.stringify(productStore.order.cartInformation))

    /* control giftcard code for finalPrice */
    if(productStore.isSubmitGiftCardCode){
      productStore.order.finalPrice = (parseFloat(productStore.finalPrice) + parseFloat(productStore.order.shippingMethod.price)).toFixed(2)
      console.log("if worked")
    }else{
      productStore.finalPrice = (productStore.cartProductsLS.reduce((sum, product) => sum + parseFloat(product.totalPrice), 0) + parseFloat(productStore.order.shippingMethod.price)).toFixed(2);
      productStore.order.finalPrice = productStore.finalPrice
      console.log("else worked" + productStore.order.finalPrice )
    }

    const post = async () => {
      await axios.post('http://localhost:3000/completedOrders', productStore.order)
        .then(response => {
            console.log('Order completed and added to completedOrders array:', response.data);
        })
        .catch(error => {
            console.error('Error completing order:', error.message);
      });
    }

    /* delete from json and post to json function */
    const deleteAndPost = async () => {
        try {
            localStorage.removeItem('order')
            const response = await axios.post('http://localhost:3000/completedOrders', productStore.order)
            console.log('Order completed and added to completedOrders array:', response.data)
            
            // Yeni siparişi store'a ekle
            await productStore.getCompletedOrders()
            
            // Yönlendirme yap
            console.log("orderUniqueCode.value: " + orderUniqueCode.value)
            router.push({ name: 'final-page', params: { id: orderUniqueCode.value } })
        } catch (error) {
            console.error('Error completing order:', error)
        }
    }

    /* delete cartProduct from json */
    const deleteCartProducts = async () => {
      productStore.cartProductsLS = []
      localStorage.removeItem('cartProducts')
    };
    
    /* Shipping and GiftCardCode refreshing after payment */
    productStore.shippingMethodView = false
    productStore.discountView = false
    productStore.isSubmitGiftCardCode = false
    productStore.giftCardCodeInput = ""
    
    deleteCartProducts()
    deleteAndPost()
  }
}

</script>

<style scoped>

/* SHIPPING METHOD */

div.title{
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}
form .shipping-method{
    border: solid black 1px;
    border-radius: 10px;
    font-size: var(--font-size-body-sm);
}
form .shipping-method .shipping-grid{
    display: block;
    padding: 20px;
    align-items: center;
}
form .shipping-method .shipping-grid:first-child{
    border-bottom: solid black 0.5px;
}
form .shipping-method .shipping-grid .shipping-option p{
    font-weight: var(--font-weight-semibold);
}
form .shipping-method .shipping-grid .shipping-price{
    justify-self: end;
    align-self: center;
}
form .shipping-method .shipping-grid input{
    height: 20px;
}

.payment-info-inner{
    padding: 20px;
}
.payment-info-inner label{
    padding-bottom: 20px;
}

/* FORM CONTENT */
h1, h2{
    font-size: var(--font-size-body);
}
p.payment-info{
    font-size: var(--font-size-sm);
}
.form-container {
  max-width: 40rem;
  padding: 40px 2rem 0;
  margin: 0 auto;
}

.form {
  display: grid;
  grid-gap: 1rem;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 0.5px solid rgb(67, 67, 67);
  padding: .5rem;
  border-radius: .25rem;
}
.mb-20{
  margin-bottom: 20px;
}
.invalid{
  border: solid 2px rgb(228, 59, 59);
}
.invalid-message{
  color: rgb(228,59,59);
}

.field__label {
  color: var(--color-gray);
  font-size: var(--font-size-3xs);
  font-weight: var(--font-weight-light);
  text-transform: uppercase;
  margin-bottom: 0.25rem
}

.field__input {
  padding: 0;
  margin: 0;
  border: 0;
  outline: 0;
  font-weight: var(--font-weight-light);
  font-size: var(--font-size-body);
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
}


.fields {
  display: grid;
  grid-gap: 1rem;
}
.fields--2 {
  grid-template-columns: 1fr 1fr;
}

.button {
  background-color: #000;
  text-transform: uppercase;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  display: block;
  color: #fff;
  width: 100%;
  padding: 1rem;
  border-radius: 0.25rem;
  border: 0;
  cursor: pointer;
  outline: 0;
}
.button:focus-visible {
  background-color: var(--color-text-primary);
}
.form-footer{
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    margin-top: 20px;
}
.return-to-cart{
    text-decoration: underline;
}
.back-icon{
    display: inline-block;
    width: 0.4em;
    height: 0.4em;
    margin-bottom: 2px;
    border-top: 1px solid;
    border-right: 1px solid;
    transform: rotate(225deg);
    transition: transform 0.3s;
}
.r-btn{
    margin-left: 3px;
    font-family: 'Montserrat', sans-serif;
    background-color: white;
    font-size: var(--font-size-body-compact);
    letter-spacing: 0.06rem;
}
@media(max-width:340px){
    .form{
        width: 100%;
    }
    .form-container {
        width: 100%;
    padding: 40px 0rem 0;
    margin: 0 auto;
    }
    .payment-info-inner{
      padding: 20px;
      font-size: var(--font-size-2xs);
  }
  .field__label {
  color: var(--color-gray);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-regular);
  text-transform: uppercase;
  margin-bottom: 0.25rem
}
  .field__input {
  padding: 0;
  margin: 0;
  border: 0;
  outline: 0;
  font-weight: var(--font-weight-light);
  font-size: var(--font-size-2xs);
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
}
.back-icon{
    display: inline-block;
    width: 0.4em;
    height: 0.4em;
    margin-bottom: 10px;
    border-top: 1px solid;
    border-right: 1px solid;
    transform: rotate(225deg);
    transition: transform 0.3s;
}
.r-btn{
    display: inline;
    width: 80px;
    font-family: 'Montserrat', sans-serif;
    background-color: white;
    font-size: var(--font-size-2xs);
    letter-spacing: 0.06rem;
}
.form-footer{
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    margin-top: 0px;
    margin-bottom: 3px;
}
.button {
  background-color: #000;
  text-transform: uppercase;
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-medium);
  display: block;
  color: #fff;
  width: 100%;
  padding: 1rem;
  border-radius: 0.25rem;
  border: 0;
  cursor: pointer;
  outline: 0;
}
}
</style>