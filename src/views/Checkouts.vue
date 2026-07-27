<template>
    <CheckoutsHeader/>
    <div class="main-checkouts">

      <CartPaymentNav :componentIndex="componentIndex"/>

        <div class="main-inner">

          <div class="inner-left">
                <div class="e-c">Express Checkout</div>
                <div class="icons-content">
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

                <div class="form-wrapper">
                  <Information v-if="componentIndex === 1" @complete="showNextComponent"/>
                  <ShippingC v-if="componentIndex === 2" @complete="showNextComponent" @previousComponent="previousComponent"/>
                  <PaymentC v-if="componentIndex === 3" @previousComponent="previousComponent"/>
                </div>

                <div class="all-rights">
                    <p><small>All rights rezerved Alaya Tea</small></p>
                </div>
            </div>

            <div class="inner-right">

                <div class="inner-right-wrapper">

                  <div v-for="chosenProduct in productStore.cartProductsLS" class="chosen-product">
                    <ChosenProduct :chosenProduct="chosenProduct"/>
                  </div>

                  <div @submit.prevent="applyDiscountCode" class="gift-card-wrapper">
                    <div 
                      v-if="productStore.discountView"
                      class="fields fields--2 discount"
                      >
                      <label 
                      class="field"
                      :class="{ validDiscountCode: (giftCardCode === productStore.giftCardCodeInput)}" 
                      >
                      <span 
                      class="field__label" 
                      :class="{ validDiscountCodeTextColor : (giftCardCode === productStore.giftCardCodeInput)}"
                      for="discount-code"
                      >
                      Gift card or discount code
                    </span>
                    <input 
                          v-model="productStore.giftCardCodeInput"
                          class="field__input" 
                          :class="{ validDiscountCodeTextColor : (giftCardCode === productStore.giftCardCodeInput)}"
                          type="text" 
                          id="firstname" 
                          placeholder="1A18NM"
                          :disabled="productStore.isSubmitGiftCardCode === true && giftCardCode === productStore.giftCardCodeInput"
                          />
                        </label>
                        <input 
                        @click="applyDiscountCode"
                        :class="{ validDiscountCodeButton: (giftCardCode === productStore.giftCardCodeInput)}" 
                        class="button" 
                        type="submit" 
                        value="Apply"
                        >
                    </div>
                    <div 
                      v-if="!isGiftCardCodeTrue && productStore.discountView"
                      class="notValidDiscountCode"
                    >
                      Enter a valid discount code.
                    </div>
                    <div
                      v-if="isGiftCardCodeTrue && productStore.isSubmitGiftCardCode"
                      class="discount-code-applied"
                    > Discount code applied. </div>
                  </div>

                  <div class="total-price-wrapper">
                    <div class="tp-item">Subtotal</div>
                    <div class="tp-item tp-right">
                      <span
                      v-if="giftCardCode === productStore.giftCardCodeInput" 
                      class="old-price"
                        >${{totalCartPrice}}
                      </span>
                      $ {{ discountedTotalPrice.toFixed(2) }}
                    </div>
                    <div class="tp-item">Shipping</div>
                    <div v-if="!productStore.shippingMethodView" class="tp-item tp-right small-shipping"><small>Enter shipping method</small></div>
                    <div v-if="productStore.shippingMethodView" class="tp-item tp-right"><small>${{ productStore.order.shippingMethod.price }}</small></div>
                    <div class="tp-item">Total</div>
                    <div v-if="!productStore.shippingMethodView" class="tp-item tp-right">$ {{ discountedTotalPrice.toFixed(2)  }}</div>
                    <div v-if="productStore.shippingMethodView" class="tp-item tp-right">$ {{ (parseFloat(discountedTotalPrice.toFixed(2)) + parseFloat(productStore.order.shippingMethod.price)).toFixed(2) }}</div>
                  </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
