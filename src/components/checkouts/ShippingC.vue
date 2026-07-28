<template>
    <div class="form-container">
        <form @submit.prevent="completeForm" class="form">
            <InfoToChange/>
            <div class="title">Shipping Method</div>
            <div class="shipping-method">
                <label class="shipping-grid" for="option1">
                    <input 
                        v-model="selectedShipping"
                        type="radio" 
                        id="option1" 
                        name="options" 
                        value="USPS First Class Package"
                        required
                    >
                    <div class="shipping-option">
                        <p>{{ shippingMethods[0].name }}</p>
                        <p>Estimated delivery Friday, Jun 7</p>
                    </div>
                    <div class="shipping-price">
                        ${{ shippingMethods[0].price }}
                    </div>
                </label>
                
                <label class="shipping-grid" for="option2">
                    <input 
                        v-model="selectedShipping"
                        type="radio" 
                        id="option2" 
                        name="options" 
                        value="USPS Ground"
                        required
                    >
                    <div class="shipping-option">
                        <p>{{ shippingMethods[1].name }}</p>
                        <p>Estimated delivery Thursday, Jun 8</p>
                    </div>
                    <div class="shipping-price">
                        ${{ shippingMethods[1].price }}
                    </div>
                </label>
            </div>
            <div class="form-footer">
                <div class="return-to-cart">
                    <span class="back-icon"></span>
                    <button class="r-btn" @click="previousComponent">Return to Information</button>
                </div>
                <div class="submit-button">
                    <input 
                        class="button" 
                        type="submit" 
                        value="Continue to Payment"
                    >
                </div>
            </div>
        </form>
    </div>
</template>
<script setup>
/* imports */
import { ref } from 'vue'
import axios from 'axios';
/* components */
import InfoToChange from './InfoToChange.vue' 
/* pinia */
import { useProductStore } from '../../stores/productStore'
const productStore = useProductStore()

const selectedShipping = ref("") 
const shippingMethods = [
    {
        name: "USPS First Class Package",
        price: "4.44"
    },
    {
        name: "USPS Ground",
        price: "9.44"
    }
]

const emit = defineEmits(['complete','previousComponent'])
const completeForm = () => {
  emit('complete')
  
  productStore.shippingMethodView = true

  if(selectedShipping.value == "USPS First Class Package"){
    productStore.order.shippingMethod = shippingMethods[0]; 
  }else{
    productStore.order.shippingMethod = shippingMethods[1]; 
  }
  console.log(JSON.stringify(productStore.order, null, 2))
  console.log("selectedShipping: " + selectedShipping.value)

    productStore.discountView = true

    /* posting to json function */
    const post = async () =>{
        localStorage.setItem('order', JSON.stringify(productStore.order))
/*         await axios.post("http://localhost:3000/orders", productStore.orders[0])
        .then((result)=>{
            console.log(result)
        })
        .catch((error) => {
            console.error(error);
        }); */
    }
  /* delete from json and post to json function */
  const deleteAndPost = async () =>{
    localStorage.removeItem('order')
    post()
/*     let newId = productStore.newId
    await axios.delete(`http://localhost:3000/orders/${newId}`)
    .then(()=>{
        post()
    })
    .catch((error) => {
        console.error(error);
    }); */
  }

  deleteAndPost()
}

const previousComponent = () => {
  emit('previousComponent')
}
</script>

<style scoped>

 form .information-to-change{
    border: solid 0.5px black;
    border-radius: 10px;
    margin-bottom: 50px;
}
 form .itc-inner{
    margin: 10px;
    padding: 10px;
}
 form .itc-inner .itc-grid{
    display: grid;
    grid-template-columns: 1fr 5fr 1fr;
    font-size: var(--font-size-sm);
}
 form .itc-inner .contact{
    border-bottom: solid black 0.5px;
    padding-bottom: 20px;
}
 form .itc-inner .ship-to{
    padding-top: 20px;
}

 form .itc-inner .itc-grid div:nth-child(2){
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-body-sm);
}
 form .itc-inner .itc-grid div:last-child{
    text-decoration: underline;
}
/* SHIPPING METHOD */
 form .shipping-method{
    border: solid black 1px;
    border-radius: 10px;
    font-size: var(--font-size-body-sm);
}
 form .shipping-method .shipping-grid{
    display: grid;
    grid-template-columns: 1fr 10fr 2fr;
    padding: 20px;
}
 form .shipping-method .shipping-grid:first-child{
    border-bottom: solid black 0.5px;
}
 form .shipping-method .shipping-grid .shipping-option p:last-child{
    font-size: var(--font-size-2xs);
}
 form .shipping-method .shipping-grid .shipping-price{
    justify-self: end;
    align-self: center;
}
 form .shipping-method .shipping-grid input{
    height: 20px;
}

/* FORM CONTENT */
div.title{
    font-weight: var(--font-weight-semibold);
    font-size: var(--font-size-lg);
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
.form-footer{
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
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
    font-family: 'Montserrat', sans-serif;
    background-color: var(--color-surface);
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
    form .information-to-change{
    border: solid 0.5px black;
    border-radius: 10px;
    margin-bottom: 0px;
}
form .shipping-method{
    border: solid black 1px;
    border-radius: 10px;
    font-size: var(--font-size-2xs);
}
form .shipping-method .shipping-grid .shipping-option{
    padding-left: 10px ;
    font-size: var(--font-size-2xs);
}
form .shipping-method .shipping-grid{
    display: grid;
    grid-template-columns: 1fr 10fr 2fr;
    padding: 20px;
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
    background-color: var(--color-surface);
    font-size: var(--font-size-2xs);
    letter-spacing: 0.06rem;
}
.button {
  background-color: #000;
  text-transform: uppercase;
  font-size: var(--font-size-3xs);
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
form .shipping-method{
    border: solid black 0.5px;
    border-radius: 10px;
    font-size: var(--font-size-2xs);
}
}
</style>