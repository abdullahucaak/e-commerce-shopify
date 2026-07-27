<template>
  <div class="form-container">
    <form @submit.prevent="completeForm" class="form">
        <div class="title">Contact</div>
        <div class="fields">
            <label 
              class="field"
              :class="{ invalid: !isValidEmail && submitted}"
            >
            <span class="field__label" for="email">Email</span>
            <input 
              v-model="email" 
              class="field__input" 
              type="text" 
              id="email" 
              autofocus 
            />
            </label>
            <p 
              v-if="!isValidEmail && submitted"
              class="invalid-message"
              ><small>Enter a valid email.</small>
            </p>
        </div>

        <div class="title">Shipping address</div>
        <p><small>Please enter your shipping details.</small></p>
        <div class="fields fields--2">
          <div>
            <label 
             class="field"
             :class="{ invalid: !isValidFirstName && submitted}"
            >
            <span class="field__label" for="firstname">First name</span>
            <input 
              v-model="firstName" 
              class="field__input" 
              type="text" 
              id="firstname" 
            />
          </label>
          <span 
              v-if="!isValidFirstName && submitted"
              class="invalid-message"
              ><small>Enter a name.</small>
            </span>
          </div>
          <div>
            <label 
            class="field"
            :class="{ invalid: !isValidLastName && submitted}"
          >
            <span class="field__label" for="lastname">Last name</span>
            <input 
              v-model="lastName" 
              class="field__input" 
              type="text" 
              id="lastname" 
            />
            </label>
            <span 
              v-if="!isValidLastName && submitted"
              class="invalid-message"
              ><small>Enter a last name.</small>
            </span>
          </div>
        </div>
        <div>
          <label 
            class="field"
            :class="{ invalid: !isValidShippingAddress && submitted}"
          >
              <span class="field__label" for="address">Address</span>
              <input 
                v-model="shippingAddress" 
                class="field__input" 
                type="text" 
                id="address" 
              />
          </label>
          <span 
            v-if="!isValidShippingAddress && submitted"
            class="invalid-message"
            ><small>Enter a Address.</small>
          </span>
        </div>
        <div class="fields fields--3">
          <div>
            <label 
              class="field"
              :class="{ invalid: !isValidZipCode && submitted}"            
            >
            <span class="field__label" for="zipcode">Zip code</span>
            <input 
              v-model="zipCode" 
              class="field__input" 
              type="text" 
              id="zipcode" 
            />
            </label>
            <span 
              v-if="!isValidZipCode && submitted"
              class="invalid-message"
              ><small>Enter a zip code.</small>
            </span>
          </div>
            <div>
              <label 
                class="field"
                :class="{ invalid: !isValidCity && submitted}"
              >
              <span class="field__label" for="city">City</span>
              <input 
                v-model="city" 
                class="field__input" 
                type="text" 
                id="city" 
              />
              </label>
              <span 
              v-if="!isValidCity && submitted"
              class="invalid-message"
              ><small>Enter a city.</small>
            </span>
            </div>
            <div>
              <label 
                  class="field"
                  :class="{ invalid: !isValidCountry && submitted}"
                >
                <span class="field__label" for="country">Country</span>
                <select v-model="country" class="field__input" id="country">
                <option value="turkiye" > Turkiye </option>
                <option value="greece" disabled>Greece</option>
                </select>
              </label>
              <span 
                v-if="!isValidCountry && submitted"
                class="invalid-message"
                ><small>Enter a country.</small>
              </span>
            </div>
        </div>
        <div>
          <label 
            class="field"
            :class="{ invalid: !isValidPhoneNumber && submitted}"
          >
            <span class="field__label" for="phone-number">Phone Number</span>
            <input 
              v-model="phoneNumber" 
              class="field__input" 
              type="tel" 
              id="phone-number" 
            />
          </label>
          <span 
            v-if="!isValidPhoneNumber && submitted"
            class="invalid-message"
            ><small>Enter a valid phone number.</small>
          </span>
        </div>
        <div class="form-footer">
            <div class="return-to-cart">
                <span class="back-icon"></span>
                <RouterLink :to="{name:'cart'}"> Return to cart</RouterLink>
            </div>
            <div class="submit-button">
                <input 
                  type="submit"
                  class="button" 
                  value="Continue to Shipping"
                >
            </div>
        </div>
    </form>
  </div>
</template>
<script setup>
/* imports */
import { ref, reactive, computed } from 'vue'

/* pinia */
import { useProductStore } from '../../stores/productStore'
const productStore = useProductStore()

const email = ref("kaan.uucak@gmail.com")
const firstName = ref("Kaan")
const lastName = ref("Uçak")
const shippingAddress = ref("Sarısu Mah. Kıbrıs Caddesi Narin Evleri B/blok No:8 Konyaaltı/Antalya")
const zipCode = ref("06930")
const city = ref("Antalya")
const country = ref("")
const phoneNumber = ref("+90 545 816 87 97")