/* Import Components */
import CheckoutsHeader from '../components/CheckoutsHeader.vue';
import CartPaymentNav from '../components/CartPaymentNav.vue'
import Information from '../components/checkouts/Information.vue';
import ShippingC from '../components/checkouts/ShippingC.vue';
import PaymentC from '../components/checkouts/PaymentC.vue';
import ChosenProduct from '../components/checkouts/ChosenProduct.vue'
/* Imports */
import { ref, computed, onMounted } from 'vue';
/* pinia */
import { useProductStore } from '../stores/productStore'
const productStore = useProductStore()
/* get cartProducts with JSON */
productStore.getCartProducts()

onMounted(()=>{
 const storedCartProducts = localStorage.getItem('cartProducts')
    if(storedCartProducts){
        productStore.cartProductsLS = JSON.parse(storedCartProducts)
    }
    console.log("localStorageCartProducts: " + storedCartProducts)

  const localStorageOrder = localStorage.getItem('order')
    if(localStorageOrder){
      productStore.order = JSON.parse(localStorageOrder)
    }
  console.log('localStorageOrder: ' + localStorageOrder)
  console.log('productStore.order: ' + JSON.stringify(productStore.order))
})

/* Component Toggle */
const componentIndex = ref(1);

const showNextComponent = () =>{
  componentIndex.value++;
  console.log("componentIndex:" + componentIndex.value)
}
const previousComponent = () =>{
  componentIndex.value--;
  console.log("componentIndex:" + componentIndex.value)
}

//total cart price calculating
const totalCartPrice = computed(() => {
  return productStore.cartProductsLS.reduce((total, product) => {
    return total + parseFloat(product.totalPrice);
  }, 0).toFixed(2);
});


/* Gift Card */

const giftCardCode = ref("1A18NM")

const isGiftCardCodeTrue = ref(true)

// Calculate discount
const discount = computed(() => {
  return giftCardCode.value === productStore.giftCardCodeInput ? totalCartPrice.value * 0.1 : 0;
});

// Calculate discounted price
const discountedTotalPrice = computed(() => {
  return totalCartPrice.value - discount.value;
});


const applyDiscountCode = () =>{
  productStore.isSubmitGiftCardCode = true
  
  if(productStore.giftCardCodeInput === giftCardCode.value){

    isGiftCardCodeTrue.value = true
    
    productStore.priceBeforeDiscount = totalCartPrice.value

    productStore.finalPrice = (discountedTotalPrice.value).toFixed(2)
    console.log("with discount: " + productStore.finalPrice)

    productStore.order.priceBeforeDiscount = productStore.priceBeforeDiscount
    productStore.order.finalPrice = productStore.finalPrice

  }else{

    isGiftCardCodeTrue.value = false
    
    productStore.finalPrice = totalCartPrice.value
    console.log("withouts discount: " + productStore.finalPrice)
    console.log(productStore.giftCardCodeInput)
    
    productStore.order.finalPrice = productStore.finalPrice

   }
}

</script>
<style scoped>

.main-checkouts .main-inner{
    display: grid;
    grid-template-columns: 6fr 4fr;
    width: 1197px;
    margin: 10px auto 0;
}
.main-checkouts .main-inner .inner-left .e-c{
    text-align: center;
    margin-bottom: 10px;
}

.main-checkouts .main-inner .inner-left .icons-content{
    display: grid;
    justify-content: center;
    align-items: center;
    height: 70px;
    border-bottom: solid rgb(168, 168, 168) 0.5px;
}
.main-checkouts .main-inner .inner-left .icons-content ul li.icons{
    display: inline-block;
    padding: 0 15px;
    font-size: var(--font-size-2xl);
}