/* valid email controller */
const isValidEmail = computed (()=>{
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.value)
})

/* Enter a firstName controller */
const isValidFirstName = computed (()=>{
  return firstName.value.length > 0
})
if(firstName.value.length){
  !isValidFirstName
} else {
  isValidFirstName
}

/* Enter a lastName controller */
const isValidLastName = computed (()=>{
  return lastName.value.length > 0
})
if(lastName.value.length){
  !isValidLastName
} else {
  isValidLastName
}

/* Enter a address controller */
const isValidShippingAddress = computed (()=>{
  return shippingAddress.value.length > 0
})
if(shippingAddress.value.length){
  !isValidShippingAddress
} else {
  isValidShippingAddress
}

/* Enter a zip code controller */
const isValidZipCode = computed (()=>{
  return zipCode.value.length > 0
})
if(zipCode.value.length){
  !isValidZipCode
} else {
  isValidZipCode
}

/* Enter a city controller */
const isValidCity = computed (()=>{
  return city.value.length > 0
})
if(city.value.length ){
  !isValidCity
} else {
  isValidCity
}

/* Enter a country controller */
const isValidCountry = computed (()=>{
  return country.value.length > 0
})
if(country.value.length){
  !isValidCountry
} else {
  isValidCountry
}

/* Enter a phoneNumber controller */
const isValidPhoneNumber = computed (() => {
  return /^(\+90)?\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/.test(phoneNumber.value)
})
/* changing component */
const emit = defineEmits(['complete'])

/* submission control for validity check */
const submitted = ref(false)

const completeForm = () => {
  /* submission control for validity check */
  submitted.value = true
  
  /* Validity check before submitting the form... */
  if(isValidEmail.value && isValidFirstName.value && isValidLastName.value && isValidShippingAddress.value && isValidZipCode.value && isValidCity.value && isValidCountry.value && isValidPhoneNumber.value){
    /* changing component */
    emit('complete')

    /* shipping Info */
    const shippingInfo = reactive({
      email: email.value,
      firstName: firstName.value,
      lastName: lastName.value,
      shippingAddress: shippingAddress.value,
      country: country.value,
      zipCode: zipCode.value,
      city: city.value,
      phoneNumber: phoneNumber.value
    })
    
    /*add shippingInfo to productStore.orders */
    productStore.order.shippingInfo = shippingInfo; 

    /* posting to json function */
    const post = async () =>{
/*           await axios.post("http://localhost:3000/orders", productStore.orders[0])
          .then((result)=>{
              console.log(result)
          })
          .catch((error) => {
              console.error(error);
          }); */
          localStorage.setItem('order', JSON.stringify(productStore.order))
    }
    /* delete from json and post to json function */
    const deleteAndPost = async () =>{
      localStorage.removeItem('order')
      post()
     /*  let newId = productStore.newId */
/*       await axios.delete(`http://localhost:3000/orders/${newId}`)
      .then(()=>{
          post()
      })
      .catch((error) => {
          console.error(error);
      }); */
    }

    deleteAndPost()
  }
}

</script>

<style scoped>
/* FORM CONTENT */
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
  padding: .5rem;
  border-radius: .25rem;
}

.field__label {
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
  font-weight: bold;
  font-size: var(--font-size-body);
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
}

.fields {
  display: grid;
  grid-column-gap: 0.5rem;
}
.fields--2 {
  grid-template-columns: 1fr 1fr;
}
.fields--3 {
  grid-template-columns: 1fr 1fr 1fr;
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

.country-code{
  display: inline-block;
  width: 50px;
}
.invalid{
  border: solid 2px rgb(228, 59, 59);
}
.invalid-message{
  color: rgb(228,59,59);
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
div.title{
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}
@media (max-width: 399px){
  .return-to-cart{
    font-size: 14px;
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
}
@media (max-width: 340px){
  .form-container {
    padding: 20px 0;
    margin: 0 auto;
  }
  .return-to-cart{
    font-size: 13px;
  }
  .button {
    background-color: #000;
    text-transform: uppercase;
    font-size: var(--font-size-3xs);
    font-weight: var(--font-weight-medium);
    display: block;
    color: #fff;
    width: 100%;
    padding: 1rem 0.8rem;
    border-radius: 0.25rem;
    border: 0;
    cursor: pointer;
    outline: 0;
  }
  .field__input {
    padding: 0;
    margin: 0;
    border: 0;
    outline: 0;
    font-weight: var(--font-weight-light);
    font-size: var(--font-size-sm);
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
    background-color: transparent;
  }
  small{
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-medium);
  }
  .invalid{
    border: solid 1.5px rgb(228, 59, 59);
  }
}

</style>