/* FORM CONTENT */
h1, h2{
    font-size: var(--font-size-xl);
}
.form-wrapper{
    padding-bottom: 40px ;
    border-bottom: solid rgb(168, 168, 168) 0.5px;
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
.validDiscountCode{
  border: 2px solid var(--color-brand-primary);
}
.validDiscountCodeTextColor{
  color: var(--color-brand-primary);
  font-weight: bold;
}
.notValidDiscountCode{
  margin-top: 5px;
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: red;
}
.discount-code-applied{
  margin-top: 10px;
  font-weight: var(--font-weight-medium);
  color: var(--color-brand-primary);
}


.fields {
  display: grid;
  grid-gap: 1rem;
}
.fields--2 {
  grid-template-columns: 1fr 1fr;
}
.fields--3 {
  grid-template-columns: 1fr 1fr 1fr;
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
.validDiscountCodeButton{
  background-color: white;
  color: var(--color-brand-primary);
  border: 1px solid var(--color-brand-primary);
  border-left: 25px solid var(--color-brand-primary);
  transition: 0.4s;
}
.validDiscountCodeButton:hover{
    font-size: var(--font-size-body-sm);
    border-left: 35px solid var(--color-brand-primary);
    transition: 0.2s;
}
.validDiscountCodeButton:focus{
    color: rgb(86, 86, 251);
    border: 1px solid rgb(86, 86, 251);
    border-left: 35px solid rgb(86, 86, 251);
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

.all-rights{
    margin: 20px 0;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper{
  padding: 10px;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .chosen-product{
  display: grid;
  grid-template-columns: 1fr 5fr 1fr;
  align-items: center;
  margin-top: 15px;
  padding: 0 1rem;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .gift-card-wrapper{
  margin-top: 22px;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper{
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 20px;
  border-top: 0.5px solid gray;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper .tp-item{
  margin-top: 10px;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper .tp-item:nth-child(5),
.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper .tp-item:nth-child(6){
  font-weight: var(--font-weight-semibold);
}

.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper .tp-right{
  justify-self: end;
}
.main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper .tp-right .old-price{
  color: rgb(230, 69, 69);
  text-decoration:line-through;
  font-weight: var(--font-weight-medium);
  margin-right: 10px;
}

@media (min-width: 1000px) and (max-width: 1205px){
  .main-checkouts .main-inner{
    display: grid;
    grid-template-columns: 6fr 4fr;
    width: 95%;
    margin: 10px auto 0;
} 
}
@media (max-width: 1000px){

  .main-checkouts .main-inner{
    display: flex;
    flex-direction: column;
    grid-template-columns: 1fr;
    width: 95%;
    margin: 10px auto 0;
  } 
  .main-checkouts .main-inner .inner-right{
    order: -1;
  }

  .main-checkouts .main-inner .inner-right .inner-right-wrapper{
    width: 575px;
    margin: 0 auto 20px;
    padding: 10px 10px 30px 10px;
    border-bottom: solid 0.5px var(--color-text-primary);
  }
  .main-checkouts .main-inner .inner-left .icons-content{
    display: grid;
    justify-content: center;
    align-items: center;
    height: 50px;
    padding-bottom: 50px;
    border-bottom: solid rgb(168, 168, 168) 0.5px;
  } 
  .main-checkouts .main-inner .inner-left .icons-content ul li.icons{
    display: inline-block;
    padding: 0 10px;
    font-size: var(--font-size-body);
  } 
}

@media (max-width: 679px){
  .main-checkouts .main-inner .inner-right .inner-right-wrapper{
    width: 90%;
    margin: 0 auto 20px;
    padding: 10px 10px 30px 10px;
    border-bottom: solid 0.5px var(--color-text-primary);
  }
}
@media (max-width: 399px){
  .small-shipping{
    font-size: 14px;
  }
}
@media (max-width: 340px){
  .form-wrapper{
    padding-bottom: 10px ;
    border-bottom: solid rgb(168, 168, 168) 0.5px;
  }
  .main-checkouts .main-inner .inner-left {
      margin-top: 20px;
  }
  .main-checkouts .main-inner .inner-right .inner-right-wrapper{
      width: 100%;
      margin: 0 auto;
      padding: 0px 0px 30px;
      border-bottom: solid 0.5px var(--color-text-primary);
    }
  .main-checkouts .main-inner .inner-right .inner-right-wrapper .chosen-product{
    display: grid;
    grid-template-columns: 1fr 5fr 1fr;
    align-items: center;
    margin-top: 15px;
    padding: 0 0;
    font-size: var(--font-size-2xs);
  }
  .main-checkouts .main-inner .inner-right .inner-right-wrapper .total-price-wrapper{
    display: grid;
    grid-template-columns: 1fr 2fr;
    margin-top: 20px;
    border-top: 0.5px solid gray;
    font-size: var(--font-size-sm);
  }
}

</style>